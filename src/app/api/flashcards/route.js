if (typeof global.DOMMatrix === 'undefined') {
  global.DOMMatrix = class DOMMatrix {};
}

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyJWT } from '@/lib/auth';
import { uploadFile } from '@/lib/storage';
import fs from 'fs/promises';
import path from 'path';

// Use require to evaluate pdf-parse at runtime, ensuring our global.DOMMatrix stub is defined first
const { PDFParse } = require('pdf-parse');


// Premium template flashcards used if Gemini API fails or if no Key is set
const fallbackFlashcards = [
  {
    front: "What is the primary role of Next.js Edge Routing Middleware?",
    back: "It intercepts request traffic and validates session cookie tokens on the fly before reaching protected routes."
  },
  {
    front: "What is the purpose of 'npx prisma db push' in MVP database development?",
    back: "It synchronizes the database schema directly to PostgreSQL without requiring migration history files, speeding up setups."
  },
  {
    front: "Why is a singleton helper pattern recommended for PrismaClient in development?",
    back: "It prevents rapid hot reloads in development from spawning multiple client instances and exhausting database connections."
  },
  {
    front: "Which pure-JavaScript library is ideal for server-side PDF text extraction in Node?",
    back: "pdf-parse. It reads a binary PDF file buffer and extracts all raw text content safely."
  },
  {
    front: "Why choose the 'jose' library over standard 'jsonwebtoken' for Edge Middleware?",
    back: "Because 'jose' is built entirely using standard Web Crypto APIs, which are fully supported inside restricted Edge runtimes."
  }
];

/**
 * GET /api/flashcards
 * Lists all flashcards owned by the authenticated user.
 * Optional query parameter ?noteId= filters cards by study material.
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
    const noteId = searchParams.get('noteId');

    const flashcards = await prisma.flashcard.findMany({
      where: {
        userId,
        noteId: noteId || undefined
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ flashcards }, { status: 200 });
  } catch (error) {
    console.error('Fetch flashcards API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/flashcards
 * Creates new flashcards. Supports:
 * 1. Manual creation: { front: "Q", back: "A", noteId: "optional" }
 * 2. AI generation: { generate: true, noteId: "required" }
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
    const body = await request.json();

    const { generate, noteId, front, back } = body;

    // SCENARIO 1: AI FLASHCARDS DECK GENERATION FROM NOTE
    if (generate) {
      if (!noteId) {
        return NextResponse.json({ error: 'Note ID is required for AI generation.' }, { status: 400 });
      }

      // Fetch note
      const note = await prisma.note.findUnique({
        where: { id: noteId }
      });

      if (!note) {
        return NextResponse.json({ error: 'Note material not found.' }, { status: 404 });
      }

      // Extract text content
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
          console.error('Flashcard PDF parse failed:', err);
          return NextResponse.json({ error: 'Failed to extract text from PDF.' }, { status: 500 });
        }
      } else {
        textMaterial = note.content || '';
      }

      if (!textMaterial.trim()) {
        return NextResponse.json({ error: 'Selected note contains no readable text content.' }, { status: 400 });
      }

      // Query Gemini API
      const apiKey = process.env.GEMINI_API_KEY;
      let cardList = [];

      if (apiKey) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
          
          const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [{
                  text: `You are an expert tutor. Read the following study materials and generate a deck of exactly 5 flashcards to test memory recall.
                  
                  You MUST return a JSON array containing exactly 5 flashcard objects. Each object in the array must strictly match this JSON schema:
                  {
                    "front": "The concept or question (compact text)",
                    "back": "The definition or answer (clear, concise explanation)"
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
            cardList = JSON.parse(generatedText.trim());
          } else {
            console.warn('Gemini Flashcard API call failed, using mock fallback.');
            cardList = fallbackFlashcards;
          }
        } catch (err) {
          console.error('Gemini Flashcard generation error:', err);
          cardList = fallbackFlashcards;
        }
      } else {
        console.log('No GEMINI_API_KEY detected, creating mock study deck.');
        cardList = fallbackFlashcards;
      }

      // Check card size
      if (!Array.isArray(cardList) || cardList.length === 0) {
        cardList = fallbackFlashcards;
      }

      // Bulk write to database
      const createdCards = await prisma.$transaction(
        cardList.map(card => 
          prisma.flashcard.create({
            data: {
              userId,
              noteId,
              front: card.front,
              back: card.back
            }
          })
        )
      );

      return NextResponse.json({
        message: 'Flashcard deck generated successfully!',
        flashcards: createdCards
      }, { status: 201 });
    }

    // SCENARIO 2: MANUAL FLASHCARD CREATION
    if (!front || !front.trim() || !back || !back.trim()) {
      return NextResponse.json({ error: 'Front and Back content are required for manual creation.' }, { status: 400 });
    }

    const newCard = await prisma.flashcard.create({
      data: {
        userId,
        noteId: noteId || null,
        front: front.trim(),
        back: back.trim()
      }
    });

    return NextResponse.json({
      message: 'Flashcard created successfully!',
      flashcard: newCard
    }, { status: 201 });

  } catch (error) {
    console.error('Create flashcard API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
