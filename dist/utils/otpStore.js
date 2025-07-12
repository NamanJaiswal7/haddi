"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setOtp = setOtp;
exports.verifyOtp = verifyOtp;
exports.isEmailVerified = isEmailVerified;
exports.clearEmailVerification = clearEmailVerification;
const client_1 = require("../prisma/client");
const otpMap = new Map();
const verifiedEmails = new Set();
async function setOtp(email, otp) {
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await client_1.prisma.otp.upsert({
        where: { email },
        update: { otp, expiresAt },
        create: { email, otp, expiresAt }
    });
}
async function verifyOtp(email, otp) {
    const entry = await client_1.prisma.otp.findUnique({ where: { email } });
    if (!entry)
        return false;
    if (entry.otp !== otp)
        return false;
    if (new Date() > entry.expiresAt) {
        await client_1.prisma.otp.delete({ where: { email } });
        return false;
    }
    await client_1.prisma.otp.delete({ where: { email } });
    return true;
}
function isEmailVerified(email) {
    return verifiedEmails.has(email);
}
function clearEmailVerification(email) {
    verifiedEmails.delete(email);
}
