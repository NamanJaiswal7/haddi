import logger from '../utils/logger';

export function requestLogger(req, res, next) {
  logger.info(`${req.method} ${req.originalUrl}`, { body: req.body, user: req.user?.id });
  next();
} 