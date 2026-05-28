import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { signJWT } from '@/lib/auth';
import { sendOTPEmail } from '@/lib/mail';

export async function POST(request) {
  try {
    const { email, password, name } = await request.json();

    // 1. Inputs validation
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email address format' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    // 2. Check existing user
    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 400 }
      );
    }

    // 3. Hash password and insert record
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Use transaction to ensure user and OTP are created together
    const { user, otp } = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: normalizedEmail,
          passwordHash,
          name: name ? name.trim() : null,
          isVerified: false, // Explicit default
        },
      });

      // Generate 6-digit OTP code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

      const newOtp = await tx.verificationOTP.create({
        data: {
          userId: newUser.id,
          code,
          expiresAt,
        },
      });

      return { user: newUser, otp: newOtp };
    });

    // Send email verification code (real SMTP or fallback to console simulation)
    await sendOTPEmail(user.email, otp.code);

    // 4. Generate and sign session JWT token (with isVerified: false claim)
    const token = await signJWT({ 
      userId: user.id, 
      email: user.email, 
      role: user.role, 
      isVerified: false 
    });

    const response = NextResponse.json(
      {
        message: 'Signup successful. Please verify your email.',
        user: { 
          id: user.id, 
          email: user.email, 
          name: user.name, 
          role: user.role, 
          isBlocked: user.isBlocked,
          isVerified: false
        },
      },
      { status: 201 }
    );

    // 5. Establish secure session cookie
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days in seconds
    });

    return response;
  } catch (error) {
    console.error('Signup API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
