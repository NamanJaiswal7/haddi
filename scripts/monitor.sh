#!/bin/bash

# Production Monitoring Script for Haddi Backend
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_URL="http://localhost:4545"
HEALTH_ENDPOINT="$APP_URL/health"
LOG_FILE="/var/log/haddi-monitor.log"
ALERT_EMAIL="admin@haddi.com"

# Timestamp
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

echo -e "${BLUE}🔍 Haddi Production Monitoring - $TIMESTAMP${NC}"

# Function to log messages
log_message() {
    echo "[$TIMESTAMP] $1" >> "$LOG_FILE"
}

# Function to send alert
send_alert() {
    local message="$1"
    echo -e "${RED}🚨 ALERT: $message${NC}"
    log_message "ALERT: $message"
    # Uncomment to enable email alerts
    # echo "$message" | mail -s "Haddi Production Alert" "$ALERT_EMAIL"
}

# 1. Check Application Health
echo -e "${YELLOW}🏥 Checking application health...${NC}"
if curl -f -s "$HEALTH_ENDPOINT" > /dev/null; then
    echo -e "${GREEN}✅ Application is healthy${NC}"
    log_message "Application health check: PASSED"
else
    send_alert "Application health check failed"
    log_message "Application health check: FAILED"
fi

# 2. Check Database Connectivity
echo -e "${YELLOW}🗄️ Checking database connectivity...${NC}"
if docker-compose -f docker-compose.prod.yml exec -T app npx prisma db execute --stdin <<< "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Database connection is healthy${NC}"
    log_message "Database connectivity check: PASSED"
else
    send_alert "Database connectivity check failed"
    log_message "Database connectivity check: FAILED"
fi

# 3. Check Container Status
echo -e "${YELLOW}🐳 Checking container status...${NC}"
CONTAINERS=$(docker-compose -f docker-compose.prod.yml ps -q)
for container in $CONTAINERS; do
    STATUS=$(docker inspect --format='{{.State.Status}}' "$container")
    if [ "$STATUS" = "running" ]; then
        echo -e "${GREEN}✅ Container $container is running${NC}"
        log_message "Container $container: RUNNING"
    else
        send_alert "Container $container is not running (Status: $STATUS)"
        log_message "Container $container: $STATUS"
    fi
done

# 4. Check System Resources
echo -e "${YELLOW}💻 Checking system resources...${NC}"

# CPU Usage
CPU_USAGE=$(top -l 1 | grep "CPU usage" | awk '{print $3}' | sed 's/%//')
if (( $(echo "$CPU_USAGE > 80" | bc -l) )); then
    send_alert "High CPU usage: ${CPU_USAGE}%"
    log_message "High CPU usage: ${CPU_USAGE}%"
else
    echo -e "${GREEN}✅ CPU usage: ${CPU_USAGE}%${NC}"
    log_message "CPU usage: ${CPU_USAGE}%"
fi

# Memory Usage
MEMORY_USAGE=$(memory_pressure | grep "System-wide memory free percentage:" | awk '{print $5}' | sed 's/%//')
MEMORY_USED=$((100 - MEMORY_USAGE))
if [ "$MEMORY_USED" -gt 80 ]; then
    send_alert "High memory usage: ${MEMORY_USED}%"
    log_message "High memory usage: ${MEMORY_USED}%"
else
    echo -e "${GREEN}✅ Memory usage: ${MEMORY_USED}%${NC}"
    log_message "Memory usage: ${MEMORY_USED}%"
fi

# Disk Usage
DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 80 ]; then
    send_alert "High disk usage: ${DISK_USAGE}%"
    log_message "High disk usage: ${DISK_USAGE}%"
else
    echo -e "${GREEN}✅ Disk usage: ${DISK_USAGE}%${NC}"
    log_message "Disk usage: ${DISK_USAGE}%"
fi

# 5. Check Application Logs for Errors
echo -e "${YELLOW}📋 Checking recent application logs...${NC}"
ERROR_COUNT=$(docker-compose -f docker-compose.prod.yml logs --since=1h app 2>/dev/null | grep -i "error\|exception\|fatal" | wc -l)
if [ "$ERROR_COUNT" -gt 0 ]; then
    send_alert "Found $ERROR_COUNT errors in application logs in the last hour"
    log_message "Error count in logs: $ERROR_COUNT"
else
    echo -e "${GREEN}✅ No errors found in recent logs${NC}"
    log_message "No errors in recent logs"
fi

# 6. Check API Response Time
echo -e "${YELLOW}⏱️ Checking API response time...${NC}"
RESPONSE_TIME=$(curl -o /dev/null -s -w "%{time_total}" "$HEALTH_ENDPOINT")
if (( $(echo "$RESPONSE_TIME > 2.0" | bc -l) )); then
    send_alert "Slow API response time: ${RESPONSE_TIME}s"
    log_message "Slow API response time: ${RESPONSE_TIME}s"
else
    echo -e "${GREEN}✅ API response time: ${RESPONSE_TIME}s${NC}"
    log_message "API response time: ${RESPONSE_TIME}s"
fi

# 7. Check SSL Certificate (if using HTTPS)
if [ -n "$(curl -s -I https://localhost:443 2>/dev/null | head -1)" ]; then
    echo -e "${YELLOW}🔒 Checking SSL certificate...${NC}"
    SSL_EXPIRY=$(echo | openssl s_client -connect localhost:443 2>/dev/null | openssl x509 -noout -dates | grep notAfter | cut -d= -f2)
    if [ -n "$SSL_EXPIRY" ]; then
        echo -e "${GREEN}✅ SSL certificate expires: $SSL_EXPIRY${NC}"
        log_message "SSL certificate expires: $SSL_EXPIRY"
    else
        send_alert "SSL certificate check failed"
        log_message "SSL certificate check: FAILED"
    fi
fi

echo -e "${GREEN}✅ Monitoring check completed at $TIMESTAMP${NC}"
log_message "Monitoring check completed"

# Clean up old log entries (keep last 1000 lines)
if [ -f "$LOG_FILE" ]; then
    tail -n 1000 "$LOG_FILE" > "${LOG_FILE}.tmp" && mv "${LOG_FILE}.tmp" "$LOG_FILE"
fi 