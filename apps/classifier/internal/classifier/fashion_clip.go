package classifier

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"sort"
	"strings"
	"time"

	"github.com/indie/classifier/internal/models"
	"go.uber.org/zap"
)

// FashionCLIPClient communicates with the Fashion-CLIP model service
type FashionCLIPClient struct {
	baseURL    string
	httpClient *http.Client
	logger     *zap.Logger
}

// NewFashionCLIPClient creates a new client
func NewFashionCLIPClient(baseURL string, logger *zap.Logger) *FashionCLIPClient {
	return &FashionCLIPClient{
		baseURL: baseURL,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
		logger: logger,
	}
}

// ClassifyRequest sent to the model service
type ClassifyRequest struct {
	ImageURL string   `json:"image_url"`
	Labels   []string `json:"labels"`
}

// ClassifyResponse from the model service
type ClassifyResponse struct {
	Labels      []Prediction `json:"labels"`
	ProcessTime float64      `json:"process_time_ms,omitempty"`
}

type Prediction struct {
	Name  string  `json:"name"` // Changed from "label" to match API
	Score float64 `json:"score"`
}

// Predefined label sets for zero-shot classification
var (
	CategoryLabels = []string{
		"a t-shirt", "a shirt", "a polo shirt", "a tank top",
		"a hoodie", "a sweatshirt", "a crewneck", "a zip-up hoodie",
		"a sweater", "a cardigan", "a knit sweater",
		"a jacket", "a coat", "a bomber jacket", "a windbreaker", "a puffer jacket",
		"jeans", "pants", "cargo pants", "joggers", "trousers",
		"shorts", "swim shorts",
		"sneakers", "boots", "sandals", "loafers", "shoes",
		"a bag", "a backpack", "a hat", "a cap", "a belt", "jewelry", "a wallet", "socks", "a scarf",
		"a dress",
	}

	GenderLabels = []string{
		"menswear, men's clothing",
		"womenswear, women's clothing",
		"unisex clothing",
		"children's clothing, kids wear",
	}

	StyleLabels = []string{
		"casual style clothing",
		"formal style clothing",
		"sportswear, athletic clothing",
		"streetwear style clothing",
		"vintage style clothing",
		"minimalist style clothing",
	}

	SeasonLabels = []string{
		"summer clothing, lightweight",
		"winter clothing, warm, heavy",
		"spring or fall clothing, mid-season",
		"all-season clothing, versatile",
	}

	ColorLabels = []string{
		"black", "white", "gray", "navy blue", "blue", "light blue",
		"red", "burgundy", "pink", "orange", "yellow", "green",
		"olive", "brown", "beige", "cream", "purple", "multicolor",
	}
)

// Classify processes an image and returns classification results
func (c *FashionCLIPClient) Classify(ctx context.Context, imageURL string) (*models.ClassificationResult, error) {
	result := &models.ClassificationResult{
		ImageURL:    imageURL,
		ProcessedAt: time.Now(),
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	// 1. Classify category
	categoryPreds, err := c.classifyWithLabels(ctx, imageURL, CategoryLabels)
	if err != nil {
		return nil, fmt.Errorf("category classification failed: %w", err)
	}
	category, subCategory, catScore, subScore := c.mapCategoryPredictions(categoryPreds)
	result.Category = category
	result.CategoryScore = catScore
	result.SubCategory = subCategory
	result.SubCategoryScore = subScore

	// DISABLED FOR SPEED - Skip secondary classifications for now
	// Uncomment these when you have time for full classification

	// // 2. Classify gender
	// genderPreds, err := c.classifyWithLabels(ctx, imageURL, GenderLabels)
	// if err != nil {
	// 	c.logger.Warn("Gender classification failed", zap.Error(err))
	// } else {
	// 	result.Gender, result.GenderScore = c.mapGenderPredictions(genderPreds)
	// }

	// // 3. Classify style
	// stylePreds, err := c.classifyWithLabels(ctx, imageURL, StyleLabels)
	// if err != nil {
	// 	c.logger.Warn("Style classification failed", zap.Error(err))
	// } else {
	// 	result.Style, result.StyleScore = c.mapStylePredictions(stylePreds)
	// }

	// // 4. Classify season
	// seasonPreds, err := c.classifyWithLabels(ctx, imageURL, SeasonLabels)
	// if err != nil {
	// 	c.logger.Warn("Season classification failed", zap.Error(err))
	// } else {
	// 	result.Season, result.SeasonScore = c.mapSeasonPredictions(seasonPreds)
	// }

	// // 5. Detect colors
	// colorPreds, err := c.classifyWithLabels(ctx, imageURL, ColorLabels)
	// if err != nil {
	// 	c.logger.Warn("Color detection failed", zap.Error(err))
	// } else {
	// 	result.PrimaryColor, result.SecondaryColor, result.TertiaryColor = c.mapColorPredictions(colorPreds)
	// }

	// Set default values for unused fields
	result.Gender = models.GenderUnisex
	result.Style = models.StyleCasual
	result.Season = models.SeasonAllSeason

	// Calculate overall confidence score
	result.OverallScore = (result.CategoryScore + result.SubCategoryScore + result.GenderScore + result.StyleScore) / 4.0

	return result, nil
}

// classifyWithLabels sends a classification request to the model service
func (c *FashionCLIPClient) classifyWithLabels(ctx context.Context, imageURL string, labels []string) ([]Prediction, error) {
	reqBody := ClassifyRequest{
		ImageURL: imageURL,
		Labels:   labels,
	}

	jsonBody, err := json.Marshal(reqBody)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, "POST", c.baseURL+"/classify", bytes.NewBuffer(jsonBody))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("model service returned %d: %s", resp.StatusCode, string(body))
	}

	var result ClassifyResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	return result.Labels, nil
}

