import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyJWT } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

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

    // Fetch notes and PDF uploads
    const [notes, pdfUploads] = await Promise.all([
      prisma.note.findMany({
        include: {
          user: {
            select: { name: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.pdfUpload.findMany({
        include: {
          user: {
            select: { name: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return NextResponse.json({ notes, pdfUploads });
  } catch (error) {
    console.error('Admin Notes GET error:', error);
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

    const { type, id, action, value } = await request.json();

    if (!type || !id || !action) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    if (type === 'note') {
      let updateData = {};
      if (action === 'toggle_featured') updateData.isFeatured = value;
      if (action === 'toggle_hidden') updateData.isHidden = value;
      if (action === 'set_status') updateData.moderationStatus = value;

      const updatedNote = await prisma.note.update({
        where: { id },
        data: updateData,
      });
      return NextResponse.json({ message: 'Note updated successfully', item: updatedNote });
    } else if (type === 'pdf') {
      let updateData = {};
      if (action === 'toggle_featured') updateData.isFeatured = value;
      if (action === 'toggle_hidden') updateData.isHidden = value;
      if (action === 'set_status') updateData.moderationStatus = value;

      const updatedPdf = await prisma.pdfUpload.update({
        where: { id },
        data: updateData,
      });
      return NextResponse.json({ message: 'PDF updated successfully', item: updatedPdf });
    } else {
      return NextResponse.json({ error: 'Invalid item type' }, { status: 400 });
    }
  } catch (error) {
    console.error('Admin Notes PATCH error:', error);
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
    const id = searchParams.get('id');
    const type = searchParams.get('type');

    if (!id || !type) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    if (type === 'note') {
      // Find note to check for PDF file deletion if exists
      const note = await prisma.note.findUnique({ where: { id } });
      if (note && note.pdfUrl) {
        try {
          const filePath = path.join(process.cwd(), 'public', note.pdfUrl);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (err) {
          console.error('Failed to delete associated note file:', err);
        }
      }
      await prisma.note.delete({ where: { id } });
      return NextResponse.json({ message: 'Note deleted successfully' });
    } else if (type === 'pdf') {
      // Find PDF upload to delete file
      const upload = await prisma.pdfUpload.findUnique({ where: { id } });
      if (upload && upload.url) {
        try {
          const filePath = path.join(process.cwd(), 'public', upload.url);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (err) {
          console.error('Failed to delete associated upload PDF file:', err);
        }
      }
      await prisma.pdfUpload.delete({ where: { id } });
      return NextResponse.json({ message: 'PDF deleted successfully' });
    } else {
      return NextResponse.json({ error: 'Invalid item type' }, { status: 400 });
    }
  } catch (error) {
    console.error('Admin Notes DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
