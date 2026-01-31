package api

import (
	"context"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/indie/classifier/internal/models"
	"github.com/indie/classifier/internal/queue"
	"go.uber.org/zap"
)

// Handler contains all API handlers
type Handler struct {
	queue  *queue.RedisQueue
	db     Database
	logger *zap.Logger
}

// Database interface for API operations
type Database interface {
	GetClassification(ctx context.Context, id uuid.UUID) (*models.ClassificationResult, error)
	GetClassificationByProduct(ctx context.Context, productID uuid.UUID) (*models.ClassificationResult, error)
	ListClassifications(ctx context.Context, limit, offset int, status string) ([]*models.ClassificationResult, int64, error)
	GetReviewQueue(ctx context.Context, limit, offset int) ([]*models.ClassificationResult, int64, error)
	ApproveClassification(ctx context.Context, id uuid.UUID, reviewerID string) error
	UpdateClassification(ctx context.Context, id uuid.UUID, updates map[string]interface{}) error
	GetProductsWithoutClassification(ctx context.Context, limit int) ([]ProductInfo, error)
}

type ProductInfo struct {
	ID       uuid.UUID `json:"id"`
	Title    string    `json:"title"`
	ImageURL string    `json:"image_url"`
	BrandID  uuid.UUID `json:"brand_id"`
}

// NewHandler creates a new API handler
func NewHandler(q *queue.RedisQueue, db Database, logger *zap.Logger) *Handler {
	return &Handler{
		queue:  q,
		db:     db,
		logger: logger,
	}
}

// RegisterRoutes registers all API routes
func (h *Handler) RegisterRoutes(r *gin.Engine) {
	api := r.Group("/api/v1")
	{
		// Health check
		api.GET("/health", h.HealthCheck)

		// Classification endpoints
		classify := api.Group("/classify")
		{
			classify.POST("", h.SubmitClassification)
			classify.POST("/batch", h.SubmitBatchClassification)
			classify.GET("/:id", h.GetClassification)
			classify.GET("/product/:product_id", h.GetClassificationByProduct)
		}

		// Results endpoints
		results := api.Group("/results")
		{
			results.GET("", h.ListClassifications)
			results.PUT("/:id", h.UpdateClassification)
		}

		// Review queue endpoints
		review := api.Group("/review")
		{
			review.GET("", h.GetReviewQueue)
			review.POST("/:id/approve", h.ApproveClassification)
			review.POST("/:id/reject", h.RejectClassification)
		}

		// Stats endpoint
		api.GET("/stats", h.GetStats)

		// Sync endpoint - classify all unclassified products
		api.POST("/sync", h.SyncProducts)
	}
}

// HealthCheck returns service health status
func (h *Handler) HealthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":  "healthy",
		"service": "classifier",
	})
}

// SubmitClassificationRequest for single classification
type SubmitClassificationRequest struct {
	ProductID string `json:"product_id" binding:"required"`
	ImageURL  string `json:"image_url" binding:"required,url"`
	Priority  int    `json:"priority,omitempty"`
}

// SubmitClassification adds a single image to the classification queue
func (h *Handler) SubmitClassification(c *gin.Context) {
	var req SubmitClassificationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	job := &models.ClassificationJob{
		ProductID: req.ProductID,
		ImageURL:  req.ImageURL,
		Priority:  req.Priority,
	}

	if err := h.queue.Enqueue(c.Request.Context(), job); err != nil {
		h.logger.Error("Failed to enqueue job", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to queue classification"})
		return
	}

	c.JSON(http.StatusAccepted, gin.H{
		"job_id":     job.ID,
		"product_id": req.ProductID,
		"status":     "queued",
		"message":    "Classification job submitted successfully",
	})
}

// SubmitBatchClassification adds multiple images to the queue
func (h *Handler) SubmitBatchClassification(c *gin.Context) {
	var req models.BatchClassificationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if len(req.Items) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No items provided"})
		return
	}

	if len(req.Items) > 1000 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Maximum 1000 items per batch"})
		return
	}

	jobs := make([]*models.ClassificationJob, len(req.Items))
	for i, item := range req.Items {
		jobs[i] = &models.ClassificationJob{
			ProductID: item.ProductID,
			ImageURL:  item.ImageURL,
			Priority:  item.Priority,
		}
	}

	if err := h.queue.EnqueueBatch(c.Request.Context(), jobs); err != nil {
		h.logger.Error("Failed to enqueue batch", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to queue batch"})
		return
	}

	c.JSON(http.StatusAccepted, models.BatchClassificationResponse{
		JobID:      uuid.New().String(),
		TotalItems: len(req.Items),
		Status:     "queued",
		Message:    "Batch classification submitted successfully",
	})
}

// GetClassification retrieves a classification result by ID
func (h *Handler) GetClassification(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID format"})
		return
	}

	result, err := h.db.GetClassification(c.Request.Context(), id)
	if err != nil {
		h.logger.Error("Failed to get classification", zap.Error(err))
		c.JSON(http.StatusNotFound, gin.H{"error": "Classification not found"})
		return
	}

	c.JSON(http.StatusOK, result)
}