// HuggingFace model label to Category mapping
// Direct 1:1 mapping from dima806/clothes_image_detection model output
var hfLabelToCategory = map[string]models.Category{
	"blazer":        models.CategoryBlazer,
	"coat":          models.CategoryJacket, // Coat merged into jacket
	"denim jacket":  models.CategoryDenimJacket,
	"dresses":       models.CategoryDresses,
	"a dress":       models.CategoryDresses,
	"hoodie":        models.CategoryHoodie,
	"jacket":        models.CategoryJacket,
	"jeans":         models.CategoryJeans,
	"long pants":    models.CategoryLongPants,
	"polo":          models.CategoryPolo,
	"shirt":         models.CategoryShirt,
	"shorts":        models.CategoryShorts,
	"skirt":         models.CategorySkirt,
	"sports jacket": models.CategorySportsJacket,
	"sweater":       models.CategorySweater,
	"t-shirt":       models.CategoryTShirt,
	// Shoes mappings
	"sneakers": models.CategoryShoes,
	"shoes":    models.CategoryShoes,
	"boots":    models.CategoryShoes,
	"sandals":  models.CategoryShoes,
	"loafers":  models.CategoryShoes,
}

// titleKeywords maps product title keywords to categories
// Used for hybrid classification combining AI + title analysis
// Only EXPLICIT keywords - if title is abstract, let AI decide
// Includes both English and French keywords
var titleKeywords = map[string]models.Category{
	// Shorts - high priority (often misclassified)
	"short":  models.CategoryShorts,
	"shorts": models.CategoryShorts,
	"jort":   models.CategoryShorts,
	"jorts":  models.CategoryShorts,

	// Jackets (coat merged into jacket)
	"jacket":      models.CategoryJacket,
	"windbreaker": models.CategoryJacket,
	"bomber":      models.CategoryJacket,
	"puffer":      models.CategoryJacket,
	"coat":        models.CategoryJacket,
	"blazer":      models.CategoryJacket,
	"fleece":      models.CategoryJacket,
	"polar":       models.CategoryJacket,
	// French
	"veste":      models.CategoryJacket,
	"manteau":    models.CategoryJacket,
	"blouson":    models.CategoryJacket,
	"doudoune":   models.CategoryJacket,
	"coupe-vent": models.CategoryJacket,

	// Tops - explicit keywords only
	"t-shirt":    models.CategoryTShirt,
	"tee":        models.CategoryTShirt,
	"tshirt":     models.CategoryTShirt,
	"longsleeve": models.CategoryTShirt,
	"hoodie":     models.CategoryHoodie,
	"hoodies":    models.CategoryHoodie,
	"crewneck":   models.CategorySweater,
	"sweater":    models.CategorySweater,
	"knit":       models.CategorySweater,
	"knitwear":   models.CategorySweater,
	"mohair":     models.CategorySweater,
	"polo":       models.CategoryPolo,
	"shirt":      models.CategoryShirt,
	// French
	"sweat":    models.CategorySweater,
	"pull":     models.CategorySweater,
	"tricot":   models.CategorySweater,
	"maille":   models.CategorySweater,
	"chemise":  models.CategoryShirt,
	"debardeur": models.CategoryTShirt,

	// Pants
	"jeans":   models.CategoryJeans,
	"denim":   models.CategoryJeans,
	"baggy":   models.CategoryJeans,
	"pants":   models.CategoryLongPants,
	"pant":    models.CategoryLongPants,
	"jogger":  models.CategoryLongPants,
	"joggers": models.CategoryLongPants,
	"cargo":   models.CategoryLongPants,
	"trouser": models.CategoryLongPants,
	// French
	"pantalon":  models.CategoryLongPants,
	"jogging":   models.CategoryLongPants,
	"survetement": models.CategoryLongPants,

	// Dresses/Skirts
	"dress":   models.CategoryDresses,
	"dresses": models.CategoryDresses,
	"skirt":   models.CategorySkirt,
	// French
	"robe":  models.CategoryDresses,
	"jupe":  models.CategorySkirt,

	// Accessories - IMPORTANT: casquette must be here!
	"bag":       models.CategoryAccessories,
	"backpack":  models.CategoryAccessories,
	"socks":     models.CategoryAccessories,
	"sock":      models.CategoryAccessories,
	"belt":      models.CategoryAccessories,
	"hat":       models.CategoryAccessories,
	"cap":       models.CategoryAccessories,
	"beanie":    models.CategoryAccessories,
	"balaclava": models.CategoryAccessories,
	"scarf":     models.CategoryAccessories,
	"gloves":    models.CategoryAccessories,
	"wallet":    models.CategoryAccessories,
	"necklace":  models.CategoryAccessories,
	"bracelet":  models.CategoryAccessories,
	"ring":      models.CategoryAccessories,
	"pendant":   models.CategoryAccessories,
	"jewelry":   models.CategoryAccessories,
	"keychain":  models.CategoryAccessories,
	"towel":     models.CategoryAccessories,
	"flask":     models.CategoryAccessories,
	"ashtray":   models.CategoryAccessories,
	// French accessories
	"casquette":  models.CategoryAccessories,
	"chapeau":    models.CategoryAccessories,
	"bonnet":     models.CategoryAccessories,
	"cagoule":    models.CategoryAccessories,
	"echarpe":    models.CategoryAccessories,
	"foulard":    models.CategoryAccessories,
	"gants":      models.CategoryAccessories,
	"ceinture":   models.CategoryAccessories,
	"sac":        models.CategoryAccessories,
	"sacoche":    models.CategoryAccessories,
	"collier":    models.CategoryAccessories,
	"bague":      models.CategoryAccessories,
	"bijoux":     models.CategoryAccessories,
	"chaussettes": models.CategoryAccessories,
	"portefeuille": models.CategoryAccessories,

	// Footwear → Shoes
	"boots":     models.CategoryShoes,
	"sneakers":  models.CategoryShoes,
	"shoes":     models.CategoryShoes,
	"sandals":   models.CategoryShoes,
	"loafers":   models.CategoryShoes,
	"muzzle":    models.CategoryShoes, // Davril Supply shoe line
	"amaryllis": models.CategoryShoes, // Davril Supply shoe line
	// French
	"chaussures": models.CategoryShoes,
	"baskets":    models.CategoryShoes,
	"bottes":     models.CategoryShoes,
	"mocassins":  models.CategoryShoes,
}

