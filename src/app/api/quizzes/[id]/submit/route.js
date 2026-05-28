import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyJWT } from '@/lib/auth';

/**
 * POST /api/quizzes/[id]/submit
 * Scores a user's quiz session answers securely on the server and logs results.
 */
export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const { answers } = await request.json(); // Map of { [questionId]: "A" | "B" | "C" | "D" }

    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload || !payload.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = payload.userId;

    if (!answers || typeof answers !== 'object') {
      return NextResponse.json({ error: 'Invalid payload format. Answers are required.' }, { status: 400 });
    }

    // 1. Fetch QuizSession checking ownership
    const quizSession = await prisma.quizSession.findUnique({
      where: { id },
      include: {
        questions: true,
        note: {
          select: { title: true }
        }
      }
    });

    if (!quizSession) {
      return NextResponse.json({ error: 'Quiz session not found.' }, { status: 404 });
    }

    if (quizSession.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    // 2. Score questions
    let score = 0;
    const review = quizSession.questions.map(q => {
      const userAnswer = answers[q.id] || null;
      const isCorrect = userAnswer === q.correctAnswer;
      
      if (isCorrect) {
        score++;
      }

      return {
        id: q.id,
        question: q.question,
        optionA: q.optionA,
        optionB: q.optionB,
        optionC: q.optionC,
        optionD: q.optionD,
        userAnswer,
        correctAnswer: q.correctAnswer,
        isCorrect
      };
    });

    // 3. Update score in database
    await prisma.quizSession.update({
      where: { id },
      data: { score }
    });

    return NextResponse.json({
      message: 'Quiz scored successfully',
      score,
      totalQuestions: quizSession.questions.length,
      noteTitle: quizSession.note?.title || 'Study Material',
      review
    }, { status: 200 });

  } catch (error) {
    console.error('Submit quiz API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