// GetClassificationByProduct retrieves classification by product ID
func (h *Handler) GetClassificationByProduct(c *gin.Context) {
	productIDStr := c.Param("product_id")
	productID, err := uuid.Parse(productIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid product ID format"})
		return
	}

	result, err := h.db.GetClassificationByProduct(c.Request.Context(), productID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Classification not found for product"})
		return
	}

	c.JSON(http.StatusOK, result)
}

// ListClassifications returns paginated classification results
func (h *Handler) ListClassifications(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))
	status := c.Query("status")

	if limit > 100 {
		limit = 100
	}

	results, total, err := h.db.ListClassifications(c.Request.Context(), limit, offset, status)
	if err != nil {
		h.logger.Error("Failed to list classifications", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch classifications"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":   results,
		"total":  total,
		"limit":  limit,
		"offset": offset,
	})
}

// GetReviewQueue returns items pending review
func (h *Handler) GetReviewQueue(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	results, total, err := h.db.GetReviewQueue(c.Request.Context(), limit, offset)
	if err != nil {
		h.logger.Error("Failed to get review queue", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch review queue"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":   results,
		"total":  total,
		"limit":  limit,
		"offset": offset,
	})
}

// ApproveClassification approves a classification in review
func (h *Handler) ApproveClassification(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID format"})
		return
	}

	reviewerID := c.GetHeader("X-Reviewer-ID")
	if reviewerID == "" {
		reviewerID = "system"
	}

	if err := h.db.ApproveClassification(c.Request.Context(), id, reviewerID); err != nil {
		h.logger.Error("Failed to approve classification", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to approve"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "approved"})
}

// UpdateClassificationRequest for manual corrections
type UpdateClassificationRequest struct {
	Category    string `json:"category,omitempty"`
	SubCategory string `json:"sub_category,omitempty"`
	Gender      string `json:"gender,omitempty"`
	Style       string `json:"style,omitempty"`
	Season      string `json:"season,omitempty"`
	Color       string `json:"primary_color,omitempty"`
}

// UpdateClassification allows manual correction of a classification
func (h *Handler) UpdateClassification(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID format"})
		return
	}

	var req UpdateClassificationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	updates := make(map[string]interface{})
	if req.Category != "" {
		updates["category"] = req.Category
	}
	if req.SubCategory != "" {
		updates["sub_category"] = req.SubCategory
	}
	if req.Gender != "" {
		updates["gender"] = req.Gender
	}
	if req.Style != "" {
		updates["style"] = req.Style
	}
	if req.Season != "" {
		updates["season"] = req.Season
	}
	if req.Color != "" {
		updates["primary_color"] = req.Color
	}

	if err := h.db.UpdateClassification(c.Request.Context(), id, updates); err != nil {
		h.logger.Error("Failed to update classification", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "updated"})
}

// RejectClassification rejects and re-queues a classification
func (h *Handler) RejectClassification(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID format"})
		return
	}

	// Get the classification to re-queue
	result, err := h.db.GetClassification(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Classification not found"})
		return
	}

	// Re-queue with higher priority
	job := &models.ClassificationJob{
		ProductID: result.ProductID.String(),
		ImageURL:  result.ImageURL,
		Priority:  10, // High priority for re-classification
	}

	if err := h.queue.Enqueue(c.Request.Context(), job); err != nil {
		h.logger.Error("Failed to re-queue", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to re-queue"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "rejected_and_requeued"})
}

// GetStats returns queue and processing statistics
func (h *Handler) GetStats(c *gin.Context) {
	stats, err := h.queue.GetStats(c.Request.Context())
	if err != nil {
		h.logger.Error("Failed to get stats", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get stats"})
		return
	}

	c.JSON(http.StatusOK, stats)
}

// SyncProducts queues all unclassified products for classification
func (h *Handler) SyncProducts(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "100"))
	if limit > 1000 {
		limit = 1000
	}

	products, err := h.db.GetProductsWithoutClassification(c.Request.Context(), limit)
	if err != nil {
		h.logger.Error("Failed to get products", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get products"})
		return
	}

	if len(products) == 0 {
		c.JSON(http.StatusOK, gin.H{
			"message": "No unclassified products found",
			"queued":  0,
		})
		return
	}

	jobs := make([]*models.ClassificationJob, len(products))
	for i, p := range products {
		jobs[i] = &models.ClassificationJob{
			ProductID: p.ID.String(),
			ImageURL:  p.ImageURL,
			Priority:  1,
		}
	}

	if err := h.queue.EnqueueBatch(c.Request.Context(), jobs); err != nil {
		h.logger.Error("Failed to enqueue products", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to queue products"})
		return
	}

	c.JSON(http.StatusAccepted, gin.H{
		"message": "Products queued for classification",
		"queued":  len(products),
	})
}