// highPriorityKeywords override AI classification when found in title
// These are explicit clothing terms that should always be trusted
// Includes both English and French keywords
var highPriorityKeywords = map[string]bool{
	// Explicit clothing types - always trust these
	"short":       true,
	"shorts":      true,
	"jort":        true,
	"jorts":       true,
	"jacket":      true,
	"coat":        true,
	"puffer":      true,
	"pants":       true,
	"pant":        true,
	"jogger":      true,
	"joggers":     true,
	"dress":       true,
	"skirt":       true,
	"windbreaker": true,
	"polar":       true,
	"fleece":      true,
	"t-shirt":     true,
	"tee":         true,
	"hoodie":      true,
	"longsleeve":  true,
	"crewneck":    true,
	"sweater":     true,
	"knitwear":    true,
	"polo":        true,
	"shirt":       true,
	// French clothing
	"veste":       true,
	"manteau":     true,
	"blouson":     true,
	"doudoune":    true,
	"pantalon":    true,
	"jogging":     true,
	"robe":        true,
	"jupe":        true,
	"chemise":     true,
	"pull":        true,
	"sweat":       true,
	// Accessories - high priority
	"bag":       true,
	"backpack":  true,
	"socks":     true,
	"belt":      true,
	"hat":       true,
	"cap":       true,
	"beanie":    true,
	"balaclava": true,
	"scarf":     true,
	"gloves":    true,
	"wallet":    true,
	"necklace":  true,
	"bracelet":  true,
	"ring":      true,
	"pendant":   true,
	"keychain":  true,
	// French accessories - CRITICAL for casquette!
	"casquette":   true,
	"chapeau":     true,
	"bonnet":      true,
	"cagoule":     true,
	"echarpe":     true,
	"gants":       true,
	"ceinture":    true,
	"sac":         true,
	"sacoche":     true,
	"collier":     true,
	"bague":       true,
	"chaussettes": true,
	// Footwear
	"boots":      true,
	"sneakers":   true,
	"shoes":      true,
	"chaussures": true,
	"baskets":    true,
	"bottes":     true,
}

