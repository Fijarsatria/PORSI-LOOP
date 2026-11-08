import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyAction,
  createState,
  DEMO_USERS,
  expire,
  recommendation,
  serverNow,
  snapshot,
  stock,
} from '../lib/server/engine';

const now = Date.parse('2026-11-08T10:00:00+07:00');
const seller = DEMO_USERS.seller;
const student = DEMO_USERS.student;
const act = (
  state: ReturnType<typeof createState>,
  action: Parameters<typeof applyAction>[2],
  at = now,
) => applyAction(state, seller, action, at);

test('live installations start with a closed sample menu and no fabricated demand or production', () => {
  const state = createState(now, true);
  assert.equal(state.menu.active, false);
  assert.equal(state.manualBaseline, 0);
  assert.equal(recommendation(state).target, 2);
  assert.equal(stock(state), 0);
  assert.deepEqual(state.history, []);
  assert.throws(
    () =>
      applyAction(
        state,
        student,
        { type: 'preorder', portion: 'regular', slotId: 'slot-1' },
        now,
      ),
    /tidak tersedia/,
  );
});

test('pickup rejects early collection and expires exactly at the end of the slot', () => {
  const state = createState(now);
  const order = state.orders.find((o) => o.slotId === 'slot-1')!;
  assert.throws(
    () => act(state, { type: 'pickup_order', code: order.code }),
    /belum dimulai/,
  );
  expire(state, Date.parse(state.slots[0].end));
  assert.equal(order.status, 'no_show');
  assert.throws(
    () =>
      act(
        state,
        { type: 'pickup_order', code: order.code },
        Date.parse(state.slots[0].end),
      ),
    /sudah diproses/,
  );
});

test('rescue expiry is consistent at the exact deadline', () => {
  const state = createState(now);
  applyAction(
    state,
    student,
    { type: 'claim_rescue', batchId: state.rescues[0].id },
    now,
  );
  expire(state, Date.parse(state.rescues[0].expiresAt));
  assert.equal(state.rescues[0].active, false);
  assert.equal(state.claims[0].status, 'expired');
});

test('numerical stock ledger records actual pickups, sales and reconciliation corrections once', () => {
  const state = createState(now);
  const later = now + 240 * 60000;
  expire(state, later);
  act(
    state,
    { type: 'record_production', quantity: 8, idempotencyKey: 'production' },
    later,
  );
  act(
    state,
    { type: 'record_production', quantity: 8, idempotencyKey: 'production' },
    later,
  );
  act(state, { type: 'record_walkin', quantity: 10 }, later);
  act(
    state,
    {
      type: 'record_waste',
      quantity: 2,
      weightKg: 0.4,
      reason: 'Hasil penimbangan sisa',
    },
    later,
  );
  act(
    state,
    { type: 'reconcile', internal: 1, waste: 3, wasteKg: 0.6, endingStock: 26 },
    later,
  );
  assert.equal(state.closed, true);
  assert.equal(
    state.movements!.reduce((sum, movement) => sum + movement.quantity, 0),
    26,
  );
  assert.equal(stock(state), 26);
  assert.equal(
    state.movements!.filter((m) => m.type === 'production_confirmed').length,
    2,
  );
  assert.ok(state.movements!.every((m) => m.reference));
  assert.deepEqual(snapshot(state, student, 'demo', now).movements, []);
});

test('incomplete reconciliation is retained and corrected in place; completed sessions inform the next session', () => {
  const state = createState(now);
  const initialHistory = state.history.length;
  const later = now + 240 * 60000;
  const firstId = state.sessionId;
  applyAction(
    state,
    student,
    { type: 'preorder', portion: 'regular', slotId: 'slot-1' },
    now,
  );
  expire(state, later);
  act(state, { type: 'reconcile', endingStock: 31 }, later);
  assert.equal(state.history.length, initialHistory + 1);
  assert.equal(state.history.at(-1)!.closed, false);
  assert.equal(recommendation(state).historyDays, initialHistory);
  act(state, { type: 'reconcile', endingStock: 32 }, later);
  assert.equal(
    state.history.length,
    initialHistory + 1,
    'correction must replace the same session',
  );
  assert.equal(state.history.at(-1)!.closed, true);
  assert.throws(
    () => applyAction(state, student, { type: 'start_session' }, later),
    /tidak memiliki akses/,
  );
  act(
    state,
    {
      type: 'start_session',
      businessDate: '2026-11-08',
      cutoffTime: '14:30',
      pickupStart: '15:00',
      idempotencyKey: 'next',
    },
    later,
  );
  act(
    state,
    {
      type: 'start_session',
      businessDate: '2026-11-08',
      cutoffTime: '14:30',
      pickupStart: '15:00',
      idempotencyKey: 'next',
    },
    later,
  );
  assert.notEqual(state.sessionId, firstId);
  assert.equal(state.closed, false);
  assert.equal(
    stock(state),
    0,
    'old ending stock must not become new production',
  );
  assert.equal(state.history.at(-1)!.endingStock, 32);
  assert.equal(recommendation(state).historyDays, 7);
  assert.equal(state.orders.length, 0);
  assert.equal(snapshot(state, student, 'demo', now).orders.length, 1);
  assert.equal(
    snapshot(state, { ...student, id: 'another' }, 'demo', now).orders.length,
    0,
  );
  assert.equal(state.menu.outlet, 'Dapur Bu Ratna');
  act(state, { type: 'save_menu', location: 'Gerai baru lantai 2' }, later);
  const oldTicket = snapshot(state, student, 'demo', now).orders[0];
  assert.equal(oldTicket.serviceDate, '2026-11-08');
  assert.equal(oldTicket.pickupLocation, 'Kantin kampus · Gerai A-03');
  assert.throws(
    () =>
      act(
        state,
        {
          type: 'start_session',
          businessDate: '2026-11-08',
          cutoffTime: '14:30',
          pickupStart: '15:00',
        },
        later,
      ),
    /harus lengkap/,
  );
});

