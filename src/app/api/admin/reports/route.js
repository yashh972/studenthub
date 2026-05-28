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

    // Fetch reports including user, note, and PDF relationships
    const reports = await prisma.report.findMany({
      include: {
        reporter: {
          select: { id: true, name: true, email: true },
        },
        reportedUser: {
          select: { id: true, name: true, email: true },
        },
        reportedNote: {
          select: { id: true, title: true, userId: true, user: { select: { name: true, email: true } } },
        },
        reportedPdf: {
          select: { id: true, name: true, userId: true, user: { select: { name: true, email: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ reports });
  } catch (error) {
    console.error('Admin Reports GET error:', error);
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

    const { reportId, status } = await request.json();

    if (!reportId || !status) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    if (status !== 'pending' && status !== 'reviewed' && status !== 'resolved') {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const updatedReport = await prisma.report.update({
      where: { id: reportId },
      data: { status },
    });

    // Proactively update the moderation status on flagged items if the report is resolved or reviewed!
    if (status === 'resolved') {
      const report = await prisma.report.findUnique({ where: { id: reportId } });
      if (report) {
        if (report.reportedNoteId) {
          await prisma.note.update({
            where: { id: report.reportedNoteId },
            data: { moderationStatus: 'resolved' },
          });
        }
        if (report.reportedPdfId) {
          await prisma.pdfUpload.update({
            where: { id: report.reportedPdfId },
            data: { moderationStatus: 'resolved' },
          });
        }
      }
    }

    return NextResponse.json({ message: 'Report updated successfully', report: updatedReport });
  } catch (error) {
    console.error('Admin Reports PATCH error:', error);
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
    const reportId = searchParams.get('id');

    if (!reportId) {
      return NextResponse.json({ error: 'Report ID is required' }, { status: 400 });
    }

    await prisma.report.delete({
      where: { id: reportId },
    });

    return NextResponse.json({ message: 'Report dismissed successfully' });
  } catch (error) {
    console.error('Admin Reports DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
