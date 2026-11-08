import { createHash, randomBytes } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { DatabaseSync } from 'node:sqlite';
import type { Action, Snapshot, User } from '../domain';
import { createMarketplaceState, DomainError, snapshot, type StoreState } from './engine';
import { applyDemoCommand } from './commands';

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
      db.prepare(
        'INSERT OR IGNORE INTO application_state (id, document) VALUES (1, ?)',
      ).run(JSON.stringify(createMarketplaceState()));
      return db;
    });
  return dbPromise;
}
const parse = (row: unknown) => {
  const state = JSON.parse((row as { document: string }).document) as StoreState;
  if (!state.kitchens) {
    const seeded = createMarketplaceState(Date.parse(state.createdAt));
    state.kitchens = seeded.kitchens;
    state.menu.outletId ??= 'outlet-bu-ratna';
    state.orders.forEach(order => { order.outletId ??= state.menu.outletId; order.paymentStatus ??= 'paid'; order.paymentMethod ??= 'qris'; order.fulfillment ??= 'pick_up'; if (['confirmed', 'ready'].includes(order.status)) order.pickupToken ??= randomBytes(32).toString('base64url'); });
    state.claims.forEach(claim => { claim.outletId ??= state.menu.outletId; claim.paymentStatus ??= 'paid'; claim.paymentMethod ??= 'qris'; claim.fulfillment ??= 'pick_up'; if (['confirmed', 'ready'].includes(claim.status)) claim.pickupToken ??= randomBytes(32).toString('base64url'); });
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
    db.prepare('UPDATE application_state SET document = ? WHERE id = 1').run(JSON.stringify(state));
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
