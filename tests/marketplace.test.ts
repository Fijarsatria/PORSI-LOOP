import test from 'node:test';
import assert from 'node:assert/strict';
import { applyAction, createState, createMarketplaceState, DEMO_USERS, expire, snapshot, stock } from '../lib/server/engine';

const now = Date.parse('2026-11-08T10:00:00+07:00');
const guest = { id: 'guest-one', role: 'student' as const, name: 'Tamu', isGuest: true };
const seller = DEMO_USERS.seller;
function reserve(state: ReturnType<typeof createState>, extra = {}) {
  applyAction(state, guest, { type: 'preorder', phone: '081234567890', portion: 'regular', slotId: 'asap', quantity: 1, customer: 'Rani', fulfillment: 'pick_up', paymentMethod: 'qris', ...extra }, now);
  return state.orders[0];
}

test('payment reserves capacity without consuming stock; paid QR is generated once and handed over once', () => {
  const state = createState(now);
  const before = stock(state);
  const order = reserve(state);
  assert.equal(order.status, 'pending_payment');
  assert.ok(!('pickupToken' in order));
  assert.equal(stock(state), before);
  assert.throws(() => applyAction(state, seller, { type: 'pickup_order', orderId: order.id }, now));
  applyAction(state, guest, { type: 'pay_order', orderId: order.id }, now);
  const token = order.pickupToken;
  assert.ok(token && token.length >= 40);
  applyAction(state, guest, { type: 'pay_order', orderId: order.id }, now);
  assert.equal(order.pickupToken, token);
  assert.throws(() => applyAction(state, seller, { type: 'scan_pickup', token }, now), /siap/i);
  applyAction(state, seller, { type: 'prepare_order', orderId: order.id }, now);
  applyAction(state, seller, { type: 'ready_order', orderId: order.id }, now);
  applyAction(state, seller, { type: 'scan_pickup', token }, now);
  assert.equal(stock(state), before - 1);
  assert.throws(() => applyAction(state, seller, { type: 'scan_pickup', token }, now), /digunakan|diproses/i);
  assert.equal(stock(state), before - 1);
});

test('public snapshots expose availability while private forecasting and costs stay with staff', () => {
  const state = createMarketplaceState(now);
  const publicView = snapshot(state, guest, 'demo', now);
  assert.equal(publicView.recommendation.walkinEstimate, 0);
  assert.equal(publicView.recommendation.capacity, 0);
  assert.equal(publicView.metrics.revenue, 0);
  assert.equal(publicView.reconciliation.produced, 0);
  assert.equal(publicView.history.length, 0);
  assert.ok(publicView.menus?.every(m => m.variableCost === 0));
  const staff = snapshot(state, seller, 'demo', now);
  assert.equal(staff.kitchens?.[0].recommendation.walkinEstimate, 24);
});

test('live mode blocks synthetic payment and unconfigured digital checkout; verified cash uses the same paid lifecycle', () => {
  const state = createState(now);
  assert.throws(() => applyAction(state, guest, { type: 'preorder', phone: '081234567890', portion: 'regular', slotId: 'asap', paymentMethod: 'qris' }, now, 'supabase'), /belum tersedia/i);
  applyAction(state, guest, { type: 'preorder', phone: '081234567890', portion: 'regular', slotId: 'asap', paymentMethod: 'cash' }, now, 'supabase');
  const order = state.orders[0];
  assert.throws(() => applyAction(state, guest, { type: 'pay_order', orderId: order.id }, now, 'supabase'), /belum tersedia/i);
  applyAction(state, seller, { type: 'verify_cash_payment', orderId: order.id }, now, 'supabase');
  assert.equal(order.status, 'confirmed');
  assert.equal(order.paymentStatus, 'paid');
});

