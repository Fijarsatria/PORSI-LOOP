import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  randomUUID,
} from 'node:crypto';
import { cookies } from 'next/headers';
import { createClient, type User as SupabaseUser } from '@supabase/supabase-js';
import type { Action, Role, Snapshot, User } from '../domain';
import {
  applyAction,
  createMarketplaceState,
  DomainError,
  snapshot,
  type StoreState,
} from './engine';
import { COOKIE, cookieOptions } from './http';
import { createGuest } from './auth';

function config() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishable =
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (
    !url ||
    !publishable ||
    !secret ||
    !process.env.SESSION_SECRET ||
    process.env.SESSION_SECRET.length < 32
  )
    throw new DomainError(
      'Layanan belum selesai dikonfigurasi. Hubungi pengelola kantin.',
      503,
    );
  return { url, publishable, secret };
}
const options = {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
};
const publicClient = () => {
  const c = config();
  return createClient(c.url, c.publishable, options);
};
const serviceClient = () => {
  const c = config();
  return createClient(c.url, c.secret, options);
};
const encryptionKey = () =>
  createHash('sha256').update(process.env.SESSION_SECRET!).digest();
interface SessionToken {
  id: string;
  access: string;
  refresh: string;
  expires: number;
}
interface GuestToken { kind: 'guest'; user: User; expires: number }
function seal(value: SessionToken | GuestToken) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(value), 'utf8'),
    cipher.final(),
  ]);
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString(
    'base64url',
  );
}
function unseal(token: string): SessionToken | GuestToken | null {
  try {
    if (token.length > 6000) return null;
    const data = Buffer.from(token, 'base64url');
    const decipher = createDecipheriv(
      'aes-256-gcm',
      encryptionKey(),
      data.subarray(0, 12),
    );
    decipher.setAuthTag(data.subarray(12, 28));
    const value = JSON.parse(
      Buffer.concat([
        decipher.update(data.subarray(28)),
        decipher.final(),
      ]).toString(),
    ) as SessionToken | GuestToken;
    return value.expires > Date.now() ? value : null;
  } catch {
    return null;
  }
}
export function userFromAuth(user: SupabaseUser): User {
  // Roles are issued only by a trusted administrator, never from user_metadata.
  const rawRole = user.app_metadata?.role;
  const role: Role =
    rawRole === 'seller' || rawRole === 'admin' ? rawRole : 'student';
  const outletId = typeof user.app_metadata?.outletId === 'string' ? user.app_metadata.outletId : undefined;
  if (role === 'seller' && (!outletId || !/^[a-zA-Z0-9_-]{1,100}$/.test(outletId))) throw new DomainError('Akun gerai belum memiliki penugasan gerai yang valid.', 403);
  return {
    id: user.id,
    role,
    name:
      role === 'student'
        ? 'Teman Porsi'
        : role === 'seller'
          ? 'Pemilik gerai'
          : 'Pengelola kantin',
    email: user.email,
    outletId: role === 'seller' ? outletId : undefined,
  };
}

export function createCloudGuestSession() {
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) throw new DomainError('Identitas tamu belum selesai dikonfigurasi.', 503);
  const user = createGuest();
  return { user, token: seal({ kind: 'guest', user, expires: Date.now() + 86400000 }) };
}
export function readCloudGuestSession(token: string): User | null {
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) return null;
  const value = unseal(token);
  return value && 'kind' in value && value.kind === 'guest' && value.user.role === 'student' && value.user.isGuest === true && /^guest-[a-f0-9-]{36}$/.test(value.user.id) ? value.user : null;
}
export async function cloudLogin(data: Record<string, unknown>) {
  if (
    typeof data.email !== 'string' ||
    typeof data.password !== 'string' ||
    !data.email.includes('@') ||
    data.email.length > 254 ||
    data.password.length > 1024
  )
    throw new DomainError('Masukkan email dan kata sandi yang valid.');
  const client = publicClient();
  const { data: auth, error } = await client.auth.signInWithPassword({
    email: data.email.trim(),
    password: data.password,
  });
  if (error || !auth.session || !auth.user)
    throw new DomainError(
      'Email atau kata sandi belum sesuai. Periksa kembali dan coba lagi.',
      401,
    );
  const user = userFromAuth(auth.user);
  if (user.role !== data.role) {
    await client.auth.signOut({ scope: 'local' });
    throw new DomainError(
      'Jenis akun tidak sesuai. Pilih akses yang sesuai dengan akunmu.',
      403,
    );
  }
  const id = randomUUID();
  const expires = Date.now() + 86400000;
  const stored = await serviceClient()
    .from('porsi_sessions')
    .insert({
      id,
      user_id: auth.user.id,
      expires_at: new Date(expires).toISOString(),
    });
  if (stored.error)
    throw new DomainError('Sesi belum dapat disimpan. Hubungi pengelola.', 503);
  const token = seal({
    id,
    access: auth.session.access_token,
    refresh: auth.session.refresh_token,
    expires,
  });
  return { token, user };
}
export async function readCloudSession(token: string): Promise<User | null> {
  config();
  const value = unseal(token);
  if (!value || 'kind' in value) return null;
  const registered = await serviceClient()
    .from('porsi_sessions')
    .select('user_id')
    .eq('id', value.id)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();
  if (registered.error || !registered.data) return null;
  const client = publicClient();
  const { data, error } = await client.auth.getUser(value.access);
  if (!error && data.user)
    return registered.data.user_id === data.user.id
      ? userFromAuth(data.user)
      : null;
  const refreshed = await client.auth.refreshSession({
    refresh_token: value.refresh,
  });
  if (
    refreshed.error ||
    !refreshed.data.session ||
    !refreshed.data.user ||
    registered.data.user_id !== refreshed.data.user.id
  )
    return null;
  const updated = seal({
    id: value.id,
    access: refreshed.data.session.access_token,
    refresh: refreshed.data.session.refresh_token,
    expires: value.expires,
  });
  const jar = await cookies();
  jar.set(COOKIE, updated, cookieOptions());
  return userFromAuth(refreshed.data.user);
}
export async function cloudLogout(token: string) {
  config();
  const value = unseal(token);
  if (!value || 'kind' in value) return;
  const revoked = await serviceClient()
    .from('porsi_sessions')
    .delete()
    .eq('id', value.id);
  if (revoked.error)
    throw new DomainError(
      'Sesi belum berhasil dicabut. Coba keluar lagi sebentar.',
      503,
    );
  const client = publicClient();
  await client.auth.setSession({
    access_token: value.access,
    refresh_token: value.refresh,
  });
  await client.auth.signOut({ scope: 'local' });
}

