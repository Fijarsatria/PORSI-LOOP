import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { DatabaseSync } from 'node:sqlite';
import type { Action, Snapshot, User } from '../domain';
import { applyAction, createState, DomainError, expire, serverNow, snapshot, type StoreState } from './engine';

export const mode = (): 'demo' | 'supabase' => process.env.PORSI_MODE === 'supabase' ? 'supabase' : 'demo';
let dbPromise: Promise<DatabaseSync> | undefined;
async function database() {
  if (!dbPromise) dbPromise = import('node:sqlite').then(({ DatabaseSync }) => {
    const directory = process.env.PORSI_DATA_DIR ?? join(process.cwd(), '.data');
    mkdirSync(directory, { recursive: true });
    const db = new DatabaseSync(join(directory, 'porsi-loop.sqlite'));
    db.exec('PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000; CREATE TABLE IF NOT EXISTS application_state (id INTEGER PRIMARY KEY CHECK(id = 1), document TEXT NOT NULL); CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_json TEXT NOT NULL, expires_at INTEGER NOT NULL); CREATE TABLE IF NOT EXISTS auth_attempts (key TEXT PRIMARY KEY, count INTEGER NOT NULL, window_start INTEGER NOT NULL);');
    db.prepare('INSERT OR IGNORE INTO application_state (id, document) VALUES (1, ?)').run(JSON.stringify(createState()));
    return db;
  });
  return dbPromise;
}
const parse = (row: unknown) => JSON.parse((row as { document: string }).document) as StoreState;

export async function getSnapshot(user: User | null): Promise<Snapshot> {
  if (mode() === 'supabase') { const { cloudSnapshot } = await import('./supabase'); return cloudSnapshot(user); }
  const db = await database();
  const state = parse(db.prepare('SELECT document FROM application_state WHERE id = 1').get());
  return snapshot(state, user, 'demo');
}

export async function mutate(user: User, action: Action): Promise<Snapshot> {
  if (mode() === 'supabase') { const { cloudMutate } = await import('./supabase'); return cloudMutate(user, action); }
  const db = await database();
  db.exec('BEGIN IMMEDIATE');
  try {
    let state = parse(db.prepare('SELECT document FROM application_state WHERE id = 1').get());
    if (action.type === 'reset_demo') {
      if (user.role !== 'admin') throw new DomainError('Hanya pengelola yang dapat mengatur ulang simulasi.', 403);
      state = createState();
    } else if (action.type === 'advance_demo') {
      if (user.role !== 'admin') throw new DomainError('Hanya pengelola yang dapat mengubah jam simulasi.', 403);
      if (typeof action.minutes !== 'number' || !Number.isSafeInteger(action.minutes) || action.minutes < 1 || action.minutes > 240) throw new DomainError('Majukan jam simulasi antara 1–240 menit.');
      const key = typeof action.idempotencyKey === 'string' ? `${user.id}:${action.idempotencyKey.slice(0, 100)}` : '';
      if (!key || !state.idempotency.includes(key)) {
        state.demoClock = new Date(new Date(state.demoClock).getTime() + action.minutes * 60000).toISOString();
        const now = serverNow(state, 'demo'); expire(state, now);
        state.logs.unshift({ id: randomUUID(), action: 'Jam simulasi dimajukan', detail: `+${action.minutes} menit · tidak mengubah pengambilan menjadi berhasil`, actor: user.name, at: new Date(now).toISOString() });
        if (key) state.idempotency = [...state.idempotency.slice(-999), key];
      }
    } else {
      const now = serverNow(state, 'demo'); expire(state, now); applyAction(state, user, action, now);
    }
    db.prepare('UPDATE application_state SET document = ? WHERE id = 1').run(JSON.stringify(state));
    db.exec('COMMIT');
    return snapshot(state, user, 'demo');
  } catch (error) { db.exec('ROLLBACK'); throw error; }
}

const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex');
export async function createDemoSession(user: User) {
  const db = await database(); const token = randomBytes(32).toString('base64url');
  db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(Date.now());
  db.prepare('INSERT INTO sessions (token_hash, user_json, expires_at) VALUES (?, ?, ?)').run(tokenHash(token), JSON.stringify(user), Date.now() + 86400000);
  return token;
}
export async function readDemoSession(token: string): Promise<User | null> {
  if (token.length !== 43) return null;
  const db = await database(); const row = db.prepare('SELECT user_json FROM sessions WHERE token_hash = ? AND expires_at > ?').get(tokenHash(token), Date.now()) as { user_json: string } | undefined;
  return row ? JSON.parse(row.user_json) as User : null;
}
export async function removeDemoSession(token: string) {
  const db = await database(); db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash(token));
}

export async function checkRateLimit(key: string) {
  // A durable demo limiter; cloud auth also applies Supabase's account-level limits.
  if (mode() !== 'demo') return;
  const db = await database(); const now = Date.now();
  db.prepare('DELETE FROM auth_attempts WHERE window_start < ?').run(now - 900000);
  const hashed = tokenHash(key); const row = db.prepare('SELECT count FROM auth_attempts WHERE key = ?').get(hashed) as { count: number } | undefined;
  if (row && row.count >= 30) throw new DomainError('Terlalu banyak percobaan. Coba kembali dalam 15 menit.', 429);
  db.prepare('INSERT INTO auth_attempts (key, count, window_start) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET count = count + 1').run(hashed, now);
}
