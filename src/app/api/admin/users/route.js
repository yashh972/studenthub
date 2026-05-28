import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyJWT } from '@/lib/auth';

export async function GET(request) {
  try {
    // Auth Check
    const tokenCookie = request.cookies.get('token');
    const token = tokenCookie ? tokenCookie.value : null;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    // 1. Fetch single user detailed audit logs
    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isBlocked: true,
          createdAt: true,
          notes: {
            select: { id: true, title: true, isPublic: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
          pdfUploads: {
            select: { id: true, name: true, url: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
          quizSessions: {
            select: { id: true, score: true, createdAt: true, note: { select: { title: true } } },
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
          reportsReceived: {
            select: {
              id: true,
              reason: true,
              createdAt: true,
              reporter: {
                select: { name: true, email: true }
              }
            },
            orderBy: { createdAt: 'desc' }
          },
        },
      });

      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      return NextResponse.json({ user });
    }

    // 2. Fetch standard user directory
    const search = searchParams.get('search') || '';

    // Query users with optional search and include counts
    const users = await prisma.user.findMany({
      where: search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {},
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isBlocked: true,
        createdAt: true,
        _count: {
          select: {
            notes: true,
            pdfUploads: true,
            quizSessions: true,
            reportsReceived: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Admin Users GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    // Auth Check
    const tokenCookie = request.cookies.get('token');
    const token = tokenCookie ? tokenCookie.value : null;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { userId, action, role } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Prevent self-modification that would lock admin out
    if (userId === payload.userId) {
      return NextResponse.json(
        { error: 'Self-modification of administrative accounts is blocked to prevent lockouts.' },
        { status: 400 }
      );
    }

    let updatedUser;

    if (action === 'set_role') {
      if (role !== 'user' && role !== 'admin') {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
      }
      updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { role },
      });
    } else if (action === 'block') {
      updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { isBlocked: true },
      });
    } else if (action === 'unblock') {
      updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { isBlocked: false },
      });
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({
      message: 'User updated successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role,
        isBlocked: updatedUser.isBlocked,
      },
    });
  } catch (error) {
    console.error('Admin Users PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    // Auth Check
    const tokenCookie = request.cookies.get('token');
    const token = tokenCookie ? tokenCookie.value : null;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    if (userId === payload.userId) {
      return NextResponse.json(
        { error: 'Self-deletion of administrative accounts is forbidden.' },
        { status: 400 }
      );
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Admin Users DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
