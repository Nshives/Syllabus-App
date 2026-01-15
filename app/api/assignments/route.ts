import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const session = await getSession() as any;
    if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { title, dueDate, courseId } = await req.json();

    if (!title || !courseId || !dueDate) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    // Create the assignment and return it WITH the course data
    // (We need the course data so the frontend can color-code it immediately)
    const newAssignment = await prisma.assignment.create({
      data: {
        title,
        dueDate, // Expecting "YYYY-MM-DD"
        status: 'pending',
        courseId: parseInt(courseId),
      },
      include: {
        course: true
      }
    });

    return NextResponse.json(newAssignment);
  } catch (error) {
    console.error("Create Assignment Error:", error);
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 });
  }
}