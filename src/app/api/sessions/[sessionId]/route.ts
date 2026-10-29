import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { sessionId: string } }
) {
  try {
    const session = await prisma.session.findUnique({
      where: { id: params.sessionId },
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

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    return NextResponse.json({ session });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch session' }, { status: 500 });
  }
}
