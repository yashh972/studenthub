import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyJWT } from '@/lib/auth';
import fs from 'fs/promises';
import path from 'path';

/**
 * GET /api/public/notes
 * Fetches all notes marked as public and not hidden by admins.
 * No authentication required (accessible by anonymous users).
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');

    const notes = await prisma.note.findMany({
      where: {
        isPublic: true,
        isHidden: false,
        AND: q ? {
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { content: { contains: q, mode: 'insensitive' } }
          ]
        } : undefined
      },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    return NextResponse.json({ notes }, { status: 200 });
  } catch (error) {
    console.error('Fetch public notes API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/public/notes
 * Creates a public note directly. Requires authentication.
 * Supports standard JSON body or PDF file upload via multipart/form-data.
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
    const contentType = request.headers.get('content-type') || '';

    let title = '';
    let content = '';
    let pdfUrl = null;
    let fileKey = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      title = formData.get('title') || '';
      content = formData.get('content') || '';
      const file = formData.get('file');

      if (file && file.size > 0) {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const timestamp = Date.now();
        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filename = `${timestamp}-${safeName}`;

        const uploadDir = path.join(process.cwd(), 'public', 'uploads');
        const absolutePath = path.join(uploadDir, filename);

        // Ensure upload directory exists
        await fs.mkdir(uploadDir, { recursive: true });
        await fs.writeFile(absolutePath, buffer);

        pdfUrl = `/uploads/${filename}`;
        fileKey = filename;

        if (!title) {
          title = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
        }
      }
    } else {
      const body = await request.json();
      title = body.title || '';
      content = body.content || '';
    }

    if (!title.trim()) {
      return NextResponse.json({ error: 'Note title is required' }, { status: 400 });
    }

    const newNote = await prisma.note.create({
      data: {
        title: title.trim(),
        content: content.trim(),
        isPublic: true,
        userId,
        pdfUrl,
        fileKey,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    return NextResponse.json({ message: 'Public note published successfully', note: newNote }, { status: 201 });
  } catch (error) {
    console.error('Create public note API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
