import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession() as any;
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const courses = await prisma.course.findMany({
      where: { userId: session.userId },
      include: { 
        assignments: {
          // 🟢 SORTING FIX:
          // This forces the database to send assignments ordered by date.
          // 'asc' (Ascending) means: Jan 1, then Jan 2, then Jan 3...
          orderBy: {
            dueDate: 'asc'
          }
        } 
      },
      // Keep courses sorted by newest upload first
      orderBy: { id: 'desc' } 
    });

    return NextResponse.json(courses);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }

  //Trigger redeploy
}