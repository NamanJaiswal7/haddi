#!/bin/bash

# Database Backup Script for Haddi Production
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="haddi_backup_${DATE}.sql"
COMPRESSED_FILE="${BACKUP_FILE}.gz"
RETENTION_DAYS=30

echo -e "${GREEN}💾 Starting database backup...${NC}"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Load environment variables
if [ -f ".env.production" ]; then
    source ".env.production"
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ Error: DATABASE_URL not set${NC}"
    exit 1
fi

# Extract database connection details
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_PASS=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')

echo -e "${YELLOW}📋 Database: $DB_NAME on $DB_HOST:$DB_PORT${NC}"

# Create backup
echo -e "${YELLOW}🔄 Creating backup...${NC}"
PGPASSWORD="$DB_PASS" pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    --no-password --verbose --clean --no-owner --no-privileges \
    > "$BACKUP_DIR/$BACKUP_FILE"

# Compress backup
echo -e "${YELLOW}🗜️ Compressing backup...${NC}"
gzip "$BACKUP_DIR/$BACKUP_FILE"

# Check if backup was created successfully
if [ -f "$BACKUP_DIR/$COMPRESSED_FILE" ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_DIR/$COMPRESSED_FILE" | cut -f1)
    echo -e "${GREEN}✅ Backup created successfully!${NC}"
    echo -e "${YELLOW}📁 File: $BACKUP_DIR/$COMPRESSED_FILE${NC}"
    echo -e "${YELLOW}📊 Size: $BACKUP_SIZE${NC}"
else
    echo -e "${RED}❌ Backup creation failed!${NC}"
    exit 1
fi

# Clean up old backups
echo -e "${YELLOW}🧹 Cleaning up old backups (older than $RETENTION_DAYS days)...${NC}"
find "$BACKUP_DIR" -name "haddi_backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete

# Show backup statistics
echo -e "${GREEN}📊 Backup Statistics:${NC}"
echo -e "${YELLOW}📁 Total backups: $(ls -1 "$BACKUP_DIR"/haddi_backup_*.sql.gz 2>/dev/null | wc -l)${NC}"
echo -e "${YELLOW}💾 Total size: $(du -sh "$BACKUP_DIR" | cut -f1)${NC}"

echo -e "${GREEN}🎉 Database backup completed successfully!${NC}" 