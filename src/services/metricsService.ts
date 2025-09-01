import logger from '../utils/logger';

// Simple metrics storage for development
class SimpleMetricsService {
  private metrics: Map<string, number> = new Map();
  private timers: Map<string, number> = new Map();

  // HTTP request metrics
  incrementHttpRequests(method: string, route: string, statusCode: number) {
    const key = `http_requests_total{method="${method}",route="${route}",status_code="${statusCode}"}`;
    this.metrics.set(key, (this.metrics.get(key) || 0) + 1);
  }

  recordHttpDuration(method: string, route: string, duration: number) {
    const key = `http_request_duration_seconds{method="${method}",route="${route}"}`;
    this.metrics.set(key, duration);
  }

  // Business metrics
  incrementUserRegistrations(userType: string) {
    const key = `user_registrations_total{user_type="${userType}"}`;
    this.metrics.set(key, (this.metrics.get(key) || 0) + 1);
  }

  incrementCourseCompletions(courseLevel: string) {
    const key = `course_completions_total{course_level="${courseLevel}"}`;
    this.metrics.set(key, (this.metrics.get(key) || 0) + 1);
  }

  // Error metrics
  incrementErrors(type: string, endpoint: string) {
    const key = `errors_total{type="${type}",endpoint="${endpoint}"}`;
    this.metrics.set(key, (this.metrics.get(key) || 0) + 1);
  }

  // Memory metrics
  recordMemoryUsage() {
    const memUsage = process.memoryUsage();
    this.metrics.set('memory_usage_bytes{type="rss"}', memUsage.rss);
    this.metrics.set('memory_usage_bytes{type="heapTotal"}', memUsage.heapTotal);
    this.metrics.set('memory_usage_bytes{type="heapUsed"}', memUsage.heapUsed);
    this.metrics.set('memory_usage_bytes{type="external"}', memUsage.external);
  }

  // Get metrics in Prometheus format
  getMetrics(): string {
    this.recordMemoryUsage();
    
    let output = '';
    
    // Debug: log what metrics are stored
    logger.debug(`Total metrics stored: ${this.metrics.size}`);
    this.metrics.forEach((value, key) => {
      logger.debug(`Metric: ${key} = ${value}`);
    });
    
    // Sort metrics by name for better readability
    const sortedKeys = Array.from(this.metrics.keys()).sort();
    
    sortedKeys.forEach(key => {
      const value = this.metrics.get(key);
      if (value !== undefined) {
        output += `${key} ${value}\n`;
      }
    });
    
    // Add process metrics
    const cpuUsage = process.cpuUsage();
    output += `process_cpu_usage{type="user"} ${cpuUsage.user}\n`;
    output += `process_cpu_usage{type="system"} ${cpuUsage.system}\n`;
    output += `process_uptime_seconds ${process.uptime()}\n`;
    
    logger.debug(`Final metrics output length: ${output.length}`);
    
    return output;
  }

  // Reset metrics (useful for testing)
  reset(): void {
    this.metrics.clear();
    this.timers.clear();
  }
}

export const metricsService = new SimpleMetricsService();

// Export individual metric functions for convenience
export const httpRequestsTotal = {
  inc: (labels: { method: string; route: string; status_code: string }) => {
    metricsService.incrementHttpRequests(labels.method, labels.route, labels.status_code);
  }
};

export const httpRequestDuration = {
  observe: (labels: { method: string; route: string }, value: number) => {
    metricsService.recordHttpDuration(labels.method, labels.route, value);
  }
};

export const userRegistrationsTotal = {
  inc: (labels: { user_type: string }) => {
    metricsService.incrementUserRegistrations(labels.user_type);
  }
};

export const courseCompletionsTotal = {
  inc: (labels: { course_level: string }) => {
    metricsService.incrementCourseCompletions(labels.course_level);
  }
};

export const errorsTotal = {
  inc: (labels: { type: string; endpoint: string }) => {
    metricsService.incrementErrors(labels.type, labels.endpoint);
  }
};

export const getMetrics = async (): Promise<string> => {
  try {
    return metricsService.getMetrics();
  } catch (error) {
    logger.error('Error collecting metrics:', error);
    throw error;
  }
};

export const resetMetrics = (): void => {
  metricsService.reset();
};

logger.info('Simple metrics service initialized');
