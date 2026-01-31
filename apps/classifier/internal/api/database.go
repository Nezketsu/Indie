package api

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/indie/classifier/internal/models"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"go.uber.org/zap"
)

// PostgresDB implements the Database interface
type PostgresDB struct {
	pool   *pgxpool.Pool
	logger *zap.Logger
}

// NewPostgresDB creates a new PostgreSQL connection
func NewPostgresDB(databaseURL string, logger *zap.Logger) (*PostgresDB, error) {
	config, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		return nil, fmt.Errorf("failed to parse database URL: %w", err)
	}

	config.MaxConns = 20
	config.MinConns = 5
	config.MaxConnLifetime = time.Hour
	config.MaxConnIdleTime = 30 * time.Minute

	pool, err := pgxpool.NewWithConfig(context.Background(), config)
	if err != nil {
		return nil, fmt.Errorf("failed to create connection pool: %w", err)
	}

	// Test connection
	if err := pool.Ping(context.Background()); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	logger.Info("Connected to PostgreSQL")

	return &PostgresDB{
		pool:   pool,
		logger: logger,
	}, nil
}

// Close closes the database connection
func (db *PostgresDB) Close() {
	db.pool.Close()
}

// RunMigrations creates the necessary tables
func (db *PostgresDB) RunMigrations(ctx context.Context) error {
	migrations := []string{
		`CREATE TABLE IF NOT EXISTS product_classifications (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			product_id UUID NOT NULL,
			image_url TEXT NOT NULL,

			-- Classification
			category VARCHAR(50) NOT NULL,
			category_score DECIMAL(5,4) DEFAULT 0,
			sub_category VARCHAR(50),
			sub_category_score DECIMAL(5,4) DEFAULT 0,

			-- Attributes
			gender VARCHAR(20),
			gender_score DECIMAL(5,4) DEFAULT 0,
			style VARCHAR(30),
			style_score DECIMAL(5,4) DEFAULT 0,
			season VARCHAR(20),
			season_score DECIMAL(5,4) DEFAULT 0,

			-- Colors
			primary_color VARCHAR(30),
			secondary_color VARCHAR(30),
			tertiary_color VARCHAR(30),

			-- Metadata
			status VARCHAR(20) DEFAULT 'pending',
			overall_score DECIMAL(5,4) DEFAULT 0,
			needs_review BOOLEAN DEFAULT FALSE,
			reviewed_at TIMESTAMPTZ,
			reviewed_by VARCHAR(100),

			-- Timestamps
			processed_at TIMESTAMPTZ,
			created_at TIMESTAMPTZ DEFAULT NOW(),
			updated_at TIMESTAMPTZ DEFAULT NOW(),

			UNIQUE(product_id)
		)`,
		`CREATE INDEX IF NOT EXISTS idx_classifications_product_id ON product_classifications(product_id)`,
		`CREATE INDEX IF NOT EXISTS idx_classifications_status ON product_classifications(status)`,
		`CREATE INDEX IF NOT EXISTS idx_classifications_needs_review ON product_classifications(needs_review) WHERE needs_review = TRUE`,
		`CREATE INDEX IF NOT EXISTS idx_classifications_category ON product_classifications(category)`,
	}

	for _, migration := range migrations {
		if _, err := db.pool.Exec(ctx, migration); err != nil {
			return fmt.Errorf("migration failed: %w", err)
		}
	}

	db.logger.Info("Database migrations completed")
	return nil
}

// SaveClassification saves a new classification result
func (db *PostgresDB) SaveClassification(ctx context.Context, result *models.ClassificationResult) error {
	query := `
		INSERT INTO product_classifications (
			id, product_id, image_url,
			category, category_score, sub_category, sub_category_score,
			gender, gender_score, style, style_score, season, season_score,
			primary_color, secondary_color, tertiary_color,
			status, overall_score, needs_review, processed_at, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
		)
		ON CONFLICT (product_id) DO UPDATE SET
			image_url = EXCLUDED.image_url,
			category = EXCLUDED.category,
			category_score = EXCLUDED.category_score,
			sub_category = EXCLUDED.sub_category,
			sub_category_score = EXCLUDED.sub_category_score,
			gender = EXCLUDED.gender,
			gender_score = EXCLUDED.gender_score,
			style = EXCLUDED.style,
			style_score = EXCLUDED.style_score,
			season = EXCLUDED.season,
			season_score = EXCLUDED.season_score,
			primary_color = EXCLUDED.primary_color,
			secondary_color = EXCLUDED.secondary_color,
			tertiary_color = EXCLUDED.tertiary_color,
			status = EXCLUDED.status,
			overall_score = EXCLUDED.overall_score,
			needs_review = EXCLUDED.needs_review,
			processed_at = EXCLUDED.processed_at,
			updated_at = NOW()
	`

	_, err := db.pool.Exec(ctx, query,
		result.ID, result.ProductID, result.ImageURL,
		result.Category, result.CategoryScore, result.SubCategory, result.SubCategoryScore,
		result.Gender, result.GenderScore, result.Style, result.StyleScore, result.Season, result.SeasonScore,
		result.PrimaryColor, result.SecondaryColor, result.TertiaryColor,
		result.Status, result.OverallScore, result.NeedsReview, result.ProcessedAt, result.CreatedAt, result.UpdatedAt,
	)

	return err
}

