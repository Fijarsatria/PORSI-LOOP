import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:net';

// This suite exercises the built production HTTP server, not an in-memory mock.
test('production API: access, concurrent capacity, closed-loop operations and session revocation', { timeout: 60000 }, async t => {
  const directory = await mkdtemp(join(tmpdir(), 'porsi-api-'));
  const reservation = createServer().listen(0, '127.0.0.1');
  await once(reservation, 'listening');
  const port = reservation.address().port;
  await new Promise(resolve => reservation.close(resolve));
  const origin = `http://127.0.0.1:${port}`;
  let output = '';
  const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', String(port)], {
    env: { ...process.env, NODE_ENV: 'production', PORSI_MODE: 'demo', PORSI_DATA_DIR: directory, PORSI_COOKIE_INSECURE: 'true', APP_ORIGIN: origin },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stdout.on('data', data => { output += data; });
  server.stderr.on('data', data => { output += data; });
  t.after(async () => {
    if (server.exitCode === null) { const stopped = once(server, 'exit'); server.kill('SIGTERM'); await stopped; }
    await rm(directory, { recursive: true, force: true });
  });
  let ready = false;
  for (let attempt = 0; attempt < 150; attempt++) {
    if (server.exitCode !== null) throw new Error(output);
    try { if ((await fetch(`${origin}/api/state`)).ok) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.ok(ready, `Server did not become ready: ${output}`);
  async function request(path, { cookie, method = 'GET', data, requestOrigin = origin, raw } = {}) {
    const response = await fetch(`${origin}${path}`, { method, headers: { ...(cookie ? { Cookie: cookie } : {}), ...(method !== 'GET' ? { Origin: requestOrigin, 'Content-Type': 'application/json' } : {}) }, body: raw ?? (data ? JSON.stringify(data) : undefined) });
    return { response, data: await response.json() };
  }
  const login = async role => {
    const { response, data } = await request('/api/auth', { method: 'POST', data: { role, demo: true } });
    assert.equal(response.status, 200, JSON.stringify(data));
    assert.match(response.headers.get('set-cookie'), /HttpOnly/i);
    return response.headers.get('set-cookie').split(';')[0];
  };
  const student = await login('student'); const seller = await login('seller'); const admin = await login('admin');
  const action = (cookie, data) => request('/api/actions', { cookie, method: 'POST', data });
  const success = async (cookie, data) => { const result = await action(cookie, data); assert.equal(result.response.status, 200, JSON.stringify(result.data)); return result.data; };

  await t.test('public pages, origin protection, validation and role boundaries', async () => {
    for (const route of ['/', '/masuk', '/akses-pengelola', '/mahasiswa', '/gerai', '/pengelola', '/tentang']) {
      const response = await fetch(`${origin}${route}`);
      assert.equal(response.status, 200, route);
      assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    }
    const anonymous = await request('/api/state');
    assert.deepEqual(anonymous.data.orders, []);
    assert.equal(anonymous.data.user, null);
    assert.match(anonymous.response.headers.get('cache-control'), /no-store/);
    assert.equal((await action(undefined, { type: 'record_production', quantity: 1 })).response.status, 401);
    assert.equal((await action(student, { type: 'record_production', quantity: 1 })).response.status, 403);
    assert.equal((await action(admin, { type: 'record_production', quantity: 1 })).response.status, 403);
    assert.equal((await request('/api/actions', { cookie: seller, method: 'POST', requestOrigin: 'https://external.example', data: { type: 'record_production', quantity: 1 } })).response.status, 403);
    assert.equal((await request('/api/actions', { cookie: seller, method: 'POST', raw: 'invalid json' })).response.status, 400);
    assert.equal((await request('/api/actions', { cookie: seller, method: 'POST', raw: JSON.stringify({ large: 'x'.repeat(17000) }) })).response.status, 413);
    const before = (await request('/api/state', { cookie: seller })).data;
    assert.equal((await action(seller, { type: 'save_menu', name: 'Must roll back', regularPrice: -1 })).response.status, 400);
    assert.equal((await request('/api/state', { cookie: seller })).data.menu.name, before.menu.name);
  });

  await t.test('simultaneous requests cannot oversell the last slot and retries are idempotent', async () => {
    await success(admin, { type: 'reset_demo' });
    const results = await Promise.all(Array.from({ length: 5 }, (_, i) => action(student, { type: 'preorder', portion: 'regular', slotId: 'slot-1', quantity: 5, idempotencyKey: `race-${i}` })));
    assert.equal(results.filter(result => result.response.status === 200).length, 2);
    const state = (await request('/api/state', { cookie: seller })).data;
    assert.equal(state.slots[0].reserved, 18);
    const accepted = results.findIndex(result => result.response.status === 200);
    const replay = await success(student, { type: 'preorder', portion: 'regular', slotId: 'slot-1', quantity: 5, idempotencyKey: `race-${accepted}` });
    assert.equal(replay.slots[0].reserved, 18);
    assert.equal(replay.orders.length, 2);
  });

  await t.test('student order and rescue → seller pickup → incomplete/complete reconciliation → next session', async () => {
    await success(admin, { type: 'reset_demo' });
    let state = await success(student, { type: 'preorder', portion: 'small', slotId: 'slot-1', quantity: 1, idempotencyKey: 'cancel-me' });
    await success(student, { type: 'cancel_order', orderId: state.orders[0].id });
    state = await success(student, { type: 'preorder', portion: 'regular', slotId: 'slot-1', quantity: 1, idempotencyKey: 'my-order' });
    const order = state.orders.find(order => order.status === 'confirmed');
    assert.equal((await action(seller, { type: 'pickup_order', code: order.code })).response.status, 400);
    state = await success(student, { type: 'claim_rescue', batchId: 'rescue-today', quantity: 1 });
    const claim = state.claims[0];
    assert.equal(state.metrics.rescued, 0);
    await success(seller, { type: 'record_production', quantity: 18 });
    await success(admin, { type: 'advance_demo', minutes: 90 });
    assert.equal((await action(student, { type: 'preorder', portion: 'regular', slotId: 'slot-1' })).response.status, 400);
    await success(seller, { type: 'ready_order', orderId: order.id });
    await success(seller, { type: 'pickup_order', code: order.code, idempotencyKey: 'pick-once' });
    await success(seller, { type: 'pickup_order', code: order.code, idempotencyKey: 'pick-once' });
    assert.equal((await action(seller, { type: 'pickup_order', code: order.code })).response.status, 400);
    await success(seller, { type: 'record_walkin', quantity: 10 });
    state = await success(seller, { type: 'pickup_rescue', code: claim.code });
    assert.equal(state.metrics.rescued, 1);
    assert.equal(state.metrics.stock, 38);
    await success(seller, { type: 'close_rescue', batchId: 'rescue-today', reason: 'Penawaran sesi selesai' });
    await success(admin, { type: 'advance_demo', minutes: 180 });
    state = await success(seller, { type: 'reconcile', internal: 1, waste: 2, wasteKg: 0.4, endingStock: 34 });
    const sessionId = state.sessionId;
    assert.equal(state.reconciliation.complete, false);
    assert.equal(state.reconciliation.difference, 1);
    state = await success(seller, { type: 'reconcile', internal: 1, waste: 2, wasteKg: 0.4, endingStock: 35 });
    assert.equal(state.reconciliation.complete, true);
    assert.equal(state.history.filter(item => item.id === sessionId).length, 1);
    assert.equal(state.movements.reduce((sum, movement) => sum + movement.quantity, 0), 35);
    const tomorrow = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date(Date.parse(state.now) + 86400000));
    state = await success(seller, { type: 'start_session', businessDate: tomorrow, cutoffTime: '10:30', pickupStart: '11:30', idempotencyKey: 'new-session' });
    assert.notEqual(state.sessionId, sessionId);
    assert.equal(state.metrics.stock, 0);
    assert.equal(state.reconciliation.complete, false);
    const studentState = (await request('/api/state', { cookie: student })).data;
    assert.equal(studentState.orders.length, 2);
    assert.equal(studentState.claims[0].status, 'picked_up');
    assert.deepEqual(studentState.movements, []);
    const adminState = (await request('/api/state', { cookie: admin })).data;
    assert.deepEqual(adminState.orders, []);
    assert.deepEqual(adminState.claims, []);
  });

  await t.test('logout revokes the old cookie, including a replayed copy', async () => {
    assert.equal((await request('/api/auth', { cookie: student, method: 'DELETE' })).response.status, 200);
    assert.equal((await request('/api/state', { cookie: student })).data.user, null);
    assert.equal((await action(student, { type: 'preorder', portion: 'regular', slotId: 'slot-1' })).response.status, 401);
  });
});
