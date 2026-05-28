import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyJWT } from '@/lib/auth';

/**
 * GET /api/chat/messages
 * Retrieves conversation streams history between the authenticated user and a classmate.
 * Expects ?receiverId= query parameter.
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
    const { searchParams } = new URL(request.url);
    const receiverId = searchParams.get('receiverId');

    if (!receiverId) {
      return NextResponse.json({ error: 'Receiver ID is required.' }, { status: 400 });
    }

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId, receiverId },
          { senderId: receiverId, receiverId: userId }
        ]
      },
      orderBy: { createdAt: 'asc' }
    });

    return NextResponse.json({ messages }, { status: 200 });
  } catch (error) {
    console.error('Fetch conversation messages error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 550 });
  }
}
