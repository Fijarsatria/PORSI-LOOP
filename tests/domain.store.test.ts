import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DEMO_USERS } from '../lib/server/engine';
import { createDemoSession, getSnapshot, mutate, readDemoSession, removeDemoSession } from '../lib/server/store';

process.env.PORSI_MODE = 'demo';
process.env.PORSI_DATA_DIR = mkdtempSync(join(tmpdir(), 'porsi-loop-test-'));

test('SQLite serializes competing requests, persists state, and validates revocable server sessions', async () => {
  await mutate(DEMO_USERS.admin, { type: 'reset_demo' });
  const before = await getSnapshot(DEMO_USERS.student);
  const results = await Promise.allSettled(Array.from({ length: 5 }, (_, i) => mutate(DEMO_USERS.student, { type: 'preorder', slotId: 'slot-1', portion: 'regular', quantity: 5, idempotencyKey: `concurrent-${i}` })));
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 2);
  const after = await getSnapshot(DEMO_USERS.seller);
  assert.equal(after.slots[0].reserved, 18);
  assert.equal(after.metrics.stock, before.metrics.stock, 'reservations must not decrement physical stock');
  assert.equal(after.orders.length, 14);
  const token = await createDemoSession(DEMO_USERS.student);
  assert.equal((await readDemoSession(token))?.role, 'student');
  assert.equal(await readDemoSession('forged-token'), null);
  await removeDemoSession(token);
  assert.equal(await readDemoSession(token), null);
  const admin = await getSnapshot(DEMO_USERS.admin);
  assert.deepEqual(admin.orders, []);
  assert.deepEqual(admin.claims, []);
  assert.equal(admin.metrics.preorderEligible, 34);
  await assert.rejects(() => mutate(DEMO_USERS.student, { type: 'advance_demo', minutes: 240 }), /Hanya pengelola/);
  const advanced = await mutate(DEMO_USERS.admin, { type: 'advance_demo', minutes: 240, idempotencyKey: 'advance-clock' });
  assert.equal(advanced.metrics.noShow, 34);
  assert.equal(advanced.metrics.rescued, 0);
  const replay = await mutate(DEMO_USERS.admin, { type: 'advance_demo', minutes: 240, idempotencyKey: 'advance-clock' });
  assert.ok(new Date(replay.now).getTime() - new Date(advanced.now).getTime() < 1000, 'repeated clock command must not advance twice');
});
