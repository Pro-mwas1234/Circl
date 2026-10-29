import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const circle = await prisma.circle.findUnique({
      where: { id: params.id },
      include: {
        organizer: { select: { id: true, username: true, email: true } },
        members: {
          include: {
            user: { select: { id: true, username: true, avatar: true } },
          },
        },
        sessions: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!circle) {
      return NextResponse.json({ error: 'Circle not found' }, { status: 404 });
    }

    return NextResponse.json({ circle });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch circle' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, timeSlot } = await request.json();

    if (action === 'convert') {
      const updatedCircle = await prisma.circle.update({
        where: { id: params.id },
        data: {
          isStanding: true,
          timeSlot: timeSlot || 'Weekly Standing Slot',
        },
      });
      return NextResponse.json({ circle: updatedCircle });
    }

    if (action === 'join') {
      const memberCount = await prisma.circleMember.count({
        where: { circleId: params.id },
      });

      if (memberCount >= 6) {
        return NextResponse.json(
          { error: 'Circle is full (Max 6 members per micro-circle).' },
          { status: 400 }
        );
      }

      const existing = await prisma.circleMember.findUnique({
        where: {
          circleId_userId: {
            circleId: params.id,
            userId: user.id,
          },
        },
      });

      if (!existing) {
        await prisma.circleMember.create({
          data: {
            circleId: params.id,
            userId: user.id,
          },
        });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Failed to perform action' }, { status: 500 });
  }
}
