import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import pdfParse from 'pdf-extraction'; 

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
  try {
    const session = await getSession();
    
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = session.userId;

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const pdfData = await pdfParse(buffer);
    const pdfText = pdfData.text;

    console.log(`✅ Project Brief extracted. Asking Gemini...`);

    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
    
    // 💡 UPDATED PROMPT: Telling Gemini to stop guessing dates
    const prompt = `
      You are an expert project manager for university students. Analyze this project brief text:
      "${pdfText.slice(0, 15000)}"

      Your goal is to extract key info and break the project down into manageable milestones.
      
      CRITICAL DATE RULE:
      - If the text has explicit due dates for steps (e.g. "Draft due Oct 10"), use them.
      - If NO dates are listed for the steps, you MUST set the date field to null. DO NOT guess or invent dates.
      
      Return ONLY a raw JSON object (no markdown) with this exact structure:
      {
        "title": "Project Name",
        "summary": "A 2-sentence summary of what needs to be done.",
        "deliverables": "A string listing exactly what needs to be submitted (e.g. '1. PDF, 2. Video file')",
        "turnInInfo": "Where/How to submit (e.g. 'Blackboard via TurnItIn')",
        "dueDate": "YYYY-MM-DD" (or null if not stated),
        "steps": [
          { "title": "Step Name", "date": "YYYY-MM-DD" (or null if not stated) }
        ]
      }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().replace(/```json/g, '').replace(/```/g, '').trim();
    
    const data = JSON.parse(text);

    type ParsedStep = { title: string; date?: string };

    const newProject = await prisma.project.create({
      data: {
        userId: userId, 
        title: data.title || 'Untitled Project',
        summary: data.summary,
        deliverables: data.deliverables,
        turnInInfo: data.turnInInfo,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        steps: {
          create: (data.steps || []).map((step: ParsedStep) => ({
            title: step.title,
            date: step.date ? new Date(step.date) : null
          }))
        }
      },
      include: { steps: true }
    });

    return NextResponse.json(newProject);

  } catch (error) {
    console.error('Project Parse Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to analyze project';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session || !session.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const userId = session.userId;

    const projects = await prisma.project.findMany({
      where: { userId: userId }, 
      include: { steps: { orderBy: { date: 'asc' } } },
      orderBy: { dueDate: 'asc' }
    });

    return NextResponse.json(projects);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}

// 💡 NEW ROUTE: Updates a specific step when the user adds a date manually
export async function PATCH(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { stepId, date } = await req.json();

    if (!stepId) return NextResponse.json({ error: 'Missing step ID' }, { status: 400 });

    await prisma.projectStep.update({
      where: { id: Number(stepId) },
      data: { date: date ? new Date(date) : null }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update step date' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'No ID provided' }, { status: 400 });

    await prisma.project.delete({
      where: { id: Number(id) }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
  }
}