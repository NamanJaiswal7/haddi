import redisService from '../services/redisService';
import { logger } from './logger';

const OTP_TTL = 5 * 60; // 5 minutes in seconds
const VERIFIED_EMAIL_TTL = 24 * 60 * 60; // 24 hours in seconds

export async function setOtp(email: string, otp: string): Promise<void> {
  try {
    const otpKey = `otp:${email}`;
    const otpData = {
      otp,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + OTP_TTL * 1000).toISOString()
    };
    
    await redisService.setObject(otpKey, otpData, OTP_TTL);
    logger.info(`OTP set for email: ${email}`);
  } catch (error) {
    logger.error('Error setting OTP:', error);
    throw error;
  }
}

export async function verifyOtp(email: string, otp: string): Promise<boolean> {
  try {
    const otpKey = `otp:${email}`;
    const otpData = await redisService.getObject<{
      otp: string;
      createdAt: string;
      expiresAt: string;
    }>(otpKey);
    
    if (!otpData) {
      logger.warn(`No OTP found for email: ${email}`);
      return false;
    }
    
    if (otpData.otp !== otp) {
      logger.warn(`Invalid OTP for email: ${email}`);
      return false;
    }
    
    const expiresAt = new Date(otpData.expiresAt);
    if (new Date() > expiresAt) {
      logger.warn(`OTP expired for email: ${email}`);
      await redisService.del(otpKey);
      return false;
    }
    
    // OTP is valid, delete it and mark email as verified
    await redisService.del(otpKey);
    await markEmailAsVerified(email);
    
    logger.info(`OTP verified for email: ${email}`);
    return true;
  } catch (error) {
    logger.error('Error verifying OTP:', error);
    return false;
  }
}

export async function isEmailVerified(email: string): Promise<boolean> {
  try {
    const verifiedKey = `verified_email:${email}`;
    return await redisService.exists(verifiedKey);
  } catch (error) {
    logger.error('Error checking email verification:', error);
    return false;
  }
}

export async function markEmailAsVerified(email: string): Promise<void> {
  try {
    const verifiedKey = `verified_email:${email}`;
    const verifiedData = {
      verifiedAt: new Date().toISOString(),
      email
    };
    
    await redisService.setObject(verifiedKey, verifiedData, VERIFIED_EMAIL_TTL);
    logger.info(`Email marked as verified: ${email}`);
  } catch (error) {
    logger.error('Error marking email as verified:', error);
    throw error;
  }
}

export async function clearEmailVerification(email: string): Promise<void> {
  try {
    const verifiedKey = `verified_email:${email}`;
    await redisService.del(verifiedKey);
    logger.info(`Email verification cleared: ${email}`);
  } catch (error) {
    logger.error('Error clearing email verification:', error);
  }
}

export async function getOtpInfo(email: string): Promise<{
  otp: string;
  createdAt: string;
  expiresAt: string;
  remainingTime: number;
} | null> {
  try {
    const otpKey = `otp:${email}`;
    const otpData = await redisService.getObject<{
      otp: string;
      createdAt: string;
      expiresAt: string;
    }>(otpKey);
    
    if (!otpData) {
      return null;
    }
    
    const expiresAt = new Date(otpData.expiresAt);
    const remainingTime = Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / 1000));
    
    return {
      ...otpData,
      remainingTime
    };
  } catch (error) {
    logger.error('Error getting OTP info:', error);
    return null;
  }
}

export async function resendOtp(email: string): Promise<boolean> {
  try {
    const otpKey = `otp:${email}`;
    const otpData = await redisService.getObject<{
      otp: string;
      createdAt: string;
      expiresAt: string;
    }>(otpKey);
    
    if (!otpData) {
      return false;
    }
    
    const createdAt = new Date(otpData.createdAt);
    const timeSinceCreation = Date.now() - createdAt.getTime();
    const minResendInterval = 60 * 1000; // 1 minute minimum interval
    
    if (timeSinceCreation < minResendInterval) {
      logger.warn(`OTP resend too soon for email: ${email}`);
      return false;
    }
    
    // Update creation time for the new OTP
    const newOtpData = {
      ...otpData,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + OTP_TTL * 1000).toISOString()
    };
    
    await redisService.setObject(otpKey, newOtpData, OTP_TTL);
    logger.info(`OTP resent for email: ${email}`);
    return true;
  } catch (error) {
    logger.error('Error resending OTP:', error);
    return false;
  }
}

export async function clearExpiredOtps(): Promise<void> {
  try {
    // Redis automatically handles expiration, but we can add custom cleanup logic here
    logger.info('OTP cleanup task executed');
  } catch (error) {
    logger.error('Error during OTP cleanup:', error);
  }
}

export async function getOtpStats(): Promise<{
  totalActiveOtps: number;
  totalVerifiedEmails: number;
  redisStatus: boolean;
}> {
  try {
    const redisStatus = redisService.getConnectionStatus();
    
    // This is a simplified version - in production you might want more detailed stats
    return {
      totalActiveOtps: 0, // Would need to implement scanning logic
      totalVerifiedEmails: 0, // Would need to implement scanning logic
      redisStatus
    };
  } catch (error) {
    logger.error('Error getting OTP stats:', error);
    return {
      totalActiveOtps: 0,
      totalVerifiedEmails: 0,
      redisStatus: false
    };
  }
} 