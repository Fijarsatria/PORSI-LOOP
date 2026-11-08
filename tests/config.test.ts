import test from 'node:test';
import assert from 'node:assert/strict';
import { mode } from '../lib/server/store';
import { cloudMutate, cloudSnapshot } from '../lib/server/supabase';
import { DEMO_USERS } from '../lib/server/engine';

test('unknown storage mode fails closed instead of exposing a shared demo', () => {
  const previous = process.env.PORSI_MODE;
  try { process.env.PORSI_MODE = 'supabse'; assert.throws(mode, /harus demo atau supabase/); }
  finally { if (previous === undefined) delete process.env.PORSI_MODE; else process.env.PORSI_MODE = previous; }
});

test('cloud mode rejects incomplete configuration and never permits simulation controls', async () => {
  const previous = process.env.SESSION_SECRET;
  try {
    delete process.env.SESSION_SECRET;
    await assert.rejects(() => cloudSnapshot(null), /belum selesai dikonfigurasi/);
    await assert.rejects(() => cloudMutate(DEMO_USERS.admin, { type: 'reset_demo' }), /dinonaktifkan/);
    await assert.rejects(() => cloudMutate(DEMO_USERS.admin, { type: 'advance_demo', minutes: 30 }), /dinonaktifkan/);
  } finally { if (previous === undefined) delete process.env.SESSION_SECRET; else process.env.SESSION_SECRET = previous; }
});
