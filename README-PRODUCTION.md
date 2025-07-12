# Haddi Production Deployment with YugabyteDB

This document provides comprehensive instructions for deploying the Haddi application in production using YugabyteDB as the primary database.

## 🏗️ Architecture Overview

### Production Stack
- **Database**: YugabyteDB 3-node cluster (high availability)
- **Cache**: Redis cluster with master-replica setup
- **Application**: Node.js/TypeScript with Express
- **Reverse Proxy**: Nginx with SSL termination
- **Containerization**: Docker & Docker Compose

### High Availability Features
- 3-node YugabyteDB cluster with fault tolerance
- Redis master-replica setup for caching
- Nginx load balancing and SSL termination
- Health checks and automatic restarts
- Rate limiting and security headers

## 📋 Prerequisites

### System Requirements
- Docker Engine 20.10+
- Docker Compose 2.0+
- 8GB+ RAM (recommended)
- 50GB+ disk space
- Linux/Unix environment

### Required Software
- OpenSSL (for SSL certificate generation)
- curl (for health checks)
- bash (for deployment scripts)

## 🚀 Quick Start

### 1. Environment Setup

Create a `.env.production` file:

```bash
# Database Configuration
DB_PASSWORD=your_secure_database_password_here
YUGABYTE_PASSWORD=your_yugabyte_admin_password_here

# Redis Configuration
REDIS_PASSWORD=your_secure_redis_password_here

# JWT Configuration
JWT_SECRET=your_super_secure_jwt_secret_key_for_production

# AWS Configuration
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-production-s3-bucket-name

# Email Configuration
GMAIL_USER=your_gmail_user@gmail.com
GMAIL_PASS=your_gmail_app_password

# Application Configuration
NODE_ENV=production
PORT=4545
LOG_LEVEL=info
```

### 2. Deploy to Production

```bash
# Run the production deployment script
./deploy-prod.sh
```

The script will:
- Validate environment variables
- Generate SSL certificates (if needed)
- Start YugabyteDB cluster
- Initialize database
- Start Redis cluster
- Deploy the application
- Configure Nginx

### 3. Verify Deployment

```bash
# Check all services
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Test health endpoint
curl https://localhost/health
```

## 🔧 Manual Deployment

If you prefer manual deployment:

```bash
# 1. Start YugabyteDB cluster
docker-compose -f docker-compose.prod.yml up -d yb-master-1 yb-master-2 yb-master-3
docker-compose -f docker-compose.prod.yml up -d yb-tserver-1 yb-tserver-2 yb-tserver-3

# 2. Wait for cluster to be ready (2-3 minutes)
sleep 180

# 3. Initialize database
docker-compose -f docker-compose.prod.yml up db-init

# 4. Start Redis cluster
docker-compose -f docker-compose.prod.yml up -d redis-master redis-replica-1 redis-replica-2

# 5. Start application
docker-compose -f docker-compose.prod.yml up -d app_prod

# 6. Start Nginx
docker-compose -f docker-compose.prod.yml up -d nginx
```

## 🔒 Security Configuration

### SSL/TLS Setup
1. **Self-signed certificates** (development):
   ```bash
   openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
       -keyout ssl/key.pem -out ssl/cert.pem \
       -subj "/C=US/ST=State/L=City/O=Organization/CN=your-domain.com"
   ```

2. **Let's Encrypt certificates** (production):
   ```bash
   # Install certbot
   sudo apt-get install certbot

   # Generate certificates
   sudo certbot certonly --standalone -d your-domain.com
   
   # Copy certificates
   sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ssl/cert.pem
   sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem ssl/key.pem
   ```

### Firewall Configuration
```bash
# Allow necessary ports
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 4546/tcp  # Application port
sudo ufw allow 7000/tcp   # YugabyteDB Admin UI
sudo ufw enable
```

### Database Security
- Change default passwords
- Use strong, unique passwords
- Enable SSL connections
- Restrict network access
- Regular security updates

