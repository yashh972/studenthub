import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyJWT } from '@/lib/auth';

/**
 * GET /api/todos
 * Retrieves all checklist todos belonging to the authenticated user.
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

    const todos = await prisma.todo.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ todos }, { status: 200 });
  } catch (error) {
    console.error('Fetch todos API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 550 });
  }
}

/**
 * POST /api/todos
 * Appends a new check-off todo task for the authenticated user.
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
    const { task } = await request.json();

    if (!task || !task.trim()) {
      return NextResponse.json({ error: 'Task description is required.' }, { status: 400 });
    }

    const newTodo = await prisma.todo.create({
      data: {
        userId,
        task: task.trim(),
        isCompleted: false
      }
    });

    return NextResponse.json({
      message: 'Task created successfully!',
      todo: newTodo
    }, { status: 201 });

  } catch (error) {
    console.error('Create todo API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
