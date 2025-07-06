import { prisma } from '../prisma/client';

const otpMap = new Map<string, { otp: string; expiresAt: number }>();
const verifiedEmails = new Set<string>();

export async function setOtp(email: string, otp: string) {
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
  await prisma.otp.upsert({
    where: { email },
    update: { otp, expiresAt },
    create: { email, otp, expiresAt }
  });
}

export async function verifyOtp(email: string, otp: string): Promise<boolean> {
  const entry = await prisma.otp.findUnique({ where: { email } });
  if (!entry) return false;
  if (entry.otp !== otp) return false;
  if (new Date() > entry.expiresAt) {
    await prisma.otp.delete({ where: { email } });
    return false;
  }
  await prisma.otp.delete({ where: { email } });
  return true;
}

export function isEmailVerified(email: string): boolean {
  return verifiedEmails.has(email);
}

export function clearEmailVerification(email: string) {
  verifiedEmails.delete(email);
} 