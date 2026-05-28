import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyJWT } from '@/lib/auth';
import { sendOTPEmail } from '@/lib/mail';

/**
 * POST /api/auth/resend-otp
 * Regenerates and resends a 6-digit OTP verification code.
 * Logs the code to server console for testing convenience.
 */
export async function POST(request) {
  try {
    // 1. Auth check
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload || !payload.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = payload.userId;

    // Fetch user email details
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 2. Generate new OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    // 3. Upsert OTP record in transaction
    await prisma.$transaction(async (tx) => {
      // Clear existing code
      await tx.verificationOTP.deleteMany({ where: { userId } });

      // Create new code
      await tx.verificationOTP.create({
        data: {
          userId,
          code,
          expiresAt
        }
      });
    });

    // Send email verification code (real SMTP or fallback to console simulation)
    await sendOTPEmail(user.email, code);

    return NextResponse.json({ message: 'A new verification OTP code has been sent!' }, { status: 200 });

  } catch (error) {
    console.error('Resend OTP API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
