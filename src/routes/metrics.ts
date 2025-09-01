import { Router } from 'express';
import { getMetrics } from '../services/metricsService';
import logger from '../utils/logger';

const router = Router();

// Metrics endpoint for Prometheus
router.get('/', async (req, res) => {
  try {
    const metrics = await getMetrics();
    res.set('Content-Type', 'text/plain');
    res.send(metrics);
  } catch (error) {
    logger.error('Error serving metrics:', error);
    res.status(500).json({ error: 'Failed to collect metrics' });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

export default router;
