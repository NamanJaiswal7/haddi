# Redis Implementation Guide

This document outlines the Redis implementation for the Haddi application, including session management, caching, rate limiting, and OTP storage.

## Overview

Redis has been integrated into the Haddi application to provide:
- **Session Management**: JWT token validation, user sessions, and token blacklisting
- **Caching**: Course data, user data, and frequently accessed information
- **Rate Limiting**: API rate limiting for security and abuse prevention
- **OTP Storage**: Temporary OTP storage with automatic expiration
- **User Activity Tracking**: Real-time user activity monitoring

## Architecture

### Services

1. **RedisService** (`src/services/redisService.ts`)
   - Core Redis connection management
   - Connection pooling and error handling
   - Automatic reconnection strategies

2. **SessionService** (`src/services/sessionService.ts`)
   - User session management
   - JWT token blacklisting
   - Multi-device session support

3. **CacheService** (`src/services/cacheService.ts`)
   - Data caching with TTL
   - Cache invalidation strategies
   - Cache warming capabilities

4. **RateLimitService** (`src/services/rateLimitService.ts`)
   - API rate limiting
   - Configurable rate limit rules
   - IP blocking capabilities

### Middleware

- **RedisMiddleware** (`src/middleware/redisMiddleware.ts`)
  - Rate limiting middleware
  - Session validation
  - Cache management
  - Health checks

## Configuration

### Environment Variables

```bash
# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Session Configuration
SESSION_TTL=86400          # 24 hours
MAX_SESSIONS_PER_USER=5

# Cache Configuration
DEFAULT_CACHE_TTL=1800     # 30 minutes
COURSE_CACHE_TTL=3600      # 1 hour
USER_CACHE_TTL=900         # 15 minutes

# Rate Limiting
RATE_LIMIT_WINDOW=900000   # 15 minutes
MAX_REQUESTS_PER_WINDOW=100

# OTP Configuration
OTP_TTL=300               # 5 minutes
VERIFIED_EMAIL_TTL=86400   # 24 hours
```

### Docker Configuration

Redis is configured in both development and production Docker Compose files:

```yaml
redis:
  image: redis:7-alpine
  container_name: haddi_redis
  restart: unless-stopped
  ports:
    - "6379:6379"
  volumes:
    - redis_data:/data
  healthcheck:
    test: ["CMD", "redis-cli", "ping"]
    interval: 10s
    timeout: 5s
    retries: 5
```

## Usage

### Session Management

```typescript
import sessionService from '../services/sessionService';

// Create a new session
await sessionService.createSession(token, {
  userId: user.id,
  role: user.role,
  lastActive: new Date(),
  deviceInfo: req.get('User-Agent'),
  ipAddress: req.ip
});

// Check if token is valid
const isValid = await sessionService.isTokenValid(token);

// Invalidate session (logout)
await sessionService.invalidateSession(token);

// Force logout from all devices
await sessionService.invalidateAllUserSessions(userId);
```

### Caching

```typescript
import cacheService from '../services/cacheService';

// Cache course data
await cacheService.cacheCourse(courseId, courseData);

// Get cached course
const course = await cacheService.getCachedCourse(courseId);

// Invalidate cache
await cacheService.invalidateCourseCache(courseId);

// Cache with custom TTL
await cacheService.cacheData('custom_key', data, 3600); // 1 hour
```

### Rate Limiting

```typescript
import rateLimitService from '../services/rateLimitService';

// Check rate limit
const result = await rateLimitService.checkRateLimit(identifier, 'api');

if (!result.allowed) {
  // Handle rate limit exceeded
  return res.status(429).json({
    error: 'Rate limit exceeded',
    retryAfter: result.retryAfter
  });
}

// Block malicious IP
await rateLimitService.blockIdentifier(ipAddress, 'global', 3600);
```

### OTP Management

```typescript
import { setOtp, verifyOtp, isEmailVerified } from '../utils/otpStore';

// Set OTP
await setOtp(email, otp);

// Verify OTP
const isValid = await verifyOtp(email, otp);

// Check if email is verified
const verified = await isEmailVerified(email);
```

