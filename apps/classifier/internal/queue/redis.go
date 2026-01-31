package queue

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/indie/classifier/internal/models"
	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"
)

const (
	// Queue keys
	PendingQueueKey    = "classifier:queue:pending"
	ProcessingQueueKey = "classifier:queue:processing"
	FailedQueueKey     = "classifier:queue:failed"
	ReviewQueueKey     = "classifier:queue:review"
	CompletedSetKey    = "classifier:completed"

	// Cache keys
	ImageCachePrefix = "classifier:cache:image:"

	// Lock keys
	LockPrefix = "classifier:lock:"

	// TTLs
	CacheTTL       = 24 * time.Hour
	ProcessingTTL  = 5 * time.Minute
	LockTTL        = 30 * time.Second
)

type RedisQueue struct {
	client *redis.Client
	logger *zap.Logger
}

func NewRedisQueue(redisURL, password string, logger *zap.Logger) (*RedisQueue, error) {
	client := redis.NewClient(&redis.Options{
		Addr:     redisURL,
		Password: password,
		DB:       0,
	})

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("failed to connect to redis: %w", err)
	}

	logger.Info("Connected to Redis", zap.String("addr", redisURL))

	return &RedisQueue{
		client: client,
		logger: logger,
	}, nil
}

// Enqueue adds a job to the pending queue
func (q *RedisQueue) Enqueue(ctx context.Context, job *models.ClassificationJob) error {
	if job.ID == "" {
		job.ID = uuid.New().String()
	}
	job.CreatedAt = time.Now()

	data, err := json.Marshal(job)
	if err != nil {
		return fmt.Errorf("failed to marshal job: %w", err)
	}

	// Use sorted set with priority as score (higher priority = processed first)
	score := float64(job.Priority)*1e12 - float64(job.CreatedAt.UnixNano())

	if err := q.client.ZAdd(ctx, PendingQueueKey, redis.Z{
		Score:  score,
		Member: data,
	}).Err(); err != nil {
		return fmt.Errorf("failed to enqueue job: %w", err)
	}

	q.logger.Debug("Job enqueued",
		zap.String("job_id", job.ID),
		zap.String("product_id", job.ProductID),
		zap.Int("priority", job.Priority))

	return nil
}

// EnqueueBatch adds multiple jobs at once
func (q *RedisQueue) EnqueueBatch(ctx context.Context, jobs []*models.ClassificationJob) error {
	pipe := q.client.Pipeline()

	for _, job := range jobs {
		if job.ID == "" {
			job.ID = uuid.New().String()
		}
		job.CreatedAt = time.Now()

		data, err := json.Marshal(job)
		if err != nil {
			return fmt.Errorf("failed to marshal job: %w", err)
		}

		score := float64(job.Priority)*1e12 - float64(job.CreatedAt.UnixNano())
		pipe.ZAdd(ctx, PendingQueueKey, redis.Z{
			Score:  score,
			Member: data,
		})
	}

	_, err := pipe.Exec(ctx)
	if err != nil {
		return fmt.Errorf("failed to enqueue batch: %w", err)
	}

	q.logger.Info("Batch enqueued", zap.Int("count", len(jobs)))
	return nil
}

// Dequeue gets the highest priority job from the queue
func (q *RedisQueue) Dequeue(ctx context.Context) (*models.ClassificationJob, error) {
	// Pop from pending and add to processing atomically
	result, err := q.client.ZPopMax(ctx, PendingQueueKey, 1).Result()
	if err != nil {
		if err == redis.Nil {
			return nil, nil // Queue empty
		}
		return nil, fmt.Errorf("failed to dequeue: %w", err)
	}

	if len(result) == 0 {
		return nil, nil
	}

	var job models.ClassificationJob
	if err := json.Unmarshal([]byte(result[0].Member.(string)), &job); err != nil {
		return nil, fmt.Errorf("failed to unmarshal job: %w", err)
	}

	// Add to processing queue with TTL
	processingData, _ := json.Marshal(job)
	q.client.ZAdd(ctx, ProcessingQueueKey, redis.Z{
		Score:  float64(time.Now().Add(ProcessingTTL).Unix()),
		Member: processingData,
	})

	return &job, nil
}

// Complete marks a job as completed
func (q *RedisQueue) Complete(ctx context.Context, job *models.ClassificationJob) error {
	data, _ := json.Marshal(job)

	pipe := q.client.Pipeline()
	pipe.ZRem(ctx, ProcessingQueueKey, data)
	pipe.SAdd(ctx, CompletedSetKey, job.ID)
	pipe.Expire(ctx, CompletedSetKey, 7*24*time.Hour) // Keep completed IDs for 7 days

	_, err := pipe.Exec(ctx)
	return err
}

