export const redisConfig = {
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  
  // Connection settings
  connectionTimeout: parseInt(process.env.REDIS_CONNECTION_TIMEOUT || '10000'),
  retryDelayOnFailover: parseInt(process.env.REDIS_RETRY_DELAY || '100'),
  maxRetriesPerRequest: parseInt(process.env.REDIS_MAX_RETRIES || '3'),
  
  // Session settings
  sessionTTL: parseInt(process.env.SESSION_TTL || '86400'), // 24 hours
  maxSessionsPerUser: parseInt(process.env.MAX_SESSIONS_PER_USER || '5'),
  
  // Cache settings
  defaultCacheTTL: parseInt(process.env.DEFAULT_CACHE_TTL || '1800'), // 30 minutes
  courseCacheTTL: parseInt(process.env.COURSE_CACHE_TTL || '3600'), // 1 hour
  userCacheTTL: parseInt(process.env.USER_CACHE_TTL || '900'), // 15 minutes
  
  // Rate limiting settings
  rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '900000'), // 15 minutes
  maxRequestsPerWindow: parseInt(process.env.MAX_REQUESTS_PER_WINDOW || '100'),
  
  // OTP settings
  otpTTL: parseInt(process.env.OTP_TTL || '300'), // 5 minutes
  verifiedEmailTTL: parseInt(process.env.VERIFIED_EMAIL_TTL || '86400'), // 24 hours
};
