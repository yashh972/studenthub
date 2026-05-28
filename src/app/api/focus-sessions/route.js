import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyJWT } from '@/lib/auth';

/**
 * GET /api/focus-sessions
 * Retrieves all Pomodoro focus session intervals completed by the user.
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

    const sessions = await prisma.focusSession.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ sessions }, { status: 200 });
  } catch (error) {
    console.error('Fetch focus sessions API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 550 });
  }
}

/**
 * POST /api/focus-sessions
 * Logs a completed Pomodoro study session interval.
 */
export async function POST(request) {
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
    const { duration } = await request.json(); // session duration in seconds

    if (!duration || typeof duration !== 'number' || duration <= 0) {
      return NextResponse.json({ error: 'Invalid duration. Must be a positive number.' }, { status: 400 });
    }

    const newSession = await prisma.focusSession.create({
      data: {
        userId,
        duration,
        isCompleted: true
      }
    });

    return NextResponse.json({
      message: 'Focus session logged successfully!',
      session: newSession
    }, { status: 201 });

  } catch (error) {
    console.error('Create focus session API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
