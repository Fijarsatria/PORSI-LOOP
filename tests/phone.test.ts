import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePhone } from '../lib/phone';
import {
  applyAction,
  createMarketplaceState,
  DEMO_USERS,
  serverNow,
  snapshot,
} from '../lib/server/engine';
test('phone normalization accepts local and international formats without dropping invalid characters', () => {
  assert.equal(normalizePhone('0812-3456-7890'), '+6281234567890');
  assert.equal(normalizePhone('+62 812 3456 7890'), '+6281234567890');
  for (const input of [
    '',
    null,
    '123',
    '0812abc3456',
    '+000000000000',
    '1'.repeat(31),
  ])
    assert.equal(normalizePhone(input), null);
});
test('new food and promotion orders require a phone and keep it private to the ticket participants', () => {
  const state = createMarketplaceState();
  const now = serverNow(state, 'demo');
  const payload = {
    type: 'preorder',
    portion: 'regular',
    slotId: 'asap',
    quantity: 1,
    customer: 'Uji',
    paymentMethod: 'cash',
  };
  assert.throws(
    () => applyAction(state, DEMO_USERS.student, payload, now),
    /telepon/,
  );
  applyAction(
    state,
    DEMO_USERS.student,
    { ...payload, phone: '081234567890', seat: 'Meja 7 dekat jendela' },
    now,
  );
  assert.equal(
    snapshot(state, DEMO_USERS.student, 'demo').orders[0].phone,
    '+6281234567890',
  );
  assert.equal(
    snapshot(state, DEMO_USERS.seller, 'demo').orders[0].phone,
    '+6281234567890',
  );
  assert.equal(
    snapshot(state, DEMO_USERS.seller, 'demo').orders[0].seat,
    'Meja 7 dekat jendela',
  );
  assert.deepEqual(snapshot(state, DEMO_USERS.admin, 'demo').orders, []);
  assert.deepEqual(
    snapshot(state, { ...DEMO_USERS.student, id: 'other' }, 'demo').orders,
    [],
  );
  assert.throws(
    () =>
      applyAction(
        state,
        DEMO_USERS.student,
        { type: 'claim_rescue', batchId: 'menu-ayam-promo', quantity: 1 },
        now,
      ),
    /telepon/,
  );
});
