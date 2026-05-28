import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyJWT } from '@/lib/auth';
import { uploadFile } from '@/lib/storage';

/**
 * GET /api/notes
 * Lists all notes owned by or shared with the authenticated user.
 * Supports case-insensitive query parameter ?q= for title/content search.
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
    const q = searchParams.get('q');

    const notes = await prisma.note.findMany({
      where: {
        OR: [
          { userId },
          { sharedWith: { some: { sharedWithUserId: userId } } }
        ],
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
        },
        sharedWith: {
          include: {
            sharedWithUser: {
              select: { id: true, name: true, email: true }
            }
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    return NextResponse.json({ notes }, { status: 200 });
  } catch (error) {
    console.error('Fetch notes API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/notes
 * Creates a new note. Supports JSON (plain text) or multipart/form-data (PDF file upload).
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
    let isPublic = false;

    // Check if the request is standard JSON or a File Upload (multipart/form-data)
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      title = formData.get('title') || '';
      content = formData.get('content') || '';
      isPublic = formData.get('isPublic') === 'true';
      const file = formData.get('file');

      if (file && file.size > 0) {
        // Retrieve binary buffer
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Sanitize name and append timestamp
        const timestamp = Date.now();
        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filename = `${timestamp}-${safeName}`;
        
        // Save using our robust storage helper (Supabase in production, local disk in dev)
        const uploadResult = await uploadFile(buffer, filename, file.type || 'application/pdf');
        pdfUrl = uploadResult.pdfUrl;
        fileKey = uploadResult.fileKey;

        // Auto-generate title if left blank
        if (!title) {
          title = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
        }
      }
    } else {
      const body = await request.json();
      title = body.title || '';
      content = body.content || '';
      isPublic = !!body.isPublic;
    }

    if (!title.trim()) {
      return NextResponse.json({ error: 'Note title is required' }, { status: 400 });
    }

    // Insert Note in database
    const newNote = await prisma.note.create({
      data: {
        title: title.trim(),
        content: content.trim(),
        isPublic,
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

    return NextResponse.json({ message: 'Note created successfully', note: newNote }, { status: 201 });
  } catch (error) {
    console.error('Create note API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
