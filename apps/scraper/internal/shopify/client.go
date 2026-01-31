package shopify

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"indie-marketplace/scraper/pkg/models"

	"golang.org/x/time/rate"
)

// Config holds the configuration for the Shopify client
type Config struct {
	UserAgent      string
	RequestDelay   time.Duration
	MaxRetries     int
	RequestTimeout time.Duration
}

// DefaultConfig returns the default configuration
func DefaultConfig() Config {
	return Config{
		UserAgent:      "IndieMarketBot/1.0 (+https://indiemarket.com/bot)",
		RequestDelay:   1 * time.Second,
		MaxRetries:     3,
		RequestTimeout: 30 * time.Second,
	}
}

// Client is a Shopify API client
type Client struct {
	httpClient  *http.Client
	rateLimiter *rate.Limiter
	config      Config
}

// NewClient creates a new Shopify client
func NewClient(config Config) *Client {
	return &Client{
		httpClient: &http.Client{
			Timeout: config.RequestTimeout,
		},
		// Allow 1 request per second with burst of 1
		rateLimiter: rate.NewLimiter(rate.Every(config.RequestDelay), 1),
		config:      config,
	}
}

// FetchProducts fetches all products from a Shopify store
func (c *Client) FetchProducts(ctx context.Context, domain string) ([]models.ShopifyProduct, error) {
	var allProducts []models.ShopifyProduct
	page := 1
	limit := 250 // Shopify's max limit

	for {
		// Wait for rate limiter
		if err := c.rateLimiter.Wait(ctx); err != nil {
			return nil, fmt.Errorf("rate limiter error: %w", err)
		}

		url := fmt.Sprintf("https://%s/products.json?limit=%d&page=%d", domain, limit, page)

		products, err := c.fetchProductsPage(ctx, url)
		if err != nil {
			return nil, fmt.Errorf("failed to fetch page %d: %w", page, err)
		}

		if len(products) == 0 {
			break
		}

		allProducts = append(allProducts, products...)

		// If we got fewer products than the limit, we've reached the end
		if len(products) < limit {
			break
		}

		page++
	}

	return allProducts, nil
}

func (c *Client) fetchProductsPage(ctx context.Context, url string) ([]models.ShopifyProduct, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("User-Agent", c.config.UserAgent)
	req.Header.Set("Accept", "application/json")

	var resp *http.Response
	var lastErr error

	// Retry logic with exponential backoff
	for attempt := 0; attempt <= c.config.MaxRetries; attempt++ {
		if attempt > 0 {
			backoff := time.Duration(attempt*attempt) * time.Second
			select {
			case <-ctx.Done():
				return nil, ctx.Err()
			case <-time.After(backoff):
			}
		}

		resp, lastErr = c.httpClient.Do(req)
		if lastErr != nil {
			continue
		}

		// Check for rate limiting or server errors
		if resp.StatusCode == 429 || resp.StatusCode >= 500 {
			resp.Body.Close()
			lastErr = fmt.Errorf("received status code %d", resp.StatusCode)
			continue
		}

		break
	}

	if lastErr != nil {
		return nil, fmt.Errorf("all retries failed: %w", lastErr)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("unexpected status code: %d", resp.StatusCode)
	}

	var result models.ShopifyProductsResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return result.Products, nil
}
