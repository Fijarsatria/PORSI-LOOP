import test from 'node:test';
import assert from 'node:assert/strict';
import { applyAction, createState, createMarketplaceState, DEMO_USERS, snapshot } from '../lib/server/engine';

const now = Date.parse('2026-11-08T10:00:00+07:00');
const guest = { id: 'finance-guest', role: 'student' as const, name: 'Tamu', isGuest: true };

test('canteen finance separates fulfilled sales, received payments, pending payments and refunds', () => {
  const state = createState(now);
  state.orders = [];
  state.claims = [];
  state.rescues = [];
  state.movements = [];
  state.produced = 50;
  const order = (method = 'qris') => {
    applyAction(state, guest, { type: 'preorder', portion: 'regular', slotId: 'asap', quantity: 1, paymentMethod: method }, now);
    return state.orders[0];
  };
  const fulfilled = order();
  applyAction(state, guest, { type: 'pay_order', orderId: fulfilled.id }, now);
  applyAction(state, DEMO_USERS.seller, { type: 'prepare_order', orderId: fulfilled.id }, now);
  applyAction(state, DEMO_USERS.seller, { type: 'ready_order', orderId: fulfilled.id }, now);
  applyAction(state, DEMO_USERS.seller, { type: 'scan_pickup', token: fulfilled.pickupToken }, now);
  const paid = order('ewallet');
  applyAction(state, guest, { type: 'pay_order', orderId: paid.id }, now);
  order('bank_transfer');
  const refunded = order();
  applyAction(state, guest, { type: 'pay_order', orderId: refunded.id }, now);
  applyAction(state, guest, { type: 'cancel_order', orderId: refunded.id }, now);
  const cashRefund = order('cash');
  applyAction(state, DEMO_USERS.seller, { type: 'verify_cash_payment', orderId: cashRefund.id }, now, 'supabase');
  applyAction(state, guest, { type: 'cancel_order', orderId: cashRefund.id }, now, 'supabase');
  applyAction(state, DEMO_USERS.seller, { type: 'record_walkin', quantity: 2 }, now);
  applyAction(state, DEMO_USERS.seller, { type: 'publish_rescue', quantity: 2, price: 10000, foodChecked: true }, now);
  applyAction(state, guest, { type: 'claim_rescue', batchId: state.rescues[0].id, quantity: 1, paymentMethod: 'qris' }, now);
  const claim = state.claims[0];
  applyAction(state, guest, { type: 'pay_order', claimId: claim.id }, now);
  applyAction(state, DEMO_USERS.seller, { type: 'prepare_order', claimId: claim.id }, now);
  applyAction(state, DEMO_USERS.seller, { type: 'ready_order', claimId: claim.id }, now);
  applyAction(state, DEMO_USERS.seller, { type: 'scan_pickup', token: claim.pickupToken }, now);
  const report = snapshot(state, DEMO_USERS.admin, 'demo', now).finance;
  assert.ok(report, 'canteen managers need a private finance report');
  assert.equal(report.normalSales, 54000);
  assert.equal(report.promoSales, 10000);
  assert.equal(report.grossSales, 64000);
  assert.equal(report.grossPayments, 118000);
  assert.equal(report.refunds, 18000);
  assert.equal(report.refundPending, 18000);
  assert.equal(report.netPayments, 100000);
  assert.equal(report.awaitingPayment, 18000);
  assert.equal(report.servedPortions, 4);
  assert.equal(report.completedOrders, 2);
  assert.equal(report.paymentMethods.find(row => row.method === 'qris')?.grossPayments, 46000);
  assert.equal(report.paymentMethods.find(row => row.method === 'walk_in')?.grossPayments, 36000);
});

test('financial reports respect outlet ownership and never reach guest or student snapshots', () => {
  const state = createMarketplaceState(now);
  const manager = snapshot(state, DEMO_USERS.admin, 'demo', now);
  const seller = snapshot(state, DEMO_USERS.seller, 'demo', now);
  assert.equal(manager.finance?.outlets.length, 6);
  assert.equal(seller.finance?.outlets.length, 1);
  assert.equal(seller.finance?.outlets[0].outletId, DEMO_USERS.seller.outletId);
  assert.equal(snapshot(state, guest, 'demo', now).finance, undefined);
  assert.equal(snapshot(state, null, 'demo', now).finance, undefined);
  assert.equal(manager.finance?.grossPayments, manager.finance?.outlets.reduce((total, outlet) => total + outlet.grossPayments, 0));
  assert.ok(!JSON.stringify(manager.finance).includes('pickupToken'));
  assert.ok(!JSON.stringify(manager.finance).includes('customer'));
});

test('finance preserves each outlet session dates and excludes archived tickets and unrecorded historical receipts', () => {
  const state = createMarketplaceState(now);
  const baseline = snapshot(state, DEMO_USERS.admin, 'demo', now).finance!;
  const other = state.kitchens!.find(kitchen => kitchen.menu.outletId !== state.menu.outletId)!;
  other.businessDate = '2026-11-09';
  state.archivedOrders = [{ ...state.orders[0], id: 'archived', price: 999999, quantity: 5, status: 'picked_up' }];
  const report = snapshot(state, DEMO_USERS.admin, 'demo', now).finance!;
  assert.deepEqual(report.businessDates, ['2026-11-08', '2026-11-09']);
  assert.deepEqual(report.outlets.find(outlet => outlet.outletId === state.menu.outletId)?.businessDates, ['2026-11-08']);
  assert.equal(report.grossSales, baseline.grossSales);
  assert.equal(report.grossPayments, baseline.grossPayments);
});