// ClassifyWithTitle performs hybrid classification using both image AI and product title
func (c *FashionCLIPClient) ClassifyWithTitle(ctx context.Context, imageURL string, productTitle string) (*models.ClassificationResult, error) {
	// First, get AI classification from image
	result, err := c.Classify(ctx, imageURL)
	if err != nil {
		return nil, err
	}

	// Analyze the product title for category hints
	titleCategory, titleConfidence := c.analyzeTitle(productTitle)

	// Decide final category based on both signals
	finalCategory := c.decideCategory(result.Category, result.CategoryScore, titleCategory, titleConfidence, productTitle)

	if finalCategory != result.Category {
		c.logger.Info("Category overridden by title analysis",
			zap.String("title", productTitle),
			zap.String("ai_category", string(result.Category)),
			zap.Float64("ai_score", result.CategoryScore),
			zap.String("title_category", string(titleCategory)),
			zap.Float64("title_confidence", titleConfidence),
			zap.String("final_category", string(finalCategory)))
		result.Category = finalCategory
	}

	return result, nil
}

// analyzeTitle extracts category hints from product title
func (c *FashionCLIPClient) analyzeTitle(title string) (models.Category, float64) {
	titleLower := strings.ToLower(title)
	words := strings.Fields(titleLower)

	// Check for exact word matches first (higher confidence)
	for _, word := range words {
		// Clean punctuation
		word = strings.Trim(word, ".,!?-_")
		if cat, ok := titleKeywords[word]; ok {
			confidence := 0.9
			if highPriorityKeywords[word] {
				confidence = 0.95
			}
			return cat, confidence
		}
	}

	// Check for substring matches (lower confidence)
	for keyword, cat := range titleKeywords {
		if strings.Contains(titleLower, keyword) {
			confidence := 0.7
			if highPriorityKeywords[keyword] {
				confidence = 0.85
			}
			return cat, confidence
		}
	}

	return "", 0
}

