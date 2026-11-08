import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, relative } from 'node:path';
import { createServer } from 'node:net';

test('production HTTP API: guest privacy, credentials, outlet isolation, payment and single-use handover', { timeout: 60000 }, async t => {
  const directory = await mkdtemp(join(tmpdir(), 'porsi-api-'));
  const reservation = createServer().listen(0, '127.0.0.1');
  await once(reservation, 'listening');
  const port = reservation.address().port;
  await new Promise(resolve => reservation.close(resolve));
  const origin = `http://127.0.0.1:${port}`;
  let output = '';
  const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', String(port)], {
    env: { ...process.env, NODE_ENV: 'production', PORSI_MODE: 'demo', PORSI_DATA_DIR: directory, PORSI_COOKIE_INSECURE: 'true', APP_ORIGIN: origin,
      DEMO_ADMIN_EMAIL: 'admin@porsiloop.local', DEMO_ADMIN_PASSWORD: 'PorsiAdmin2026!', DEMO_SELLER_EMAIL: 'seller@porsiloop.local', DEMO_SELLER_PASSWORD: 'PorsiSeller2026!' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stdout.on('data', data => { output += data; });
  server.stderr.on('data', data => { output += data; });
  t.after(async () => {
    if (server.exitCode === null) { const stopped = once(server, 'exit'); server.kill('SIGTERM'); await stopped; }
    const target = resolve(directory);
    const withinTemp = relative(resolve(tmpdir()), target);
    assert.ok(withinTemp && !withinTemp.startsWith('..') && !withinTemp.includes(':'));
    await rm(target, { recursive: true, force: true });
  });
  for (let i = 0; i < 150; i++) {
    if (server.exitCode !== null) throw new Error(output);
    try { if ((await fetch(`${origin}/api/state`)).ok) break; } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  async function request(path, { cookie, method = 'GET', data, requestOrigin = origin, raw } = {}) {
    const response = await fetch(`${origin}${path}`, { method, headers: { ...(cookie ? { Cookie: cookie } : {}), ...(method !== 'GET' ? { Origin: requestOrigin, 'Content-Type': 'application/json' } : {}) }, body: raw ?? (data ? JSON.stringify(data) : undefined) });
    return { response, data: await response.json(), cookie: response.headers.get('set-cookie')?.split(';')[0] };
  }
  const action = (cookie, data) => request('/api/actions', { cookie, method: 'POST', data });
  async function success(cookie, data) { const result = await action(cookie, data); assert.equal(result.response.status, 200, JSON.stringify(result.data)); return result.data; }
  async function login(role, email, password) {
    const result = await request('/api/auth', { method: 'POST', data: { role, demo: true, email, password } });
    assert.equal(result.response.status, 200, JSON.stringify(result.data));
    assert.match(result.response.headers.get('set-cookie'), /HttpOnly/i);
    return result.cookie;
  }
  const first = await request('/api/state');
  assert.equal(first.response.status, 200, output);
  const guest = first.cookie;
  const other = (await request('/api/state')).cookie;
  assert.equal(first.data.user.isGuest, true);
  assert.notEqual((await request('/api/state', { cookie: other })).data.user.id, first.data.user.id);
  assert.equal((await request('/api/state', { cookie: guest })).data.user.id, first.data.user.id);
  assert.equal(first.data.menus.length, 18);
  assert.equal(first.data.outlets.length, 6);
  assert.equal(first.data.kitchens, undefined);
  assert.equal(first.data.recommendation.capacity, 0);
  assert.match(first.response.headers.get('cache-control'), /no-store/);
  assert.equal((await request('/api/auth', { method: 'POST', data: { role: 'admin', demo: true } })).response.status, 401);
  assert.equal((await request('/api/auth', { method: 'POST', data: { role: 'seller', demo: true, email: 'seller@porsiloop.local', password: 'wrong' } })).response.status, 401);
  const seller = await login('seller', 'seller@porsiloop.local', 'PorsiSeller2026!');
  const foreignSeller = await login('seller', 'dedi@porsiloop.local', 'PorsiSeller2026!');
  const admin = await login('admin', 'admin@porsiloop.local', 'PorsiAdmin2026!');

  await t.test('origin, body validation, roles and transactional rollback', async () => {
    assert.equal((await action(undefined, { type: 'record_production', quantity: 1 })).response.status, 401);
    assert.equal((await action(guest, { type: 'record_production', quantity: 1 })).response.status, 403);
    assert.equal((await action(admin, { type: 'record_production', quantity: 1 })).response.status, 403);
    assert.equal((await request('/api/actions', { cookie: seller, method: 'POST', requestOrigin: 'https://attacker.example', data: { type: 'record_production', quantity: 1 } })).response.status, 403);
    assert.equal((await request('/api/actions', { cookie: seller, method: 'POST', raw: 'bad json' })).response.status, 400);
    assert.equal((await request('/api/actions', { cookie: seller, method: 'POST', raw: JSON.stringify({ large: 'x'.repeat(17000) }) })).response.status, 413);
    assert.equal((await action(seller, { type: 'save_menu', menuId: 'menu-ayam', name: 'Rollback this', regularPrice: -1 })).response.status, 400);
    assert.equal((await request('/api/state', { cookie: seller })).data.menu.name, 'Nasi ayam rempah');
    assert.equal((await action(seller, { type: 'record_production', menuId: 'menu-mie-pak-dedi-1', quantity: 1 })).response.status, 403);
  });

  await t.test('reservations serialize concurrent capacity and expire without moving stock', async () => {
    await success(admin, { type: 'reset_demo' });
    const races = await Promise.all(Array.from({ length: 5 }, (_, i) => action(guest, { type: 'preorder', menuId: 'menu-ayam', portion: 'regular', slotId: 'slot-1', quantity: 5, idempotencyKey: `race-${i}` })));
    assert.equal(races.filter(r => r.response.status === 200).length, 2);
    const accepted = races.findIndex(r => r.response.status === 200);
    const replay = await success(guest, { type: 'preorder', menuId: 'menu-ayam', portion: 'regular', slotId: 'slot-1', quantity: 5, idempotencyKey: `race-${accepted}` });
    assert.equal(replay.orders.length, 2);
    assert.equal(replay.slots[0].reserved, 18);
    const expired = await success(admin, { type: 'advance_demo', minutes: 16 });
    assert.equal(expired.kitchens[0].metrics.stock, 32);
    assert.equal(expired.kitchens[0].slots[0].reserved, 8);
    assert.equal((await request('/api/state', { cookie: guest })).data.orders[0].paymentStatus, 'expired');
    assert.equal((await request('/api/state', { cookie: other })).data.orders.length, 0);
  });

  await t.test('paid order requires preparation, correct outlet and an unused QR; cash and promo share the lifecycle', async () => {
    await success(admin, { type: 'reset_demo' });
    let state = await success(guest, { type: 'preorder', menuId: 'menu-ayam', portion: 'small', quantity: 1, slotId: 'asap', customer: 'Rani', fulfillment: 'dine_in', paymentMethod: 'qris' });
    let order = state.orders[0];
    assert.equal(order.status, 'pending_payment');
    assert.equal(order.pickupToken, undefined);
    assert.equal((await action(seller, { type: 'pickup_order', orderId: order.id })).response.status, 403);
    assert.equal((await action(other, { type: 'pay_order', orderId: order.id })).response.status, 404);
    state = await success(guest, { type: 'pay_order', orderId: order.id });
    order = state.orders[0];
    assert.match(order.pickupToken, /^[A-Za-z0-9_-]{43}$/);
    assert.equal((await success(guest, { type: 'pay_order', orderId: order.id })).orders[0].pickupToken, order.pickupToken);
    assert.equal((await action(seller, { type: 'scan_pickup', token: order.pickupToken })).response.status, 409);
    await success(seller, { type: 'prepare_order', orderId: order.id });
    await success(seller, { type: 'ready_order', orderId: order.id });
    assert.equal((await action(foreignSeller, { type: 'scan_pickup', token: order.pickupToken })).response.status, 403);
    const picked = await success(seller, { type: 'scan_pickup', token: order.pickupToken });
    assert.equal(picked.kitchens[0].metrics.stock, 31);
    assert.equal((await action(seller, { type: 'scan_pickup', token: order.pickupToken })).response.status, 409);
    assert.equal((await request('/api/state', { cookie: guest })).data.orders[0].status, 'picked_up');
    state = await success(guest, { type: 'preorder', menuId: 'menu-ayam', portion: 'regular', quantity: 1, slotId: 'asap', customer: 'Rani', paymentMethod: 'cash' });
    const cash = state.orders.find(o => o.status === 'pending_payment');
    assert.equal((await action(guest, { type: 'pay_order', orderId: cash.id })).response.status, 400);
    await success(seller, { type: 'verify_cash_payment', orderId: cash.id });
    await success(guest, { type: 'cancel_order', orderId: cash.id });
    assert.equal((await request('/api/state', { cookie: guest })).data.orders.find(o => o.id === cash.id).paymentStatus, 'refunded');
    state = await success(guest, { type: 'claim_rescue', batchId: 'menu-ayam-promo', quantity: 1, customer: 'Rani', fulfillment: 'pick_up', paymentMethod: 'ewallet' });
    const claim = state.claims[0];
    state = await success(guest, { type: 'pay_order', claimId: claim.id });
    const token = state.claims[0].pickupToken;
    await success(seller, { type: 'prepare_order', claimId: claim.id });
    await success(seller, { type: 'ready_order', claimId: claim.id });
    state = await success(seller, { type: 'scan_pickup', token });
    assert.equal(state.kitchens[0].metrics.stock, 30);
    assert.equal(state.kitchens[0].metrics.rescued, 1);
    const manager = (await request('/api/state', { cookie: admin })).data;
    assert.deepEqual(manager.orders, []);
    assert.deepEqual(manager.claims, []);
    assert.ok(manager.kitchens.every(k => k.orders.length === 0 && k.claims.length === 0));
  });

  await t.test('logout revokes staff session and returns to the same browser guest orders', async () => {
    const result = await request('/api/auth', { method: 'DELETE', cookie: `${seller}; ${guest}` });
    assert.equal(result.response.status, 200);
    assert.equal(result.data.user.id, first.data.user.id);
    assert.equal(result.data.orders.length, 2);
    assert.equal((await action(seller, { type: 'record_production', quantity: 1 })).response.status, 401);
    assert.ok((await request('/api/state', { cookie: seller })).data.user.isGuest);
  });
});
