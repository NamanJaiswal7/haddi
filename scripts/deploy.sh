#!/bin/bash

# Production Deployment Script for Haddi Backend
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="haddi-backend"
DOCKER_COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.production"

echo -e "${GREEN}🚀 Starting production deployment for Haddi Backend...${NC}"

# Check if .env.production exists
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}❌ Error: $ENV_FILE not found!${NC}"
    echo "Please create $ENV_FILE with your production environment variables."
    exit 1
fi

# Load environment variables
echo -e "${YELLOW}📋 Loading environment variables...${NC}"
source "$ENV_FILE"

# Check required environment variables
required_vars=("DATABASE_URL" "JWT_SECRET" "AWS_ACCESS_KEY_ID" "AWS_SECRET_ACCESS_KEY")
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo -e "${RED}❌ Error: $var is not set in $ENV_FILE${NC}"
        exit 1
    fi
done

# Stop existing containers
echo -e "${YELLOW}🛑 Stopping existing containers...${NC}"
docker-compose -f "$DOCKER_COMPOSE_FILE" down --remove-orphans

# Remove old images
echo -e "${YELLOW}🧹 Cleaning up old images...${NC}"
docker system prune -f

# Build and start services
echo -e "${YELLOW}🔨 Building and starting services...${NC}"
docker-compose -f "$DOCKER_COMPOSE_FILE" up -d --build

# Wait for database to be ready
echo -e "${YELLOW}⏳ Waiting for database to be ready...${NC}"
sleep 30

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
sleep 10

# Health check
if curl -f http://localhost:4545/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Application is healthy!${NC}"
else
    echo -e "${RED}❌ Application health check failed!${NC}"
    echo -e "${YELLOW}📋 Checking logs...${NC}"
    docker-compose -f "$DOCKER_COMPOSE_FILE" logs app
    exit 1
fi

# Show running containers
echo -e "${GREEN}📊 Deployment completed successfully!${NC}"
echo -e "${YELLOW}📋 Running containers:${NC}"
docker-compose -f "$DOCKER_COMPOSE_FILE" ps

echo -e "${GREEN}🎉 Haddi Backend is now running in production!${NC}"
echo -e "${YELLOW}🌐 Application URL: https://your-domain.com${NC}"
echo -e "${YELLOW}📊 Health Check: https://your-domain.com/health${NC}" 