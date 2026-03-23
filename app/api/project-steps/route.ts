import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

// ADD A NEW STEP
export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { projectId, title, date } = await req.json();
    
    const newStep = await prisma.projectStep.create({
      data: {
        title,
        date: date ? new Date(date) : null,
        projectId: Number(projectId)
      }
    });
    return NextResponse.json(newStep);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to add step' }, { status: 500 });
  }
}

// EDIT AN EXISTING STEP
export async function PATCH(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { stepId, title, date, completed } = await req.json();
    
    // 💡 THE FIX: We define exactly what properties are allowed to be updated
    type UpdateStepData = {
      title?: string;
      date?: Date | null;
      completed?: boolean;
    };

    const updateData: UpdateStepData = {};
    
    if (title !== undefined) updateData.title = title;
    if (date !== undefined) updateData.date = date ? new Date(date) : null;
    if (completed !== undefined) updateData.completed = completed;

    const updatedStep = await prisma.projectStep.update({
      where: { id: Number(stepId) },
      data: updateData
    });
    return NextResponse.json(updatedStep);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update step' }, { status: 500 });
  }
}

// DELETE A STEP
export async function DELETE(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    await prisma.projectStep.delete({
      where: { id: Number(id) }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete step' }, { status: 500 });
  }
}