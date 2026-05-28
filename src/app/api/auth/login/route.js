import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { signJWT } from '@/lib/auth';

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    // 1. Inputs validation
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // 2. Fetch corresponding user
    const normalizedEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // 3. Verify password hash
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // 3b. Verify blocked status
    if (user.isBlocked) {
      return NextResponse.json(
        { error: 'Your account has been blocked by an administrator.' },
        { status: 403 }
      );
    }

    // 4. Generate signed JWT session (including isVerified check claim!)
    const token = await signJWT({ 
      userId: user.id, 
      email: user.email, 
      role: user.role, 
      isVerified: user.isVerified 
    });

    const response = NextResponse.json(
      {
        message: 'Login successful',
        user: { 
          id: user.id, 
          email: user.email, 
          name: user.name, 
          role: user.role, 
          isBlocked: user.isBlocked,
          isVerified: user.isVerified
        },
      },
      { status: 200 }
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
    console.error('Login API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
