import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyJWT } from '@/lib/auth';

const getFallbackTasks = (promptText) => {
  const text = promptText.toLowerCase();
  if (text.includes('exam') || text.includes('test') || text.includes('midterm') || text.includes('quiz')) {
    return [
      "Review textbook chapters and lecture notes thoroughly",
      "Compile a cheat sheet of formulas, key dates, and central definitions",
      "Generate AI Quiz Questions on StudyHub to test comprehension",
      "Take a timed mock exam and review incorrect answers",
      "Do a final high-level review of weak topics 2 hours before the test"
    ];
  } else if (text.includes('code') || text.includes('project') || text.includes('build') || text.includes('program') || text.includes('dev')) {
    return [
      "Set up project workspace, repository, and configure environment variables",
      "Design mockups and outline basic database models or components",
      "Implement core logic, backend API handlers, or central page routes",
      "Conduct end-to-end user path testing and resolve runtime bugs",
      "Clean up comments, optimize import bundles, and compile the final build"
    ];
  } else {
    return [
      "Day 1: Read all relevant learning modules and take structural notes",
      "Day 1: Outline major milestones and define key topics to cover",
      "Day 2: Do active recall exercises or quiz reviews on key concepts",
      "Day 2: Perform spaced-repetition flashcard sessions",
      "Day 3: Tackle mock scenarios, write summaries, and do a final wrap-up"
    ];
  }
};

/**
 * POST /api/todos/generate
 * Automatically schedules a systematic multi-step study plan checklist based on a prompt.
 */
export async function POST(request) {
  try {
    // 1. Authenticate user
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload || !payload.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = payload.userId;
    const { prompt } = await request.json();

    if (!prompt || !prompt.trim()) {
      return NextResponse.json({ error: 'Please specify your study goal or timeline prompt.' }, { status: 400 });
    }

    // 2. Query Gemini 1.5 Flash API or utilize our smart fallback
    const apiKey = process.env.GEMINI_API_KEY;
    let generatedTasks = [];

    if (apiKey) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
        
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `You are a master academic planner. The student wants you to create a structured, systematic, step-by-step to-do checklist to help them study or organize their tasks.
                Goal and Timeline Description: "${prompt}"

                You MUST output exactly a JSON object containing a "tasks" array, where each element is a short, actionable, and clear task (max 70 characters). Do not group them into objects, just simple strings inside the "tasks" array.
                Example structure:
                {
                  "tasks": [
                    "Day 1: Outline Chapter 4 CPU scheduling",
                    "Day 1: Practice Shortest Job First exercises",
                    "Day 2: Review round-robin scheduling algorithms",
                    "Day 2: Take self-assessment quiz on Operating Systems"
                  ]
                }

                Ensure the tasks are chronologically logical and systematic for their timeline. Keep it brief (max 8 tasks).
                Output ONLY the raw JSON object. Do not include markdown code block formatting (such as \`\`\`json) or additional text.`
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
          const parsed = JSON.parse(generatedText.trim());
          if (parsed && Array.isArray(parsed.tasks)) {
            generatedTasks = parsed.tasks;
          }
        } else {
          console.warn('Gemini To-Do Generator API call failed, falling back.');
        }
      } catch (err) {
        console.error('Gemini query error in todos generator, falling back:', err);
      }
    }

    // Apply context-aware fallback if API failed or key is missing
    if (generatedTasks.length === 0) {
      generatedTasks = getFallbackTasks(prompt);
    }

    // Limit to max 8 tasks to keep checklists manageable
    const finalTasks = generatedTasks.slice(0, 8);

    // 3. Batch insert new checklist todos inside a single transaction
    const createdTodos = await prisma.$transaction(
      finalTasks.map(taskText => 
        prisma.todo.create({
          data: {
            userId,
            task: taskText.trim(),
            isCompleted: false
          }
        })
      )
    );

    return NextResponse.json({
      message: `Successfully scheduled ${createdTodos.length} study tasks!`,
      todos: createdTodos
    }, { status: 201 });

  } catch (error) {
    console.error('AI generate todo list API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
