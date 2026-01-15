import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

// 1. Define the correct type for Next.js 15+ params
type Props = {
  params: Promise<{ id: string }>
}

// DELETE: Remove a course
export async function DELETE(req: Request, context: Props) {
  try {
    const session = await getSession() as any;
    if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Await the params (Critical fix!)
    const { id } = await context.params;
    const courseId = parseInt(id);

    // Verify ownership
    const course = await prisma.course.findFirst({
      where: { id: courseId, userId: session.userId }
    });

    if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 });

    await prisma.assignment.deleteMany({ where: { courseId } });
    await prisma.course.delete({ where: { id: courseId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE Error:", error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}

// PATCH: Update color
export async function PATCH(req: Request, context: Props) {
  try {
    const session = await getSession() as any;
    if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    
    // Await the params (Critical fix!)
    const { id } = await context.params;
    const courseId = parseInt(id);

    console.log(`🎨 Updating Course ${courseId} to color: ${body.color}`);

    // Update the course
    const updatedCourse = await prisma.course.updateMany({
      where: { id: courseId, userId: session.userId },
      data: { color: body.color }
    });

    return NextResponse.json({ success: true, updatedCourse });
  } catch (error) {
    console.error("PATCH Error:", error);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}