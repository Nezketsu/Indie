package models

import (
	"time"

	"github.com/google/uuid"
)

// Category represents the main product category
// These match exactly the 15 labels from the HuggingFace model (dima806/clothes_image_detection)
type Category string

const (
	// Direct mapping to HuggingFace model labels
	CategoryBlazer        Category = "blazer"
	CategoryDenimJacket   Category = "denim-jacket"
	CategoryDresses       Category = "dresses"
	CategoryHoodie        Category = "hoodie"
	CategoryJacket        Category = "jacket"
	CategoryJeans         Category = "jeans"
	CategoryLongPants     Category = "long-pants"
	CategoryPolo          Category = "polo"
	CategoryShirt         Category = "shirt"
	CategoryShorts        Category = "shorts"
	CategorySkirt         Category = "skirt"
	CategorySportsJacket  Category = "sports-jacket"
	CategorySweater       Category = "Knitwear"
	CategoryTShirt        Category = "t-shirt"
	CategoryHoodiesSweats Category = "Hoodies & Sweats"

	// Additional categories
	CategoryShoes       Category = "shoes"
	CategoryAccessories Category = "accessories"
)

// SubCategory represents detailed subcategory
type SubCategory string

const (
	// T-Shirts & Shirts
	SubCategoryTShirt     SubCategory = "t-shirt"
	SubCategoryShirt      SubCategory = "shirt"
	SubCategoryPolo       SubCategory = "polo"
	SubCategoryTank       SubCategory = "tank"
	SubCategoryLongsleeve SubCategory = "longsleeve"

	// Hoodies (zip-up vs pullover)
	SubCategoryHoodiePullover SubCategory = "hoodie-pullover"
	SubCategoryHoodieZipUp    SubCategory = "hoodie-zip-up"

	// Crewnecks & Sweatshirts
	SubCategoryCrewneck   SubCategory = "crewneck"
	SubCategorySweatshirt SubCategory = "sweatshirt"

	//Knitwear
	SubCategorySweater  SubCategory = "sweater"
	SubCategoryCardigan SubCategory = "cardigan"
	SubCategoryKnit     SubCategory = "knit"

	// Jackets & Outerwear
	SubCategoryJacket      SubCategory = "jacket"
	SubCategoryCoat        SubCategory = "coat"
	SubCategoryBomber      SubCategory = "bomber"
	SubCategoryWindbreaker SubCategory = "windbreaker"
	SubCategoryPuffer      SubCategory = "puffer"

	// Bottoms
	SubCategoryJeans   SubCategory = "jeans"
	SubCategoryPants   SubCategory = "pants"
	SubCategoryCargo   SubCategory = "cargo"
	SubCategoryJoggers SubCategory = "joggers"
	SubCategoryShorts  SubCategory = "shorts"

	// Footwear
	SubCategorySneakers SubCategory = "sneakers"
	SubCategoryBoots    SubCategory = "boots"
	SubCategorySandals  SubCategory = "sandals"
	SubCategoryLoafers  SubCategory = "loafers"

	// Accessories
	SubCategoryBag     SubCategory = "bag"
	SubCategoryHat     SubCategory = "hat"
	SubCategoryBelt    SubCategory = "belt"
	SubCategoryJewelry SubCategory = "jewelry"
	SubCategorySocks   SubCategory = "socks"
	SubCategoryScarf   SubCategory = "scarf"
	SubCategoryWallet  SubCategory = "wallet"
)

// Gender detected from image
type Gender string

const (
	GenderMale   Gender = "male"
	GenderFemale Gender = "female"
	GenderUnisex Gender = "unisex"
	GenderKids   Gender = "kids"
)

// Style of the clothing
type Style string

const (
	StyleCasual     Style = "casual"
	StyleFormal     Style = "formal"
	StyleSport      Style = "sport"
	StyleStreetwear Style = "streetwear"
	StyleVintage    Style = "vintage"
	StyleMinimalist Style = "minimalist"
)

// Season for the clothing
type Season string

