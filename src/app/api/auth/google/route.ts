import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { signToken } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { email, username } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required for Google authentication' },
        { status: 400 }
      );
    }

    let user = await prisma.user.findUnique({
      where: { email },
    });

    if (user && user.provider !== 'google') {
      return NextResponse.json(
        { error: 'This email is associated with password authentication. Please log in with email/password.' },
        { status: 400 }
      );
    }

    if (!user) {
      let targetUsername = username || `google_user_${Math.floor(1000 + Math.random() * 9000)}`;

      const existingUsername = await prisma.user.findUnique({
        where: { username: targetUsername },
      });
      if (existingUsername) {
        targetUsername = `${targetUsername}_${Math.floor(100 + Math.random() * 900)}`;
      }

      user = await prisma.user.create({
        data: {
          email,
          username: targetUsername,
          provider: 'google',
          avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${targetUsername}`,
        },
      });
    }

    const token = signToken({
      id: user.id,
      email: user.email,
      username: user.username,
    });

    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
      },
    });

    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: 'Google login failed.' },
      { status: 500 }
    );
  }
}