// decideCategory combines AI and title analysis to determine final category
// Strategy: If title has EXPLICIT keywords, trust them. If title is abstract, trust AI.
func (c *FashionCLIPClient) decideCategory(
	aiCategory models.Category, aiScore float64,
	titleCategory models.Category, titleConfidence float64,
	productTitle string,
) models.Category {
	titleLower := strings.ToLower(productTitle)

	// PRIORITY 1: Check for explicit clothing keywords in title
	// These should ALWAYS override AI because they're unambiguous

	// 1. ACCESSORIES: Always override - very explicit (English + French)
	accessoryKeywords := []string{
		// English
		"bag", "backpack", "socks", "sock", "belt", "hat", "cap", "beanie",
		"balaclava", "scarf", "gloves", "wallet", "necklace", "bracelet", "ring", "pendant",
		"jewelry", "keychain", "towel", "flask", "ashtray",
		// French
		"casquette", "chapeau", "bonnet", "cagoule", "echarpe", "foulard", "gants",
		"ceinture", "sac", "sacoche", "collier", "bague", "bijoux", "chaussettes", "portefeuille",
	}
	for _, kw := range accessoryKeywords {
		if strings.Contains(titleLower, kw) {
			return models.CategoryAccessories
		}
	}

	// 2. SHOES: Always override (English + French)
	footwearKeywords := []string{
		"boots", "sneakers", "shoes", "sandals", "loafers", "muzzle", "amaryllis",
		// French
		"chaussures", "baskets", "bottes", "mocassins",
	}
	for _, kw := range footwearKeywords {
		if strings.Contains(titleLower, kw) {
			return models.CategoryShoes
		}
	}

	// 3. SHORTS: If title says "short/shorts/jort", always use shorts
	if strings.Contains(titleLower, "short") || strings.Contains(titleLower, "jort") {
		if !strings.Contains(titleLower, "sleeve") {
			return models.CategoryShorts
		}
	}

	// 4. EXPLICIT TOPS
	// T-shirt, tee, longsleeve
	if strings.Contains(titleLower, "t-shirt") || strings.Contains(titleLower, "tshirt") ||
		strings.Contains(titleLower, "longsleeve") {
		return models.CategoryTShirt
	}
	// Check for "tee" as separate word (not part of another word like "street")
	words := strings.Fields(titleLower)
	for _, word := range words {
		if word == "tee" {
			return models.CategoryTShirt
		}
	}

	// Hoodie (explicit)
	if strings.Contains(titleLower, "hoodie") {
		return models.CategoryHoodie
	}

	// Crewneck, sweater, knitwear, mohair → Sweater
	if strings.Contains(titleLower, "crewneck") || strings.Contains(titleLower, "sweater") ||
		strings.Contains(titleLower, "knitwear") || strings.Contains(titleLower, "mohair") {
		return models.CategorySweater
	}

	// Polo
	if strings.Contains(titleLower, "polo") {
		return models.CategoryPolo
	}

	// Shirt (but not t-shirt)
	for _, word := range words {
		if word == "shirt" {
			return models.CategoryShirt
		}
	}

	// 5. KNIT → Sweater (check BEFORE jackets to handle "coat-of-arms knit")
	if strings.Contains(titleLower, "knit") {
		return models.CategorySweater
	}

	// 6. JACKETS: "jacket", "puffer", "windbreaker", "bomber", "polar", "fleece"
	// Note: "coat" must be checked as whole word to avoid "coat-of-arms"
	jacketKeywords := []string{"jacket", "puffer", "windbreaker", "bomber", "polar", "fleece"}
	for _, kw := range jacketKeywords {
		if strings.Contains(titleLower, kw) {
			return models.CategoryJacket
		}
	}
	// Check "coat" as whole word only
	for _, word := range words {
		if word == "coat" {
			return models.CategoryJacket
		}
	}

	// 7. PANTS: explicit pants keywords
	pantsKeywords := []string{"pants", "pant", "jogger", "joggers", "cargo", "trouser", "baggy"}
	for _, kw := range pantsKeywords {
		if strings.Contains(titleLower, kw) {
			return models.CategoryLongPants
		}
	}

	// 8. JEANS/DENIM
	if strings.Contains(titleLower, "jeans") || strings.Contains(titleLower, "denim") {
		// "denim jacket" should be jacket, not jeans
		if !strings.Contains(titleLower, "jacket") {
			return models.CategoryJeans
		}
	}

	// 9. ZIP handling - special logic
	// "zip jacket" → Jacket
	// "zip" alone (no other keyword) → Hoodie (zip hoodie)
	if strings.Contains(titleLower, "zip") {
		// Check if "jacket" is also in the title
		if strings.Contains(titleLower, "jacket") {
			return models.CategoryJacket
		}
		// Check if any other explicit keyword exists
		hasExplicitKeyword := false
		for kw := range highPriorityKeywords {
			if kw != "zip" && strings.Contains(titleLower, kw) {
				hasExplicitKeyword = true
				break
			}
		}
		// "zip" alone = hoodie (pull zippé)
		if !hasExplicitKeyword {
			return models.CategoryHoodie
		}
	}

	// 10. DRESSES/SKIRTS
	if strings.Contains(titleLower, "dress") {
		return models.CategoryDresses
	}
	if strings.Contains(titleLower, "skirt") {
		return models.CategorySkirt
	}

	// PRIORITY 2: If no explicit keyword found, trust AI
	// The title is abstract (e.g., "BRUTAL SUPPLY", "DARKNESS", "SOLAR RED")
	return aiCategory
}

