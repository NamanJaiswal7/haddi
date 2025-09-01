#!/bin/bash

echo "🛑 Stopping Haddi Monitoring Stack..."

# Stop monitoring services
echo "📊 Stopping Prometheus, Grafana, and exporters..."
docker-compose -f docker-compose.monitoring.dev.yml down

# Remove monitoring network if no other services are using it
echo "🌐 Cleaning up monitoring network..."
docker network rm haddi_monitoring_network_dev 2>/dev/null || echo "Network removed or already removed"

echo ""
echo "✅ Monitoring stack stopped successfully!"
echo ""
echo "💡 To start monitoring again: ./scripts/start-monitoring-dev.sh"