// UpdateProductClassification updates the product's category in the products table
func (db *PostgresDB) UpdateProductClassification(ctx context.Context, productID uuid.UUID, result *models.ClassificationResult) error {
	// Map our internal category to the product_type field
	productType := mapCategoryToProductType(result.Category, result.SubCategory)

	query := `
		UPDATE products SET
			product_type = $1,
			updated_at = NOW()
		WHERE id = $2
	`

	_, err := db.pool.Exec(ctx, query, productType, productID)
	return err
}

// mapCategoryToProductType maps internal categories to product_type values
// Direct 1:1 mapping from HuggingFace model labels (dima806/clothes_image_detection)
func mapCategoryToProductType(cat models.Category, subCat models.SubCategory) string {
	// Direct mapping - category slug becomes the product_type
	switch cat {
	case models.CategoryBlazer:
		return "Blazer"
	case models.CategoryDenimJacket:
		return "Denim Jacket"
	case models.CategoryDresses:
		return "Dresses"
	case models.CategoryHoodie:
		return "Hoodie"
	case models.CategoryJacket:
		return "Jacket"
	case models.CategoryJeans:
		return "Jeans"
	case models.CategoryLongPants:
		return "Long Pants"
	case models.CategoryPolo:
		return "Polo"
	case models.CategoryShirt:
		return "Shirt"
	case models.CategoryShorts:
		return "Shorts"
	case models.CategorySkirt:
		return "Skirt"
	case models.CategorySportsJacket:
		return "Sports Jacket"
	case models.CategorySweater:
		return "Sweater"
	case models.CategoryTShirt:
		return "T-shirt"
	case models.CategoryShoes:
		return "Shoes"
	case models.CategoryAccessories:
		return "Accessories"
	default:
		return "Other"
	}
}

// GetClassification retrieves a classification by ID
func (db *PostgresDB) GetClassification(ctx context.Context, id uuid.UUID) (*models.ClassificationResult, error) {
	query := `
		SELECT id, product_id, image_url,
			category, category_score, sub_category, sub_category_score,
			gender, gender_score, style, style_score, season, season_score,
			primary_color, secondary_color, tertiary_color,
			status, overall_score, needs_review, reviewed_at, reviewed_by,
			processed_at, created_at, updated_at
		FROM product_classifications
		WHERE id = $1
	`

	var result models.ClassificationResult
	err := db.pool.QueryRow(ctx, query, id).Scan(
		&result.ID, &result.ProductID, &result.ImageURL,
		&result.Category, &result.CategoryScore, &result.SubCategory, &result.SubCategoryScore,
		&result.Gender, &result.GenderScore, &result.Style, &result.StyleScore, &result.Season, &result.SeasonScore,
		&result.PrimaryColor, &result.SecondaryColor, &result.TertiaryColor,
		&result.Status, &result.OverallScore, &result.NeedsReview, &result.ReviewedAt, &result.ReviewedBy,
		&result.ProcessedAt, &result.CreatedAt, &result.UpdatedAt,
	)

	if err == pgx.ErrNoRows {
		return nil, fmt.Errorf("classification not found")
	}

	return &result, err
}

// GetClassificationByProduct retrieves classification by product ID
func (db *PostgresDB) GetClassificationByProduct(ctx context.Context, productID uuid.UUID) (*models.ClassificationResult, error) {
	query := `
		SELECT id, product_id, image_url,
			category, category_score, sub_category, sub_category_score,
			gender, gender_score, style, style_score, season, season_score,
			primary_color, secondary_color, tertiary_color,
			status, overall_score, needs_review, reviewed_at, reviewed_by,
			processed_at, created_at, updated_at
		FROM product_classifications
		WHERE product_id = $1
	`

	var result models.ClassificationResult
	err := db.pool.QueryRow(ctx, query, productID).Scan(
		&result.ID, &result.ProductID, &result.ImageURL,
		&result.Category, &result.CategoryScore, &result.SubCategory, &result.SubCategoryScore,
		&result.Gender, &result.GenderScore, &result.Style, &result.StyleScore, &result.Season, &result.SeasonScore,
		&result.PrimaryColor, &result.SecondaryColor, &result.TertiaryColor,
		&result.Status, &result.OverallScore, &result.NeedsReview, &result.ReviewedAt, &result.ReviewedBy,
		&result.ProcessedAt, &result.CreatedAt, &result.UpdatedAt,
	)

	if err == pgx.ErrNoRows {
		return nil, fmt.Errorf("classification not found")
	}

	return &result, err
}

