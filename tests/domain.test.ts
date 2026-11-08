import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyAction,
  availableStock,
  batchAvailable,
  createState,
  DEMO_USERS,
  DomainError,
  expire,
  recommendation,
  snapshot,
  stock,
} from '../lib/server/engine';

const fixed = new Date('2026-11-08T03:00:00.000Z').getTime();
const fresh = () => {
  const state = createState(fixed, true);
  state.menu.active = true;
  state.menu.prices = { small: 13000, regular: 18000 };
  return state;
};
const seller = DEMO_USERS.seller;
const student = DEMO_USERS.student;

test('plan uses only walk-in-labelled history, applies capacity, and never creates stock', () => {
  const state = createState(fixed);
  const plan = recommendation(state);
  assert.equal(plan.preorders, 24);
  assert.equal(plan.walkinEstimate, 24);
  assert.equal(plan.target, 50);
  assert.deepEqual(plan.walkinRange, [22, 28]);
  assert.equal(stock(state), 32);
  assert.equal(plan.toProduce, 18);
  const empty = fresh();
  assert.equal(recommendation(empty).source, 'manual');
});

test('pre-order reserves slot capacity, snapshots isolate student identity, and cancellation respects cutoff', () => {
  const state = fresh();
  applyAction(
    state,
    student,
    { type: 'preorder', slotId: 'slot-1', portion: 'small', quantity: 2 },
    fixed,
  );
  assert.equal(
    stock(state),
    0,
    'future pre-orders must not decrement physical stock',
  );
  assert.equal(snapshot(state, student, 'demo', fixed).slots[0].reserved, 2);
  applyAction(state, student, { type: 'pay_order', orderId: state.orders[0].id }, fixed);
  assert.equal(
    snapshot(state, { ...student, id: 'other' }, 'demo', fixed).orders.length,
    0,
  );
  assert.throws(
    () =>
      applyAction(
        state,
        student,
        { type: 'cancel_order', orderId: state.orders[0].id },
        fixed + 61 * 60000,
      ),
    /Pembatalan ditutup/,
  );
  applyAction(
    state,
    student,
    { type: 'cancel_order', orderId: state.orders[0].id },
    fixed + 5 * 60000,
  );
  assert.equal(snapshot(state, student, 'demo', fixed).slots[0].reserved, 0);
});

test('rescue reservation holds quota; only seller-validated pickup changes stock and rescue impact', () => {
  const state = fresh();
  applyAction(
    state,
    seller,
    { type: 'record_production', quantity: 10 },
    fixed,
  );
  assert.throws(
    () =>
      applyAction(
        state,
        seller,
        { type: 'publish_rescue', quantity: 3, price: 10000 },
        fixed,
      ),
    /Periksa kelayakan/,
  );
  applyAction(
    state,
    seller,
    { type: 'publish_rescue', quantity: 3, price: 10000, foodChecked: true },
    fixed,
  );
  const batchId = state.rescues[0].id;
  applyAction(
    state,
    student,
    { type: 'claim_rescue', batchId, quantity: 2 },
    fixed,
  );
  assert.equal(stock(state), 10);
  assert.equal(batchAvailable(state, state.rescues[0]), 1);
  assert.equal(snapshot(state, student, 'demo', fixed).metrics.rescued, 0);
  assert.throws(
    () =>
      applyAction(
        state,
        student,
        { type: 'scan_pickup', token: state.claims[0].pickupToken },
        fixed,
      ),
    /tidak memiliki akses/,
  );
  const claim = state.claims[0];
  applyAction(state, student, { type: 'pay_order', claimId: claim.id }, fixed);
  applyAction(state, seller, { type: 'prepare_order', claimId: claim.id }, fixed);
  applyAction(state, seller, { type: 'ready_order', claimId: claim.id }, fixed);
  applyAction(state, seller, { type: 'scan_pickup', token: claim.pickupToken }, fixed);
  assert.equal(stock(state), 8);
  assert.equal(snapshot(state, student, 'demo', fixed).metrics.rescued, 2);
  assert.throws(
    () =>
      applyAction(
        state,
        seller,
        { type: 'scan_pickup', token: claim.pickupToken },
        fixed,
      ),
    /sudah digunakan/,
  );
});

test('expiry releases rescue and pre-order holds, with no fabricated pickup', () => {
  const state = createState(fixed);
  applyAction(
    state,
    student,
    { type: 'claim_rescue', batchId: 'rescue-today' },
    fixed,
  );
  expire(state, fixed + 5 * 3600000);
  assert.equal(state.claims[0].status, 'expired');
  assert.ok(state.orders.every((o) => o.status === 'no_show'));
  assert.equal(availableStock(state), 32);
  assert.equal(
    snapshot(state, student, 'demo', fixed + 5 * 3600000).metrics.rescued,
    0,
  );
});

