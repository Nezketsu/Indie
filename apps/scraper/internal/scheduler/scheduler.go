package scheduler

import (
	"context"
	"sync"
	"time"

	"indie-marketplace/scraper/internal/shopify"
	"indie-marketplace/scraper/internal/storage"
	"indie-marketplace/scraper/pkg/models"

	"github.com/robfig/cron/v3"
	"go.uber.org/zap"
)

// Scheduler manages periodic scraping tasks
type Scheduler struct {
	db           *storage.DB
	logger       *zap.SugaredLogger
	cron         *cron.Cron
	client       *shopify.Client
	maxWorkers   int
	syncInterval string
}

// New creates a new scheduler
func New(db *storage.DB, logger *zap.SugaredLogger) *Scheduler {
	return &Scheduler{
		db:           db,
		logger:       logger,
		cron:         cron.New(cron.WithSeconds()),
		client:       shopify.NewClient(shopify.DefaultConfig()),
		maxWorkers:   3, // Max concurrent brands being scraped
		syncInterval: "0 0 */6 * * *", // Every 6 hours
	}
}

// Start starts the scheduler
func (s *Scheduler) Start() {
	// Add the sync job
	_, err := s.cron.AddFunc(s.syncInterval, func() {
		s.runSync()
	})
	if err != nil {
		s.logger.Errorf("Failed to add cron job: %v", err)
		return
	}

	s.cron.Start()

	// Run initial sync
	go s.runSync()
}

// Stop stops the scheduler
func (s *Scheduler) Stop() {
	ctx := s.cron.Stop()
	<-ctx.Done()
}

// runSync runs the synchronization for all active brands
func (s *Scheduler) runSync() {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Hour)
	defer cancel()

	s.logger.Info("Starting sync for all brands")

	brands, err := s.db.GetActiveBrands(ctx)
	if err != nil {
		s.logger.Errorf("Failed to get active brands: %v", err)
		return
	}

	if len(brands) == 0 {
		s.logger.Info("No active brands to sync")
		return
	}

	s.logger.Infof("Found %d active brands to sync", len(brands))

	// Create a worker pool
	jobs := make(chan models.Brand, len(brands))
	results := make(chan models.SyncResult, len(brands))

	var wg sync.WaitGroup

	// Start workers
	for i := 0; i < s.maxWorkers; i++ {
		wg.Add(1)
		go func(workerID int) {
			defer wg.Done()
			for brand := range jobs {
				s.logger.Infof("[Worker %d] Syncing brand: %s", workerID, brand.Name)
				result := s.syncBrand(ctx, brand)
				results <- result
			}
		}(i)
	}

	// Send jobs
	for _, brand := range brands {
		jobs <- brand
	}
	close(jobs)

	// Wait for all workers to finish
	go func() {
		wg.Wait()
		close(results)
	}()

	// Collect results
	var totalCreated, totalUpdated, totalFound int
	var errors []string

	for result := range results {
		totalFound += result.ProductsFound
		totalCreated += result.ProductsCreated
		totalUpdated += result.ProductsUpdated
		if result.Error != nil {
			errors = append(errors, result.Error.Error())
		}
	}

	s.logger.Infof("Sync completed. Found: %d, Created: %d, Updated: %d, Errors: %d",
		totalFound, totalCreated, totalUpdated, len(errors))
}

// syncBrand syncs a single brand
func (s *Scheduler) syncBrand(ctx context.Context, brand models.Brand) models.SyncResult {
	result := models.SyncResult{BrandID: brand.ID}

	// Create sync log
	logID, err := s.db.CreateSyncLog(ctx, brand.ID, "running")
	if err != nil {
		s.logger.Errorf("Failed to create sync log for %s: %v", brand.Name, err)
	}

	// Fetch products from Shopify
	products, err := s.client.FetchProducts(ctx, brand.ShopifyDomain)
	if err != nil {
		result.Error = err
		s.logger.Errorf("Failed to fetch products for %s: %v", brand.Name, err)
		if logID != "" {
			s.db.UpdateSyncLog(ctx, logID, result)
		}
		return result
	}

	result.ProductsFound = len(products)
	s.logger.Infof("Fetched %d products for %s", len(products), brand.Name)

	// Upsert each product
	for _, p := range products {
		created, err := s.db.UpsertProduct(ctx, brand.ID, p)
		if err != nil {
			s.logger.Errorf("Failed to upsert product %s: %v", p.Title, err)
			continue
		}
		if created {
			result.ProductsCreated++
		} else {
			result.ProductsUpdated++
		}
	}

	// Update brand's last synced timestamp
	if err := s.db.UpdateBrandLastSyncedAt(ctx, brand.ID); err != nil {
		s.logger.Errorf("Failed to update last synced at for %s: %v", brand.Name, err)
	}

	// Update sync log
	if logID != "" {
		s.db.UpdateSyncLog(ctx, logID, result)
	}

	s.logger.Infof("Completed sync for %s. Created: %d, Updated: %d",
		brand.Name, result.ProductsCreated, result.ProductsUpdated)

	return result
}

// SyncBrandNow triggers an immediate sync for a specific brand
func (s *Scheduler) SyncBrandNow(ctx context.Context, brandID string) (models.SyncResult, error) {
	brands, err := s.db.GetActiveBrands(ctx)
	if err != nil {
		return models.SyncResult{}, err
	}

	for _, brand := range brands {
		if brand.ID == brandID {
			return s.syncBrand(ctx, brand), nil
		}
	}

	return models.SyncResult{}, nil
}

// RunSyncNow triggers an immediate sync for all brands (used for one-shot mode)
func (s *Scheduler) RunSyncNow() {
	s.runSync()
}
