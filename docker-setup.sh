#!/bin/bash

# Docker Setup Script for Haddi Application
# This script helps set up the Docker environment for the Haddi application

set -e

echo "🐳 Setting up Docker environment for Haddi application..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is installed
check_docker() {
    print_status "Checking Docker installation..."
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    print_success "Docker and Docker Compose are installed"
}

# Check if Docker daemon is running
check_docker_daemon() {
    print_status "Checking Docker daemon..."
    if ! docker info &> /dev/null; then
        print_error "Docker daemon is not running. Please start Docker first."
        exit 1
    fi
    print_success "Docker daemon is running"
}

# Create .env file if it doesn't exist
create_env_file() {
    print_status "Setting up environment variables..."
    
    if [ ! -f .env ]; then
        cat > .env << EOF
# Database
DATABASE_URL=postgresql://haddi_user:haddi_password@postgres:5432/haddi_db

# JWT
JWT_SECRET=your_very_secure_jwt_secret_here_change_in_production

# AWS S3 (for file uploads)
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your_s3_bucket_name

# Email (Gmail SMTP)
GMAIL_USER=your_gmail_address@gmail.com
GMAIL_PASS=your_gmail_app_password

# Redis (optional, for caching)
REDIS_URL=redis://redis:6379

# Application
NODE_ENV=development
PORT=4545
EOF
        print_success "Created .env file with default values"
        print_warning "Please update the .env file with your actual values before running in production"
    else
        print_status ".env file already exists"
    fi
}

# Build and start development environment
start_development() {
    print_status "Starting development environment..."
    
    # Stop any existing containers
    docker-compose down 2>/dev/null || true
    
    # Build and start
    docker-compose up --build -d postgres redis
    print_status "Waiting for database to be ready..."
    sleep 10
    
    # Start the application
    docker-compose up --build app_dev
}

# Build and start production environment
start_production() {
    print_status "Starting production environment..."
    
    # Stop any existing containers
    docker-compose down 2>/dev/null || true
    
    # Build and start production services
    docker-compose --profile production up --build -d
    print_success "Production environment started"
    print_status "Application available at: http://localhost:4546"
    print_status "With Nginx at: http://localhost:80"
}

# Show usage information
show_usage() {
    echo "Usage: $0 [OPTION]"
    echo ""
    echo "Options:"
    echo "  dev         Start development environment"
    echo "  prod        Start production environment"
    echo "  setup       Only setup environment (create .env file)"
    echo "  clean       Stop and remove all containers and volumes"
    echo "  logs        Show application logs"
    echo "  help        Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 dev      # Start development environment"
    echo "  $0 prod     # Start production environment"
    echo "  $0 setup    # Only setup environment variables"
}

# Main script logic
main() {
    case "${1:-help}" in
        "dev")
            check_docker
            check_docker_daemon
            create_env_file
            start_development
            ;;
        "prod")
            check_docker
            check_docker_daemon
            create_env_file
            start_production
            ;;
        "setup")
            create_env_file
            print_success "Environment setup complete"
            ;;
        "clean")
            print_status "Cleaning up Docker environment..."
            docker-compose down -v --remove-orphans 2>/dev/null || true
            docker system prune -f 2>/dev/null || true
            print_success "Cleanup complete"
            ;;
        "logs")
            print_status "Showing application logs..."
            docker-compose logs -f app_dev
            ;;
        "help"|*)
            show_usage
            ;;
    esac
}

# Run main function with all arguments
main "$@" 