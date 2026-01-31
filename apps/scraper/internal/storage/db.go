package storage

import (
	"context"
	"fmt"
	"strconv"
	"strings"

	"indie-marketplace/scraper/pkg/models"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// DB wraps the database connection pool
type DB struct {
	pool *pgxpool.Pool
}

// NewDB creates a new database connection
func NewDB(ctx context.Context, connString string) (*DB, error) {
	pool, err := pgxpool.New(ctx, connString)
	if err != nil {
		return nil, fmt.Errorf("failed to create connection pool: %w", err)
	}

	// Test the connection
	if err := pool.Ping(ctx); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	return &DB{pool: pool}, nil
}

// Close closes the database connection
func (db *DB) Close() {
	db.pool.Close()
}

// GetActiveBrands returns all active brands
func (db *DB) GetActiveBrands(ctx context.Context) ([]models.Brand, error) {
	query := `
		SELECT id, name, slug, description, logo_url, website_url, shopify_domain,
		       country, is_active, last_synced_at, created_at, updated_at
		FROM brands
		WHERE is_active = true
		ORDER BY name
	`

	rows, err := db.pool.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to query brands: %w", err)
	}
	defer rows.Close()

	var brands []models.Brand
	for rows.Next() {
		var b models.Brand
		err := rows.Scan(
			&b.ID, &b.Name, &b.Slug, &b.Description, &b.LogoURL, &b.WebsiteURL,
			&b.ShopifyDomain, &b.Country, &b.IsActive, &b.LastSyncedAt, &b.CreatedAt, &b.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan brand: %w", err)
		}
		brands = append(brands, b)
	}

	return brands, nil
}

