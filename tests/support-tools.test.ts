import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyAction,
  createMarketplaceState,
  DEMO_USERS,
  snapshot,
  serverNow,
} from '../lib/server/engine';
import type { User } from '../lib/domain';
test('order chat is private, persisted, idempotent and restricted to the assigned outlet', () => {
  const state = createMarketplaceState();
  const now = serverNow(state, 'demo');
  const order = state.orders[0];
  const customer: User = {
    id: order.userId,
    role: 'student',
    name: 'Pembeli',
    isGuest: true,
  };
  const send = {
    type: 'send_message',
    orderId: order.id,
    message: 'Sambal dipisah ya',
    idempotencyKey: 'chat-first',
  };
  applyAction(state, customer, send, now);
  applyAction(state, customer, send, now);
  assert.equal(order.messages?.length, 1);
  applyAction(
    state,
    DEMO_USERS.seller,
    {
      type: 'send_message',
      orderId: order.id,
      message: 'Baik, kami pisahkan.',
    },
    now,
  );
  assert.equal(
    snapshot(state, customer, 'demo').orders.find((o) => o.id === order.id)
      ?.messages?.length,
    2,
  );
  assert.equal(snapshot(state, DEMO_USERS.admin, 'demo').orders.length, 0);
  assert.throws(() =>
    applyAction(state, { ...customer, id: 'stranger' }, send, now),
  );
  assert.throws(() =>
    applyAction(state, { ...DEMO_USERS.seller, outletId: 'other' }, send, now),
  );
  assert.throws(() => applyAction(state, DEMO_USERS.admin, send, now));
  state.archivedOrders = [order];
  state.orders = state.orders.filter((o) => o.id !== order.id);
  applyAction(
    state,
    customer,
    { ...send, idempotencyKey: 'chat-archive' },
    now,
  );
  assert.equal(
    snapshot(state, DEMO_USERS.seller, 'demo').orders.find(
      (o) => o.id === order.id,
    )?.messages?.length,
    3,
  );
  assert.equal(
    JSON.parse(JSON.stringify(state)).archivedOrders[0].messages.length,
    3,
  );
});
test('menu photos accept safe raster uploads and reject external URLs and scripted formats', () => {
  const state = createMarketplaceState();
  const now = serverNow(state, 'demo');
  const photo =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==';
  applyAction(
    state,
    DEMO_USERS.seller,
    { type: 'save_menu', image: photo },
    now,
  );
  assert.equal(snapshot(state, null, 'demo').menu.image, photo);
  for (const image of [
    'https://outside.example/x.png',
    'data:image/svg+xml;base64,PHN2Zz4=',
    'data:image/png;base64,YmFk',
  ])
    assert.throws(() =>
      applyAction(state, DEMO_USERS.seller, { type: 'save_menu', image }, now),
    );
  assert.throws(() =>
    applyAction(
      state,
      { ...DEMO_USERS.seller, outletId: 'other' },
      { type: 'save_menu', image: photo },
      now,
    ),
  );
});
test('daily reconciliation keeps actual manual sales value for later dates', async () => {
  const { createState } = await import('../lib/server/engine');
  const state = createState(Date.now(), true);
  const now = serverNow(state, 'demo');
  applyAction(
    state,
    DEMO_USERS.seller,
    { type: 'record_production', quantity: 3 },
    now,
  );
  applyAction(
    state,
    DEMO_USERS.seller,
    { type: 'record_walkin', quantity: 1, price: 17500 },
    now,
  );
  applyAction(
    state,
    DEMO_USERS.seller,
    { type: 'reconcile', endingStock: 2, waste: 0, wasteKg: 0, internal: 0 },
    now,
  );
  assert.equal(state.history.at(-1)?.revenue, 17500);
  assert.equal(state.history.at(-1)?.walkin, 1);
});
