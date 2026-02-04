# Runtime stage - uses pre-built scraper or calls APIs
FROM alpine:3.19

WORKDIR /app

# Install required packages
RUN apk --no-cache add ca-certificates tzdata curl bash

# Copy scripts
COPY sync-and-classify.sh /app/sync-and-classify.sh
COPY entrypoint.sh /app/entrypoint.sh

RUN chmod +x /app/sync-and-classify.sh /app/entrypoint.sh

# Create cron log file
RUN touch /var/log/cron.log

ENTRYPOINT ["/app/entrypoint.sh"]
