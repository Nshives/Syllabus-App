import { SignJWT, jwtVerify, JWTPayload } from 'jose';
import { cookies } from 'next/headers';

const SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET || 'secret');

export interface AuthPayload extends JWTPayload {
  userId: number; // 👈 Officially a number!
}

export async function signToken(payload: { userId: number }) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('1d')
    .sign(SECRET_KEY);
}

export async function verifyToken(token: string): Promise<AuthPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return payload as AuthPayload; 
  } catch (error) {
    return null;
  }
}

export async function getSession(): Promise<AuthPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) return null;
  return await verifyToken(token);
}