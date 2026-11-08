import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import type { Role } from '../../../lib/domain';
import { DomainError } from '../../../lib/server/engine';
import { authenticateDemo } from '../../../lib/server/auth';
import {
  body,
  checkOrigin,
  COOKIE,
  CUSTOMER_COOKIE,
  GUEST_COOKIE,
  cookieOptions,
  errorResponse,
  ensureUser,
  readGuestUser,
  requestSpace,
  readUser,
} from '../../../lib/server/http';
import {
  checkRateLimit,
  createDemoSession,
  getSnapshot,
  mode,
  removeDemoSession,
  authenticateLocal,
  claimLocalGuest,
} from '../../../lib/server/store';

export const runtime = 'nodejs';
export async function POST(request: NextRequest) {
  try {
    checkOrigin(request);
    const data = await body(request);
    if (!['student', 'seller', 'admin'].includes(String(data.role)))
      throw new DomainError('Pilih jenis akun.');
    const role = data.role as Role;
    const jar = await cookies();
    if (mode() === 'demo') {
      if (data.demo !== true)
        throw new DomainError(
          'Gunakan akun demonstrasi yang disediakan pengelola.',
          401,
        );
      await checkRateLimit(
        `account:${role}:${typeof data.email === 'string' ? data.email.trim().toLowerCase() : 'missing'}`,
      );
      const user = await authenticateLocal(data);
      if (user.role === 'student')
        await claimLocalGuest(await readGuestUser(), user);
      const token = await createDemoSession(user);
      jar.set(
        role === 'student' ? CUSTOMER_COOKIE : COOKIE,
        token,
        cookieOptions(),
      );
      return NextResponse.json(await getSnapshot(user), {
        headers: { 'Cache-Control': 'no-store, private' },
      });
    }
    if (data.demo === true)
      throw new DomainError(
        'Akses simulasi tidak tersedia pada layanan ini.',
        403,
      );
    const { cloudLogin } = await import('../../../lib/server/supabase');
    const { user, token } = await cloudLogin(data);
    if (user.role !== role)
      throw new DomainError(
        'Jenis akun tidak sesuai. Pilih akses yang sesuai dengan akunmu.',
        403,
      );
    if (role === 'student')
      await (
        await import('../../../lib/server/supabase')
      ).cloudClaimGuest(await readGuestUser(), user);
    jar.set(
      role === 'student' ? CUSTOMER_COOKIE : COOKIE,
      token,
      cookieOptions(),
    );
    return NextResponse.json(await getSnapshot(user), {
      headers: { 'Cache-Control': 'no-store, private' },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
export async function DELETE(request: NextRequest) {
  try {
    checkOrigin(request);
    const jar = await cookies();
    const current = await readUser(requestSpace(request));
    const cookieName =
      requestSpace(request) === 'customer' ||
      (requestSpace(request) === 'auto' &&
        current?.role === 'student' &&
        jar.get(CUSTOMER_COOKIE)?.value)
        ? CUSTOMER_COOKIE
        : COOKIE;
    const token = jar.get(cookieName)?.value;
    if (token) {
      if (mode() === 'demo') await removeDemoSession(token);
      else {
        const { cloudLogout } = await import('../../../lib/server/supabase');
        await cloudLogout(token);
      }
    }
    jar.set(cookieName, '', { ...cookieOptions(), maxAge: 0 });
    return NextResponse.json(
      await getSnapshot(await ensureUser(requestSpace(request))),
      {
        headers: { 'Cache-Control': 'no-store, private' },
      },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