const (
	SeasonSummer    Season = "summer"
	SeasonWinter    Season = "winter"
	SeasonMidSeason Season = "mid-season"
	SeasonAllSeason Season = "all-season"
)

// ClassificationStatus represents the processing status
type ClassificationStatus string

const (
	StatusPending    ClassificationStatus = "pending"
	StatusProcessing ClassificationStatus = "processing"
	StatusCompleted  ClassificationStatus = "completed"
	StatusFailed     ClassificationStatus = "failed"
	StatusReview     ClassificationStatus = "review" // Low confidence, needs human review
)

// ClassificationJob represents a job in the queue
type ClassificationJob struct {
	ID        string    `json:"id"`
	ProductID string    `json:"product_id"`
	ImageURL  string    `json:"image_url"`
	Priority  int       `json:"priority"` // Higher = more urgent
	CreatedAt time.Time `json:"created_at"`
	Attempts  int       `json:"attempts"`
}

// ClassificationResult is the output from the model
type ClassificationResult struct {
	ID        uuid.UUID `json:"id" db:"id"`
	ProductID uuid.UUID `json:"product_id" db:"product_id"`
	ImageURL  string    `json:"image_url" db:"image_url"`

	// Primary classification
	Category         Category    `json:"category" db:"category"`
	CategoryScore    float64     `json:"category_score" db:"category_score"`
	SubCategory      SubCategory `json:"sub_category" db:"sub_category"`
	SubCategoryScore float64     `json:"sub_category_score" db:"sub_category_score"`

	// Attributes
	Gender      Gender  `json:"gender" db:"gender"`
	GenderScore float64 `json:"gender_score" db:"gender_score"`
	Style       Style   `json:"style" db:"style"`
	StyleScore  float64 `json:"style_score" db:"style_score"`
	Season      Season  `json:"season" db:"season"`
	SeasonScore float64 `json:"season_score" db:"season_score"`

	// Colors (top 3)
	PrimaryColor   string `json:"primary_color" db:"primary_color"`
	SecondaryColor string `json:"secondary_color,omitempty" db:"secondary_color"`
	TertiaryColor  string `json:"tertiary_color,omitempty" db:"tertiary_color"`

	// Metadata
	Status       ClassificationStatus `json:"status" db:"status"`
	OverallScore float64              `json:"overall_score" db:"overall_score"`
	NeedsReview  bool                 `json:"needs_review" db:"needs_review"`
	ReviewedAt   *time.Time           `json:"reviewed_at,omitempty" db:"reviewed_at"`
	ReviewedBy   *string              `json:"reviewed_by,omitempty" db:"reviewed_by"`

	// Timestamps
	ProcessedAt time.Time `json:"processed_at" db:"processed_at"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time `json:"updated_at" db:"updated_at"`
}

// ModelPrediction represents raw output from Fashion-CLIP
type ModelPrediction struct {
	Labels []struct {
		Name  string  `json:"name"`
		Score float64 `json:"score"`
	} `json:"labels"`
}

// BatchClassificationRequest for bulk processing
type BatchClassificationRequest struct {
	Items []ClassificationItem `json:"items"`
}

type ClassificationItem struct {
	ProductID string `json:"product_id"`
	ImageURL  string `json:"image_url"`
	Priority  int    `json:"priority,omitempty"`
}

// BatchClassificationResponse
type BatchClassificationResponse struct {
	JobID      string `json:"job_id"`
	TotalItems int    `json:"total_items"`
	Status     string `json:"status"`
	Message    string `json:"message"`
}

// ClassificationStats for monitoring
type ClassificationStats struct {
	TotalProcessed  int64   `json:"total_processed"`
	PendingJobs     int64   `json:"pending_jobs"`
	ProcessingJobs  int64   `json:"processing_jobs"`
	FailedJobs      int64   `json:"failed_jobs"`
	ReviewQueue     int64   `json:"review_queue"`
	AvgConfidence   float64 `json:"avg_confidence"`
	AvgProcessingMs float64 `json:"avg_processing_ms"`
}
