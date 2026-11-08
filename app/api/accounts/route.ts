import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import {
  body,
  checkOrigin,
  cookieOptions,
  CUSTOMER_COOKIE,
  errorResponse,
  readGuestUser,
  readUser,
} from '@/lib/server/http';
import {
  checkRateLimit,
  createDemoSession,
  createLocalSeller,
  getSnapshot,
  mode,
  registerLocal,
} from '@/lib/server/store';
import { DomainError } from '@/lib/server/engine';
export const runtime = 'nodejs';
export async function POST(request: NextRequest) {
  try {
    checkOrigin(request);
    const data = await body(request);
    if (data.type === 'seller_access') {
      const admin = await readUser('work');
      if (admin?.role !== 'admin')
        throw new DomainError(
          'Hanya pengelola dapat menambah gerai atau memberi akses.',
          403,
        );
      const state =
        mode() === 'demo'
          ? await createLocalSeller(admin, data)
          : await (
              await import('@/lib/server/supabase')
            ).cloudCreateSeller(admin, data);
      return NextResponse.json(state, {
        headers: { 'Cache-Control': 'no-store, private' },
      });
    }
    if (data.type !== 'register')
      throw new DomainError('Jenis pendaftaran tidak dikenal.');
    await checkRateLimit(
      `register:${request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'local'}`,
    );
    const guest = await readGuestUser();
    if (mode() === 'supabase') {
      const result = await (
        await import('@/lib/server/supabase')
      ).cloudRegister(data, guest);
      if (!result.user)
        return NextResponse.json({
          verificationRequired: true,
          message: 'Periksa email untuk mengonfirmasi akun, lalu masuk.',
        });
      (await cookies()).set(CUSTOMER_COOKIE, result.token!, cookieOptions());
      return NextResponse.json(await getSnapshot(result.user), {
        headers: { 'Cache-Control': 'no-store, private' },
      });
    }
    const user = await registerLocal(data, guest);
    (await cookies()).set(
      CUSTOMER_COOKIE,
      await createDemoSession(user),
      cookieOptions(),
    );
    return NextResponse.json(await getSnapshot(user), {
      status: 201,
      headers: { 'Cache-Control': 'no-store, private' },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
