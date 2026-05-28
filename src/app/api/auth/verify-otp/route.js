import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyJWT, signJWT } from '@/lib/auth';

/**
 * POST /api/auth/verify-otp
 * Verifies the 6-digit OTP code submitted by the user.
 * Upon success, escalates account status to verified and updates JWT cookie.
 */
export async function POST(request) {
  try {
    // 1. Auth check
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized. Please log in first.' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload || !payload.userId) {
      return NextResponse.json({ error: 'Unauthorized. Invalid session.' }, { status: 401 });
    }

    const userId = payload.userId;
    const { code } = await request.json();

    if (!code || typeof code !== 'string' || code.trim().length !== 6) {
      return NextResponse.json({ error: 'Please enter a valid 6-digit OTP code.' }, { status: 400 });
    }

    const trimmedCode = code.trim();

    // 2. Fetch active verification OTP
    const verificationRecord = await prisma.verificationOTP.findUnique({
      where: { userId }
    });

    if (!verificationRecord) {
      return NextResponse.json({ error: 'No verification code found. Please request a new one.' }, { status: 404 });
    }

    // 3. Match code checks
    if (verificationRecord.code !== trimmedCode) {
      return NextResponse.json({ error: 'Incorrect verification code. Please try again.' }, { status: 400 });
    }

    // 4. Expiration check
    if (new Date() > new Date(verificationRecord.expiresAt)) {
      return NextResponse.json({ error: 'Verification code has expired. Please request a new code.' }, { status: 400 });
    }

    // 5. Update user status and delete verification OTP in transaction
    const user = await prisma.$transaction(async (tx) => {
      // Delete OTP
      await tx.verificationOTP.delete({ where: { userId } });

      // Update User
      return await tx.user.update({
        where: { id: userId },
        data: { isVerified: true }
      });
    });

    // 6. Sign new session JWT containing verified: true status!
    const newToken = await signJWT({ 
      userId: user.id, 
      email: user.email, 
      role: user.role, 
      isVerified: true 
    });

    const response = NextResponse.json({
      message: 'Account verified successfully!',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isBlocked: user.isBlocked,
        isVerified: true
      }
    }, { status: 200 });

    // 7. Re-issue secure JWT token cookie
    response.cookies.set('token', newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days in seconds
    });

    return response;

  } catch (error) {
    console.error('Verify OTP API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
