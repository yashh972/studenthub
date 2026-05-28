import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyJWT } from '@/lib/auth';

/**
 * PUT /api/flashcards/[id]
 * Modifies an existing flashcard. Permissible only by the card's creator.
 */
export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const { front, back } = await request.json();

    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload || !payload.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = payload.userId;

    if (!front || !front.trim() || !back || !back.trim()) {
      return NextResponse.json({ error: 'Front and Back texts are required.' }, { status: 400 });
    }

    // 1. Fetch card and check ownership
    const flashcard = await prisma.flashcard.findUnique({
      where: { id }
    });

    if (!flashcard) {
      return NextResponse.json({ error: 'Flashcard not found.' }, { status: 404 });
    }

    if (flashcard.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    // 2. Update card
    const updatedCard = await prisma.flashcard.update({
      where: { id },
      data: {
        front: front.trim(),
        back: back.trim()
      }
    });

    return NextResponse.json({
      message: 'Flashcard updated successfully!',
      flashcard: updatedCard
    }, { status: 200 });

  } catch (error) {
    console.error('Update flashcard API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/flashcards/[id]
 * Deletes a flashcard. Only creator authorized.
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

    // 1. Fetch card and check ownership
    const flashcard = await prisma.flashcard.findUnique({
      where: { id }
    });

    if (!flashcard) {
      return NextResponse.json({ error: 'Flashcard not found.' }, { status: 404 });
    }

    if (flashcard.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    // 2. Delete card
    await prisma.flashcard.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'Flashcard deleted successfully!' }, { status: 200 });

  } catch (error) {
    console.error('Delete flashcard API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