// Fail moves a job to the failed queue
func (q *RedisQueue) Fail(ctx context.Context, job *models.ClassificationJob, errMsg string) error {
	job.Attempts++

	data, _ := json.Marshal(job)

	pipe := q.client.Pipeline()
	pipe.ZRem(ctx, ProcessingQueueKey, data)
	pipe.ZAdd(ctx, FailedQueueKey, redis.Z{
		Score:  float64(time.Now().Unix()),
		Member: data,
	})

	_, err := pipe.Exec(ctx)
	return err
}

// SendToReview moves a job to the review queue
func (q *RedisQueue) SendToReview(ctx context.Context, job *models.ClassificationJob) error {
	data, _ := json.Marshal(job)

	return q.client.ZAdd(ctx, ReviewQueueKey, redis.Z{
		Score:  float64(time.Now().Unix()),
		Member: data,
	}).Err()
}

// GetStats returns queue statistics
func (q *RedisQueue) GetStats(ctx context.Context) (*models.ClassificationStats, error) {
	pipe := q.client.Pipeline()

	pendingCmd := pipe.ZCard(ctx, PendingQueueKey)
	processingCmd := pipe.ZCard(ctx, ProcessingQueueKey)
	failedCmd := pipe.ZCard(ctx, FailedQueueKey)
	reviewCmd := pipe.ZCard(ctx, ReviewQueueKey)
	completedCmd := pipe.SCard(ctx, CompletedSetKey)

	_, err := pipe.Exec(ctx)
	if err != nil {
		return nil, err
	}

	return &models.ClassificationStats{
		PendingJobs:    pendingCmd.Val(),
		ProcessingJobs: processingCmd.Val(),
		FailedJobs:     failedCmd.Val(),
		ReviewQueue:    reviewCmd.Val(),
		TotalProcessed: completedCmd.Val(),
	}, nil
}

// GetCachedResult checks if image was already classified
func (q *RedisQueue) GetCachedResult(ctx context.Context, imageURL string) (*models.ClassificationResult, bool) {
	key := ImageCachePrefix + hashURL(imageURL)

	data, err := q.client.Get(ctx, key).Bytes()
	if err != nil {
		return nil, false
	}

	var result models.ClassificationResult
	if err := json.Unmarshal(data, &result); err != nil {
		return nil, false
	}

	return &result, true
}

// CacheResult stores classification result
func (q *RedisQueue) CacheResult(ctx context.Context, imageURL string, result *models.ClassificationResult) error {
	key := ImageCachePrefix + hashURL(imageURL)

	data, err := json.Marshal(result)
	if err != nil {
		return err
	}

	return q.client.Set(ctx, key, data, CacheTTL).Err()
}

// AcquireLock gets a distributed lock for a resource
func (q *RedisQueue) AcquireLock(ctx context.Context, resourceID string) (bool, error) {
	key := LockPrefix + resourceID
	return q.client.SetNX(ctx, key, "locked", LockTTL).Result()
}

// ReleaseLock releases a distributed lock
func (q *RedisQueue) ReleaseLock(ctx context.Context, resourceID string) error {
	key := LockPrefix + resourceID
	return q.client.Del(ctx, key).Err()
}

// RecoverStaleJobs moves expired processing jobs back to pending
func (q *RedisQueue) RecoverStaleJobs(ctx context.Context) (int64, error) {
	now := float64(time.Now().Unix())

	// Find expired jobs in processing queue
	staleJobs, err := q.client.ZRangeByScore(ctx, ProcessingQueueKey, &redis.ZRangeBy{
		Min: "-inf",
		Max: fmt.Sprintf("%f", now),
	}).Result()
	if err != nil {
		return 0, err
	}

	if len(staleJobs) == 0 {
		return 0, nil
	}

	pipe := q.client.Pipeline()
	for _, jobData := range staleJobs {
		var job models.ClassificationJob
		if err := json.Unmarshal([]byte(jobData), &job); err != nil {
			continue
		}

		// Move back to pending with lower priority
		job.Attempts++
		newData, _ := json.Marshal(job)
		score := float64(job.Priority-1)*1e12 - float64(job.CreatedAt.UnixNano())

		pipe.ZRem(ctx, ProcessingQueueKey, jobData)
		pipe.ZAdd(ctx, PendingQueueKey, redis.Z{
			Score:  score,
			Member: newData,
		})
	}

	_, err = pipe.Exec(ctx)
	if err != nil {
		return 0, err
	}

	q.logger.Info("Recovered stale jobs", zap.Int("count", len(staleJobs)))
	return int64(len(staleJobs)), nil
}

// Close closes the Redis connection
func (q *RedisQueue) Close() error {
	return q.client.Close()
}

// Simple hash for cache keys
func hashURL(url string) string {
	// Use first 16 chars of UUID v5 based on URL
	return uuid.NewSHA1(uuid.NameSpaceURL, []byte(url)).String()[:16]
}
