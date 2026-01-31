package models

import "time"

// ShopifyProduct represents a product from the Shopify API
type ShopifyProduct struct {
	ID          int64            `json:"id"`
	Title       string           `json:"title"`
	Handle      string           `json:"handle"`
	BodyHTML    string           `json:"body_html"`
	Vendor      string           `json:"vendor"`
	ProductType string           `json:"product_type"`
	Tags        interface{}      `json:"tags"` // Can be string or []string depending on Shopify store
	Variants    []ShopifyVariant `json:"variants"`
	Images      []ShopifyImage   `json:"images"`
	PublishedAt time.Time        `json:"published_at"`
	CreatedAt   time.Time        `json:"created_at"`
	UpdatedAt   time.Time        `json:"updated_at"`
	Options     []ShopifyOption  `json:"options"`
}

// ShopifyVariant represents a product variant from Shopify
type ShopifyVariant struct {
	ID                int64   `json:"id"`
	ProductID         int64   `json:"product_id"`
	Title             string  `json:"title"`
	SKU               string  `json:"sku"`
	Price             string  `json:"price"`
	CompareAtPrice    *string `json:"compare_at_price"`
	InventoryQuantity int     `json:"inventory_quantity"`
	Option1           string  `json:"option1"`
	Option2           string  `json:"option2"`
	Option3           string  `json:"option3"`
	Available         bool    `json:"available"`
}

// ShopifyImage represents a product image from Shopify
type ShopifyImage struct {
	ID        int64  `json:"id"`
	ProductID int64  `json:"product_id"`
	Src       string `json:"src"`
	Alt       string `json:"alt"`
	Width     int    `json:"width"`
	Height    int    `json:"height"`
	Position  int    `json:"position"`
}

// ShopifyOption represents a product option from Shopify
type ShopifyOption struct {
	ID        int64    `json:"id"`
	ProductID int64    `json:"product_id"`
	Name      string   `json:"name"`
	Position  int      `json:"position"`
	Values    []string `json:"values"`
}

// ShopifyProductsResponse represents the API response for products
type ShopifyProductsResponse struct {
	Products []ShopifyProduct `json:"products"`
}

// Brand represents a brand in our database
type Brand struct {
	ID            string     `json:"id"`
	Name          string     `json:"name"`
	Slug          string     `json:"slug"`
	Description   *string    `json:"description"`
	LogoURL       *string    `json:"logo_url"`
	WebsiteURL    string     `json:"website_url"`
	ShopifyDomain string     `json:"shopify_domain"`
	Country       *string    `json:"country"`
	IsActive      bool       `json:"is_active"`
	LastSyncedAt  *time.Time `json:"last_synced_at"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
}

// Product represents a product in our database
type Product struct {
	ID             string     `json:"id"`
	BrandID        string     `json:"brand_id"`
	ShopifyID      int64      `json:"shopify_id"`
	Title          string     `json:"title"`
	Slug           string     `json:"slug"`
	Description    *string    `json:"description"`
	ProductType    *string    `json:"product_type"`
	Vendor         *string    `json:"vendor"`
	Tags           []string   `json:"tags"`
	PriceMin       float64    `json:"price_min"`
	PriceMax       float64    `json:"price_max"`
	Currency       string     `json:"currency"`
	CompareAtPrice *float64   `json:"compare_at_price"`
	IsAvailable    bool       `json:"is_available"`
	PublishedAt    *time.Time `json:"published_at"`
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`
}

// SyncResult represents the result of a sync operation
type SyncResult struct {
	BrandID         string
	ProductsFound   int
	ProductsCreated int
	ProductsUpdated int
	Error           error
}
