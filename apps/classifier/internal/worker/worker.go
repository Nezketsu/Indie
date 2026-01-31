package worker

import (
	"context"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/indie/classifier/internal/classifier"
	"github.com/indie/classifier/internal/config"
	"github.com/indie/classifier/internal/models"
	"github.com/indie/classifier/internal/queue"
	"go.uber.org/zap"
	"golang.org/x/sync/errgroup"
)

// Worker processes classification jobs from the queue
type Worker struct {
	id              string
	cfg             *config.Config
	queue           *queue.RedisQueue
	classifier      *classifier.FashionCLIPClient
	db              Database
	logger          *zap.Logger
	stopCh          chan struct{}
	wg              sync.WaitGroup
	isRunning       bool
	mu              sync.RWMutex
	processedCount  int64
	failedCount     int64
}

// Database interface for storing results
type Database interface {
	SaveClassification(ctx context.Context, result *models.ClassificationResult) error
	UpdateProductClassification(ctx context.Context, productID uuid.UUID, result *models.ClassificationResult) error
	GetProductByID(ctx context.Context, productID uuid.UUID) (*Product, error)
}

type Product struct {
	ID       uuid.UUID
	Title    string
	ImageURL string
}

// NewWorker creates a new classification worker
func NewWorker(
	cfg *config.Config,
	q *queue.RedisQueue,
	clf *classifier.FashionCLIPClient,
	db Database,
	logger *zap.Logger,
) *Worker {
	return &Worker{
		id:         uuid.New().String()[:8],
		cfg:        cfg,
		queue:      q,
		classifier: clf,
		db:         db,
		logger:     logger.With(zap.String("worker_id", uuid.New().String()[:8])),
		stopCh:     make(chan struct{}),
	}
}

// Start begins processing jobs
func (w *Worker) Start(ctx context.Context) error {
	w.mu.Lock()
	if w.isRunning {
		w.mu.Unlock()
		return nil
	}
	w.isRunning = true
	w.mu.Unlock()

	w.logger.Info("Starting worker", zap.Int("num_goroutines", w.cfg.WorkerCount))

	// Start recovery routine for stale jobs
	w.wg.Add(1)
	go w.recoveryRoutine(ctx)

	// Start worker goroutines
	g, gCtx := errgroup.WithContext(ctx)
	for i := 0; i < w.cfg.WorkerCount; i++ {
		workerNum := i
		g.Go(func() error {
			return w.processLoop(gCtx, workerNum)
		})
	}

	// Wait for all workers to finish
	if err := g.Wait(); err != nil {
		w.logger.Error("Worker error", zap.Error(err))
		return err
	}

	return nil
}

// Stop gracefully stops the worker
func (w *Worker) Stop() {
	w.mu.Lock()
	defer w.mu.Unlock()

	if !w.isRunning {
		return
	}

	w.logger.Info("Stopping worker...")
	close(w.stopCh)
	w.wg.Wait()
	w.isRunning = false
	w.logger.Info("Worker stopped")
}

// processLoop continuously processes jobs
func (w *Worker) processLoop(ctx context.Context, workerNum int) error {
	logger := w.logger.With(zap.Int("goroutine", workerNum))
	logger.Info("Worker goroutine started")

	for {
		select {
		case <-ctx.Done():
			logger.Info("Worker goroutine stopping")
			return ctx.Err()
		case <-w.stopCh:
			logger.Info("Worker goroutine stopping")
			return nil
		default:
			if err := w.processOne(ctx, logger); err != nil {
				logger.Error("Error processing job", zap.Error(err))
				time.Sleep(time.Second) // Brief pause on error
			}
		}
	}
}

