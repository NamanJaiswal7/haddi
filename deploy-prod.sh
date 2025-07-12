#!/bin/bash

# Production Deployment Script for Haddi with YugabyteDB
# This script sets up the production environment with proper security and initialization

set -e

echo "🚀 Starting Haddi Production Deployment with YugabyteDB..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if .env.production exists
if [ ! -f .env.production ]; then
    print_error ".env.production file not found!"
    echo "Please create .env.production with the following variables:"
    echo "DB_PASSWORD=your_secure_database_password"
    echo "YUGABYTE_PASSWORD=your_yugabyte_admin_password"
    echo "REDIS_PASSWORD=your_secure_redis_password"
    echo "JWT_SECRET=your_super_secure_jwt_secret"
    echo "AWS_ACCESS_KEY_ID=your_aws_access_key"
    echo "AWS_SECRET_ACCESS_KEY=your_aws_secret_key"
    echo "AWS_S3_BUCKET=your-production-s3-bucket"
    echo "GMAIL_USER=your_gmail_user"
    echo "GMAIL_PASS=your_gmail_app_password"
    exit 1
fi

# Load environment variables
print_status "Loading environment variables..."
source .env.production

# Validate required environment variables
required_vars=("DB_PASSWORD" "YUGABYTE_PASSWORD" "REDIS_PASSWORD" "JWT_SECRET")
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        print_error "Required environment variable $var is not set!"
        exit 1
    fi
done

print_status "Environment variables validated successfully."

# Create necessary directories
print_status "Creating necessary directories..."
mkdir -p logs uploads ssl

# Generate SSL certificates if they don't exist
if [ ! -f ssl/cert.pem ] || [ ! -f ssl/key.pem ]; then
    print_warning "SSL certificates not found. Generating self-signed certificates..."
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout ssl/key.pem -out ssl/cert.pem \
        -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
    print_status "SSL certificates generated."
fi

# Stop existing containers
print_status "Stopping existing containers..."
docker-compose -f docker-compose.prod.yml down --remove-orphans

# Pull latest images
print_status "Pulling latest Docker images..."
docker-compose -f docker-compose.prod.yml pull

# Start YugabyteDB cluster
print_status "Starting YugabyteDB cluster..."
docker-compose -f docker-compose.prod.yml up -d yb-master-1 yb-master-2 yb-master-3
docker-compose -f docker-compose.prod.yml up -d yb-tserver-1 yb-tserver-2 yb-tserver-3

# Wait for YugabyteDB to be ready
print_status "Waiting for YugabyteDB cluster to be ready..."
sleep 120

# Check YugabyteDB cluster status
print_status "Checking YugabyteDB cluster status..."
if docker-compose -f docker-compose.prod.yml exec yb-tserver-1 ysqlsh -h localhost -p 5433 -U yugabyte -d yugabyte -c "\l" > /dev/null 2>&1; then
    print_status "YugabyteDB cluster is ready!"
else
    print_error "YugabyteDB cluster is not ready. Please check the logs."
    docker-compose -f docker-compose.prod.yml logs yb-tserver-1
    exit 1
fi

# Initialize database
print_status "Initializing database..."
docker-compose -f docker-compose.prod.yml up db-init

# Start Redis cluster
print_status "Starting Redis cluster..."
docker-compose -f docker-compose.prod.yml up -d redis-master redis-replica-1 redis-replica-2

# Wait for Redis to be ready
print_status "Waiting for Redis to be ready..."
sleep 10

# Start the application
print_status "Starting the application..."
docker-compose -f docker-compose.prod.yml up -d app_prod

# Wait for application to be ready
print_status "Waiting for application to be ready..."
sleep 30

# Check application health
print_status "Checking application health..."
if curl -f http://localhost:4546/health > /dev/null 2>&1; then
    print_status "Application is healthy!"
else
    print_warning "Application health check failed. Checking logs..."
    docker-compose -f docker-compose.prod.yml logs app_prod
fi

# Start Nginx
print_status "Starting Nginx..."
docker-compose -f docker-compose.prod.yml up -d nginx

# Final status check
print_status "Performing final status check..."
docker-compose -f docker-compose.prod.yml ps

print_status "🎉 Production deployment completed successfully!"
echo ""
echo "📊 Access URLs:"
echo "   - Application: https://localhost"
echo "   - YugabyteDB Admin UI: http://localhost:7000"
echo "   - Application Health: https://localhost/health"
echo ""
echo "📝 Useful commands:"
echo "   - View logs: docker-compose -f docker-compose.prod.yml logs -f"
echo "   - Restart app: docker-compose -f docker-compose.prod.yml restart app_prod"
echo "   - Stop all: docker-compose -f docker-compose.prod.yml down"
echo ""
echo "🔒 Security Notes:"
echo "   - Change default passwords in .env.production"
echo "   - Set up proper SSL certificates for production"
echo "   - Configure firewall rules"
echo "   - Set up monitoring and alerting" 