import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: Request,
  { params }: { params: { sessionId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { goal, cameraOn, status } = await request.json();

    const participant = await prisma.sessionParticipant.findUnique({
      where: {
        sessionId_userId: {
          sessionId: params.sessionId,
          userId: user.id,
        },
      },
    });

    if (!participant) {
      return NextResponse.json({ error: 'Participant not found in session' }, { status: 404 });
    }

    const dataToUpdate: { goal?: string; cameraOn?: boolean; status?: string } = {};
    if (goal !== undefined) dataToUpdate.goal = goal;
    if (cameraOn !== undefined) dataToUpdate.cameraOn = cameraOn;
    if (status !== undefined) dataToUpdate.status = status;

    const updated = await prisma.sessionParticipant.update({
      where: { id: participant.id },
      data: dataToUpdate,
    });

    let circleUpdated = false;
    let newStreak = 0;

    if (status && status !== 'pending') {
      const session = await prisma.session.findUnique({
        where: { id: params.sessionId },
        include: {
          circle: true,
          participants: true,
        },
      });

      if (session && !session.streakAwarded && session.circle.isStanding) {
        const completedCheckins = session.participants.filter((p) =>
          p.userId === user.id ? true : p.status !== 'pending'
        );

        if (completedCheckins.length >= Math.ceil(session.participants.length / 2)) {
          const updatedCircle = await prisma.circle.update({
            where: { id: session.circleId },
            data: { streak: { increment: 1 } },
          });

          await prisma.session.update({
            where: { id: session.id },
            data: { streakAwarded: true },
          });

          circleUpdated = true;
          newStreak = updatedCircle.streak;
        }
      }
    }

    return NextResponse.json({
      participant: updated,
      streakUpdated: circleUpdated,
      newStreak,
    });
  } catch {
    return NextResponse.json({ error: 'Failed to update participant state' }, { status: 500 });
  }
}
