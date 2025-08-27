import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { asyncHandler } from '../utils/asyncHandler';
import logger from '../utils/logger';
import crypto from 'crypto';

const prisma = new PrismaClient();

// Submit deletion request
export const submitDeletionRequest = asyncHandler(async (req: Request, res: Response) => {
  const { deletionType, userInfo, dataTypes, reason, userId } = req.body;

  // Validate required fields
  if (!deletionType || !userInfo || !dataTypes || !Array.isArray(dataTypes)) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields: deletionType, userInfo, dataTypes'
    });
  }

  // Validate deletion type
  if (!['ACCOUNT', 'DATA'].includes(deletionType)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid deletionType. Must be "ACCOUNT" or "DATA"'
    });
  }

  // Validate data types
  const validDataTypes = ['personal', 'educational', 'activity', 'notifications'];
  const invalidTypes = dataTypes.filter(type => !validDataTypes.includes(type));
  if (invalidTypes.length > 0) {
    return res.status(400).json({
      success: false,
      message: `Invalid data types: ${invalidTypes.join(', ')}. Valid types are: ${validDataTypes.join(', ')}`
    });
  }

  // Generate verification code
  const verificationCode = crypto.randomBytes(4).toString('hex').toUpperCase();
  const verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  try {
    const deletionRequest = await prisma.deletionRequest.create({
      data: {
        deletionType: deletionType as 'ACCOUNT' | 'DATA',
        userInfo,
        dataTypes,
        reason,
        userId,
        verificationCode,
        verificationExpiresAt
      }
    });

    logger.info('Deletion request submitted', {
      requestId: deletionRequest.id,
      deletionType,
      email: userInfo.email,
      userId
    });

    res.status(201).json({
      success: true,
      requestId: deletionRequest.id,
      message: 'Deletion request submitted successfully',
      estimatedProcessingTime: '30-90 days'
    });
  } catch (error) {
    logger.error('Error submitting deletion request', { error, userInfo });
    res.status(500).json({
      success: false,
      message: 'Failed to submit deletion request'
    });
  }
});

// Get deletion request status
export const getDeletionRequestStatus = asyncHandler(async (req: Request, res: Response) => {
  const { requestId } = req.params;

  try {
    const deletionRequest = await prisma.deletionRequest.findUnique({
      where: { id: requestId }
    });

    if (!deletionRequest) {
      return res.status(404).json({
        success: false,
        message: 'Deletion request not found'
      });
    }

    // Calculate estimated completion date (30-90 days from submission)
    const estimatedCompletion = new Date(deletionRequest.submittedAt);
    estimatedCompletion.setDate(estimatedCompletion.getDate() + 60); // 60 days average

    res.json({
      requestId: deletionRequest.id,
      status: deletionRequest.status.toLowerCase(),
      submittedAt: deletionRequest.submittedAt.toISOString(),
      estimatedCompletion: estimatedCompletion.toISOString(),
      deletionType: deletionRequest.deletionType.toLowerCase(),
      dataTypes: deletionRequest.dataTypes
    });
  } catch (error) {
    logger.error('Error fetching deletion request status', { error, requestId });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch deletion request status'
    });
  }
});

// Cancel deletion request
export const cancelDeletionRequest = asyncHandler(async (req: Request, res: Response) => {
  const { requestId } = req.params;

  try {
    const deletionRequest = await prisma.deletionRequest.findUnique({
      where: { id: requestId }
    });

    if (!deletionRequest) {
      return res.status(404).json({
        success: false,
        message: 'Deletion request not found'
      });
    }

    if (deletionRequest.status === 'COMPLETED') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel a completed deletion request'
      });
    }

    if (deletionRequest.status === 'CANCELLED') {
      return res.status(400).json({
        success: false,
        message: 'Deletion request is already cancelled'
      });
    }

    await prisma.deletionRequest.update({
      where: { id: requestId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date()
      }
    });

    logger.info('Deletion request cancelled', { requestId });

    res.json({
      success: true,
      message: 'Deletion request cancelled successfully'
    });
  } catch (error) {
    logger.error('Error cancelling deletion request', { error, requestId });
    res.status(500).json({
      success: false,
      message: 'Failed to cancel deletion request'
    });
  }
});

