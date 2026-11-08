import test from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { checkOrigin } from '../lib/server/http';

test('origin validation accepts the requested localhost Host when Next uses a wildcard bind address', () => {
  const previous = process.env.APP_ORIGIN; delete process.env.APP_ORIGIN;
  try {
    const request = new NextRequest('http://0.0.0.0:3100/api/auth', { method: 'POST', headers: { host: 'localhost:3100', origin: 'http://localhost:3100' } });
    assert.doesNotThrow(() => checkOrigin(request));
    assert.throws(() => checkOrigin(new NextRequest('http://0.0.0.0:3100/api/auth', { method: 'POST', headers: { host: 'localhost:3100', origin: 'https://attacker.example', 'x-forwarded-host': 'attacker.example' } })), /Permintaan harus berasal/);
    assert.throws(() => checkOrigin(new NextRequest('http://0.0.0.0:3100/api/auth', { method: 'POST', headers: { host: 'localhost:3100' } })), /Permintaan harus berasal/);
  } finally { if (previous === undefined) delete process.env.APP_ORIGIN; else process.env.APP_ORIGIN = previous; }
});

test('configured production origin takes precedence and rejects cross-origin and forwarded host spoofing', () => {
  const previous = process.env.APP_ORIGIN; process.env.APP_ORIGIN = 'https://porsiloop.example';
  try {
    assert.doesNotThrow(() => checkOrigin(new NextRequest('http://0.0.0.0:3100/api/actions', { method: 'POST', headers: { host: 'internal:3100', origin: 'https://porsiloop.example' } })));
    assert.throws(() => checkOrigin(new NextRequest('http://0.0.0.0:3100/api/actions', { method: 'POST', headers: { host: 'attacker.example', origin: 'https://attacker.example', 'x-forwarded-host': 'porsiloop.example', 'x-forwarded-proto': 'https' } })), /Permintaan harus berasal/);
    assert.throws(() => checkOrigin(new NextRequest('https://porsiloop.example/api/actions', { method: 'POST', headers: { host: 'porsiloop.example', origin: 'http://porsiloop.example' } })), /Permintaan harus berasal/);
  } finally { if (previous === undefined) delete process.env.APP_ORIGIN; else process.env.APP_ORIGIN = previous; }
});
