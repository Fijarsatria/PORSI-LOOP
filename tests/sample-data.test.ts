import assert from 'node:assert/strict';
import test from 'node:test';
import {
  availableStock,
  createMarketplaceState,
  DEMO_USERS,
  snapshot,
  stock,
  type StoreState,
} from '../lib/server/engine';
import {
  createDemoMarketplace,
  sampleTicketCount,
  seedSampleData,
} from '../lib/server/sample-data';

const now = Date.parse('2026-11-08T10:00:00+07:00');
const kitchens = (state: StoreState) => [state, ...(state.kitchens ?? [])];
const tickets = (k: StoreState) => [
  ...k.orders,
  ...(k.archivedOrders ?? []),
  ...k.claims,
  ...(k.archivedClaims ?? []),
];

test('sample data keeps stock, free stock and reconciliation consistent', () => {
  const base = createMarketplaceState(now);
  const seeded = createDemoMarketplace(now);
  assert.ok(sampleTicketCount(seeded) > 150);
  kitchens(seeded).forEach((k, i) => {
    assert.ok(stock(k) >= 0, `${k.menu.name} stock must not be negative`);
    assert.equal(
      availableStock(k),
      availableStock(kitchens(base)[i]),
      `${k.menu.name} free stock must not change`,
    );
    assert.equal(k.history.length, 7);
    for (const row of k.history) {
      assert.equal(
        row.produced,
        row.preorders + row.walkin + row.rescue + row.waste + (row.internal ?? 0) + (row.endingStock ?? 0),
        `${row.date} must reconcile`,
      );
      assert.ok(row.closed && (row.revenue ?? 0) > 0);
    }
  });
});

test('sample tickets are labelled, unique, rated within range and carry no pickup token', () => {
  const seeded = createDemoMarketplace(now);
  const codes = new Set<string>();
  const ids = new Set<string>();
  let rated = 0;
  for (const k of kitchens(seeded))
    for (const t of tickets(k).filter((x) => x.sample)) {
      assert.ok(!codes.has(t.code), `duplicate code ${t.code}`);
      assert.ok(!ids.has(t.id), `duplicate id ${t.id}`);
      codes.add(t.code);
      ids.add(t.id);
      assert.equal(t.pickupToken, undefined);
      assert.ok(['picked_up', 'no_show', 'cancelled'].includes(t.status));
      if (t.rating) {
        rated++;
        assert.ok(t.rating.stars >= 1 && t.rating.stars <= 5);
        assert.equal(t.status, 'picked_up');
      }
      if ('originalPrice' in t && t.originalPrice)
        assert.ok(t.price < t.originalPrice, 'promo must be cheaper than normal');
    }
  assert.ok(rated > 30);
});

test('seeding is idempotent and can be switched off for test servers', () => {
  const once = createDemoMarketplace(now);
  const count = sampleTicketCount(once);
  seedSampleData(once, { now });
  assert.equal(sampleTicketCount(once), count);
  process.env.PORSI_SAMPLE_DATA = 'off';
  try {
    assert.equal(sampleTicketCount(createDemoMarketplace(now)), 0);
  } finally {
    delete process.env.PORSI_SAMPLE_DATA;
  }
});

test('community summary is anonymous, matches its days and flags sample data', () => {
  const state = createDemoMarketplace(now);
  const view = snapshot(state, null, 'demo', now);
  const community = view.community!;
  assert.equal(community.days.length, 7);
  assert.equal(
    community.servedPortions,
    community.days.reduce((n, day) => n + day.served, 0),
  );
  assert.ok(community.promoPortions > 0 && community.promoPortions < community.servedPortions);
  assert.ok(community.promoSavings > 0);
  assert.ok(community.ratingCount > 30);
  assert.ok(community.ratingAverage >= 4 && community.ratingAverage <= 5);
  assert.ok(community.topMenus.length === 3);
  assert.ok(community.activePromos > 0 && community.outletsWithPromo === 6);
  assert.equal(community.includesSample, true);
  const json = JSON.stringify(community);
  for (const secret of ['userId', 'phone', 'customer', 'sample-user', 'pickupToken'])
    assert.ok(!json.includes(secret), `community must not expose ${secret}`);
  assert.equal(snapshot(createMarketplaceState(now), null, 'demo', now).community!.includesSample, false);
});

test('demo student gets a personal history while other customers do not', () => {
  const state = createDemoMarketplace(now);
  const student = snapshot(state, DEMO_USERS.student, 'demo', now);
  const mine = [...student.orders, ...student.claims].filter((t) => t.status === 'picked_up');
  assert.ok(mine.length >= 6);
  assert.ok(student.claims.length >= 2);
  assert.ok(mine.every((t) => t.userId === DEMO_USERS.student.id));
  const guest = snapshot(state, { id: 'guest-x', role: 'student', name: 'Tamu', isGuest: true }, 'demo', now);
  assert.equal(guest.orders.length + guest.claims.length, 0);
});

test('an empty live installation is left untouched', () => {
  const empty = createMarketplaceState(now, true);
  seedSampleData(empty, { now });
  assert.equal(sampleTicketCount(empty), 0);
  assert.equal(kitchens(empty).every((k) => k.history.length === 0), true);
});
