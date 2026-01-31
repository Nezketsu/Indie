package config

import (
	"os"
	"strconv"
	"time"
)

type Config struct {
	// Server
	ServerPort string

	// Database
	DatabaseURL string

	// Redis
	RedisURL      string
	RedisPassword string

	// Worker
	WorkerCount       int
	BatchSize         int
	ProcessingTimeout time.Duration

	// Classification
	ModelServiceURL    string
	ConfidenceThreshold float64

	// Rate Limiting
	RateLimitRPS int
	RateLimitBurst int
}

func Load() *Config {
	return &Config{
		ServerPort:          getEnv("SERVER_PORT", "8080"),
		DatabaseURL:         getEnv("DATABASE_URL", "postgres://indie:indiepass@localhost:5432/indie_marketplace"),
		RedisURL:            getEnv("REDIS_URL", "localhost:6379"),
		RedisPassword:       getEnv("REDIS_PASSWORD", ""),
		WorkerCount:         getEnvInt("WORKER_COUNT", 4),
		BatchSize:           getEnvInt("BATCH_SIZE", 10),
		ProcessingTimeout:   time.Duration(getEnvInt("PROCESSING_TIMEOUT_SEC", 30)) * time.Second,
		ModelServiceURL:     getEnv("MODEL_SERVICE_URL", "http://localhost:8000"),
		ConfidenceThreshold: getEnvFloat("CONFIDENCE_THRESHOLD", 0.80),
		RateLimitRPS:        getEnvInt("RATE_LIMIT_RPS", 100),
		RateLimitBurst:      getEnvInt("RATE_LIMIT_BURST", 200),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if i, err := strconv.Atoi(value); err == nil {
			return i
		}
	}
	return defaultValue
}

func getEnvFloat(key string, defaultValue float64) float64 {
	if value := os.Getenv(key); value != "" {
		if f, err := strconv.ParseFloat(value, 64); err == nil {
			return f
		}
	}
	return defaultValue
}