## API Endpoints

### Health Check
```
GET /health
```
Returns application and Redis health status.

### Redis Status
```
GET /api/redis/status
```
Returns Redis connection status and ping response.

### Redis Statistics
```
GET /api/redis/stats
```
Returns comprehensive Redis statistics including session, cache, and rate limiting stats.

## Monitoring and Health Checks

### Redis Health Check Script

```bash
npm run redis:health
```

This script tests:
- Connection establishment
- Basic Redis operations (SET/GET, TTL, HASH, SET, INCR)
- Redis information retrieval
- Connection cleanup

### Health Check Commands

```bash
# Check Redis health
npm run redis:health

# Get Redis status via API
npm run redis:status

# Get Redis statistics
npm run redis:stats

# Health check with Redis info
npm run health:check
```

## Performance Considerations

### Caching Strategy

1. **Course Data**: Cache for 1 hour (frequently accessed, rarely changed)
2. **User Data**: Cache for 15 minutes (moderately accessed, occasionally changed)
3. **Quiz Data**: Cache for 24 hours (rarely changed)
4. **Statistics**: Cache for 5 minutes (real-time data)

### Session Management

- Sessions expire after 24 hours
- Maximum 5 active sessions per user
- Automatic cleanup of expired sessions
- Token blacklisting for security

### Rate Limiting

- Global: 1000 requests per 15 minutes
- API: 200 requests per 15 minutes
- Auth: 5 requests per 15 minutes
- Upload: 10 requests per hour
- Admin: 50 requests per 15 minutes

## Security Features

1. **Token Blacklisting**: Invalidated tokens are blacklisted
2. **Session Validation**: Multi-layer session validation
3. **Rate Limiting**: Protection against abuse and DDoS
4. **IP Blocking**: Temporary blocking of malicious IPs
5. **Secure OTP**: Time-limited OTP with resend restrictions

## Error Handling

The Redis implementation includes comprehensive error handling:

- Connection failures don't crash the application
- Fallback to database when Redis is unavailable
- Graceful degradation of features
- Detailed logging for debugging

## Development and Testing

### Local Development

```bash
# Start Redis with Docker
docker-compose -f docker-compose.dev.yml up -d redis

# Run Redis health check
npm run redis:health

# Start application
npm run dev
```

### Testing Redis

```bash
# Test Redis connection
npm run test:redis

# Check Redis status
curl http://localhost:4545/api/redis/status

# Monitor Redis logs
docker-compose -f docker-compose.dev.yml logs -f redis
```

## Production Deployment

### AWS ElastiCache

For production, consider using AWS ElastiCache Redis:

1. Create Redis subnet group
2. Configure security groups
3. Set up Redis cluster
4. Update environment variables

### Monitoring

- Redis connection status
- Cache hit/miss ratios
- Rate limiting statistics
- Session counts
- Memory usage

## Troubleshooting

### Common Issues

1. **Connection Refused**
   - Check if Redis container is running
   - Verify port configuration
   - Check firewall settings

2. **Memory Issues**
   - Monitor Redis memory usage
   - Adjust TTL values
   - Implement cache eviction policies

3. **Performance Issues**
   - Check cache hit ratios
   - Optimize cache keys
   - Monitor Redis operations

### Debug Commands

```bash
# Check Redis logs
docker-compose logs redis

# Connect to Redis CLI
docker exec -it haddi_redis redis-cli

# Monitor Redis operations
docker exec -it haddi_redis redis-cli monitor

# Check Redis info
docker exec -it haddi_redis redis-cli info
```

## Future Enhancements

1. **Redis Cluster**: Support for Redis cluster mode
2. **Advanced Caching**: Implement cache warming and predictive caching
3. **Analytics**: Redis-based analytics and metrics
4. **Pub/Sub**: Real-time notifications and messaging
5. **Backup**: Automated Redis data backup strategies

## Conclusion

The Redis implementation provides a robust foundation for:
- Scalable session management
- Efficient data caching
- Secure rate limiting
- Reliable OTP storage

This implementation ensures the Haddi application can handle high traffic while maintaining security and performance standards.
