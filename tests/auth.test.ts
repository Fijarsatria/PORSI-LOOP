import test from 'node:test';
import assert from 'node:assert/strict';
import { authenticateDemo, createGuest } from '../lib/server/auth';
import {
  userFromAuth,
  createCloudGuestSession,
  readCloudGuestSession,
} from '../lib/server/supabase';

test('staff demo access requires credentials and maps seller email to a trusted outlet', () => {
  assert.throws(
    () => authenticateDemo({ role: 'admin', demo: true }),
    /email|sandi/i,
  );
  assert.throws(
    () =>
      authenticateDemo({
        role: 'seller',
        email: 'seller@porsiloop.local',
        password: 'wrong',
      }),
    /email|sandi/i,
  );
  const seller = authenticateDemo({
    role: 'seller',
    email: 'dedi@porsiloop.local',
    password: 'PorsiSeller2026!',
    outletId: 'outlet-bu-ratna',
  });
  assert.equal(seller.outletId, 'outlet-mie-pak-dedi');
  assert.throws(
    () =>
      authenticateDemo({
        role: 'admin',
        email: 'seller@porsiloop.local',
        password: 'PorsiSeller2026!',
      }),
    /akun|email|sandi/i,
  );
  assert.notEqual(createGuest().id, createGuest().id);
});

test('cloud role and outlet originate only in administrator metadata', () => {
  const untrusted = {
    id: 'u',
    email: 'seller@example.com',
    app_metadata: {},
    user_metadata: { role: 'admin', outletId: 'outlet-bu-ratna' },
  };
  assert.equal(userFromAuth(untrusted as never).role, 'student');
  assert.equal(userFromAuth(untrusted as never).outletId, undefined);
  assert.throws(
    () =>
      userFromAuth({ ...untrusted, app_metadata: { role: 'seller' } } as never),
    /gerai/i,
  );
  assert.equal(
    userFromAuth({
      ...untrusted,
      app_metadata: { role: 'seller', outletId: 'outlet-mie-pak-dedi' },
    } as never).outletId,
    'outlet-mie-pak-dedi',
  );
});

test('cloud customers see the name they registered, never a role taken from it', () => {
  const base = { id: 'u', email: 'rani@example.com', app_metadata: {} };
  assert.equal(
    userFromAuth({ ...base, user_metadata: { display_name: '  Rani Putri ' } } as never).name,
    'Rani Putri',
  );
  assert.equal(userFromAuth({ ...base, user_metadata: {} } as never).name, 'Teman Porsi');
  assert.equal(
    userFromAuth({ ...base, user_metadata: { display_name: 'A\u0000B' } } as never).name,
    'AB',
  );
  const claimed = userFromAuth({
    ...base,
    user_metadata: { display_name: 'Pengelola kantin', role: 'admin' },
  } as never);
  assert.equal(claimed.role, 'student');
  assert.equal(claimed.name, 'Pengelola kantin');
});

test('cloud guest cookies are authenticated encrypted identities and tampering fails closed', () => {
  const prior = process.env.SESSION_SECRET;
  try {
    process.env.SESSION_SECRET = 'a-very-long-unique-test-secret-at-least-32';
    const { user, token } = createCloudGuestSession();
    assert.equal(readCloudGuestSession(token)?.id, user.id);
    assert.ok(!token.includes(user.id));
    assert.equal(readCloudGuestSession(`${token.slice(0, -8)}xxxxxxxx`), null);
    process.env.SESSION_SECRET = 'a-different-secret-must-not-open-sessions';
    assert.equal(readCloudGuestSession(token), null);
  } finally {
    if (prior === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = prior;
  }
});

test('owner bootstrap uses immutable Auth identity, never a claimed email', () => {
  const original = process.env.PORSI_OWNER_USER_ID;
  try {
    process.env.PORSI_OWNER_USER_ID = 'owner-test';
    const user = {
      id: 'owner-test',
      email: 'owner@example.test',
      app_metadata: {},
      user_metadata: { role: 'admin' },
    };
    assert.equal(userFromAuth(user as never).role, 'admin');
    assert.equal(
      userFromAuth({ ...user, id: 'different-auth-user' } as never).role,
      'student',
    );
    assert.equal(
      userFromAuth({ ...user, email: 'changed@example.test' } as never).role,
      'admin',
    );
    delete process.env.PORSI_OWNER_USER_ID;
    assert.equal(userFromAuth(user as never).role, 'student');
    assert.equal(
      userFromAuth({ ...user, app_metadata: { role: 'admin' } } as never).role,
      'admin',
    );
  } finally {
    if (original === undefined) delete process.env.PORSI_OWNER_USER_ID;
    else process.env.PORSI_OWNER_USER_ID = original;
  }
});
