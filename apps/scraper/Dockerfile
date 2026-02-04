# Build stage
FROM golang:1.22-alpine AS builder

WORKDIR /app

# Install dependencies
RUN apk add --no-cache gcc musl-dev

# Copy go mod files
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build binary
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o scraper ./cmd/scraper

# Runtime stage
FROM alpine:3.19

WORKDIR /app

# Install ca-certificates for HTTPS and curl for health checks
RUN apk --no-cache add ca-certificates tzdata curl

# Copy binary
COPY --from=builder /app/scraper .

# Health check - scraper is healthy if process is running
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD pgrep scraper || exit 1

# Run
CMD ["./scraper"]
