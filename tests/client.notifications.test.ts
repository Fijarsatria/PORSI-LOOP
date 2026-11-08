import { test } from 'node:test';
import assert from 'node:assert/strict';
import { orderNotices } from '../lib/client/notifications';

const order = { id: 'one', code: 'PL-ONE', customer: 'Ayu', status: 'confirmed', paymentStatus: 'paid' };
test('seller sees a new order once, while unchanged polling stays quiet', () => {
  assert.equal(orderNotices([], [order], 'seller').length, 1);
  assert.deepEqual(orderNotices([order], [order], 'seller'), []);
  assert.deepEqual(orderNotices([], [order], 'student'), []);
});
test('buyer sees a real ready transition and seller sees payment confirmation', () => {
  assert.match(orderNotices([order], [{ ...order, status: 'ready' }], 'student')[0], /siap/);
  assert.match(orderNotices([{ ...order, paymentStatus: 'pending' }], [order], 'seller')[0], /dibayar/);
  assert.deepEqual(orderNotices([order], [{ ...order, status: 'ready' }], 'admin'), []);
});
