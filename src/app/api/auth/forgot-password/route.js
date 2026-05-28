import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { sendPasswordResetEmail } from '@/lib/mail';

/**
 * POST /api/auth/forgot-password
 * Handles:
 * 1. Requesting a password reset OTP (action: "request")
 * 2. Resetting the password with the OTP code (action: "reset")
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { action, email, code, newPassword } = body;

    if (!action) {
      return NextResponse.json({ error: 'Action parameter is required.' }, { status: 400 });
    }

    if (!email) {
      return NextResponse.json({ error: 'Email address is required.' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 1. Fetch the user
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (!user) {
      // For security, don't explicitly leak that the email doesn't exist,
      // but in an academic workspace environment, let's return a clean informative error
      return NextResponse.json({ error: 'No student account found with this email.' }, { status: 404 });
    }

    // --- STEP 1: REQUEST PASSWORD RESET OTP ---
    if (action === 'request') {
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

      // Transaction: Delete any old OTP and create the new one
      await prisma.$transaction(async (tx) => {
        await tx.verificationOTP.deleteMany({
          where: { userId: user.id }
        });

        await tx.verificationOTP.create({
          data: {
            userId: user.id,
            code: otpCode,
            expiresAt
          }
        });
      });

      // Send the Password Reset email containing the OTP
      await sendPasswordResetEmail(normalizedEmail, otpCode);

      return NextResponse.json({
        message: 'A 6-digit numeric password reset OTP has been sent to your email.'
      }, { status: 200 });
    }

    // --- STEP 2: VERIFY OTP AND RESET PASSWORD ---
    if (action === 'reset') {
      if (!code || code.trim().length !== 6) {
        return NextResponse.json({ error: 'Please enter a valid 6-digit OTP code.' }, { status: 400 });
      }

      if (!newPassword || newPassword.length < 6) {
        return NextResponse.json({ error: 'New password must be at least 6 characters long.' }, { status: 400 });
      }

      // Fetch the active OTP record for the user
      const otpRecord = await prisma.verificationOTP.findUnique({
        where: { userId: user.id }
      });

      if (!otpRecord) {
        return NextResponse.json({ error: 'No active password reset request found. Please request a new OTP.' }, { status: 400 });
      }

      // Validate OTP match
      if (otpRecord.code !== code.trim()) {
        return NextResponse.json({ error: 'Incorrect verification OTP code.' }, { status: 400 });
      }

      // Check if OTP is expired
      if (new Date() > otpRecord.expiresAt) {
        // Delete expired OTP
        await prisma.verificationOTP.delete({ where: { userId: user.id } });
        return NextResponse.json({ error: 'Verification OTP code has expired. Please request a new one.' }, { status: 400 });
      }

      // Hash the new password
      const newPasswordHash = await bcrypt.hash(newPassword, 10);

      // Perform transaction: Update user's password, ensure they are verified (since they completed OTP email verification), and delete OTP
      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: user.id },
          data: { 
            passwordHash: newPasswordHash,
            isVerified: true // Auto-verify account since they successfully completed email verification
          }
        });

        await tx.verificationOTP.delete({
          where: { userId: user.id }
        });
      });

      return NextResponse.json({
        message: 'Your StudyHUB password has been successfully updated! You can now log in.'
      }, { status: 200 });
    }

    return NextResponse.json({ error: 'Invalid action parameter specified.' }, { status: 400 });

  } catch (error) {
    console.error('Password reset API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