// UpsertProduct inserts or updates a product
func (db *DB) UpsertProduct(ctx context.Context, brandID string, sp models.ShopifyProduct) (created bool, err error) {
	tx, err := db.pool.Begin(ctx)
	if err != nil {
		return false, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	// Calculate price range from variants
	var priceMin, priceMax float64
	var compareAtPrice *float64

	for i, v := range sp.Variants {
		price, _ := strconv.ParseFloat(v.Price, 64)
		if i == 0 || price < priceMin {
			priceMin = price
		}
		if i == 0 || price > priceMax {
			priceMax = price
		}
		if v.CompareAtPrice != nil && *v.CompareAtPrice != "" {
			cap, _ := strconv.ParseFloat(*v.CompareAtPrice, 64)
			if compareAtPrice == nil || cap > *compareAtPrice {
				compareAtPrice = &cap
			}
		}
	}

	// Check if any variant is available
	isAvailable := false
	for _, v := range sp.Variants {
		if v.Available {
			isAvailable = true
			break
		}
	}

	// Parse tags - handle both string and array formats from Shopify
	var tags []string
	switch t := sp.Tags.(type) {
	case string:
		if t != "" {
			tags = strings.Split(t, ", ")
		}
	case []interface{}:
		for _, v := range t {
			if s, ok := v.(string); ok {
				tags = append(tags, s)
			}
		}
	}

	// Upsert product
	var productID string
	var wasCreated bool
	query := `
		INSERT INTO products (brand_id, shopify_id, title, slug, description, product_type, vendor, tags,
		                      price_min, price_max, currency, compare_at_price, is_available, published_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'EUR', $11, $12, $13, NOW())
		ON CONFLICT (brand_id, shopify_id) DO UPDATE SET
			title = EXCLUDED.title,
			slug = EXCLUDED.slug,
			description = EXCLUDED.description,
			product_type = EXCLUDED.product_type,
			vendor = EXCLUDED.vendor,
			tags = EXCLUDED.tags,
			price_min = EXCLUDED.price_min,
			price_max = EXCLUDED.price_max,
			compare_at_price = EXCLUDED.compare_at_price,
			is_available = EXCLUDED.is_available,
			published_at = EXCLUDED.published_at,
			updated_at = NOW()
		RETURNING id, (xmax = 0) as created
	`

	err = tx.QueryRow(ctx, query,
		brandID, sp.ID, sp.Title, sp.Handle, sp.BodyHTML, sp.ProductType, sp.Vendor,
		tags, priceMin, priceMax, compareAtPrice, isAvailable, sp.PublishedAt,
	).Scan(&productID, &wasCreated)

	if err != nil {
		return false, fmt.Errorf("failed to upsert product: %w", err)
	}

	// Delete existing variants and images
	_, err = tx.Exec(ctx, "DELETE FROM product_variants WHERE product_id = $1", productID)
	if err != nil {
		return false, fmt.Errorf("failed to delete variants: %w", err)
	}

	_, err = tx.Exec(ctx, "DELETE FROM product_images WHERE product_id = $1", productID)
	if err != nil {
		return false, fmt.Errorf("failed to delete images: %w", err)
	}

	// Insert variants
	for _, v := range sp.Variants {
		price, _ := strconv.ParseFloat(v.Price, 64)
		var cap *float64
		if v.CompareAtPrice != nil && *v.CompareAtPrice != "" {
			c, _ := strconv.ParseFloat(*v.CompareAtPrice, 64)
			cap = &c
		}

		_, err = tx.Exec(ctx, `
			INSERT INTO product_variants (product_id, shopify_id, title, sku, price, compare_at_price,
			                              inventory_quantity, option1, option2, option3, is_available)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
		`, productID, v.ID, v.Title, v.SKU, price, cap, v.InventoryQuantity,
			v.Option1, v.Option2, v.Option3, v.Available)

		if err != nil {
			return false, fmt.Errorf("failed to insert variant: %w", err)
		}
	}

	// Insert images
	for _, img := range sp.Images {
		_, err = tx.Exec(ctx, `
			INSERT INTO product_images (product_id, shopify_id, src, alt_text, width, height, position)
			VALUES ($1, $2, $3, $4, $5, $6, $7)
		`, productID, img.ID, img.Src, img.Alt, img.Width, img.Height, img.Position)

		if err != nil {
			return false, fmt.Errorf("failed to insert image: %w", err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return false, fmt.Errorf("failed to commit transaction: %w", err)
	}

	return wasCreated, nil
}

// UpdateBrandLastSyncedAt updates the last synced timestamp for a brand
func (db *DB) UpdateBrandLastSyncedAt(ctx context.Context, brandID string) error {
	_, err := db.pool.Exec(ctx,
		"UPDATE brands SET last_synced_at = NOW(), updated_at = NOW() WHERE id = $1",
		brandID)
	return err
}

// CreateSyncLog creates a new sync log entry
func (db *DB) CreateSyncLog(ctx context.Context, brandID, status string) (string, error) {
	var id string
	err := db.pool.QueryRow(ctx,
		"INSERT INTO sync_logs (brand_id, status) VALUES ($1, $2) RETURNING id",
		brandID, status).Scan(&id)
	return id, err
}

// UpdateSyncLog updates a sync log entry
func (db *DB) UpdateSyncLog(ctx context.Context, logID string, result models.SyncResult) error {
	status := "completed"
	var errorMsg *string
	if result.Error != nil {
		status = "failed"
		msg := result.Error.Error()
		errorMsg = &msg
	}

	_, err := db.pool.Exec(ctx, `
		UPDATE sync_logs
		SET status = $1, products_found = $2, products_created = $3, products_updated = $4,
		    error_message = $5, completed_at = NOW()
		WHERE id = $6
	`, status, result.ProductsFound, result.ProductsCreated, result.ProductsUpdated, errorMsg, logID)

	return err
}

// Pool returns the underlying connection pool (for testing/advanced usage)
func (db *DB) Pool() *pgxpool.Pool {
	return db.pool
}

// Conn returns a single connection from the pool
func (db *DB) Conn(ctx context.Context) (*pgxpool.Conn, error) {
	return db.pool.Acquire(ctx)
}

// BeginTx starts a new transaction
func (db *DB) BeginTx(ctx context.Context) (pgx.Tx, error) {
	return db.pool.Begin(ctx)
}
