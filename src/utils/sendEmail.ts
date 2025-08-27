import nodemailer from 'nodemailer';
import logger from './logger';

export async function sendEmail(to: string, subject: string, text: string) {
  // Check if email credentials are configured
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    logger.warn('Email credentials not configured. Cannot send email.');
    throw new Error('Email service not configured - missing EMAIL_USER or EMAIL_PASS');
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Verify transporter configuration
    await transporter.verify();

    const result = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject,
      text,
    });

    logger.info('Email sent successfully to %s', to);
    return result;
  } catch (error) {
    logger.error('Failed to send email to %s: %s', to, error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      logger.error('Email error stack: %s', error.stack);
    }
    
    // Re-throw the error so calling code can handle it appropriately
    throw error;
  }
} 