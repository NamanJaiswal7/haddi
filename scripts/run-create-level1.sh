#!/bin/bash

# Script to run the create-level1-courses.ts script
# This script sets up the environment and runs the TypeScript file

echo "🚀 Setting up environment for Level 1 course creation..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  Warning: .env file not found. Make sure your environment variables are set."
    echo "   Required variables: DATABASE_URL"
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running. Please start Docker first."
    exit 1
fi

# Check if we're using Docker containers
if [ -f "docker-compose.dev.yml" ]; then
    echo "🐳 Detected Docker development environment..."
    
    # Check if containers are running
    if ! docker-compose -f docker-compose.dev.yml ps | grep -q "Up"; then
        echo "📦 Starting Docker containers..."
        docker-compose -f docker-compose.dev.yml up -d
        
        # Wait for database to be ready
        echo "⏳ Waiting for database to be ready..."
        sleep 15
    fi
    
    # Check if database schema exists
    echo "🔍 Checking database schema..."
    if docker-compose -f docker-compose.dev.yml exec app npx prisma db push --accept-data-loss > /dev/null 2>&1; then
        echo "✅ Database schema is ready"
    else
        echo "❌ Failed to set up database schema"
        exit 1
    fi
    
    # Run the script inside the Docker container
    echo "🎯 Running Level 1 course creation script in Docker container..."
    docker-compose -f docker-compose.dev.yml exec app npx ts-node scripts/create-level1-courses.ts
    
elif [ -f "docker-compose.yml" ]; then
    echo "🐳 Detected Docker production environment..."
    
    # Check if containers are running
    if ! docker-compose ps | grep -q "Up"; then
        echo "📦 Starting Docker containers..."
        docker-compose up -d
        
        # Wait for database to be ready
        echo "⏳ Waiting for database to be ready..."
        sleep 15
    fi
    
    # Check if database schema exists
    echo "🔍 Checking database schema..."
    if docker-compose exec app npx prisma db push --accept-data-loss > /dev/null 2>&1; then
        echo "✅ Database schema is ready"
    else
        echo "❌ Failed to set up database schema"
        exit 1
    fi
    
    # Run the script inside the Docker container
    echo "🎯 Running Level 1 course creation script in Docker container..."
    docker-compose exec app npx ts-node scripts/create-level1-courses.ts
    
else
    echo "💻 Running in local environment..."
    
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        echo "📦 Installing dependencies..."
        npm install
    fi

    # Generate Prisma client if needed
    echo "🔧 Generating Prisma client..."
    npx prisma generate

    # Check database connection
    echo "🔍 Testing database connection..."
    npx prisma db push --accept-data-loss

    # Run the TypeScript script
    echo "🎯 Running Level 1 course creation script..."
    npx ts-node scripts/create-level1-courses.ts
fi

echo "✅ Script execution completed!"
