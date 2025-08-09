"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmail = sendEmail;
const nodemailer_1 = __importDefault(require("nodemailer"));
const logger_1 = __importDefault(require("./logger"));
async function sendEmail(to, subject, text) {
    // Check if email credentials are configured
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        logger_1.default.warn('Email credentials not configured. Cannot send email.');
        throw new Error('Email service not configured - missing EMAIL_USER or EMAIL_PASS');
    }
    try {
        const transporter = nodemailer_1.default.createTransport({
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
        logger_1.default.info('Email sent successfully to %s', to);
        return result;
    }
    catch (error) {
        logger_1.default.error('Failed to send email to %s: %o', to, error);
        // Re-throw the error so calling code can handle it appropriately
        throw error;
    }
}
