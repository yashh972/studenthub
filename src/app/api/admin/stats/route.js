import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyJWT } from '@/lib/auth';

export async function GET(request) {
  try {
    // 1. Auth check
    const tokenCookie = request.cookies.get('token');
    const token = tokenCookie ? tokenCookie.value : null;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 2. Fetch metrics in parallel
    const [
      totalUsers,
      totalNotes,
      totalUploads,
      totalQuizzes,
      totalMessages,
      totalReports,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.note.count(),
      prisma.pdfUpload.count(),
      prisma.quizSession.count(),
      prisma.message.count(),
      prisma.report.count(),
    ]);

    // 3. Fetch recent items for audit logs
    const [recentUsers, recentNotes, recentPdfs, recentReports] = await Promise.all([
      prisma.user.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { name: true, email: true, createdAt: true },
      }),
      prisma.note.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { title: true, user: { select: { name: true } }, createdAt: true },
      }),
      prisma.pdfUpload.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { name: true, user: { select: { name: true } }, createdAt: true },
      }),
      prisma.report.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { reason: true, status: true, createdAt: true },
      }),
    ]);

    // 4. Combine and sort recent activities
    const activities = [
      ...recentUsers.map((u) => ({
        type: 'user',
        description: `New student registered: ${u.name || 'Anonymous'} (${u.email})`,
        createdAt: u.createdAt,
      })),
      ...recentNotes.map((n) => ({
        type: 'note',
        description: `New note created: "${n.title}" by ${n.user?.name || 'Student'}`,
        createdAt: n.createdAt,
      })),
      ...recentPdfs.map((p) => ({
        type: 'pdf',
        description: `PDF uploaded: "${p.name}" by ${p.user?.name || 'Student'}`,
        createdAt: p.createdAt,
      })),
      ...recentReports.map((r) => ({
        type: 'report',
        description: `Flagged content: "${r.reason.substring(0, 45)}${r.reason.length > 45 ? '...' : ''}" (${r.status.toUpperCase()})`,
        createdAt: r.createdAt,
      })),
    ]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10);

    return NextResponse.json({
      stats: {
        totalUsers,
        totalNotes,
        totalUploads,
        totalQuizzes,
        totalMessages,
        totalReports,
      },
      activities,
    });
  } catch (error) {
    console.error('Admin Stats API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