// mapCategoryPredictions converts predictions to category
// Direct mapping from HuggingFace model output to database category
func (c *FashionCLIPClient) mapCategoryPredictions(preds []Prediction) (models.Category, models.SubCategory, float64, float64) {
	if len(preds) == 0 {
		return models.CategoryTShirt, "", 0, 0
	}

	// Sort by score
	sort.Slice(preds, func(i, j int) bool {
		return preds[i].Score > preds[j].Score
	})

	top := preds[0]
	label := strings.ToLower(top.Name)

	// Direct lookup from HuggingFace label
	if cat, ok := hfLabelToCategory[label]; ok {
		return cat, "", top.Score, top.Score
	}

	// Fallback: try partial matching for edge cases
	for hfLabel, cat := range hfLabelToCategory {
		if strings.Contains(label, hfLabel) || strings.Contains(hfLabel, label) {
			return cat, "", top.Score, top.Score
		}
	}

	// Default fallback
	c.logger.Warn("Unknown label from model, defaulting to t-shirt", zap.String("label", label))
	return models.CategoryTShirt, "", top.Score, top.Score
}

func (c *FashionCLIPClient) mapGenderPredictions(preds []Prediction) (models.Gender, float64) {
	if len(preds) == 0 {
		return models.GenderUnisex, 0
	}

	sort.Slice(preds, func(i, j int) bool {
		return preds[i].Score > preds[j].Score
	})

	top := preds[0]
	label := strings.ToLower(top.Name)

	switch {
	case strings.Contains(label, "men"):
		return models.GenderMale, top.Score
	case strings.Contains(label, "women"):
		return models.GenderFemale, top.Score
	case strings.Contains(label, "kid") || strings.Contains(label, "child"):
		return models.GenderKids, top.Score
	default:
		return models.GenderUnisex, top.Score
	}
}

func (c *FashionCLIPClient) mapStylePredictions(preds []Prediction) (models.Style, float64) {
	if len(preds) == 0 {
		return models.StyleCasual, 0
	}

	sort.Slice(preds, func(i, j int) bool {
		return preds[i].Score > preds[j].Score
	})

	top := preds[0]
	label := strings.ToLower(top.Name)

	switch {
	case strings.Contains(label, "casual"):
		return models.StyleCasual, top.Score
	case strings.Contains(label, "formal"):
		return models.StyleFormal, top.Score
	case strings.Contains(label, "sport") || strings.Contains(label, "athletic"):
		return models.StyleSport, top.Score
	case strings.Contains(label, "street"):
		return models.StyleStreetwear, top.Score
	case strings.Contains(label, "vintage"):
		return models.StyleVintage, top.Score
	case strings.Contains(label, "minimal"):
		return models.StyleMinimalist, top.Score
	default:
		return models.StyleCasual, top.Score
	}
}

func (c *FashionCLIPClient) mapSeasonPredictions(preds []Prediction) (models.Season, float64) {
	if len(preds) == 0 {
		return models.SeasonAllSeason, 0
	}

	sort.Slice(preds, func(i, j int) bool {
		return preds[i].Score > preds[j].Score
	})

	top := preds[0]
	label := strings.ToLower(top.Name)

	switch {
	case strings.Contains(label, "summer"):
		return models.SeasonSummer, top.Score
	case strings.Contains(label, "winter"):
		return models.SeasonWinter, top.Score
	case strings.Contains(label, "spring") || strings.Contains(label, "fall") || strings.Contains(label, "mid"):
		return models.SeasonMidSeason, top.Score
	default:
		return models.SeasonAllSeason, top.Score
	}
}

func (c *FashionCLIPClient) mapColorPredictions(preds []Prediction) (string, string, string) {
	if len(preds) == 0 {
		return "", "", ""
	}

	sort.Slice(preds, func(i, j int) bool {
		return preds[i].Score > preds[j].Score
	})

	var primary, secondary, tertiary string

	if len(preds) > 0 && preds[0].Score > 0.1 {
		primary = preds[0].Name
	}
	if len(preds) > 1 && preds[1].Score > 0.1 {
		secondary = preds[1].Name
	}
	if len(preds) > 2 && preds[2].Score > 0.1 {
		tertiary = preds[2].Name
	}

	return primary, secondary, tertiary
}

// HealthCheck verifies the model service is running
func (c *FashionCLIPClient) HealthCheck(ctx context.Context) error {
	req, err := http.NewRequestWithContext(ctx, "GET", c.baseURL+"/health", nil)
	if err != nil {
		return err
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("model service unhealthy: %d", resp.StatusCode)
	}

	return nil
}