test('unpaid reservations expire and release capacity; student cannot simulate live or verify cash', () => {
  const state = createState(now);
  const before = snapshot(state, guest, 'demo', now).slots[0].available;
  const order = reserve(state, { slotId: 'slot-1' });
  expire(state, now + 16 * 60000);
  assert.equal(order.status, 'expired');
  assert.equal(order.paymentStatus, 'expired');
  assert.equal(snapshot(state, guest, 'demo', now).slots[0].available, before);
  const cash = reserve(state, { paymentMethod: 'cash' });
  assert.throws(() => applyAction(state, guest, { type: 'pay_order', orderId: cash.id }, now), /gerai|tunai/i);
  applyAction(state, seller, { type: 'verify_cash_payment', orderId: cash.id }, now);
  assert.equal(cash.paymentStatus, 'paid');
});

test('marketplace isolates seller kitchens and customer tickets while admin receives aggregates', () => {
  const state = createMarketplaceState(now);
  const publicView = snapshot(state, guest, 'demo', now);
  assert.equal(publicView.outlets?.length, 6);
  assert.equal(publicView.menus?.length, 18);
  assert.equal(publicView.kitchens, undefined);
  const foreignMenu = publicView.menus!.find(m => m.outletId !== seller.outletId)!;
  applyAction(state, guest, { type: 'preorder', phone: '081234567890', menuId: foreignMenu.id, portion: 'regular', slotId: 'asap', quantity: 1, customer: 'Rani', paymentMethod: 'qris' }, now);
  const own = snapshot(state, guest, 'demo', now).orders[0];
  applyAction(state, guest, { type: 'pay_order', orderId: own.id }, now);
  assert.equal(snapshot(state, { ...guest, id: 'guest-two' }, 'demo', now).orders.length, 0);
  assert.ok(snapshot(state, seller, 'demo', now).kitchens?.every(k => k.menu.outletId === seller.outletId));
  assert.ok(snapshot(state, seller, 'demo', now).orders.every(o => o.outletId === seller.outletId));
  assert.throws(() => applyAction(state, seller, { type: 'ready_order', orderId: own.id, menuId: foreignMenu.id }, now), /gerai|akses/i);
  assert.deepEqual(snapshot(state, DEMO_USERS.admin, 'demo', now).orders, []);
  assert.equal(snapshot(state, DEMO_USERS.admin, 'demo', now).kitchens?.length, 18);
  const traffic = snapshot(state, DEMO_USERS.admin, 'demo', now).orderTraffic;
  assert.ok(traffic);
  assert.equal(traffic.find(row => row.outletId === foreignMenu.outletId)?.orders, 37);
  assert.equal(traffic.find(row => row.outletId === foreignMenu.outletId)?.portions, 73);
  assert.ok(traffic.every(row => !('customer' in row) && !('userId' in row)));
  assert.equal(snapshot(state, guest, 'demo', now).orderTraffic, undefined);
});

test('paid cancellation records a refund and promo uses only safe unallocated physical portions', () => {
  const state = createState(now);
  const order = reserve(state, { slotId: 'slot-1' });
  applyAction(state, guest, { type: 'pay_order', orderId: order.id }, now);
  applyAction(state, guest, { type: 'cancel_order', orderId: order.id }, now);
  assert.equal(order.paymentStatus, 'refunded');
  assert.equal(order.pickupToken, undefined);
  assert.throws(() => applyAction(state, seller, { type: 'publish_rescue', quantity: 9, foodChecked: true, price: 10000 }, now), /stok/i);
  applyAction(state, seller, { type: 'publish_rescue', quantity: 2, foodChecked: true, price: 10000 }, now);
  assert.throws(() => applyAction(state, seller, { type: 'record_walkin', quantity: 1 }, now), /stok/i);
});

