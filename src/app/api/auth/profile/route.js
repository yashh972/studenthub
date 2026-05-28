import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyJWT } from '@/lib/auth';

/**
 * PATCH /api/auth/profile
 * Allows verified students to update their profile settings (e.g. Display Name).
 */
export async function PATCH(request) {
  try {
    // 1. Authenticate session
    const tokenCookie = request.cookies.get('token');
    const token = tokenCookie ? tokenCookie.value : null;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload || !payload.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = payload.userId;
    const { name } = await request.json();

    if (name !== undefined && name.trim() === '') {
      return NextResponse.json({ error: 'Display Name cannot be empty.' }, { status: 400 });
    }

    // 2. Perform database update
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name: name ? name.trim() : null
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isBlocked: true,
        isVerified: true
      }
    });

    return NextResponse.json({
      message: 'Profile settings updated successfully!',
      user: updatedUser
    }, { status: 200 });

  } catch (error) {
    console.error('Update profile API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/auth/profile
 * Deletes the authenticated user's account from the database permanently.
 * Clears session cookies as well.
 */
export async function DELETE(request) {
  try {
    // 1. Authenticate session
    const tokenCookie = request.cookies.get('token');
    const token = tokenCookie ? tokenCookie.value : null;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload || !payload.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = payload.userId;

    // 2. Delete user from database (relations will cascade delete)
    await prisma.user.delete({
      where: { id: userId }
    });

    // 3. Clear session cookie
    const response = NextResponse.json({
      message: 'Account successfully deleted from Database.'
    }, { status: 200 });

    response.cookies.set('token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0 // Expire instantly
    });

    return response;

  } catch (error) {
    console.error('Delete profile account API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
