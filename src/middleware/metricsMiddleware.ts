import { Request, Response, NextFunction } from 'express';
import { httpRequestsTotal, httpRequestDuration } from '../services/metricsService';
import logger from '../utils/logger';

export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const route = req.route?.path || req.path || 'unknown';
  
  // Log that middleware is being triggered
  logger.debug(`Metrics middleware triggered for ${req.method} ${route}`);
  
  // Override the response methods to capture metrics
  const originalSend = res.send;
  const originalJson = res.json;
  const originalEnd = res.end;
  
  // Track if metrics have been captured
  let metricsCaptured = false;
  
  const captureMetrics = () => {
    if (metricsCaptured) return;
    metricsCaptured = true;
    
    const duration = (Date.now() - start) / 1000;
    
    try {
      logger.debug(`Capturing metrics for ${req.method} ${route} - duration: ${duration}s, status: ${res.statusCode}`);
      
      // Increment request counter
      httpRequestsTotal.inc({
        method: req.method,
        route: route,
        status_code: res.statusCode.toString()
      });
      
      // Record request duration
      httpRequestDuration.observe(
        { method: req.method, route: route },
        duration
      );
      
      // Log slow requests
      if (duration > 1) {
        logger.warn(`Slow request detected: ${req.method} ${route} took ${duration.toFixed(3)}s`);
      }
    } catch (error) {
      logger.error('Error capturing metrics:', error);
    }
  };
  
  // Override send method
  res.send = function(body: any) {
    captureMetrics();
    return originalSend.call(this, body);
  };
  
  // Override json method
  res.json = function(body: any) {
    captureMetrics();
    return originalJson.call(this, body);
  };
  
  // Override end method
  res.end = function(chunk?: any, encoding?: any) {
    captureMetrics();
    return originalEnd.call(this, chunk, encoding);
  };
  
  next();
};

export default metricsMiddleware;
