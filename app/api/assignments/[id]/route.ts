import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

type Props = {
  params: Promise<{ id: string }>
}

export async function PATCH(req: Request, context: Props) {
  try {
    const session = await getSession() as any;
    if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await context.params;
    const assignmentId = parseInt(id);
    const body = await req.json();

    // We can update status, title, date, etc. dynamically
    const updatedAssignment = await prisma.assignment.update({
      where: { id: assignmentId },
      data: body, // e.g., { status: 'completed' }
    });

    return NextResponse.json(updatedAssignment);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}

// Bonus: Delete assignment endpoint (good to have for later)
export async function DELETE(req: Request, context: Props) {
  try {
    const session = await getSession() as any;
    if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await context.params;
    await prisma.assignment.delete({ where: { id: parseInt(id) } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}