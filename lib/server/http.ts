import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import type { User } from '../domain';
import { DomainError } from './engine';
import { createDemoSession, mode, readDemoSession } from './store';
import { createGuest } from './auth';

export const COOKIE = 'porsi_session';
export const CUSTOMER_COOKIE = 'porsi_customer';
export const GUEST_COOKIE = 'porsi_guest';
export type SessionSpace = 'auto' | 'customer' | 'work';
export const requestSpace = (request: NextRequest): SessionSpace =>
  request.headers.get('x-porsi-space') === 'customer' ||
  request.nextUrl.searchParams.get('space') === 'customer'
    ? 'customer'
    : request.headers.get('x-porsi-space') === 'work' ||
        request.nextUrl.searchParams.get('space') === 'work'
      ? 'work'
      : 'auto';
export const cookieOptions = () => ({
  httpOnly: true,
  secure:
    process.env.NODE_ENV === 'production' &&
    process.env.PORSI_COOKIE_INSECURE !== 'true',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 86400,
});
export function checkOrigin(request: NextRequest) {
  const origin = request.headers.get('origin');
  // Next's dev URL can contain the bind address (0.0.0.0) rather than the
  // hostname the browser requested. Host is the actual HTTP target; forwarded
  // host/protocol headers are intentionally not trusted for this decision.
  const host = request.headers.get('host') ?? request.nextUrl.host;
  const protocol = request.nextUrl.protocol;
  if (
    !host ||
    /[\s\/@?#]/.test(host) ||
    !['http:', 'https:'].includes(protocol)
  )
    throw new DomainError('Alamat situs tidak valid.', 403);
  let allowedOrigin: string;
  try {
    allowedOrigin = new URL(process.env.APP_ORIGIN || `${protocol}//${host}`)
      .origin;
  } catch {
    throw new DomainError(
      'Alamat situs belum dikonfigurasi dengan benar.',
      503,
    );
  }
  if (!origin || origin !== allowedOrigin)
    throw new DomainError(
      'Permintaan harus berasal dari situs PORSI LOOP yang sama.',
      403,
    );
}
export async function readUser(
  space: SessionSpace = 'auto',
): Promise<User | null> {
  const jar = await cookies();
  let customerUser: User | null = null;
  if (space !== 'work') {
    const customerToken = jar.get(CUSTOMER_COOKIE)?.value;
    if (customerToken) {
      const customer =
        mode() === 'demo'
          ? await readDemoSession(customerToken)
          : await (
              await import('./supabase')
            ).readCloudSession(customerToken, CUSTOMER_COOKIE);
      if (customer?.role === 'student') customerUser = customer;
      if (
        customer?.role === 'student' &&
        (space === 'customer' || !jar.get(COOKIE)?.value)
      )
        return customer;
    }
  }
  const token = jar.get(COOKIE)?.value;
  if (space !== 'customer' && token && mode() === 'supabase') {
    const { readCloudSession } = await import('./supabase');
    const user = await readCloudSession(token);
    if (user) return user;
  }
  if (space !== 'customer' && token && mode() === 'demo') {
    const user = await readDemoSession(token);
    if (user) return user;
  }
  if (space === 'work') return null;
  return customerUser ?? readGuestUser();
}
export async function readGuestUser(): Promise<User | null> {
  const jar = await cookies();
  const guestToken = jar.get(GUEST_COOKIE)?.value;
  if (!guestToken) return null;
  if (mode() === 'supabase') {
    const { readCloudGuestSession } = await import('./supabase');
    return readCloudGuestSession(guestToken);
  }
  const guest = await readDemoSession(guestToken);
  return guest?.isGuest && guest.role === 'student' ? guest : null;
}
export async function ensureUser(space: SessionSpace = 'auto'): Promise<User> {
  const existing = await readUser(space);
  if (existing) return existing;
  const guest = await readGuestUser();
  if (guest) return guest;
  const jar = await cookies();
  if (mode() === 'supabase') {
    const { createCloudGuestSession } = await import('./supabase');
    const { user, token } = createCloudGuestSession();
    jar.set(GUEST_COOKIE, token, cookieOptions());
    return user;
  }
  const user = createGuest();
  jar.set(GUEST_COOKIE, await createDemoSession(user), cookieOptions());
  return user;
}
export function errorResponse(error: unknown) {
  if (error instanceof DomainError)
    return NextResponse.json(
      { error: error.message },
      { status: error.status, headers: { 'Cache-Control': 'no-store' } },
    );
  console.error(
    '[PORSI LOOP] Request failed:',
    error instanceof Error ? error.message : 'Unknown error',
  );
  return NextResponse.json(
    {
      error:
        'Data belum dapat diproses. Coba lagi sebentar atau hubungi pengelola.',
    },
    { status: 500, headers: { 'Cache-Control': 'no-store' } },
  );
}
export async function body(
  request: NextRequest,
): Promise<Record<string, unknown>> {
  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > 16384) throw new DomainError('Data terlalu besar.', 413);
  const raw = await request.text();
  if (raw.length > 16384) throw new DomainError('Data terlalu besar.', 413);
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new DomainError('Format data tidak valid.');
  }
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new DomainError('Format data tidak valid.');
  return value as Record<string, unknown>;
}
