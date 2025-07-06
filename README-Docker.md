# Docker Setup Guide for Haddi Application

This guide explains how to set up and run the Haddi application using Docker for both development and production environments.

## Prerequisites

- Docker (version 20.10 or higher)
- Docker Compose (version 2.0 or higher)
- At least 4GB of available RAM
- 10GB of available disk space

## Quick Start

### Development Environment

1. **Clone the repository and navigate to the project directory:**
   ```bash
   cd haddi
   ```

2. **Start the development environment:**
   ```bash
   npm run docker:dev:build
   ```

   This will:
   - Build the development Docker image
   - Start PostgreSQL database
   - Start Redis cache
   - Start the application with hot reloading
   - Run database migrations automatically

3. **Access the application:**
   - API: http://localhost:4545
   - PostgreSQL: localhost:5432
   - Redis: localhost:6379

### Production Environment

1. **Start the production environment:**
   ```bash
   npm run docker:prod:build
   ```

2. **Access the application:**
   - API: http://localhost:4546 (different port to avoid conflicts)
   - With Nginx: http://localhost:80

## Environment Variables

Create a `.env` file in the project root with the following variables:

```env
# Database
DATABASE_URL=postgresql://haddi_user:haddi_password@postgres:5432/haddi_db

# JWT
JWT_SECRET=your_very_secure_jwt_secret_here

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
```

## Available Scripts

### Development Scripts
- `npm run docker:dev` - Start development environment
- `npm run docker:dev:build` - Build and start development environment
- `npm run docker:logs` - View application logs
- `npm run docker:db:migrate` - Run database migrations
- `npm run docker:db:seed` - Seed the database
- `npm run docker:db:studio` - Open Prisma Studio

### Production Scripts
- `npm run docker:prod` - Start production environment
- `npm run docker:prod:build` - Build and start production environment

### Utility Scripts
- `npm run docker:down` - Stop all containers
- `npm run docker:clean` - Stop and remove all containers, volumes, and networks

## Database Management

### Running Migrations
```bash
npm run docker:db:migrate
```

### Seeding the Database
```bash
npm run docker:db:seed
```

### Accessing Prisma Studio
```bash
npm run docker:db:studio
```
Then open http://localhost:5555 in your browser.

### Direct Database Access
```bash
docker-compose exec postgres psql -U haddi_user -d haddi_db
```

## File Structure

```
haddi/
├── Dockerfile              # Production Docker image
├── Dockerfile.dev          # Development Docker image
├── docker-compose.yml      # Main Docker Compose configuration
├── docker-compose.override.yml  # Development overrides
├── .dockerignore           # Files to exclude from Docker build
├── init-db.sql            # Database initialization script
├── nginx.conf             # Nginx configuration for production
└── README-Docker.md       # This file
```

## Troubleshooting

### Common Issues

1. **Port already in use:**
   ```bash
   # Check what's using the port
   lsof -i :4545
   
   # Kill the process or change the port in docker-compose.yml
   ```

2. **Database connection issues:**
   ```bash
   # Check if PostgreSQL is running
   docker-compose ps
   
   # Check PostgreSQL logs
   docker-compose logs postgres
   ```

3. **Permission issues:**
   ```bash
   # Fix file permissions
   sudo chown -R $USER:$USER .
   ```

4. **Out of memory:**
   ```bash
   # Increase Docker memory limit in Docker Desktop settings
   # Or reduce the number of worker processes in src/index.ts
   ```

### Logs and Debugging

View logs for specific services:
```bash
# Application logs
docker-compose logs app_dev

# Database logs
docker-compose logs postgres

# All logs
docker-compose logs

# Follow logs in real-time
docker-compose logs -f
```

### Container Management

```bash
# Stop all containers
docker-compose down

# Stop and remove volumes
docker-compose down -v

# Rebuild images
docker-compose build --no-cache

# Remove all containers and images
docker system prune -a
```

## Production Deployment

### Using Docker Compose

1. **Set environment variables:**
   ```bash
   export NODE_ENV=production
   export JWT_SECRET=your_secure_secret
   # ... other environment variables
   ```

2. **Start production services:**
   ```bash
   npm run docker:prod:build
   ```

### Using Docker Swarm (Advanced)

1. **Initialize Docker Swarm:**
   ```bash
   docker swarm init
   ```

2. **Deploy the stack:**
   ```bash
   docker stack deploy -c docker-compose.yml haddi
   ```

### Using Kubernetes (Advanced)

1. **Create Kubernetes manifests from docker-compose.yml**
2. **Apply the manifests:**
   ```bash
   kubectl apply -f k8s/
   ```

## Security Considerations

1. **Change default passwords** in production
2. **Use environment variables** for sensitive data
3. **Enable HTTPS** in production
4. **Regular security updates** for base images
5. **Network segmentation** using Docker networks
6. **Resource limits** to prevent DoS attacks

## Performance Optimization

1. **Use multi-stage builds** (already implemented)
2. **Optimize layer caching** (already implemented)
3. **Use Alpine Linux** base images (already implemented)
4. **Enable gzip compression** (configured in nginx.conf)
5. **Implement caching strategies** (Redis included)
6. **Monitor resource usage:**
   ```bash
   docker stats
   ```

## Backup and Recovery

### Database Backup
```bash
# Create backup
docker-compose exec postgres pg_dump -U haddi_user haddi_db > backup.sql

# Restore backup
docker-compose exec -T postgres psql -U haddi_user haddi_db < backup.sql
```

### Volume Backup
```bash
# Backup volumes
docker run --rm -v haddi_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres_backup.tar.gz -C /data .

# Restore volumes
docker run --rm -v haddi_postgres_data:/data -v $(pwd):/backup alpine tar xzf /backup/postgres_backup.tar.gz -C /data
```

## Monitoring and Health Checks

The application includes health checks for:
- Application: `/health` endpoint
- PostgreSQL: Connection test
- Redis: Ping test

Monitor health status:
```bash
docker-compose ps
```

## Support

For issues related to:
- **Docker setup**: Check this guide and Docker documentation
- **Application issues**: Check application logs and documentation
- **Database issues**: Check PostgreSQL logs and Prisma documentation 