test('stockout requires unavailable walk-in stock; override retains the original recommendation', () => {
  const state = createState(now, true);
  act(state, {
    type: 'record_stockout',
    reason: 'Satu pembeli tidak terlayani',
  });
  assert.equal(snapshot(state, seller, 'demo', now).metrics.stockouts, 1);
  const target = recommendation(state).target;
  act(state, {
    type: 'override_plan',
    target: 5,
    manualBaseline: 3,
    reason: 'Menyesuaikan jadwal kuliah',
  });
  assert.equal(state.override!.originalTarget, target);
  act(state, { type: 'record_production', quantity: 5 });
  assert.throws(
    () =>
      act(state, {
        type: 'record_stockout',
        reason: 'Masih ada porsi tersedia',
      }),
    /Masih ada stok/,
  );
});

test('rescue allergen information remains tied to the food offered when the menu changes', () => {
  const state = createState(now, true);
  state.menu.prices.regular = 18000;
  state.menu.allergens = ['Kedelai'];
  act(state, { type: 'record_production', quantity: 3 });
  act(state, {
    type: 'publish_rescue',
    quantity: 2,
    price: 10000,
    foodChecked: true,
  });
  act(state, { type: 'save_menu', allergens: ['Telur'] });
  assert.deepEqual(state.rescues[0].allergens, ['Kedelai']);
  assert.deepEqual(state.menu.allergens, ['Telur']);
});

test('starting a session preserves the advancing demo clock after a simulated time jump', () => {
  const state = createState(now);
  state.demoClock = new Date(now + 240 * 60000).toISOString();
  const realNow = now + 1000;
  const simulatedNow = serverNow(state, 'demo', realNow);
  act(state, { type: 'reconcile', endingStock: 32 }, simulatedNow);
  act(
    state,
    {
      type: 'start_session',
      businessDate: '2026-11-08',
      cutoffTime: '14:30',
      pickupStart: '15:00',
    },
    simulatedNow,
  );
  assert.equal(serverNow(state, 'demo', realNow + 60000), simulatedNow + 60000);
});

test('slot availability reflects the total remaining session capacity, including rescue holds', () => {
  const state = createState(now);
  state.capacity = 30; // 24 pre-orders + six rescue portions already commit it all.
  const publicState = snapshot(state, null, 'demo', now);
  assert.ok(publicState.slots.every((slot) => slot.available === 0));
  assert.throws(
    () =>
      applyAction(
        state,
        student,
        { type: 'preorder', portion: 'regular', slotId: 'slot-2' },
        now,
      ),
    /Kuota produksi/,
  );
});

test('physical stock movements remain auditable after the session closes and a new one opens', () => {
  const state = createState(now);
  const later = now + 240 * 60000;
  act(state, { type: 'record_production', quantity: 5 }, later);
  act(state, { type: 'record_walkin', quantity: 7 }, later);
  const references = state.movements!.map((movement) => movement.id);
  act(state, { type: 'reconcile', endingStock: 30 }, later);
  const oldSession = state.sessionId;
  act(
    state,
    {
      type: 'start_session',
      businessDate: '2026-11-09',
      cutoffTime: '10:30',
      pickupStart: '11:30',
    },
    later,
  );
  const ledger = snapshot(state, DEMO_USERS.admin, 'demo', later).movements;
  assert.deepEqual(
    ledger.map((movement) => movement.id),
    references,
  );
  assert.ok(ledger.every((movement) => movement.sessionId === oldSession));
  assert.equal(stock(state), 0);
});

test('positive waste portions cannot be presented as a zero-weight measurement', () => {
  const state = createState(now);
  const later = now + 240 * 60000;
  expire(state, later);
  assert.throws(
    () =>
      act(
        state,
        {
          type: 'record_waste',
          quantity: 1,
          weightKg: 0,
          reason: 'Belum sempat ditimbang',
        },
        later,
      ),
    /penimbangan/,
  );
  assert.throws(
    () =>
      act(
        state,
        { type: 'reconcile', waste: 1, wasteKg: 0, endingStock: 31 },
        later,
      ),
    /Cocokkan porsi/,
  );
});

test('menu variable costs are private to staff snapshots', () => {
  const state = createState(now);
  assert.equal(snapshot(state, null, 'demo', now).menu.variableCost, 0);
  assert.equal(snapshot(state, student, 'demo', now).menu.variableCost, 0);
  assert.equal(snapshot(state, seller, 'demo', now).menu.variableCost, 9000);
  assert.equal(state.menu.variableCost, 9000);
});

test('manager cannot submit a seller reconciliation through the API command engine', () => {
  const state = createState(now, true);
  assert.throws(
    () =>
      applyAction(
        state,
        DEMO_USERS.admin,
        { type: 'reconcile', endingStock: 0 },
        now,
      ),
    /tidak memiliki akses/,
  );
  assert.equal(state.closed, false);
});