// ListClassifications returns paginated results
func (db *PostgresDB) ListClassifications(ctx context.Context, limit, offset int, status string) ([]*models.ClassificationResult, int64, error) {
	var args []interface{}
	whereClause := ""

	if status != "" {
		whereClause = "WHERE status = $1"
		args = append(args, status)
	}

	// Get total count
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM product_classifications %s", whereClause)
	var total int64
	err := db.pool.QueryRow(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	// Get results
	query := fmt.Sprintf(`
		SELECT id, product_id, image_url,
			category, category_score, sub_category, sub_category_score,
			gender, gender_score, style, style_score, season, season_score,
			primary_color, secondary_color, tertiary_color,
			status, overall_score, needs_review, reviewed_at, reviewed_by,
			processed_at, created_at, updated_at
		FROM product_classifications
		%s
		ORDER BY created_at DESC
		LIMIT %d OFFSET %d
	`, whereClause, limit, offset)

	rows, err := db.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var results []*models.ClassificationResult
	for rows.Next() {
		var r models.ClassificationResult
		err := rows.Scan(
			&r.ID, &r.ProductID, &r.ImageURL,
			&r.Category, &r.CategoryScore, &r.SubCategory, &r.SubCategoryScore,
			&r.Gender, &r.GenderScore, &r.Style, &r.StyleScore, &r.Season, &r.SeasonScore,
			&r.PrimaryColor, &r.SecondaryColor, &r.TertiaryColor,
			&r.Status, &r.OverallScore, &r.NeedsReview, &r.ReviewedAt, &r.ReviewedBy,
			&r.ProcessedAt, &r.CreatedAt, &r.UpdatedAt,
		)
		if err != nil {
			return nil, 0, err
		}
		results = append(results, &r)
	}

	return results, total, nil
}

// GetReviewQueue returns items needing review
func (db *PostgresDB) GetReviewQueue(ctx context.Context, limit, offset int) ([]*models.ClassificationResult, int64, error) {
	return db.ListClassifications(ctx, limit, offset, string(models.StatusReview))
}

// ApproveClassification marks a classification as approved
func (db *PostgresDB) ApproveClassification(ctx context.Context, id uuid.UUID, reviewerID string) error {
	query := `
		UPDATE product_classifications SET
			status = 'completed',
			needs_review = FALSE,
			reviewed_at = NOW(),
			reviewed_by = $2,
			updated_at = NOW()
		WHERE id = $1
	`

	_, err := db.pool.Exec(ctx, query, id, reviewerID)
	return err
}

// UpdateClassification updates specific fields
func (db *PostgresDB) UpdateClassification(ctx context.Context, id uuid.UUID, updates map[string]interface{}) error {
	if len(updates) == 0 {
		return nil
	}

	setParts := []string{}
	args := []interface{}{}
	argIndex := 1

	for key, value := range updates {
		setParts = append(setParts, fmt.Sprintf("%s = $%d", key, argIndex))
		args = append(args, value)
		argIndex++
	}

	setParts = append(setParts, "updated_at = NOW()")
	args = append(args, id)

	query := fmt.Sprintf(
		"UPDATE product_classifications SET %s WHERE id = $%d",
		strings.Join(setParts, ", "),
		argIndex,
	)

	_, err := db.pool.Exec(ctx, query, args...)
	return err
}

// GetProductsWithoutClassification returns products that haven't been classified
func (db *PostgresDB) GetProductsWithoutClassification(ctx context.Context, limit int) ([]ProductInfo, error) {
	query := `
		SELECT p.id, p.title,
			COALESCE(
				(SELECT src FROM product_images WHERE product_id = p.id ORDER BY position LIMIT 1),
				''
			) as image_url,
			p.brand_id
		FROM products p
		LEFT JOIN product_classifications pc ON p.id = pc.product_id
		WHERE pc.id IS NULL
		LIMIT $1
	`

	rows, err := db.pool.Query(ctx, query, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var products []ProductInfo
	for rows.Next() {
		var p ProductInfo
		if err := rows.Scan(&p.ID, &p.Title, &p.ImageURL, &p.BrandID); err != nil {
			return nil, err
		}
		if p.ImageURL != "" {
			products = append(products, p)
		}
	}

	return products, nil
}

// GetProductByID retrieves a product by ID (for worker)
func (db *PostgresDB) GetProductByID(ctx context.Context, productID uuid.UUID) (*Product, error) {
	query := `
		SELECT p.id, p.title,
			COALESCE(
				(SELECT src FROM product_images WHERE product_id = p.id ORDER BY position LIMIT 1),
				''
			) as image_url
		FROM products p
		WHERE p.id = $1
	`

	var p Product
	err := db.pool.QueryRow(ctx, query, productID).Scan(&p.ID, &p.Title, &p.ImageURL)
	if err == pgx.ErrNoRows {
		return nil, fmt.Errorf("product not found")
	}

	return &p, err
}

// Product for worker interface
type Product struct {
	ID       uuid.UUID
	Title    string
	ImageURL string
}
