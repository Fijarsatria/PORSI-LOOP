import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { DatabaseSync } from 'node:sqlite';
import type { Action, Snapshot, User } from '../domain';
import {
  createMarketplaceState,
  DomainError,
  snapshot,
  adoptGuestOrders,
  applyAction,
  serverNow,
  type StoreState,
} from './engine';
import { applyDemoCommand } from './commands';
import { createDemoMarketplace } from './sample-data';
import {
  accountFields,
  isReservedEmail,
  passwordHash,
  verifyPassword,
} from './accounts';
import { authenticateDemo } from './auth';

export const mode = (): 'demo' | 'supabase' => {
  const value = process.env.PORSI_MODE ?? 'demo';
  if (value !== 'demo' && value !== 'supabase')
    throw new DomainError(
      'PORSI_MODE harus demo atau supabase. Periksa konfigurasi layanan.',
      503,
    );
  return value;
};
let dbPromise: Promise<DatabaseSync> | undefined;
async function database() {
  if (!dbPromise)
    dbPromise = import('node:sqlite').then(({ DatabaseSync }) => {
      const directory =
        process.env.PORSI_DATA_DIR ?? join(process.cwd(), '.data');
      mkdirSync(directory, { recursive: true });
      const db = new DatabaseSync(join(directory, 'porsi-loop.sqlite'));
      db.exec(
        'PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000; CREATE TABLE IF NOT EXISTS application_state (id INTEGER PRIMARY KEY CHECK(id = 1), document TEXT NOT NULL); CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_json TEXT NOT NULL, expires_at INTEGER NOT NULL); CREATE TABLE IF NOT EXISTS auth_attempts (key TEXT PRIMARY KEY, count INTEGER NOT NULL, window_start INTEGER NOT NULL);',
      );
      db.exec(
        "CREATE TABLE IF NOT EXISTS accounts (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, name TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('student','seller')), outlet_id TEXT);",
      );
      db.prepare(
        'INSERT OR IGNORE INTO application_state (id, document) VALUES (1, ?)',
      ).run(JSON.stringify(createDemoMarketplace()));
      return db;
    });
  return dbPromise;
}
const parse = (row: unknown) => {
  const state = JSON.parse(
    (row as { document: string }).document,
  ) as StoreState;
  if (!state.kitchens) {
    const seeded = createMarketplaceState(Date.parse(state.createdAt));
    state.kitchens = seeded.kitchens;
    state.menu.outletId ??= 'outlet-bu-ratna';
    state.orders.forEach((order) => {
      order.outletId ??= state.menu.outletId;
      order.paymentStatus ??= 'paid';
      order.paymentMethod ??= 'qris';
      order.fulfillment ??= 'pick_up';
      if (['confirmed', 'ready'].includes(order.status))
        order.pickupToken ??= randomBytes(32).toString('base64url');
    });
    state.claims.forEach((claim) => {
      claim.outletId ??= state.menu.outletId;
      claim.paymentStatus ??= 'paid';
      claim.paymentMethod ??= 'qris';
      claim.fulfillment ??= 'pick_up';
      if (['confirmed', 'ready'].includes(claim.status))
        claim.pickupToken ??= randomBytes(32).toString('base64url');
    });
  }
  return state;
};

