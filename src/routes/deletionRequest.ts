import express from 'express';
import {
  submitDeletionRequest,
  getDeletionRequestStatus,
  cancelDeletionRequest,
  verifyDeletionRequest,
  getAllDeletionRequests,
  processDeletionRequest,
  completeDeletionRequest
} from '../controllers/deletionRequestController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = express.Router();

// Public endpoints (no authentication required)
router.post('/', submitDeletionRequest);
router.get('/:requestId', getDeletionRequestStatus);
router.put('/:requestId/cancel', cancelDeletionRequest);
router.post('/:requestId/verify', verifyDeletionRequest);

// Admin endpoints (require authentication)
router.get('/', authenticateToken, getAllDeletionRequests);
router.put('/:requestId/process', authenticateToken, processDeletionRequest);
router.put('/:requestId/complete', authenticateToken, completeDeletionRequest);

export default router;
