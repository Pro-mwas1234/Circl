import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { code: string } }
) {
  try {
    const circle = await prisma.circle.findUnique({
      where: { inviteCode: params.code },
      include: {
        organizer: { select: { username: true } },
        _count: { select: { members: true } },
      },
    });

    if (!circle) {
      return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 });
    }

    return NextResponse.json({ circle });
  } catch {
    return NextResponse.json({ error: 'Failed to find invite code' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { code: string } }
) {
  try {
    const circle = await prisma.circle.findUnique({
      where: { inviteCode: params.code },
    });

    if (!circle) {
      return NextResponse.json({ error: 'Invite code not found' }, { status: 404 });
    }

    return NextResponse.json({ circleId: circle.id });
  } catch {
    return NextResponse.json({ error: 'Failed to process invite' }, { status: 500 });
  }
}
