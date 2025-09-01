#!/bin/bash

echo "🚀 Starting Haddi Monitoring Stack for Development..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Create monitoring network if it doesn't exist
echo "🌐 Creating monitoring network..."
docker network create haddi_monitoring_network_dev 2>/dev/null || echo "Network already exists"

# Start monitoring services
echo "📊 Starting Prometheus, Grafana, and exporters..."
docker-compose -f docker-compose.monitoring.dev.yml up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check service status
echo "🔍 Checking service status..."
docker-compose -f docker-compose.monitoring.dev.yml ps

echo ""
echo "✅ Monitoring stack started successfully!"
echo ""
echo "📊 Available services:"
echo "   • Prometheus: http://localhost:9090"
echo "   • Grafana: http://localhost:3001 (admin/admin123)"
echo "   • Node Exporter: http://localhost:9100"
echo "   • Redis Exporter: http://localhost:9121"
echo "   • Postgres Exporter: http://localhost:9187"
echo "   • cAdvisor: http://localhost:8080"
echo ""
echo "🔗 Your app metrics: http://localhost:4545/metrics"
echo ""
echo "📈 To view dashboards:"
echo "   1. Open Grafana at http://localhost:3001"
echo "   2. Login with admin/admin123"
echo "   3. The Haddi dashboard should be automatically loaded"
echo ""
echo "🛑 To stop monitoring: ./scripts/stop-monitoring-dev.sh"
