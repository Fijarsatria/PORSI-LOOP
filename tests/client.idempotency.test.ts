import test from 'node:test';
import assert from 'node:assert/strict';
import { createIdempotencyKey } from '../lib/client/idempotency';

test('idempotency keys remain unique when randomUUID is unavailable on an HTTP preview', () => {
  const random = { getRandomValues: crypto.getRandomValues.bind(crypto) };
  const keys = Array.from({ length: 100 }, () => createIdempotencyKey(random));
  assert.equal(new Set(keys).size, 100);
  assert.ok(keys.every((key) => /^[a-f0-9]{32}$/.test(key)));
});