async function load() {
  const client = serviceClient();
  const { data, error } = await client
    .from('porsi_state')
    .select('document, revision')
    .eq('id', 'main')
    .single();
  if (error?.code === 'PGRST116') {
    const initial = createMarketplaceState(Date.now(), true);
    // A live installation starts empty, with slots relative to actual server time.
    for (const kitchen of [initial, ...(initial.kitchens ?? [])]) kitchen.slots = kitchen.slots.map((slot, i) => {
      const start = Date.now() + (60 + i * 30) * 60000;
      const end = start + 30 * 60000;
      const fmt = (date: number) =>
        new Intl.DateTimeFormat('id-ID', {
          timeZone: 'Asia/Jakarta',
          hour: '2-digit',
          minute: '2-digit',
        }).format(new Date(date));
      return {
        ...slot,
        start: new Date(start).toISOString(),
        end: new Date(end).toISOString(),
        cutoff: new Date(Date.now() + 30 * 60000).toISOString(),
        label: `${fmt(start)}–${fmt(end)}`,
      };
    });
    const inserted = await client
      .from('porsi_state')
      .insert({ id: 'main', document: initial, revision: 0 });
    if (inserted.error && inserted.error.code !== '23505')
      throw new DomainError(
        'Penyimpanan belum dapat diinisialisasi. Periksa konfigurasi basis data.',
        503,
      );
    const reloaded = await client
      .from('porsi_state')
      .select('document, revision')
      .eq('id', 'main')
      .single();
    if (reloaded.error)
      throw new DomainError('Penyimpanan belum tersedia.', 503);
    return {
      state: upgradeCloudState(reloaded.data.document as StoreState),
      revision: Number(reloaded.data.revision),
    };
  }
  if (error || !data)
    throw new DomainError(
      'Penyimpanan belum tersedia. Pastikan skema PORSI LOOP telah dipasang.',
      503,
    );
  return {
    state: upgradeCloudState(data.document as StoreState),
    revision: Number(data.revision),
  };
}
function upgradeCloudState(state: StoreState): StoreState {
  if (!state.kitchens) {
    const empty = createMarketplaceState(Date.now(), true);
    state.kitchens = empty.kitchens;
    state.menu.outletId ??= 'outlet-bu-ratna';
    for (const kitchen of state.kitchens ?? []) kitchen.slots = kitchen.slots.map((slot, i) => {
      const start = Date.now() + (60 + i * 30) * 60000;
      const format = (time: number) => new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' }).format(new Date(time));
      return { ...slot, start: new Date(start).toISOString(), end: new Date(start + 30 * 60000).toISOString(), cutoff: new Date(Date.now() + 30 * 60000).toISOString(), label: `${format(start)}–${format(start + 30 * 60000)}` };
    });
  }
  return state;
}
export async function cloudSnapshot(user: User | null): Promise<Snapshot> {
  const { state } = await load();
  return snapshot(state, user, 'supabase');
}
export async function cloudMutate(
  user: User,
  action: Action,
): Promise<Snapshot> {
  if (action.type === 'reset_demo' || action.type === 'advance_demo')
    throw new DomainError(
      'Pengaturan simulasi dinonaktifkan pada layanan nyata.',
      403,
    );
  for (let attempt = 0; attempt < 5; attempt++) {
    const { state, revision } = await load();
    applyAction(state, user, action, Date.now(), 'supabase');
    const { data, error } = await serviceClient().rpc(
      'porsi_compare_and_swap',
      { expected_revision: revision, next_document: state },
    );
    if (error)
      throw new DomainError(
        'Transaksi belum tersimpan. Coba lagi sebentar.',
        503,
      );
    if (data === true) return snapshot(state, user, 'supabase');
  }
  throw new DomainError(
    'Data sedang diperbarui pengguna lain. Muat ulang dan coba lagi.',
    409,
  );
}