test('slots and quantities reject overselling; idempotency replays do not duplicate mutations', () => {
  const state = fresh();
  state.slots[0].capacity = 2;
  applyAction(
    state,
    student,
    {
      type: 'preorder',
      slotId: 'slot-1',
      portion: 'regular',
      quantity: 2,
      idempotencyKey: 'one',
    },
    fixed,
  );
  applyAction(
    state,
    student,
    {
      type: 'preorder',
      slotId: 'slot-1',
      portion: 'regular',
      quantity: 2,
      idempotencyKey: 'one',
    },
    fixed,
  );
  assert.equal(state.orders.length, 1);
  assert.throws(
    () =>
      applyAction(
        state,
        student,
        { type: 'preorder', slotId: 'slot-1', portion: 'regular', quantity: 1 },
        fixed,
      ),
    /Slot baru saja penuh/,
  );
  assert.throws(
    () =>
      applyAction(
        state,
        seller,
        { type: 'record_production', quantity: -1 },
        fixed,
      ),
    DomainError,
  );
  assert.throws(
    () =>
      applyAction(state, seller, { type: 'record_walkin', quantity: 1 }, fixed),
    /Stok bebas/,
  );
  assert.throws(
    () =>
      applyAction(
        state,
        seller,
        { type: 'record_production', quantity: 51 },
        fixed,
      ),
    /kapasitas/,
  );
});

test('the complete PRD ledger reconciles 50 = 23 pre-order + 20 walk-in + 3 rescue + 1 internal + 3 waste', () => {
  const state = fresh();
  applyAction(
    state,
    seller,
    { type: 'record_production', quantity: 50 },
    fixed,
  );
  for (let i = 0; i < 24; i++)
    applyAction(
      state,
      { ...student, id: `student-${i}` },
      {
        type: 'preorder',
        slotId: `slot-${(i % 3) + 1}`,
        portion: 'regular',
        quantity: 1,
      },
      fixed,
    );
  for (const order of state.orders) {
    applyAction(state, { ...student, id: order.userId }, { type: 'pay_order', orderId: order.id }, fixed);
    applyAction(state, seller, { type: 'prepare_order', orderId: order.id }, fixed);
    applyAction(state, seller, { type: 'ready_order', orderId: order.id }, fixed);
  }
  for (const order of state.orders
    .slice(0, 23)
    .sort((a, b) => a.slotId.localeCompare(b.slotId)))
    applyAction(
      state,
      seller,
      { type: 'scan_pickup', token: order.pickupToken },
      new Date(state.slots.find((s) => s.id === order.slotId)!.start).getTime(),
    );
  const afterSession = fixed + 181 * 60000;
  expire(state, afterSession);
  assert.equal(state.orders.filter((o) => o.status === 'no_show').length, 1);
  applyAction(
    state,
    seller,
    { type: 'record_walkin', quantity: 20 },
    afterSession,
  );
  applyAction(
    state,
    seller,
    { type: 'publish_rescue', quantity: 3, foodChecked: true },
    afterSession,
  );
  applyAction(
    state,
    student,
    { type: 'claim_rescue', batchId: state.rescues[0].id, quantity: 2 },
    afterSession,
  );
  applyAction(
    state,
    { ...student, id: 'rescue-other' },
    { type: 'claim_rescue', batchId: state.rescues[0].id, quantity: 1 },
    afterSession,
  );
  for (const claim of state.claims) {
    applyAction(state, { ...student, id: claim.userId }, { type: 'pay_order', claimId: claim.id }, afterSession);
    applyAction(state, seller, { type: 'prepare_order', claimId: claim.id }, afterSession);
    applyAction(state, seller, { type: 'ready_order', claimId: claim.id }, afterSession);
    applyAction(
      state,
      seller,
      { type: 'scan_pickup', token: claim.pickupToken },
      afterSession,
    );
  }
  applyAction(
    state,
    seller,
    { type: 'record_internal', quantity: 1, reason: 'Konsumsi petugas gerai' },
    afterSession,
  );
  applyAction(
    state,
    seller,
    {
      type: 'record_waste',
      quantity: 3,
      weightKg: 0.54,
      reason: 'Batas kelayakan terlewati',
    },
    afterSession,
  );
  assert.equal(stock(state), 0);
  applyAction(
    state,
    seller,
    { type: 'reconcile', endingStock: 1 },
    afterSession,
  );
  assert.equal(state.closed, false);
  assert.equal(
    snapshot(state, seller, 'demo', afterSession).reconciliation.difference,
    -1,
  );
  applyAction(
    state,
    seller,
    { type: 'reconcile', endingStock: 0 },
    afterSession,
  );
  const result = snapshot(state, DEMO_USERS.admin, 'demo', fixed + 181 * 60000);
  assert.equal(result.reconciliation.difference, 0);
  assert.equal(result.reconciliation.preorderPickedUp, 23);
  assert.equal(result.reconciliation.walkin, 20);
  assert.equal(result.reconciliation.rescuePickedUp, 3);
  assert.equal(result.reconciliation.internal, 1);
  assert.equal(result.reconciliation.waste, 3);
  assert.equal(result.metrics.noShow, 1);
  assert.equal(result.metrics.wasteKg, 0.54);
  assert.equal(result.reconciliation.complete, true);
});
