# Classifier Service

AI-powered clothing classification service using Fashion-CLIP for zero-shot image classification.

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Go API        │────▶│   Redis Queue   │◀────│   Workers       │
│   (Gin)         │     │   (Priority)    │     │   (Parallel)    │
└────────┬────────┘     └─────────────────┘     └────────┬────────┘
         │                                               │
         ▼                                               ▼
┌─────────────────┐                            ┌─────────────────┐
│   PostgreSQL    │                            │  Fashion-CLIP   │
│   (Results)     │                            │  (Python)       │
└─────────────────┘                            └─────────────────┘
```

## Features

- **Zero-shot classification**: Classify any fashion item without training
- **Priority queue**: Redis-based queue with priority scoring
- **Parallel processing**: Configurable worker count for throughput
- **Caching**: Avoid re-classifying same images
- **Review queue**: Low-confidence items sent for human review
- **Batch processing**: Submit up to 1000 items at once
- **Graceful shutdown**: Clean worker termination

## Classification Output

| Field | Values |
|-------|--------|
| Category | tops, bottoms, footwear, accessories, dresses, outerwear, knitwear |
| SubCategory | t-shirt, jeans, sneakers, hoodie, etc. (40+ options) |
| Gender | male, female, unisex, kids |
| Style | casual, formal, sport, streetwear, vintage, minimalist |
| Season | summer, winter, mid-season, all-season |
| Colors | Primary, secondary, tertiary colors detected |

## Quick Start

```bash
# Start all services
docker-compose up -d

# Check health
curl http://localhost:8080/api/v1/health

# Submit single classification
curl -X POST http://localhost:8080/api/v1/classify \
  -H "Content-Type: application/json" \
  -d '{"product_id": "123", "image_url": "https://example.com/image.jpg"}'

# Sync unclassified products
curl -X POST http://localhost:8080/api/v1/sync?limit=100
```

## API Endpoints

### Classification

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/classify` | Submit single image for classification |
| POST | `/api/v1/classify/batch` | Submit batch (max 1000) |
| GET | `/api/v1/classify/:id` | Get classification by ID |
| GET | `/api/v1/classify/product/:product_id` | Get by product ID |

### Results

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/results` | List classifications (paginated) |
| PUT | `/api/v1/results/:id` | Update classification manually |

### Review Queue

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/review` | Get items pending review |
| POST | `/api/v1/review/:id/approve` | Approve classification |
| POST | `/api/v1/review/:id/reject` | Reject and re-queue |

### Stats

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/stats` | Queue and processing statistics |
| GET | `/api/v1/health` | Service health check |
| POST | `/api/v1/sync` | Queue unclassified products |

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SERVER_PORT` | 8080 | API server port |
| `DATABASE_URL` | postgres://... | PostgreSQL connection |
| `REDIS_URL` | localhost:6379 | Redis address |
| `REDIS_PASSWORD` | "" | Redis password |
| `MODEL_SERVICE_URL` | http://localhost:8000 | Fashion-CLIP service |
| `WORKER_COUNT` | 4 | Parallel workers |
| `BATCH_SIZE` | 10 | Dequeue batch size |
| `CONFIDENCE_THRESHOLD` | 0.80 | Min confidence (0-1) |
| `PROCESSING_TIMEOUT_SEC` | 30 | Job timeout seconds |

## Development

### Local Setup

```bash
# Start dependencies
docker-compose up redis postgres -d

# Start model service
cd model-service
pip install -r requirements.txt
python main.py

# Run Go service
go run ./cmd/classifier
```

### Build

```bash
# Build Go binary
go build -o classifier ./cmd/classifier

# Build Docker images
docker-compose build
```

## Model Service

The Fashion-CLIP model service provides zero-shot classification:

```bash
# Direct classification
curl -X POST http://localhost:8000/classify \
  -H "Content-Type: application/json" \
  -d '{
    "image_url": "https://example.com/image.jpg",
    "labels": ["t-shirt", "jeans", "sneakers", "hoodie"]
  }'
```

Response:
```json
{
  "labels": [
    {"name": "hoodie", "score": 0.7823},
    {"name": "t-shirt", "score": 0.1542},
    {"name": "jeans", "score": 0.0412},
    {"name": "sneakers", "score": 0.0223}
  ]
}
```

## Queue Behavior

1. Jobs enter **pending queue** with priority score
2. Workers pop highest priority jobs to **processing queue**
3. Successful jobs marked **completed** and cached
4. Low confidence jobs sent to **review queue**
5. Failed jobs moved to **failed queue** with retry count
6. Stale processing jobs recovered automatically

## Performance

- Model service: ~200-500ms per image (CPU), ~50-100ms (GPU)
- Throughput: ~4-8 images/sec with 4 workers (CPU)
- Memory: ~2-4GB for model service
- Caching reduces duplicate classifications to <1ms

## License

MIT
