if (typeof global.DOMMatrix === 'undefined') {
  global.DOMMatrix = class DOMMatrix {};
}

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyJWT } from '@/lib/auth';
import fs from 'fs/promises';
import path from 'path';
import { PDFParse } from 'pdf-parse';


// Comprehensive mock questions used as a fallback if no Gemini Key is set or if the API fails
const fallbackQuestions = [
  {
    question: "What is the primary role of Next.js Edge Routing Middleware in a full-stack platform?",
    optionA: "To run complex database seeds and sync Prisma migrations on demand.",
    optionB: "To intercept request traffic and validate secure session JWT tokens on the fly.",
    optionC: "To configure local upload directories and clean up unlinked file paths.",
    optionD: "To execute text extraction scripts on binary PDF document buffers.",
    correctAnswer: "B"
  },
  {
    question: "Which declarative Prisma operation dynamically creates or updates database tables without migration files?",
    optionA: "npx prisma migrate dev",
    optionB: "npx prisma db push",
    optionC: "npx prisma db seed",
    optionD: "npx prisma generate",
    correctAnswer: "B"
  },
  {
    question: "Why is a singleton helper pattern recommended when instantiating a PrismaClient in Next.js development?",
    optionA: "To compile Edge routing assets and compile Tailwind utilities faster.",
    optionB: "To prevent active hot reloads from leaking and exhausting database connection pools.",
    optionC: "To inject custom JWT cookies automatically inside client headers.",
    optionD: "To coordinate real-time Socket.IO chat listeners in a single container.",
    correctAnswer: "B"
  },
  {
    question: "Which pure-JavaScript package extracts raw text content from PDF binary buffers on the server?",
    optionA: "jose-jwt-verifier",
    optionB: "pdf-parse",
    optionC: "bcryptjs-salter",
    optionD: "express-body-uploader",
    correctAnswer: "B"
  },
  {
    question: "How does the jose library differ from jsonwebtoken inside Next.js Edge Middleware route guards?",
    optionA: "It requires compiling native, system-specific C++ binary frameworks.",
    optionB: "It works flawlessly in restricted Edge runtimes using standard Web Crypto APIs.",
    optionC: "It caches database sessions in global browser storage pools.",
    optionD: "It only executes dynamically inside production bundle server routes.",
    correctAnswer: "B"
  }
];

/**
 * GET /api/quizzes
 * Lists all previous quiz sessions taken by the authenticated user.
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

    const quizSessions = await prisma.quizSession.findMany({
      where: { userId },
      include: {
        note: {
          select: { title: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Format list nicely
    const formattedSessions = quizSessions.map(session => ({
      id: session.id,
      noteTitle: session.note?.title || 'Study Material Note',
      score: session.score,
      createdAt: session.createdAt
    }));

    return NextResponse.json({ quizzes: formattedSessions }, { status: 200 });
  } catch (error) {
    console.error('Fetch quizzes API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/quizzes
 * Generates a new 5-question multiple-choice practice quiz session based on study notes.
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
    const { noteId } = await request.json();

    if (!noteId) {
      return NextResponse.json({ error: 'Note ID is required.' }, { status: 400 });
    }

    // 1. Fetch note material
    const note = await prisma.note.findUnique({
      where: { id: noteId }
    });

    if (!note) {
      return NextResponse.json({ error: 'Note material not found.' }, { status: 404 });
    }

    // 2. Extract Text from Note (handling PDFs vs Plain Text)
    let textMaterial = '';
    if (note.pdfUrl) {
      try {
        let dataBuffer;
        if (note.pdfUrl.startsWith('http')) {
          // Production: Fetch PDF from Supabase Storage or external link
          const response = await fetch(note.pdfUrl);
          if (!response.ok) throw new Error(`Failed to fetch PDF from storage: ${response.statusText}`);
          const arrayBuffer = await response.arrayBuffer();
          dataBuffer = Buffer.from(arrayBuffer);
        } else {
          // Local Development: Read from disk
          const filePath = path.join(process.cwd(), 'public', 'uploads', note.fileKey || path.basename(note.pdfUrl));
          dataBuffer = await fs.readFile(filePath);
        }

        const parser = new PDFParse({ data: dataBuffer });
        const parsed = await parser.getText();
        textMaterial = parsed.text || '';
      } catch (err) {
        console.error('PDF parsing failed:', err);
        return NextResponse.json({ error: 'Failed to extract text from the PDF file.' }, { status: 500 });
      }
    } else {
      textMaterial = note.content || '';
    }

    if (!textMaterial.trim()) {
      return NextResponse.json({ error: 'The selected note does not contain any readable text material.' }, { status: 400 });
    }

    // 3. Coordinate AI Question Generation via Gemini API
    const apiKey = process.env.GEMINI_API_KEY;
    let questions = [];

    if (apiKey) {
      try {
        // Query Gemini 1.5 Flash using direct fetch call
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
        
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `You are an expert educator. Read the study materials below and generate exactly 5 multiple-choice questions (MCQs) designed to test study comprehension on the material.
                
                You MUST return a JSON array containing exactly 5 question objects. Each object in the array must strictly match this JSON schema:
                {
                  "question": "The question text string",
                  "optionA": "Distractor choice A",
                  "optionB": "Distractor choice B",
                  "optionC": "Distractor choice C",
                  "optionD": "Distractor choice D",
                  "correctAnswer": "A", "B", "C", or "D"
                }

                Output ONLY the raw JSON array. Do not include markdown code block formatting (such as \`\`\`json) or additional descriptions.

                Study Materials:
                ${textMaterial.substring(0, 10000)}`
              }]
            }],
            generationConfig: {
              responseMimeType: "application/json"
            }
          })
        });

        if (response.ok) {
          const resData = await response.json();
          const generatedText = resData.candidates?.[0]?.content?.parts?.[0]?.text || '';
          questions = JSON.parse(generatedText.trim());
        } else {
          const errText = await response.text();
          console.warn('Gemini API call failed, executing mock fallback. Details:', errText);
          questions = fallbackQuestions;
        }
      } catch (err) {
        console.error('Gemini query error, falling back to mock questions:', err);
        questions = fallbackQuestions;
      }
    } else {
      console.log('No GEMINI_API_KEY found, injecting high-quality mock study questions.');
      questions = fallbackQuestions;
    }

    // Double-check question size
    if (!Array.isArray(questions) || questions.length === 0) {
      questions = fallbackQuestions;
    }

    // 4. Write QuizSession and Questions to DB
    const quizSession = await prisma.quizSession.create({
      data: {
        userId,
        noteId: note.id,
        questions: {
          create: questions.map(q => ({
            question: q.question,
            optionA: q.optionA,
            optionB: q.optionB,
            optionC: q.optionC,
            optionD: q.optionD,
            correctAnswer: q.correctAnswer
          }))
        }
      },
      include: {
        questions: true,
        note: {
          select: { title: true }
        }
      }
    });

    // 5. Sanitize Correct Answers (removes correctAnswer to prevent client-side snooping)
    const sanitizedQuestions = quizSession.questions.map(q => {
      const { correctAnswer, ...rest } = q;
      return rest;
    });

    return NextResponse.json({
      quizSession: {
        id: quizSession.id,
        noteId: quizSession.noteId,
        noteTitle: quizSession.note?.title || 'Study Material',
        score: quizSession.score,
        createdAt: quizSession.createdAt,
      },
      questions: sanitizedQuestions
    }, { status: 201 });

  } catch (error) {
    console.error('Generate quiz API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
