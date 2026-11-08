import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import type { User } from '../domain';
import { DomainError } from './engine';
import { mode, readDemoSession } from './store';

export const COOKIE = 'porsi_session';
export const cookieOptions = () => ({ httpOnly: true, secure: process.env.NODE_ENV === 'production' && process.env.PORSI_COOKIE_INSECURE !== 'true', sameSite: 'lax' as const, path: '/', maxAge: 86400 });
export function checkOrigin(request: NextRequest) {
  const origin = request.headers.get('origin');
  const allowedOrigin = process.env.APP_ORIGIN ? new URL(process.env.APP_ORIGIN).origin : request.nextUrl.origin;
  if (!origin || origin !== allowedOrigin) throw new DomainError('Permintaan harus berasal dari situs PORSI LOOP yang sama.', 403);
}
export async function readUser(): Promise<User | null> {
  const jar = await cookies(); const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  if (mode() === 'supabase') { const { readCloudSession } = await import('./supabase'); return readCloudSession(token); }
  return readDemoSession(token);
}
export function errorResponse(error: unknown) {
  if (error instanceof DomainError) return NextResponse.json({ error: error.message }, { status: error.status, headers: { 'Cache-Control': 'no-store' } });
  console.error('[PORSI LOOP] Request failed:', error instanceof Error ? error.message : 'Unknown error');
  return NextResponse.json({ error: 'Data belum dapat diproses. Coba lagi sebentar atau hubungi pengelola.' }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
}
export async function body(request: NextRequest): Promise<Record<string, unknown>> {
  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > 16384) throw new DomainError('Data terlalu besar.', 413);
  const raw = await request.text();
  if (raw.length > 16384) throw new DomainError('Data terlalu besar.', 413);
  let value: unknown; try { value = JSON.parse(raw); } catch { throw new DomainError('Format data tidak valid.'); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new DomainError('Format data tidak valid.');
  return value as Record<string, unknown>;
}
