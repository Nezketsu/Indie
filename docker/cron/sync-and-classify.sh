#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
}

warn() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARN:${NC} $1"
}

# Configuration
WEB_URL="${WEB_URL:-http://web:3000}"
CLASSIFIER_URL="${CLASSIFIER_URL:-http://classifier:8080}"
CRON_SECRET="${CRON_SECRET:-}"

log "=========================================="
log "Starting daily sync and classification job"
log "=========================================="

# Step 1: Scrape new products from all brands
log "Step 1: Scraping products from all brands..."

if [ -z "$CRON_SECRET" ]; then
    error "CRON_SECRET is not set. Cannot authenticate with web API."
    exit 1
fi

SCRAPE_RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X GET "${WEB_URL}/api/cron/sync" \
    -H "Authorization: Bearer ${CRON_SECRET}" \
    -H "Content-Type: application/json" \
    --max-time 600)

SCRAPE_HTTP_CODE=$(echo "$SCRAPE_RESPONSE" | tail -n1)
SCRAPE_BODY=$(echo "$SCRAPE_RESPONSE" | sed '$d')

if [ "$SCRAPE_HTTP_CODE" -eq 200 ]; then
    log "Scraping completed successfully!"
    log "Response: $SCRAPE_BODY"

    # Extract stats from response
    PRODUCTS_FOUND=$(echo "$SCRAPE_BODY" | grep -o '"totalProductsFound":[0-9]*' | grep -o '[0-9]*' || echo "0")
    PRODUCTS_CREATED=$(echo "$SCRAPE_BODY" | grep -o '"totalProductsCreated":[0-9]*' | grep -o '[0-9]*' || echo "0")
    PRODUCTS_UPDATED=$(echo "$SCRAPE_BODY" | grep -o '"totalProductsUpdated":[0-9]*' | grep -o '[0-9]*' || echo "0")

    log "Products found: $PRODUCTS_FOUND"
    log "Products created: $PRODUCTS_CREATED"
    log "Products updated: $PRODUCTS_UPDATED"
else
    error "Scraping failed with HTTP code: $SCRAPE_HTTP_CODE"
    error "Response: $SCRAPE_BODY"
    exit 1
fi

# Step 2: Queue unclassified products for classification
log ""
log "Step 2: Queuing unclassified products for classification..."

CLASSIFY_RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X POST "${CLASSIFIER_URL}/api/v1/sync" \
    -H "Content-Type: application/json" \
    --max-time 120)

CLASSIFY_HTTP_CODE=$(echo "$CLASSIFY_RESPONSE" | tail -n1)
CLASSIFY_BODY=$(echo "$CLASSIFY_RESPONSE" | sed '$d')

if [ "$CLASSIFY_HTTP_CODE" -eq 200 ]; then
    log "Classification sync completed successfully!"
    log "Response: $CLASSIFY_BODY"
else
    error "Classification sync failed with HTTP code: $CLASSIFY_HTTP_CODE"
    error "Response: $CLASSIFY_BODY"
    exit 1
fi

# Step 3: Check classifier queue stats
log ""
log "Step 3: Checking classifier queue status..."

STATS_RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X GET "${CLASSIFIER_URL}/api/v1/stats" \
    -H "Content-Type: application/json" \
    --max-time 30)

STATS_HTTP_CODE=$(echo "$STATS_RESPONSE" | tail -n1)
STATS_BODY=$(echo "$STATS_RESPONSE" | sed '$d')

if [ "$STATS_HTTP_CODE" -eq 200 ]; then
    log "Queue stats: $STATS_BODY"
else
    warn "Could not fetch queue stats (HTTP $STATS_HTTP_CODE)"
fi

log ""
log "=========================================="
log "Daily sync and classification job completed"
log "=========================================="
