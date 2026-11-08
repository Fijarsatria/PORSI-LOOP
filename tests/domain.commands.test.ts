import test from 'node:test';
import assert from 'node:assert/strict';
import { applyDemoCommand } from '../lib/server/commands';
import { createState, DEMO_USERS } from '../lib/server/engine';

test('a retry of the same reset does not erase transactions created after the first reset', () => {
  const now = Date.parse('2026-11-08T10:00:00+07:00');
  let state = applyDemoCommand(
    createState(now),
    DEMO_USERS.admin,
    { type: 'reset_demo', idempotencyKey: 'reset-once' },
    now,
  );
  state = applyDemoCommand(
    state,
    DEMO_USERS.student,
    { type: 'preorder', phone: '081234567890', quantity: 1, portion: 'regular', slotId: 'slot-1' },
    now,
  );
  const session = state.sessionId;
  state = applyDemoCommand(
    state,
    DEMO_USERS.admin,
    { type: 'reset_demo', idempotencyKey: 'reset-once' },
    now,
  );
  assert.equal(state.sessionId, session);
  assert.equal(state.orders.length, 13);
});