test('outlet pickup percentages are weighted by portions rather than summed across menus', () => {
  const state = createMarketplaceState(now);
  applyAction(state, guest, { type: 'preorder', phone: '081234567890', menuId: 'menu-ayam', slotId: 'asap', portion: 'regular', quantity: 1 }, now);
  const order = state.orders[0];
  applyAction(state, guest, { type: 'pay_order', orderId: order.id }, now);
  applyAction(state, seller, { type: 'prepare_order', orderId: order.id }, now);
  applyAction(state, seller, { type: 'ready_order', orderId: order.id }, now);
  applyAction(state, seller, { type: 'scan_pickup', token: order.pickupToken }, now);
  const outlet = snapshot(state, DEMO_USERS.admin, 'demo', now).outlets!.find(outlet => outlet.id === seller.outletId)!;
  assert.equal(outlet.metrics?.preorderEligible, 73);
  assert.equal(outlet.metrics?.pickupRate, 1);
  assert.equal(outlet.metrics?.completionRate, 1);
});

test('cloud starter has all eighteen kitchens but no fabricated availability, transactions, demand or history', () => {
  const state = createMarketplaceState(now, true);
  const admin = snapshot(state, DEMO_USERS.admin, 'supabase', now);
  assert.equal(admin.kitchens?.length, 18);
  assert.equal(admin.outlets?.length, 6);
  assert.equal(admin.metrics.stock, 0);
  assert.equal(admin.metrics.totalOrders, 0);
  assert.deepEqual(admin.history, []);
  assert.deepEqual(admin.rescues, []);
  assert.ok(admin.menus?.every(menu => !menu.active && menu.availableStock === 0));
  assert.equal(snapshot(state, { ...seller, outletId: 'outlet-mie-pak-dedi' }, 'supabase', now).kitchens?.length, 3);
});

test('live cash cancellation waits for seller confirmation of the actual refund', () => {
  const state = createState(now);
  applyAction(state, guest, { type: 'preorder', phone: '081234567890', slotId: 'asap', portion: 'regular', paymentMethod: 'cash' }, now, 'supabase');
  const order = state.orders[0];
  applyAction(state, seller, { type: 'verify_cash_payment', orderId: order.id }, now, 'supabase');
  applyAction(state, guest, { type: 'cancel_order', orderId: order.id }, now, 'supabase');
  assert.equal(order.paymentStatus, 'refund_pending');
  assert.equal(order.pickupToken, undefined);
  assert.throws(() => applyAction(state, guest, { type: 'confirm_cash_refund', orderId: order.id }, now, 'supabase'), /akses/i);
  assert.throws(() => applyAction(state, { ...seller, outletId: 'other-outlet' }, { type: 'confirm_cash_refund', orderId: order.id }, now, 'supabase'), /akses/i);
  applyAction(state, seller, { type: 'confirm_cash_refund', orderId: order.id }, now, 'supabase');
  assert.equal(order.paymentStatus, 'refunded');
  const refunds = state.logs.filter(log => log.action === 'Pengembalian tunai dikonfirmasi').length;
  applyAction(state, seller, { type: 'confirm_cash_refund', orderId: order.id }, now, 'supabase');
  assert.equal(state.logs.filter(log => log.action === 'Pengembalian tunai dikonfirmasi').length, refunds);
});

test('only the ticket owner receives pickup secrets, including across seller kitchen snapshots', () => {
  const state = createMarketplaceState(now);
  applyAction(state, guest, { type: 'preorder', phone: '081234567890', slotId: 'asap', menuId: 'menu-ayam', portion: 'regular' }, now);
  const order = state.orders[0];
  applyAction(state, guest, { type: 'pay_order', orderId: order.id }, now);
  assert.ok(snapshot(state, guest, 'demo', now).orders[0].pickupToken);
  const staff = snapshot(state, seller, 'demo', now);
  assert.ok(staff.orders.every(order => order.pickupToken === undefined));
  assert.ok(staff.kitchens?.every(kitchen => kitchen.orders.every(order => order.pickupToken === undefined)));
  assert.equal(snapshot(state, { ...guest, id: 'another-guest' }, 'demo', now).orders.length, 0);
  assert.ok(order.pickupToken, 'redaction must not remove the stored validation secret');
});
