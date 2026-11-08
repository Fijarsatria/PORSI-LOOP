import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, existsSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { DEMO_USERS } from '../lib/server/engine';
import {
  createDemoSession,
  getSnapshot,
  mutate,
  readDemoSession,
  removeDemoSession,
} from '../lib/server/store';

process.env.PORSI_MODE = 'demo';
process.env.PORSI_DATA_DIR = mkdtempSync(join(tmpdir(), 'porsi-loop-test-'));

test('SQLite serializes competing requests, persists state, and validates revocable server sessions', async () => {
  await mutate(DEMO_USERS.admin, { type: 'reset_demo' });
  const before = await getSnapshot(DEMO_USERS.seller);
  const results = await Promise.allSettled(
    Array.from({ length: 5 }, (_, i) =>
      mutate(DEMO_USERS.student, {
        type: 'preorder', phone: '081234567890',
        slotId: 'slot-1',
        portion: 'regular',
        quantity: 5,
        idempotencyKey: `concurrent-${i}`,
      }),
    ),
  );
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 2);
  const after = await getSnapshot(DEMO_USERS.seller);
  assert.equal(after.slots[0].reserved, 18);
  assert.equal(
    after.metrics.stock,
    before.metrics.stock,
    'reservations must not decrement physical stock',
  );
  assert.equal(after.orders.length, 38);
  const token = await createDemoSession(DEMO_USERS.student);
  assert.equal((await readDemoSession(token))?.role, 'student');
  assert.equal(await readDemoSession('forged-token'), null);
  await removeDemoSession(token);
  assert.equal(await readDemoSession(token), null);
  const admin = await getSnapshot(DEMO_USERS.admin);
  assert.deepEqual(admin.orders, []);
  assert.deepEqual(admin.claims, []);
  assert.equal(admin.metrics.preorderEligible, 442);
  await assert.rejects(
    () => mutate(DEMO_USERS.student, { type: 'advance_demo', minutes: 240 }),
    /Hanya pengelola/,
  );
  const advanced = await mutate(DEMO_USERS.admin, {
    type: 'advance_demo',
    minutes: 240,
    idempotencyKey: 'advance-clock',
  });
  assert.equal(advanced.metrics.noShow, 432);
  assert.equal(advanced.metrics.rescued, 0);
  const replay = await mutate(DEMO_USERS.admin, {
    type: 'advance_demo',
    minutes: 240,
    idempotencyKey: 'advance-clock',
  });
  assert.ok(
    new Date(replay.now).getTime() - new Date(advanced.now).getTime() < 1000,
    'repeated clock command must not advance twice',
  );
});

test('a polling snapshot holds the SQLite write lock until migration and expiry are persisted', { timeout: 15000 }, async t => {
  const directory = mkdtempSync(join(tmpdir(), 'porsi-snapshot-lock-'));
  const paused = join(directory, 'reader-paused');
  const release = join(directory, 'reader-release');
  const started = join(directory, 'writer-started');
  const committed = join(directory, 'writer-committed');
  const storeUrl = pathToFileURL(join(process.cwd(), 'lib/server/store.ts')).href;
  const engineUrl = pathToFileURL(join(process.cwd(), 'lib/server/engine.ts')).href;
  const env = { ...process.env, PORSI_MODE: 'demo', PORSI_DATA_DIR: directory };
  function child(code: string) {
    const process = spawn(globalThis.process.execPath, ['--import', 'tsx', '--input-type=module', '--eval', code], { env, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    process.stdout.on('data', data => { output += data; });
    process.stderr.on('data', data => { output += data; });
    const done = once(process, 'exit').then(([code]) => { assert.equal(code, 0, output); return output; });
    t.after(() => { if (process.exitCode === null) process.kill(); });
    return { process, done };
  }
  const reader = child(`
    import { DatabaseSync } from 'node:sqlite';
    import { writeFileSync, existsSync } from 'node:fs';
    const original = DatabaseSync.prototype.prepare;
    let paused = false;
    DatabaseSync.prototype.prepare = function(sql) {
      const statement = original.call(this, sql);
      if (sql.startsWith('SELECT document')) {
        const get = statement.get.bind(statement);
        statement.get = (...args) => {
          const row = get(...args);
          if (!paused) {
            paused = true;
            writeFileSync(${JSON.stringify(paused)}, 'paused');
            while (!existsSync(${JSON.stringify(release)})) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 20);
          }
          return row;
        };
      }
      return statement;
    };
    const { getSnapshot } = (await import(${JSON.stringify(storeUrl)})).default;
    await getSnapshot(null);
  `);
  t.after(() => writeFileSync(release, 'release'));
  async function waitFor(path: string) {
    for (let i = 0; i < 150; i++) { if (existsSync(path)) return; await new Promise(resolve => setTimeout(resolve, 20)); }
    assert.fail(`Timed out waiting for ${path}`);
  }
  await waitFor(paused);
  const writer = child(`
    import { writeFileSync } from 'node:fs';
    const { mutate } = (await import(${JSON.stringify(storeUrl)})).default;
    const { DEMO_USERS } = (await import(${JSON.stringify(engineUrl)})).default;
    writeFileSync(${JSON.stringify(started)}, 'started');
    await mutate(DEMO_USERS.seller, { type: 'record_production', menuId: 'menu-ayam', quantity: 1 });
    writeFileSync(${JSON.stringify(committed)}, 'committed');
  `);
  await waitFor(started);
  await new Promise(resolve => setTimeout(resolve, 500));
  const writerWasBlocked = !existsSync(committed);
  writeFileSync(release, 'release');
  await Promise.all([reader.done, writer.done]);
  assert.equal(writerWasBlocked, true, 'a concurrent writer must wait for the polling snapshot transaction');
  const verify = child(`
    const { getSnapshot } = (await import(${JSON.stringify(storeUrl)})).default;
    const { DEMO_USERS } = (await import(${JSON.stringify(engineUrl)})).default;
    const result = await getSnapshot(DEMO_USERS.seller);
    console.log('STOCK=' + result.kitchens[0].metrics.stock);
  `);
  assert.match(await verify.done, /STOCK=33/);
});
