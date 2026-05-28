import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyJWT } from '@/lib/auth';

/**
 * POST /api/notes/[id]/share
 * Shares a note with a user by their email address.
 */
export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const { email } = await request.json();

    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload || !payload.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = payload.userId;

    if (!email || !email.trim()) {
      return NextResponse.json({ error: 'Email address is required' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 1. Fetch note and check ownership
    const note = await prisma.note.findUnique({
      where: { id }
    });

    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    if (note.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden. Only the owner can share this note.' }, { status: 403 });
    }

    // 2. Fetch target user
    const targetUser = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'No account found with this email address.' }, { status: 404 });
    }

    // 3. Prevent self-sharing
    if (targetUser.id === userId) {
      return NextResponse.json({ error: 'You cannot share notes with yourself.' }, { status: 400 });
    }

    // 4. Check if already shared
    const existingShare = await prisma.sharedNote.findUnique({
      where: {
        noteId_sharedWithUserId: {
          noteId: id,
          sharedWithUserId: targetUser.id
        }
      }
    });

    if (existingShare) {
      return NextResponse.json({ error: 'This note has already been shared with this user.' }, { status: 400 });
    }

    // 5. Share note
    const sharedNote = await prisma.sharedNote.create({
      data: {
        noteId: id,
        sharedWithUserId: targetUser.id
      },
      include: {
        sharedWithUser: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    return NextResponse.json({
      message: `Note shared successfully with ${sharedNote.sharedWithUser.name || sharedNote.sharedWithUser.email}`,
      sharedNote
    }, { status: 201 });
  } catch (error) {
    console.error('Share note API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
