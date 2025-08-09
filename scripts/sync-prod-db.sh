#!/bin/bash

# Production Database Sync Script for Haddi Backend
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DOCKER_COMPOSE_FILE="docker-compose.yml"

echo -e "${GREEN}🗄️ Starting production database sync for Haddi Backend...${NC}"

# Check if production containers are running
if ! docker-compose -f "$DOCKER_COMPOSE_FILE" ps | grep -q "Up"; then
    echo -e "${RED}❌ Error: Production containers are not running!${NC}"
    echo "Please start the production containers first with: docker-compose up -d"
    exit 1
fi

# Sync database schema (for YugabyteDB compatibility)
echo -e "${YELLOW}🗄️ Syncing database schema...${NC}"
docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T app npx prisma db push

# Generate Prisma client
echo -e "${YELLOW}🔧 Generating Prisma client...${NC}"
docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T app npx prisma generate

# Seed database with initial data
echo -e "${YELLOW}🌱 Seeding database...${NC}"
docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T app npm run seed

# Check application health
echo -e "${YELLOW}🏥 Checking application health...${NC}"
sleep 5

# Health check
if curl -f http://localhost:4545/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Application is healthy!${NC}"
else
    echo -e "${RED}❌ Application health check failed!${NC}"
    echo -e "${YELLOW}📋 Checking logs...${NC}"
    docker-compose -f "$DOCKER_COMPOSE_FILE" logs app
    exit 1
fi

echo -e "${GREEN}🎉 Production database sync completed successfully!${NC}"
echo -e "${YELLOW}📊 Database now contains:${NC}"
echo -e "   • 55 districts of Madhya Pradesh"
echo -e "   • Master admin user (master@haddi.com)"
echo -e "   • All required database tables and schema" 