// Verify deletion request
export const verifyDeletionRequest = asyncHandler(async (req: Request, res: Response) => {
  const { requestId } = req.params;
  const { verificationCode, userId } = req.body;

  if (!verificationCode) {
    return res.status(400).json({
      success: false,
      message: 'Verification code is required'
    });
  }

  try {
    const deletionRequest = await prisma.deletionRequest.findUnique({
      where: { id: requestId }
    });

    if (!deletionRequest) {
      return res.status(404).json({
        success: false,
        message: 'Deletion request not found'
      });
    }

    if (deletionRequest.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: 'Deletion request is not in pending status'
      });
    }

    if (!deletionRequest.verificationCode) {
      return res.status(400).json({
        success: false,
        message: 'No verification code found for this request'
      });
    }

    if (deletionRequest.verificationCode !== verificationCode) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification code'
      });
    }

    if (deletionRequest.verificationExpiresAt && deletionRequest.verificationExpiresAt < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Verification code has expired'
      });
    }

    await prisma.deletionRequest.update({
      where: { id: requestId },
      data: {
        status: 'VERIFIED',
        verifiedAt: new Date(),
        verificationCode: null, // Clear the code after verification
        verificationExpiresAt: null
      }
    });

    logger.info('Deletion request verified', { requestId, userId });

    res.json({
      success: true,
      message: 'Deletion request verified successfully'
    });
  } catch (error) {
    logger.error('Error verifying deletion request', { error, requestId });
    res.status(500).json({
      success: false,
      message: 'Failed to verify deletion request'
    });
  }
});

// Admin: Get all deletion requests
export const getAllDeletionRequests = asyncHandler(async (req: Request, res: Response) => {
  const { status, page = 1, limit = 10 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  try {
    const where = status ? { status: status as any } : {};

    const [deletionRequests, total] = await Promise.all([
      prisma.deletionRequest.findMany({
        where,
        orderBy: { submittedAt: 'desc' },
        skip,
        take: Number(limit),
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          }
        }
      }),
      prisma.deletionRequest.count({ where })
    ]);

    res.json({
      success: true,
      data: deletionRequests,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    logger.error('Error fetching deletion requests', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch deletion requests'
    });
  }
});

// Admin: Process deletion request
export const processDeletionRequest = asyncHandler(async (req: Request, res: Response) => {
  const { requestId } = req.params;
  const { adminNotes } = req.body;

  try {
    const deletionRequest = await prisma.deletionRequest.findUnique({
      where: { id: requestId }
    });

    if (!deletionRequest) {
      return res.status(404).json({
        success: false,
        message: 'Deletion request not found'
      });
    }

    if (deletionRequest.status !== 'VERIFIED') {
      return res.status(400).json({
        success: false,
        message: 'Deletion request must be verified before processing'
      });
    }

    await prisma.deletionRequest.update({
      where: { id: requestId },
      data: {
        status: 'PROCESSING',
        processedAt: new Date(),
        adminNotes
      }
    });

    logger.info('Deletion request processing started', { requestId, adminNotes });

    res.json({
      success: true,
      message: 'Deletion request processing started'
    });
  } catch (error) {
    logger.error('Error processing deletion request', { error, requestId });
    res.status(500).json({
      success: false,
      message: 'Failed to process deletion request'
    });
  }
});

// Admin: Complete deletion request
export const completeDeletionRequest = asyncHandler(async (req: Request, res: Response) => {
  const { requestId } = req.params;
  const { adminNotes } = req.body;

  try {
    const deletionRequest = await prisma.deletionRequest.findUnique({
      where: { id: requestId }
    });

    if (!deletionRequest) {
      return res.status(404).json({
        success: false,
        message: 'Deletion request not found'
      });
    }

    if (deletionRequest.status !== 'PROCESSING') {
      return res.status(400).json({
        success: false,
        message: 'Deletion request must be processing before completion'
      });
    }

    await prisma.deletionRequest.update({
      where: { id: requestId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        adminNotes: adminNotes || deletionRequest.adminNotes
      }
    });

    logger.info('Deletion request completed', { requestId, adminNotes });

    res.json({
      success: true,
      message: 'Deletion request completed successfully'
    });
  } catch (error) {
    logger.error('Error completing deletion request', { error, requestId });
    res.status(500).json({
      success: false,
      message: 'Failed to complete deletion request'
    });
  }
});
