import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyJWT } from '@/lib/auth';
import fs from 'fs/promises';
import path from 'path';

/**
 * GET /api/notes/[id]
 * Retrieves a single note. Verifies the user owns the note or it has been shared with them.
 */
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload || !payload.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = payload.userId;

    const note = await prisma.note.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        },
        sharedWith: {
          include: {
            sharedWithUser: {
              select: { id: true, name: true, email: true }
            }
          }
        }
      }
    });

    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    // Security check: Must be owner or shared recipient
    const isOwner = note.userId === userId;
    const isShared = note.sharedWith.some(shared => shared.sharedWithUserId === userId);

    if (!isOwner && !isShared) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ note }, { status: 200 });
  } catch (error) {
    console.error('Fetch individual note error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/notes/[id]
 * Deletes a note. Only permissible by the note's creator.
 * Performs automatic cleanup of uploaded files from local disk.
 */
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload || !payload.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = payload.userId;

    const note = await prisma.note.findUnique({
      where: { id }
    });

    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    // Only the owner can delete the note
    if (note.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden. Only the owner can delete notes.' }, { status: 403 });
    }

    // File cleanup on disk if PDF upload exists
    if (note.fileKey) {
      try {
        const filePath = path.join(process.cwd(), 'public', 'uploads', note.fileKey);
        await fs.unlink(filePath);
      } catch (err) {
        console.warn(`Could not delete file on disk at public/uploads/${note.fileKey}:`, err.message);
      }
    }

    // Delete record from DB (foreign keys shared notes cascade)
    await prisma.note.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'Note deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Delete note API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/notes/[id]
 * Updates a note's properties (like isPublic). Only permissible by the note's owner.
 */
export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload || !payload.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = payload.userId;

    const note = await prisma.note.findUnique({
      where: { id }
    });

    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    // Only the owner can update the note
    if (note.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { isPublic } = body;

    const updatedNote = await prisma.note.update({
      where: { id },
      data: {
        isPublic: isPublic !== undefined ? !!isPublic : note.isPublic
      }
    });

    return NextResponse.json({ message: 'Note updated successfully', note: updatedNote }, { status: 200 });
  } catch (error) {
    console.error('Update note API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
