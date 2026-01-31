package main

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/indie/classifier/internal/api"
	"github.com/indie/classifier/internal/classifier"
	"github.com/indie/classifier/internal/config"
	"github.com/indie/classifier/internal/models"
	"github.com/indie/classifier/internal/queue"
	"github.com/indie/classifier/internal/worker"
	"github.com/joho/godotenv"
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

func main() {
	// Load .env file if exists
	_ = godotenv.Load()

	// Initialize logger
	logger := initLogger()
	defer logger.Sync()

	// Load configuration
	cfg := config.Load()
	logger.Info("Configuration loaded",
		zap.String("server_port", cfg.ServerPort),
		zap.Int("worker_count", cfg.WorkerCount),
		zap.Float64("confidence_threshold", cfg.ConfidenceThreshold))

	// Initialize Redis queue
	redisQueue, err := queue.NewRedisQueue(cfg.RedisURL, cfg.RedisPassword, logger)
	if err != nil {
		logger.Fatal("Failed to initialize Redis", zap.Error(err))
	}
	defer redisQueue.Close()

	// Initialize PostgreSQL database
	db, err := api.NewPostgresDB(cfg.DatabaseURL, logger)
	if err != nil {
		logger.Fatal("Failed to initialize database", zap.Error(err))
	}
	defer db.Close()

	// Run database migrations
	ctx := context.Background()
	if err := db.RunMigrations(ctx); err != nil {
		logger.Fatal("Failed to run migrations", zap.Error(err))
	}

	// Initialize Fashion-CLIP client
	clipClient := classifier.NewFashionCLIPClient(cfg.ModelServiceURL, logger)

	// Health check the model service
	if err := clipClient.HealthCheck(ctx); err != nil {
		logger.Warn("Model service not available - workers will retry",
			zap.Error(err),
			zap.String("model_url", cfg.ModelServiceURL))
	} else {
		logger.Info("Model service connected", zap.String("url", cfg.ModelServiceURL))
	}

	// Create worker database adapter
	workerDB := &workerDBAdapter{db: db}

	// Initialize worker
	w := worker.NewWorker(cfg, redisQueue, clipClient, workerDB, logger)

	// Start worker in background
	workerCtx, workerCancel := context.WithCancel(ctx)
	go func() {
		if err := w.Start(workerCtx); err != nil {
			logger.Error("Worker error", zap.Error(err))
		}
	}()

	// Initialize API handler
	handler := api.NewHandler(redisQueue, db, logger)

	// Setup Gin router
	if os.Getenv("GIN_MODE") == "" {
		gin.SetMode(gin.ReleaseMode)
	}
	router := gin.New()
	router.Use(gin.Recovery())
	router.Use(requestLogger(logger))
	router.Use(corsMiddleware())

	// Register routes
	handler.RegisterRoutes(router)

	// Start HTTP server
	serverAddr := fmt.Sprintf(":%s", cfg.ServerPort)
	logger.Info("Starting HTTP server", zap.String("addr", serverAddr))

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		if err := router.Run(serverAddr); err != nil {
			logger.Fatal("Server failed", zap.Error(err))
		}
	}()

	// Wait for shutdown signal
	<-quit
	logger.Info("Shutting down...")

	// Stop worker
	workerCancel()
	w.Stop()

	// Give connections time to close
	time.Sleep(time.Second)
	logger.Info("Shutdown complete")
}

func initLogger() *zap.Logger {
	config := zap.NewProductionConfig()
	config.EncoderConfig.TimeKey = "timestamp"
	config.EncoderConfig.EncodeTime = zapcore.ISO8601TimeEncoder

	if os.Getenv("DEBUG") == "true" {
		config = zap.NewDevelopmentConfig()
	}

	logger, err := config.Build()
	if err != nil {
		panic(err)
	}

	return logger
}

func requestLogger(logger *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path

		c.Next()

		latency := time.Since(start)
		status := c.Writer.Status()

		logger.Info("HTTP request",
			zap.String("method", c.Request.Method),
			zap.String("path", path),
			zap.Int("status", status),
			zap.Duration("latency", latency),
			zap.String("ip", c.ClientIP()),
		)
	}
}

func corsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Authorization, X-Reviewer-ID")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}

// workerDBAdapter adapts api.PostgresDB to worker.Database interface
type workerDBAdapter struct {
	db *api.PostgresDB
}

func (a *workerDBAdapter) SaveClassification(ctx context.Context, result *models.ClassificationResult) error {
	return a.db.SaveClassification(ctx, result)
}

func (a *workerDBAdapter) UpdateProductClassification(ctx context.Context, productID uuid.UUID, result *models.ClassificationResult) error {
	return a.db.UpdateProductClassification(ctx, productID, result)
}

func (a *workerDBAdapter) GetProductByID(ctx context.Context, productID uuid.UUID) (*worker.Product, error) {
	p, err := a.db.GetProductByID(ctx, productID)
	if err != nil {
		return nil, err
	}
	return &worker.Product{
		ID:       p.ID,
		Title:    p.Title,
		ImageURL: p.ImageURL,
	}, nil
}
