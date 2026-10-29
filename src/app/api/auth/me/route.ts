import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const tokenUser = await getCurrentUser();
  if (!tokenUser) {
    return NextResponse.json({ user: null });
  }

  const user = await prisma.user.findUnique({
    where: { id: tokenUser.id },
    select: {
      id: true,
      email: true,
      username: true,
      avatar: true,
      provider: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ user });
}

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete('auth_token');
  return response;
}
