#!/bin/bash
set -e

# Default cron schedule: 3 AM daily
CRON_SCHEDULE="${CRON_SCHEDULE:-0 3 * * *}"

echo "[Cron] Starting cron service..."
echo "[Cron] Timezone: ${TZ:-UTC}"
echo "[Cron] Schedule: $CRON_SCHEDULE"

# Create environment file for cron jobs
printenv | grep -E '^(DATABASE_URL|CLASSIFIER_URL|WEB_URL|CRON_SECRET|TZ)=' > /app/.env

# Create cron job file
cat > /etc/crontabs/root << EOF
# Indie Marketplace - Daily Sync and Classification
# Schedule: $CRON_SCHEDULE (default: 3 AM daily)
$CRON_SCHEDULE cd /app && source /app/.env && /app/sync-and-classify.sh >> /var/log/cron.log 2>&1

# Keep container alive with empty cron
EOF

echo "[Cron] Cron job configured:"
cat /etc/crontabs/root

# Run sync immediately on startup if RUN_ON_STARTUP is set
if [ "${RUN_ON_STARTUP:-false}" = "true" ]; then
    echo "[Cron] RUN_ON_STARTUP=true, running initial sync..."
    /app/sync-and-classify.sh || echo "[Cron] Initial sync failed, continuing..."
fi

echo "[Cron] Starting crond in foreground..."

# Start cron daemon in foreground, tail the log
crond -f -l 2 &
CRON_PID=$!

# Tail the log file
tail -f /var/log/cron.log &
TAIL_PID=$!

# Handle signals
trap "kill $CRON_PID $TAIL_PID 2>/dev/null; exit 0" SIGTERM SIGINT

# Wait for cron process
wait $CRON_PID