// processOne processes a single job from the queue
func (w *Worker) processOne(ctx context.Context, logger *zap.Logger) error {
	// Get job from queue
	job, err := w.queue.Dequeue(ctx)
	if err != nil {
		return err
	}

	if job == nil {
		// Queue empty, wait before checking again
		time.Sleep(100 * time.Millisecond)
		return nil
	}

	logger = logger.With(
		zap.String("job_id", job.ID),
		zap.String("product_id", job.ProductID),
	)

	logger.Debug("Processing job")
	startTime := time.Now()

	// Check cache first
	if cached, found := w.queue.GetCachedResult(ctx, job.ImageURL); found {
		logger.Debug("Cache hit, using cached result")
		cached.ProductID = uuid.MustParse(job.ProductID)
		if err := w.saveResult(ctx, job, cached); err != nil {
			return err
		}
		w.queue.Complete(ctx, job)
		return nil
	}

	// Acquire lock to prevent duplicate processing
	locked, err := w.queue.AcquireLock(ctx, job.ProductID)
	if err != nil {
		return err
	}
	if !locked {
		logger.Debug("Job already being processed")
		return nil
	}
	defer w.queue.ReleaseLock(ctx, job.ProductID)

	// Create timeout context
	classifyCtx, cancel := context.WithTimeout(ctx, w.cfg.ProcessingTimeout)
	defer cancel()

	// Get product title for hybrid classification
	productTitle := ""
	productID, parseErr := uuid.Parse(job.ProductID)
	if parseErr == nil {
		if product, prodErr := w.db.GetProductByID(ctx, productID); prodErr == nil && product != nil {
			productTitle = product.Title
		}
	}

	// Classify the image with title-based hybrid approach
	var result *models.ClassificationResult
	var classifyErr error
	if productTitle != "" {
		result, classifyErr = w.classifier.ClassifyWithTitle(classifyCtx, job.ImageURL, productTitle)
	} else {
		result, classifyErr = w.classifier.Classify(classifyCtx, job.ImageURL)
	}
	if classifyErr != nil {
		logger.Error("Classification failed", zap.Error(classifyErr))
		w.queue.Fail(ctx, job, classifyErr.Error())
		w.incrementFailed()
		return nil // Don't return error to continue processing other jobs
	}

	// Set product ID
	result.ProductID = uuid.MustParse(job.ProductID)
	result.ID = uuid.New()

	// Check confidence threshold
	if result.OverallScore < w.cfg.ConfidenceThreshold {
		result.NeedsReview = true
		result.Status = models.StatusReview
		w.queue.SendToReview(ctx, job)
		logger.Info("Low confidence, sent to review",
			zap.Float64("confidence", result.OverallScore),
			zap.Float64("threshold", w.cfg.ConfidenceThreshold))
	} else {
		result.Status = models.StatusCompleted
	}

	// Save result
	if err := w.saveResult(ctx, job, result); err != nil {
		logger.Error("Failed to save result", zap.Error(err))
		w.queue.Fail(ctx, job, err.Error())
		return nil
	}

	// Cache result
	w.queue.CacheResult(ctx, job.ImageURL, result)

	// Mark job as complete
	w.queue.Complete(ctx, job)
	w.incrementProcessed()

	elapsed := time.Since(startTime)
	logger.Info("Job completed",
		zap.Duration("elapsed", elapsed),
		zap.String("category", string(result.Category)),
		zap.String("sub_category", string(result.SubCategory)),
		zap.Float64("confidence", result.OverallScore))

	return nil
}

// saveResult saves the classification result to the database
func (w *Worker) saveResult(ctx context.Context, job *models.ClassificationJob, result *models.ClassificationResult) error {
	// Save classification result
	if err := w.db.SaveClassification(ctx, result); err != nil {
		return err
	}

	// Update product with classification
	if err := w.db.UpdateProductClassification(ctx, result.ProductID, result); err != nil {
		return err
	}

	return nil
}

// recoveryRoutine periodically recovers stale jobs
func (w *Worker) recoveryRoutine(ctx context.Context) {
	defer w.wg.Done()

	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-w.stopCh:
			return
		case <-ticker.C:
			recovered, err := w.queue.RecoverStaleJobs(ctx)
			if err != nil {
				w.logger.Error("Failed to recover stale jobs", zap.Error(err))
			} else if recovered > 0 {
				w.logger.Info("Recovered stale jobs", zap.Int64("count", recovered))
			}
		}
	}
}

func (w *Worker) incrementProcessed() {
	w.mu.Lock()
	w.processedCount++
	w.mu.Unlock()
}

func (w *Worker) incrementFailed() {
	w.mu.Lock()
	w.failedCount++
	w.mu.Unlock()
}

// Stats returns worker statistics
func (w *Worker) Stats() (processed, failed int64) {
	w.mu.RLock()
	defer w.mu.RUnlock()
	return w.processedCount, w.failedCount
}