export async function getSnapshot(user: User | null): Promise<Snapshot> {
  if (mode() === 'supabase') {
    const { cloudSnapshot } = await import('./supabase');
    return cloudSnapshot(user);
  }
  const db = await database();
  db.exec('BEGIN IMMEDIATE');
  try {
    const state = parse(
      db.prepare('SELECT document FROM application_state WHERE id = 1').get(),
    );
    const view = snapshot(state, user, 'demo');
    db.prepare('UPDATE application_state SET document = ? WHERE id = 1').run(
      JSON.stringify(state),
    );
    db.exec('COMMIT');
    return view;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

export async function mutate(user: User, action: Action): Promise<Snapshot> {
  if (mode() === 'supabase') {
    const { cloudMutate } = await import('./supabase');
    return cloudMutate(user, action);
  }
  const db = await database();
  db.exec('BEGIN IMMEDIATE');
  try {
    let state = parse(
      db.prepare('SELECT document FROM application_state WHERE id = 1').get(),
    );
    state = applyDemoCommand(state, user, action);
    db.prepare('UPDATE application_state SET document = ? WHERE id = 1').run(
      JSON.stringify(state),
    );
    db.exec('COMMIT');
    return snapshot(state, user, 'demo');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

export async function authenticateLocal(
  data: Record<string, unknown>,
): Promise<User> {
  if (typeof data.email !== 'string' || typeof data.password !== 'string')
    throw new DomainError('Masukkan email dan kata sandi.', 401);
  const db = await database();
  const row = db
    .prepare('SELECT * FROM accounts WHERE email = ?')
    .get(data.email.trim().toLowerCase()) as
    | {
        id: string;
        name: string;
        email: string;
        role: 'student' | 'seller';
        outlet_id?: string;
        password_hash: string;
      }
    | undefined;
  if (!row) return authenticateDemo(data);
  if (
    row.role !== data.role ||
    !verifyPassword(data.password, row.password_hash)
  )
    throw new DomainError(
      'Email, kata sandi, atau jenis akun belum sesuai.',
      401,
    );
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    isGuest: false,
    ...(row.outlet_id ? { outletId: row.outlet_id } : {}),
  };
}

export async function registerLocal(
  data: Record<string, unknown>,
  guest?: User | null,
): Promise<User> {
  const fields = accountFields(data);
  if (isReservedEmail(fields.email))
    throw new DomainError(
      'Email ini sudah dipakai. Masuk dengan akun yang ada.',
      409,
    );
  const hash = passwordHash(fields.password);
  const db = await database();
  const user: User = {
    id: randomUUID(),
    name: fields.name,
    email: fields.email,
    role: 'student',
    isGuest: false,
  };
  db.exec('BEGIN IMMEDIATE');
  try {
    if (db.prepare('SELECT id FROM accounts WHERE email = ?').get(fields.email))
      throw new DomainError('Email ini sudah terdaftar. Silakan masuk.', 409);
    db.prepare('INSERT INTO accounts VALUES (?, ?, ?, ?, ?, NULL)').run(
      user.id,
      fields.email,
      hash,
      fields.name,
      'student',
    );
    if (guest?.isGuest) {
      const state = parse(
        db.prepare('SELECT document FROM application_state WHERE id = 1').get(),
      );
      adoptGuestOrders(state, guest.id, user.id);
      db.prepare('UPDATE application_state SET document = ? WHERE id = 1').run(
        JSON.stringify(state),
      );
    }
    db.exec('COMMIT');
    return user;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

export async function claimLocalGuest(guest: User | null, customer: User) {
  if (!guest?.isGuest || customer.role !== 'student') return;
  const db = await database();
  db.exec('BEGIN IMMEDIATE');
  try {
    const state = parse(
      db.prepare('SELECT document FROM application_state WHERE id = 1').get(),
    );
    adoptGuestOrders(state, guest.id, customer.id);
    db.prepare('UPDATE application_state SET document = ? WHERE id = 1').run(
      JSON.stringify(state),
    );
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

export async function createLocalSeller(
  admin: User,
  data: Record<string, unknown>,
): Promise<Snapshot> {
  if (admin.role !== 'admin')
    throw new DomainError(
      'Hanya pengelola yang dapat memberi akses gerai.',
      403,
    );
  const fields = accountFields(data);
  if (isReservedEmail(fields.email))
    throw new DomainError('Email ini sudah dipakai oleh akun demo.', 409);
  const hash = passwordHash(fields.password);
  const db = await database();
  db.exec('BEGIN IMMEDIATE');
  try {
    if (db.prepare('SELECT id FROM accounts WHERE email = ?').get(fields.email))
      throw new DomainError('Email sudah terdaftar.', 409);
    const state = parse(
      db.prepare('SELECT document FROM application_state WHERE id = 1').get(),
    );
    const accountId = randomUUID();
    const outletId =
      typeof data.outletId === 'string' && data.outletId
        ? data.outletId
        : `outlet-${randomUUID()}`;
    if (data.outletId) {
      if (
        ![state, ...(state.kitchens ?? [])].some(
          (k) => k.menu.outletId === outletId,
        )
      )
        throw new DomainError('Gerai tidak ditemukan.', 404);
      state.staffAccounts ??= [];
      state.staffAccounts.push({
        id: accountId,
        name: fields.name,
        email: fields.email,
        outletId,
      });
    } else
      applyAction(
        state,
        admin,
        {
          type: 'create_outlet',
          name: data.outletName,
          location: data.location,
          category: data.category,
          outletId,
          accountId,
          sellerEmail: fields.email,
          sellerName: fields.name,
        },
        serverNow(state, 'demo'),
      );
    db.prepare('INSERT INTO accounts VALUES (?, ?, ?, ?, ?, ?)').run(
      accountId,
      fields.email,
      hash,
      fields.name,
      'seller',
      outletId,
    );
    db.prepare('UPDATE application_state SET document = ? WHERE id = 1').run(
      JSON.stringify(state),
    );
    db.exec('COMMIT');
    return snapshot(state, admin, 'demo');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

const tokenHash = (token: string) =>
  createHash('sha256').update(token).digest('hex');
export async function createDemoSession(user: User) {
  const db = await database();
  const token = randomBytes(32).toString('base64url');
  db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(Date.now());
  db.prepare(
    'INSERT INTO sessions (token_hash, user_json, expires_at) VALUES (?, ?, ?)',
  ).run(tokenHash(token), JSON.stringify(user), Date.now() + 86400000);
  return token;
}
export async function readDemoSession(token: string): Promise<User | null> {
  if (token.length !== 43) return null;
  const db = await database();
  const row = db
    .prepare(
      'SELECT user_json FROM sessions WHERE token_hash = ? AND expires_at > ?',
    )
    .get(tokenHash(token), Date.now()) as { user_json: string } | undefined;
  return row ? (JSON.parse(row.user_json) as User) : null;
}
export async function removeDemoSession(token: string) {
  const db = await database();
  db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash(token));
}

export async function checkRateLimit(key: string) {
  // A durable demo limiter; cloud auth also applies Supabase's account-level limits.
  if (mode() !== 'demo') return;
  const db = await database();
  const now = Date.now();
  db.prepare('DELETE FROM auth_attempts WHERE window_start < ?').run(
    now - 900000,
  );
  const hashed = tokenHash(key);
  const row = db
    .prepare('SELECT count FROM auth_attempts WHERE key = ?')
    .get(hashed) as { count: number } | undefined;
  if (row && row.count >= 30)
    throw new DomainError(
      'Terlalu banyak percobaan. Coba kembali dalam 15 menit.',
      429,
    );
  db.prepare(
    'INSERT INTO auth_attempts (key, count, window_start) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET count = count + 1',
  ).run(hashed, now);
}
