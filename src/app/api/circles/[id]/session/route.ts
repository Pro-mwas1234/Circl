import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const circleId = params.id;

    const circle = await prisma.circle.findUnique({
      where: { id: circleId },
      include: {
        members: true,
      },
    });

    if (!circle) {
      return NextResponse.json({ error: 'Circle not found' }, { status: 404 });
    }

    const isMember = circle.members.some((m) => m.userId === user.id);
    if (!isMember) {
      if (circle.members.length >= 6) {
        return NextResponse.json(
          { error: 'Circle is full (Max 6 members).' },
          { status: 400 }
        );
      }

      await prisma.circleMember.create({
        data: {
          circleId: circle.id,
          userId: user.id,
        },
      });
    }

    const now = new Date();

    // Mark any expired active sessions as completed
    await prisma.session.updateMany({
      where: {
        circleId: circle.id,
        status: 'active',
        endTime: {
          lt: now,
        },
      },
      data: {
        status: 'completed',
      },
    });

    // Find currently active, non-expired session
    let session = await prisma.session.findFirst({
      where: {
        circleId: circle.id,
        status: 'active',
        endTime: {
          gt: now,
        },
      },
      include: {
        participants: {
          include: {
            user: { select: { id: true, username: true, avatar: true } },
          },
        },
      },
    });

    if (!session) {
      const endTime = new Date(now.getTime() + circle.durationMins * 60 * 1000);

      session = await prisma.session.create({
        data: {
          circleId: circle.id,
          status: 'active',
          startTime: now,
          endTime: endTime,
          durationMins: circle.durationMins,
        },
        include: {
          participants: {
            include: {
              user: { select: { id: true, username: true, avatar: true } },
            },
          },
        },
      });
    }

    const existingParticipant = await prisma.sessionParticipant.findUnique({
      where: {
        sessionId_userId: {
          sessionId: session.id,
          userId: user.id,
        },
      },
    });

    if (!existingParticipant) {
      await prisma.sessionParticipant.create({
        data: {
          sessionId: session.id,
          userId: user.id,
        },
      });
    }

    const fullSession = await prisma.session.findUnique({
      where: { id: session.id },
      include: {
        circle: true,
        participants: {
          include: {
            user: { select: { id: true, username: true, avatar: true } },
          },
        },
        chatMessages: {
          include: {
            user: { select: { id: true, username: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    return NextResponse.json({ session: fullSession });
  } catch {
    return NextResponse.json({ error: 'Failed to join session' }, { status: 500 });
  }
}