## 📊 Monitoring & Maintenance

### Health Checks
```bash
# Application health
curl https://your-domain.com/health

# Database connectivity
docker-compose -f docker-compose.prod.yml exec yb-tserver-1 ysqlsh -h localhost -p 5433 -U yugabyte -d yugabyte -c "\l"

# Redis connectivity
docker-compose -f docker-compose.prod.yml exec redis-master redis-cli -a your_redis_password ping
```

### Log Management
```bash
# View application logs
docker-compose -f docker-compose.prod.yml logs -f app_prod

# View database logs
docker-compose -f docker-compose.prod.yml logs -f yb-tserver-1

# View Nginx logs
docker-compose -f docker-compose.prod.yml logs -f nginx
```

### Backup Procedures
```bash
# Database backup
docker-compose -f docker-compose.prod.yml exec yb-tserver-1 ysql_dump -h localhost -p 5433 -U yugabyte -d haddi_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Application data backup
tar -czf uploads_backup_$(date +%Y%m%d_%H%M%S).tar.gz uploads/
```

### Updates & Maintenance
```bash
# Update application
git pull
docker-compose -f docker-compose.prod.yml build app_prod
docker-compose -f docker-compose.prod.yml up -d app_prod

# Update database
docker-compose -f docker-compose.prod.yml exec app_prod npx prisma migrate deploy

# Restart services
docker-compose -f docker-compose.prod.yml restart
```

## 🚨 Troubleshooting

### Common Issues

1. **YugabyteDB cluster not starting**
   ```bash
   # Check logs
   docker-compose -f docker-compose.prod.yml logs yb-master-1
   
   # Verify network connectivity
   docker network ls
   docker network inspect haddi_yb_prod_network
   ```

2. **Application not connecting to database**
   ```bash
   # Check database connectivity
   docker-compose -f docker-compose.prod.yml exec app_prod ysqlsh -h yb-tserver-1 -p 5433 -U haddi_user -d haddi_db
   
   # Verify environment variables
   docker-compose -f docker-compose.prod.yml exec app_prod env | grep DATABASE_URL
   ```

3. **SSL certificate issues**
   ```bash
   # Check certificate validity
   openssl x509 -in ssl/cert.pem -text -noout
   
   # Test SSL connection
   openssl s_client -connect localhost:443 -servername your-domain.com
   ```

### Performance Tuning

1. **Database Optimization**
   ```sql
   -- Check slow queries
   SELECT * FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;
   
   -- Analyze table statistics
   ANALYZE;
   ```

2. **Application Optimization**
   - Enable Redis caching
   - Use connection pooling
   - Implement rate limiting
   - Monitor memory usage

3. **Nginx Optimization**
   - Enable gzip compression
   - Configure caching headers
   - Tune worker processes

## 📈 Scaling

### Horizontal Scaling
```bash
# Scale application instances
docker-compose -f docker-compose.prod.yml up -d --scale app_prod=3

# Add more YugabyteDB nodes
# (Requires cluster reconfiguration)
```

### Vertical Scaling
- Increase container memory limits
- Add more CPU cores
- Optimize database queries
- Use CDN for static assets

## 🔄 Disaster Recovery

### Backup Strategy
1. **Daily database backups**
2. **Weekly full system backups**
3. **Real-time log backups**
4. **Configuration backups**

### Recovery Procedures
1. **Database recovery**
2. **Application rollback**
3. **SSL certificate renewal**
4. **Infrastructure restoration**

## 📞 Support

For production issues:
1. Check logs first
2. Verify network connectivity
3. Test individual components
4. Review recent changes
5. Contact system administrator

## 📚 Additional Resources

- [YugabyteDB Documentation](https://docs.yugabyte.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Nginx Configuration Guide](https://nginx.org/en/docs/)
- [Node.js Production Best Practices](https://nodejs.org/en/docs/guides/nodejs-docker-webapp/) 