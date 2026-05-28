import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyJWT } from '@/lib/auth';

export async function POST(request) {
  try {
    // 1. Auth check
    const tokenCookie = request.cookies.get('token');
    const token = tokenCookie ? tokenCookie.value : null;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload || !payload.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { reportedUserId, reportedNoteId, reportedPdfId, reason } = await request.json();

    if (!reason || (!reportedUserId && !reportedNoteId && !reportedPdfId)) {
      return NextResponse.json(
        { error: 'Please specify a report target and explain the reason.' },
        { status: 400 }
      );
    }

    // Create the report record
    const report = await prisma.report.create({
      data: {
        reporterId: payload.userId,
        reportedUserId: reportedUserId || null,
        reportedNoteId: reportedNoteId || null,
        reportedPdfId: reportedPdfId || null,
        reason: reason.trim(),
        status: 'pending',
      },
    });

    // Proactively flag the target note/PDF in moderation status
    if (reportedNoteId) {
      await prisma.note.update({
        where: { id: reportedNoteId },
        data: { moderationStatus: 'flagged' },
      });
    }
    if (reportedPdfId) {
      await prisma.pdfUpload.update({
        where: { id: reportedPdfId },
        data: { moderationStatus: 'flagged' },
      });
    }

    return NextResponse.json({
      message: 'Report submitted successfully. Administrators will review it shortly.',
      report,
    }, { status: 201 });
  } catch (error) {
    console.error('Report submission API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
