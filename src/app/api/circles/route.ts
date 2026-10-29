import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode');

    const whereClause: { isStanding?: boolean } = {};
    if (mode === 'standing') {
      whereClause.isStanding = true;
    } else if (mode === 'dropin') {
      whereClause.isStanding = false;
    }

    const circles = await prisma.circle.findMany({
      where: whereClause,
      include: {
        organizer: {
          select: { id: true, username: true, email: true },
        },
        members: {
          include: {
            user: { select: { id: true, username: true } },
          },
        },
        sessions: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: { members: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ circles });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch circles' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, description, workType, durationMins, isStanding, timeSlot } = await request.json();

    if (!name || !workType) {
      return NextResponse.json(
        { error: 'Name and work type are required' },
        { status: 400 }
      );
    }

    if (isStanding) {
      const standingCount = await prisma.circle.count({
        where: {
          organizerId: user.id,
          isStanding: true,
        },
      });

      if (standingCount >= 1) {
        return NextResponse.json(
          { error: 'Free tier limit reached: You can create 1 standing circle as organizer.' },
          { status: 403 }
        );
      }
    }

    const circle = await prisma.circle.create({
      data: {
        name,
        description: description || '',
        workType,
        durationMins: durationMins ? parseInt(durationMins, 10) : 50,
        isStanding: Boolean(isStanding),
        timeSlot: timeSlot || (isStanding ? 'Weekly' : 'Drop-in'),
        organizerId: user.id,
        members: {
          create: {
            userId: user.id,
            role: 'organizer',
          },
        },
      },
      include: {
        organizer: { select: { id: true, username: true } },
        members: true,
      },
    });

    return NextResponse.json({ circle });
  } catch {
    return NextResponse.json({ error: 'Failed to create circle' }, { status: 500 });
  }
}
