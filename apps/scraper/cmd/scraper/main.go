package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"

	"indie-marketplace/scraper/internal/scheduler"
	"indie-marketplace/scraper/internal/storage"

	"go.uber.org/zap"
)

func main() {
	// Initialize logger
	logger, err := zap.NewProduction()
	if err != nil {
		log.Fatalf("Failed to initialize logger: %v", err)
	}
	defer logger.Sync()

	sugar := logger.Sugar()
	sugar.Info("Starting IndieMarket Scraper...")

	// Get database URL from environment
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		sugar.Fatal("DATABASE_URL environment variable is required")
	}

	// Initialize database connection
	ctx := context.Background()
	db, err := storage.NewDB(ctx, dbURL)
	if err != nil {
		sugar.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	sugar.Info("Connected to database")

	// Initialize scheduler
	sched := scheduler.New(db, sugar)

	// Start the scheduler
	sched.Start()
	sugar.Info("Scheduler started")

	// Wait for interrupt signal
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	<-sigChan
	sugar.Info("Shutting down...")

	// Stop the scheduler
	sched.Stop()
	sugar.Info("Scheduler stopped")
}
