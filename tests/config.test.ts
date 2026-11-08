import test from 'node:test';
import assert from 'node:assert/strict';
import { mode } from '../lib/server/store';
import { cloudMutate, cloudSnapshot } from '../lib/server/supabase';
import { DEMO_USERS } from '../lib/server/engine';
import { spawnSync } from 'node:child_process';

test('unknown storage mode fails closed instead of exposing a shared demo', () => {
  const previous = process.env.PORSI_MODE;
  try {
    process.env.PORSI_MODE = 'supabse';
    assert.throws(mode, /harus demo atau supabase/);
  } finally {
    if (previous === undefined) delete process.env.PORSI_MODE;
    else process.env.PORSI_MODE = previous;
  }
});

test('hosted demonstration has no implicit administrator credentials', () => {
  const env: NodeJS.ProcessEnv = { ...process.env, NODE_ENV: 'production', PORSI_MODE: 'demo' };
  for (const key of ['DEMO_ADMIN_EMAIL', 'DEMO_ADMIN_PASSWORD', 'DEMO_SELLER_EMAIL', 'DEMO_SELLER_PASSWORD']) delete env[key];
  const missing = spawnSync(process.execPath, ['scripts/check-config.mjs'], { env, encoding: 'utf8' });
  assert.equal(missing.status, 1);
  const configured = spawnSync(process.execPath, ['scripts/check-config.mjs'], { env: { ...env, DEMO_ADMIN_EMAIL: 'owner@example.com', DEMO_ADMIN_PASSWORD: 'configured-admin-password', DEMO_SELLER_EMAIL: 'seller@example.com', DEMO_SELLER_PASSWORD: 'configured-seller-password' }, encoding: 'utf8' });
  assert.equal(configured.status, 0, configured.stderr);
});

test('cloud mode rejects incomplete configuration and never permits simulation controls', async () => {
  const previous = process.env.SESSION_SECRET;
  try {
    delete process.env.SESSION_SECRET;
    await assert.rejects(
      () => cloudSnapshot(null),
      /belum selesai dikonfigurasi/,
    );
    await assert.rejects(
      () => cloudMutate(DEMO_USERS.admin, { type: 'reset_demo' }),
      /dinonaktifkan/,
    );
    await assert.rejects(
      () =>
        cloudMutate(DEMO_USERS.admin, { type: 'advance_demo', minutes: 30 }),
      /dinonaktifkan/,
    );
  } finally {
    if (previous === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = previous;
  }
});
