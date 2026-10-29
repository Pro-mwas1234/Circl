import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET || 'tiny-focus-circles-secret-key-12345';

export interface UserTokenPayload {
  id: string;
  email: string;
  username: string;
}

export function signToken(payload: UserTokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): UserTokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as UserTokenPayload;
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<UserTokenPayload | null> {
  const cookieStore = cookies();
  const token = cookieStore.get('auth_token')?.value;
  if (!token) return null;
  return verifyToken(token);
}
