import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyJWT } from '@/lib/auth';

/**
 * GET /api/chat/users
 * Returns a directory of all registered students on StudyHub (excluding the active user).
 */
export async function GET(request) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload || !payload.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = payload.userId;

    const classmates = await prisma.user.findMany({
      where: {
        id: { not: userId }
      },
      select: {
        id: true,
        name: true,
        email: true
      },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json({ classmates }, { status: 200 });
  } catch (error) {
    console.error('Fetch classmates directory error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 550 });
  }
}
