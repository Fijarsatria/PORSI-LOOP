import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import {
  applyAction,
  createMarketplaceState,
  DEMO_USERS,
  adoptGuestOrders,
  snapshot,
  serverNow,
} from '../lib/server/engine';
import { passwordHash, verifyPassword } from '../lib/server/accounts';
import type { User } from '../lib/domain';

test('passwords use salted hashes and never accept a different password', () => {
  const a = passwordHash('CorrectPassword123!');
  const b = passwordHash('CorrectPassword123!');
  assert.notEqual(a, b);
  assert.equal(verifyPassword('CorrectPassword123!', a), true);
  assert.equal(verifyPassword('wrong', a), false);
});
test('only manager creates outlets and only the assigned seller adds a menu with zero physical stock', () => {
  const state = createMarketplaceState();
  const now = serverNow(state, 'demo');
  const seller = { ...DEMO_USERS.seller };
  assert.throws(() =>
    applyAction(state, seller, { type: 'create_outlet', name: 'Test' }, now),
  );
  applyAction(
    state,
    DEMO_USERS.admin,
    {
      type: 'create_outlet',
      outletId: 'outlet-new',
      name: 'Dapur Baru',
      location: 'Kantin A7',
    },
    now,
  );
  const newSeller: User = {
    id: 'seller-new',
    role: 'seller',
    name: 'Pemilik',
    outletId: 'outlet-new',
  };
  applyAction(
    state,
    newSeller,
    {
      type: 'add_menu',
      name: 'Nasi bakar',
      smallPrice: 12000,
      regularPrice: 17000,
      description: 'Nasi dan ayam',
    },
    now,
  );
  const view = snapshot(state, newSeller, 'demo');
  const item = view.kitchens!.find((k) => k.menu.name === 'Nasi bakar')!;
  assert.equal(item.metrics.stock, 0);
  assert.equal(item.menu.availableStock, 0);
  assert.equal(item.metrics.produced, 0);
  assert.equal(item.menu.outletId, 'outlet-new');
  assert.throws(() =>
    applyAction(
      state,
      seller,
      { type: 'record_production', menuId: item.menu.id, quantity: 2 },
      now,
    ),
  );
});
test('guest tickets transfer only to the authenticated customer and ratings require actual delivery', () => {
  const state = createMarketplaceState();
  const now = serverNow(state, 'demo');
  const guest: User = {
    id: `guest-${randomUUID()}`,
    role: 'student',
    name: 'Tamu',
    isGuest: true,
  };
  const customer: User = {
    id: 'customer-a',
    role: 'student',
    name: 'Ayu',
    isGuest: false,
  };
  applyAction(
    state,
    guest,
    {
      type: 'preorder',
      menuId: 'menu-ayam',
      quantity: 1,
      portion: 'regular',
      slotId: 'asap',
      paymentMethod: 'cash',
    },
    now,
  );
  const order = state.orders[0];
  assert.throws(() =>
    applyAction(
      state,
      guest,
      { type: 'rate_order', orderId: order.id, stars: 5 },
      now,
    ),
  );
  adoptGuestOrders(state, guest.id, customer.id);
  assert.equal(snapshot(state, guest, 'demo').orders.length, 0);
  assert.equal(snapshot(state, customer, 'demo').orders[0].id, order.id);
  assert.throws(() =>
    applyAction(
      state,
      customer,
      { type: 'rate_order', orderId: order.id, stars: 5 },
      now,
    ),
  );
  applyAction(
    state,
    DEMO_USERS.seller,
    { type: 'verify_cash_payment', orderId: order.id },
    now,
  );
  applyAction(
    state,
    DEMO_USERS.seller,
    { type: 'prepare_order', orderId: order.id },
    now,
  );
  applyAction(
    state,
    DEMO_USERS.seller,
    { type: 'ready_order', orderId: order.id },
    now,
  );
  applyAction(
    state,
    DEMO_USERS.seller,
    { type: 'scan_pickup', token: order.pickupToken },
    now,
  );
  assert.throws(() =>
    applyAction(
      state,
      { ...customer, id: 'other' },
      { type: 'rate_order', orderId: order.id, stars: 5 },
      now,
    ),
  );
  applyAction(
    state,
    customer,
    { type: 'rate_order', orderId: order.id, stars: 4, comment: 'Enak' },
    now,
  );
  const menu = snapshot(state, null, 'demo').menus!.find(
    (m) => m.id === 'menu-ayam',
  )!;
  assert.equal(menu.ratingCount, 1);
  assert.equal(menu.ratingAverage, 4);
  applyAction(
    state,
    customer,
    { type: 'rate_order', orderId: order.id, stars: 5 },
    now,
  );
  assert.equal(snapshot(state, null, 'demo').menus![0].ratingCount, 1);
});
test('persistent customer and seller accounts keep credentials private and preserve guest ownership', async () => {
  process.env.PORSI_MODE = 'demo';
  process.env.PORSI_DATA_DIR = join(
    process.cwd(),
    '.data',
    'accounts-test-' + randomUUID(),
  );
  const store = await import('../lib/server/store');
  const guest: User = {
    id: `guest-${randomUUID()}`,
    role: 'student',
    name: 'Tamu',
    isGuest: true,
  };
  const ordered = await store.mutate(guest, {
    type: 'preorder',
    menuId: 'menu-ayam',
    quantity: 1,
    portion: 'regular',
    slotId: 'asap',
    paymentMethod: 'cash',
  });
  const customer = await store.registerLocal(
    { name: 'Ayu', email: 'ayu@example.test', password: 'AyuPassword123!' },
    guest,
  );
  assert.equal(
    (await store.getSnapshot(customer)).orders[0].id,
    ordered.orders[0].id,
  );
  assert.equal(
    (
      await store.authenticateLocal({
        role: 'student',
        email: 'ayu@example.test',
        password: 'AyuPassword123!',
      })
    ).id,
    customer.id,
  );
  await assert.rejects(() =>
    store.registerLocal({
      name: 'Ayu',
      email: 'ayu@example.test',
      password: 'AnotherPassword!',
    }),
  );
  await assert.rejects(() =>
    store.authenticateLocal({
      role: 'admin',
      email: 'ayu@example.test',
      password: 'AyuPassword123!',
    }),
  );
  const admin = await store.createLocalSeller(DEMO_USERS.admin, {
    outletName: 'Warung Ayu',
    location: 'A7',
    name: 'Ayu penjual',
    email: 'gerai@example.test',
    password: 'GeraiPassword123!',
  });
  const seller = await store.authenticateLocal({
    role: 'seller',
    email: 'gerai@example.test',
    password: 'GeraiPassword123!',
  });
  assert.ok(admin.outlets!.some((o) => o.id === seller.outletId));
  assert.equal((await store.getSnapshot(customer)).staffAccounts, undefined);
  assert.equal(JSON.stringify(admin).includes('GeraiPassword123!'), false);
});
