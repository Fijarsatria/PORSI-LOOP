import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import type { Role } from '../../../lib/domain';
import { DEMO_USERS, DomainError } from '../../../lib/server/engine';
import { body, checkOrigin, COOKIE, cookieOptions, errorResponse } from '../../../lib/server/http';
import { checkRateLimit, createDemoSession, getSnapshot, mode, removeDemoSession } from '../../../lib/server/store';

export const runtime = 'nodejs';
export async function POST(request: NextRequest) {
  try {
    checkOrigin(request); const data = await body(request);
    if (!['student', 'seller', 'admin'].includes(String(data.role))) throw new DomainError('Pilih jenis akun.');
    const role = data.role as Role; const jar = await cookies();
    if (data.demo === true) {
      if (mode() !== 'demo') throw new DomainError('Akses simulasi tidak tersedia pada layanan ini.', 403);
      await checkRateLimit(request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'local');
      const user = DEMO_USERS[role]; const token = await createDemoSession(user);
      jar.set(COOKIE, token, cookieOptions());
      return NextResponse.json(await getSnapshot(user), { headers: { 'Cache-Control': 'no-store, private' } });
    }
    if (mode() !== 'supabase') throw new DomainError('Layanan ini memakai mode simulasi. Gunakan tombol “Coba simulasi” untuk menjelajah.', 503);
    const { cloudLogin } = await import('../../../lib/server/supabase');
    const { user, token } = await cloudLogin(data);
    if (user.role !== role) throw new DomainError('Jenis akun tidak sesuai. Pilih akses yang sesuai dengan akunmu.', 403);
    jar.set(COOKIE, token, cookieOptions());
    return NextResponse.json(await getSnapshot(user), { headers: { 'Cache-Control': 'no-store, private' } });
  } catch (error) { return errorResponse(error); }
}
export async function DELETE(request: NextRequest) {
  try {
    checkOrigin(request); const jar = await cookies(); const token = jar.get(COOKIE)?.value;
    if (token) {
      if (mode() === 'demo') await removeDemoSession(token);
      else { const { cloudLogout } = await import('../../../lib/server/supabase'); await cloudLogout(token); }
    }
    jar.set(COOKIE, '', { ...cookieOptions(), maxAge: 0 });
    return NextResponse.json({ ok: true });
  } catch (error) { return errorResponse(error); }
}
