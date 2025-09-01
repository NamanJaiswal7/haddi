# Haddi Application Monitoring & Observability Setup

This document describes the comprehensive monitoring and observability system set up for the Haddi application using Prometheus, Grafana, and various exporters.

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Haddi App    │    │   Prometheus    │    │     Grafana     │
│   (Port 4545)  │───▶│   (Port 9090)   │───▶│   (Port 3000)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Redis Exporter │    │ Node Exporter   │    │ Postgres Exporter│
│   (Port 9121)   │    │  (Port 9100)    │    │   (Port 9187)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 Quick Start (Development)

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Monitoring Stack

```bash
npm run monitoring:start
```

This will start:
- Prometheus (metrics collection)
- Grafana (visualization)
- Node Exporter (system metrics)
- Redis Exporter (Redis metrics)
- Postgres Exporter (database metrics)
- cAdvisor (container metrics)

### 3. Start Your Application

```bash
npm run docker:dev:all
```

### 4. Access Monitoring Tools

- **Grafana**: http://localhost:3001 (admin/admin123)
- **Prometheus**: http://localhost:9090
- **App Metrics**: http://localhost:4545/metrics

## 📊 Available Metrics

### Application Metrics
- HTTP request count and duration
- Database query performance
- Redis operation metrics
- Business logic metrics (user registrations, course completions)
- Error rates and types
- Memory usage and event loop lag

### System Metrics
- CPU usage
- Memory usage
- Disk I/O
- Network statistics
- Container resource usage

### Database Metrics
- Connection counts
- Query performance
- Transaction rates
- Lock statistics

### Redis Metrics
- Connected clients
- Memory usage
- Command statistics
- Performance metrics

## 🎯 Grafana Dashboards

### Haddi Overview Dashboard
Automatically loaded dashboard with:
- HTTP request rates and response times
- Database performance metrics
- Redis connection and operation metrics
- System resource utilization
- Application-specific business metrics

## 🔧 Configuration Files

### Prometheus Configuration
- **Location**: `monitoring/prometheus/prometheus.yml`
- **Scrape Interval**: 15 seconds
- **Retention**: 200 hours

### Grafana Configuration
- **Datasource**: Automatically configured to connect to Prometheus
- **Dashboards**: Auto-provisioned from `monitoring/grafana/dashboards/`

## 📝 Adding Custom Metrics

### 1. Import Metrics Service

```typescript
import { 
  userRegistrationsTotal, 
  courseCompletionsTotal,
  errorsTotal 
} from '../services/metricsService';
```

### 2. Use Metrics in Your Code

```typescript
// Increment counters
userRegistrationsTotal.inc({ user_type: 'student' });
courseCompletionsTotal.inc({ course_level: 'level1' });

// Record errors
errorsTotal.inc({ type: 'validation_error', endpoint: '/api/auth/login' });

// Measure database operations
const timer = databaseQueryDuration.startTimer();
try {
  await db.query('SELECT * FROM users');
  timer({ operation: 'select', table: 'users' });
} catch (error) {
  timer({ operation: 'select', table: 'users' });
  throw error;
}
```

## 🐳 Docker Commands

### Start Monitoring
```bash
docker-compose -f docker-compose.monitoring.dev.yml up -d
```

### Stop Monitoring
```bash
docker-compose -f docker-compose.monitoring.dev.yml down
```

### View Logs
```bash
docker-compose -f docker-compose.monitoring.dev.yml logs -f
```

### Check Status
```bash
docker-compose -f docker-compose.monitoring.dev.yml ps
```

## 📋 NPM Scripts

```bash
npm run monitoring:start    # Start monitoring stack
npm run monitoring:stop     # Stop monitoring stack
npm run monitoring:status   # Check monitoring services status
npm run monitoring:logs     # View monitoring logs
```

## 🔍 Troubleshooting

### Common Issues

1. **Port Conflicts**
   - Ensure ports 3000, 9090, 9100, 9121, 9187, 8080 are available
   - Check for existing services using these ports

2. **Network Issues**
   - Verify Docker network creation: `docker network ls`
   - Recreate network: `docker network rm haddi_monitoring_network_dev && docker network create haddi_monitoring_network_dev`

3. **Metrics Not Showing**
   - Check app metrics endpoint: `curl http://localhost:4545/metrics`
   - Verify Prometheus targets: http://localhost:9090/targets
   - Check Grafana datasource connection

4. **Grafana Login Issues**
   - Default credentials: admin/admin123
   - Reset password if needed: `docker exec -it haddi_grafana_dev grafana-cli admin reset-admin-password newpassword`

### Health Checks

```bash
# Check app health
curl http://localhost:4545/health

# Check Prometheus
curl http://localhost:9090/-/healthy

# Check Grafana
curl http://localhost:3001/api/health
```

## 🚀 Production Considerations

For production deployment:

1. **Security**
   - Change default passwords
   - Use environment variables for sensitive data
   - Implement authentication for monitoring endpoints

2. **Persistence**
   - Use persistent volumes for Prometheus and Grafana data
   - Implement backup strategies for monitoring data

3. **Scaling**
   - Consider Prometheus federation for multiple instances
   - Use Grafana Enterprise for advanced features

4. **Alerting**
   - Configure Prometheus alerting rules
   - Set up notification channels (Slack, email, etc.)

## 📚 Additional Resources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Node.js Metrics Best Practices](https://prometheus.io/docs/guides/nodejs/)
- [Docker Monitoring](https://docs.docker.com/config/daemon/prometheus/)

## 🤝 Contributing

To add new metrics or dashboards:

1. Update `src/services/metricsService.ts` with new metrics
2. Add corresponding panels to Grafana dashboard JSON
3. Update this documentation
4. Test locally before committing

---

**Note**: This monitoring setup is designed for development. For production, additional security, persistence, and scaling considerations should be implemented.
