import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyJWT } from '@/lib/auth';

/**
 * PATCH /api/todos/[id]
 * Toggles a checklist todo task's completion status.
 */
export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const { isCompleted } = await request.json();

    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload || !payload.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = payload.userId;

    // 1. Fetch todo and check ownership
    const todo = await prisma.todo.findUnique({
      where: { id }
    });

    if (!todo) {
      return NextResponse.json({ error: 'Task not found.' }, { status: 404 });
    }

    if (todo.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    // 2. Update completion status
    const updatedTodo = await prisma.todo.update({
      where: { id },
      data: {
        isCompleted: typeof isCompleted === 'boolean' ? isCompleted : !todo.isCompleted
      }
    });

    return NextResponse.json({
      message: 'Task toggled successfully!',
      todo: updatedTodo
    }, { status: 200 });

  } catch (error) {
    console.error('Toggle todo API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 550 });
  }
}

/**
 * DELETE /api/todos/[id]
 * Deletes a checklist task.
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

    // 1. Fetch todo and check ownership
    const todo = await prisma.todo.findUnique({
      where: { id }
    });

    if (!todo) {
      return NextResponse.json({ error: 'Task not found.' }, { status: 404 });
    }

    if (todo.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    // 2. Delete todo
    await prisma.todo.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'Task deleted successfully!' }, { status: 200 });

  } catch (error) {
    console.error('Delete todo API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
