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
    
    // 👈 Look how clean this is now! No String() or Number() needed.
    const userId = session.userId;

    const data = await req.formData();
    const file: File | null = data.get('file') as unknown as File;

    if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const pdfData = await pdfParse(buffer);
    const extractedText = pdfData.text;

    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    const prompt = `
      You are an expert syllabus parser. 
      CRITICAL: The text often lists a DATE first, then several assignments below it.
      
      RULE: "STICKY DATES"
      - Find a date (e.g., "1/15/26"). That is the Active Date.
      - Any assignment found after it belongs to that Active Date until you hit a NEW date.
      
      TARGETS:
      - "Film assignment"
      - "Reading assignment"
      - "Watch", "Read", "Due", "Homework"
      - "To prepare" (Split these items!)

      OUTPUT JSON ONLY:
      {
        "courseTitle": "String (Find the course name at the top)",
        "courseCode": "String (e.g. ARTH101)",
        "assignments": [
          { "title": "String", "dueDate": "YYYY-MM-DD" }
        ]
      }
      Assume year 2026.
      
      SYLLABUS TEXT:
      ${extractedText.substring(0, 30000)}
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsedData = JSON.parse(jsonString);

    const existingCourse = await prisma.course.findFirst({
      where: {
        userId: userId, 
        title: parsedData.courseTitle
      }
    });

    let savedCourse;
    type ParsedAssignment = { title: string; dueDate?: string };

    if (existingCourse) {
      await prisma.assignment.deleteMany({ where: { courseId: existingCourse.id } });
      savedCourse = await prisma.course.update({
        where: { id: existingCourse.id },
        data: {
          assignments: {
            create: (parsedData.assignments || []).map((a: ParsedAssignment) => ({
              title: a.title,
              dueDate: a.dueDate || undefined,
              status: 'pending'
            }))
          }
        }
      });
    } else {
      savedCourse = await prisma.course.create({
        data: {
          userId: userId, 
          title: parsedData.courseTitle || 'Untitled Course',
          code: parsedData.courseCode || 'N/A',
          assignments: {
            create: (parsedData.assignments || []).map((a: ParsedAssignment) => ({
              title: a.title,
              dueDate: a.dueDate || undefined,
              status: 'pending'
            }))
          }
        }
      });
    }

    return NextResponse.json({ success: true, course: savedCourse });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Processing failed';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}