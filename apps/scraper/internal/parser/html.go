package parser

import (
	"encoding/json"
	"fmt"
	"strings"

	"indie-marketplace/scraper/pkg/models"

	"github.com/PuerkitoBio/goquery"
)

// HTMLParser handles parsing of Shopify HTML pages
type HTMLParser struct{}

// NewHTMLParser creates a new HTML parser
func NewHTMLParser() *HTMLParser {
	return &HTMLParser{}
}

// ParseProductPage extracts product data from an HTML page
// This is a fallback for stores that block the JSON API
func (p *HTMLParser) ParseProductPage(html string) (*models.ShopifyProduct, error) {
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(html))
	if err != nil {
		return nil, fmt.Errorf("failed to parse HTML: %w", err)
	}

	// Try to find JSON-LD data first (most reliable)
	var product *models.ShopifyProduct

	doc.Find("script[type='application/ld+json']").Each(func(i int, s *goquery.Selection) {
		if product != nil {
			return
		}

		var data map[string]interface{}
		if err := json.Unmarshal([]byte(s.Text()), &data); err != nil {
			return
		}

		// Check if this is a Product schema
		if data["@type"] == "Product" {
			product = p.parseJSONLD(data)
		}
	})

	if product != nil {
		return product, nil
	}

	// Fallback: try to find the Shopify product JSON in a script tag
	doc.Find("script").Each(func(i int, s *goquery.Selection) {
		if product != nil {
			return
		}

		text := s.Text()
		if strings.Contains(text, "var meta = ") && strings.Contains(text, "\"product\":") {
			// Extract the product JSON
			start := strings.Index(text, "\"product\":")
			if start == -1 {
				return
			}

			// Find the JSON object
			jsonStr := extractJSONObject(text[start+10:])
			if jsonStr == "" {
				return
			}

			var sp models.ShopifyProduct
			if err := json.Unmarshal([]byte(jsonStr), &sp); err == nil {
				product = &sp
			}
		}
	})

	if product != nil {
		return product, nil
	}

	return nil, fmt.Errorf("could not extract product data from HTML")
}

// parseJSONLD converts JSON-LD data to a ShopifyProduct
func (p *HTMLParser) parseJSONLD(data map[string]interface{}) *models.ShopifyProduct {
	product := &models.ShopifyProduct{}

	if name, ok := data["name"].(string); ok {
		product.Title = name
	}

	if desc, ok := data["description"].(string); ok {
		product.BodyHTML = desc
	}

	if brand, ok := data["brand"].(map[string]interface{}); ok {
		if name, ok := brand["name"].(string); ok {
			product.Vendor = name
		}
	}

	// Parse offers
	if offers, ok := data["offers"].([]interface{}); ok && len(offers) > 0 {
		for _, offer := range offers {
			if o, ok := offer.(map[string]interface{}); ok {
				variant := models.ShopifyVariant{}

				if price, ok := o["price"].(string); ok {
					variant.Price = price
				} else if price, ok := o["price"].(float64); ok {
					variant.Price = fmt.Sprintf("%.2f", price)
				}

				if sku, ok := o["sku"].(string); ok {
					variant.SKU = sku
				}

				if availability, ok := o["availability"].(string); ok {
					variant.Available = strings.Contains(availability, "InStock")
				}

				product.Variants = append(product.Variants, variant)
			}
		}
	}

	// Parse images
	if images, ok := data["image"].([]interface{}); ok {
		for i, img := range images {
			if src, ok := img.(string); ok {
				product.Images = append(product.Images, models.ShopifyImage{
					Src:      src,
					Position: i,
				})
			}
		}
	} else if img, ok := data["image"].(string); ok {
		product.Images = append(product.Images, models.ShopifyImage{
			Src:      img,
			Position: 0,
		})
	}

	return product
}

// extractJSONObject extracts a JSON object from a string starting at position 0
func extractJSONObject(s string) string {
	s = strings.TrimSpace(s)
	if len(s) == 0 || s[0] != '{' {
		return ""
	}

	depth := 0
	inString := false
	escape := false

	for i, c := range s {
		if escape {
			escape = false
			continue
		}

		if c == '\\' && inString {
			escape = true
			continue
		}

		if c == '"' {
			inString = !inString
			continue
		}

		if inString {
			continue
		}

		if c == '{' {
			depth++
		} else if c == '}' {
			depth--
			if depth == 0 {
				return s[:i+1]
			}
		}
	}

	return ""
}

// ParseCollectionPage extracts product handles from a collection page
func (p *HTMLParser) ParseCollectionPage(html string) ([]string, error) {
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(html))
	if err != nil {
		return nil, fmt.Errorf("failed to parse HTML: %w", err)
	}

	var handles []string

	// Common patterns for product links in Shopify themes
	selectors := []string{
		"a[href*='/products/']",
		".product-card a",
		".product-item a",
		".grid__item a[href*='/products/']",
	}

	for _, selector := range selectors {
		doc.Find(selector).Each(func(i int, s *goquery.Selection) {
			href, exists := s.Attr("href")
			if !exists {
				return
			}

			// Extract handle from URL
			if strings.Contains(href, "/products/") {
				parts := strings.Split(href, "/products/")
				if len(parts) > 1 {
					handle := strings.Split(parts[1], "?")[0]
					handle = strings.Split(handle, "#")[0]
					handle = strings.TrimSuffix(handle, "/")

					if handle != "" && !contains(handles, handle) {
						handles = append(handles, handle)
					}
				}
			}
		})

		if len(handles) > 0 {
			break
		}
	}

	return handles, nil
}

func contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}
