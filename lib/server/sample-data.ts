import type {
  HistoricalSession,
  Order,
  PaymentMethod,
  RescueBatch,
  RescueClaim,
  StockMovement,
} from '../domain';
import { createMarketplaceState, DEMO_USERS, type StoreState } from './engine';

// Synthetic history used to make demos feel alive: past sessions, completed
// orders with ratings, Promo Terbatas pickups and today's sales. Every ticket
// carries `sample: true` so interfaces can say "data contoh" and the records
// can be told apart from real activity. Nothing here changes how stock is
// calculated: production is raised by exactly what the sample sales consume.

const DAY = 86400000;
// Only the latest days carry individual tickets; older days are summarised in
// history rows. Keeps the single operational document small.
const TICKET_DAYS = 2;
const WIB = 'Asia/Jakarta';

export interface SampleOptions {
  /** Real clock, used only to time the active promo offer. */
  now?: number;
  /** Give this customer a personal history (demo student). */
  studentId?: string;
  studentName?: string;
  /** Hours the generated Promo Terbatas stays open. */
  promoHours?: number;
}

const NAMES = [
  'Rani',
  'Dimas',
  'Aulia',
  'Bima',
  'Citra',
  'Fajar',
  'Gita',
  'Hendra',
  'Intan',
  'Kevin',
  'Laras',
  'Raka',
  'Salsa',
  'Tomi',
  'Wulan',
  'Yoga',
];
const COMMENTS: Record<number, string[]> = {
  5: [
    'Porsinya pas dan masih hangat.',
    'Pesan dulu jadi tidak perlu antre. Praktis.',
    'Bumbunya mantap, promonya hemat banget.',
    'Cepat diambil, QR-nya langsung dipindai.',
    'Enak, dan senang bisa ikut menyelamatkan porsi.',
  ],
  4: [
    'Enak, sambalnya bisa lebih pedas.',
    'Antrean ambil rapi dan jelas.',
    'Porsi reguler cukup untuk makan siang.',
  ],
  3: ['Lumayan, tapi menunggu agak lama.', 'Rasanya oke, porsi bisa lebih besar.'],
};
const METHODS: PaymentMethod[] = [
  'qris',
  'qris',
  'qris',
  'ewallet',
  'ewallet',
  'bank_transfer',
  'cash',
  'cash',
];

function rng(seed: string) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = <T>(r: () => number, items: T[]) =>
  items[Math.floor(r() * items.length)];
const between = (r: () => number, min: number, max: number) =>
  min + Math.floor(r() * (max - min + 1));
const iso = (ms: number) => new Date(ms).toISOString();
const dateOf = (ms: number) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: WIB }).format(new Date(ms));
const sum = <T>(items: T[], value: (item: T) => number) =>
  items.reduce((a, b) => a + value(b), 0);

function stars(r: () => number) {
  const roll = r();
  return roll < 0.62 ? 5 : roll < 0.9 ? 4 : 3;
}
function rating(r: () => number, at: number) {
  if (r() > 0.68) return undefined;
  const value = stars(r);
  return { stars: value, comment: pick(r, COMMENTS[value]), at: iso(at) };
}
const promoPrice = (regular: number, r: () => number) =>
  Math.max(
    3000,
    Math.round((regular * (1 - (35 + between(r, 0, 15)) / 100)) / 500) * 500,
  );
const code = (prefix: string, kitchen: number, day: number, i: number) =>
  `${prefix}-X${String(kitchen + 1).padStart(2, '0')}${day}${i}`;

function ticketBase(
  k: StoreState,
  r: () => number,
  userIndex: number,
  createdAt: number,
  serviceDate: string,
) {
  const method = pick(r, METHODS);
  const dine = r() < 0.3;
  return {
    sample: true as const,
    serviceDate,
    userId: `sample-user-${userIndex + 1}`,
    customer: NAMES[userIndex],
    outletId: k.menu.outletId,
    fulfillment: dine ? ('dine_in' as const) : ('pick_up' as const),
    ...(dine ? { seat: `Meja ${between(r, 1, 12)}` } : {}),
    paymentMethod: method,
    createdAt: iso(createdAt),
  };
}

function seedKitchen(k: StoreState, index: number, o: SampleOptions) {
  if (k.menu.prices.regular <= 0) return;
  if ((k.archivedOrders ?? []).some((t) => t.sample)) return;
  const r = rng(k.menu.id);
  const anchor = Date.parse(`${k.businessDate}T00:00:00+07:00`);
  const archivedOrders: Order[] = [];
  const archivedClaims: RescueClaim[] = [];
  const history: HistoricalSession[] = [];
  const avgPrice = Math.round((k.menu.prices.small + k.menu.prices.regular) / 2);

  for (let d = 7; d >= 1; d--) {
    const dayStart = anchor - d * DAY;
    const date = dateOf(dayStart + 12 * 3600000);
    let pre = 0;
    let preRevenue = 0;
    let promo = 0;
    let promoRevenue = 0;
    const withTickets = d <= TICKET_DAYS;
    const orderCount = between(r, 2, 3);
    for (let i = 0; withTickets && i < orderCount; i++) {
      const user = between(r, 0, NAMES.length - 1);
      const created = dayStart + (9 * 60 + between(r, 0, 150)) * 60000;
      const portion = r() < 0.3 ? 'small' : 'regular';
      const quantity = r() < 0.7 ? 1 : 2;
      const outcome = r();
      const status =
        outcome < 0.84 ? 'picked_up' : outcome < 0.92 ? 'no_show' : 'cancelled';
      const base = ticketBase(k, r, user, created, date);
      const order: Order = {
        ...base,
        id: `sample-${k.menu.id}-${date}-${i}`,
        code: code('PL', index, d, i),
        menuId: k.menu.id,
        menuName: k.menu.name,
        portion,
        quantity,
        price: k.menu.prices[portion],
        slotId: 'asap',
        slotLabel: 'Pesan sekarang',
        status,
        paymentStatus: status === 'cancelled' ? 'refunded' : 'paid',
        note: '',
      };
      if (status === 'picked_up') {
        const pickedAt = created + between(r, 40, 110) * 60000;
        order.pickedUpAt = iso(pickedAt);
        const review = rating(r, pickedAt + 25 * 60000);
        if (review) order.rating = review;
        pre += quantity;
        preRevenue += order.price * quantity;
      }
      archivedOrders.push(order);
    }
    const claimCount = withTickets && r() < 0.55 ? 1 : 0;
    for (let i = 0; i < claimCount; i++) {
      const user = between(r, 0, NAMES.length - 1);
      const created = dayStart + (13 * 60 + between(r, 0, 90)) * 60000;
      const quantity = r() < 0.75 ? 1 : 2;
      const price = promoPrice(k.menu.prices.regular, r);
      const pickedAt = created + between(r, 15, 50) * 60000;
      const claim: RescueClaim = {
        ...ticketBase(k, r, user, created, date),
        id: `sample-${k.menu.id}-${date}-promo-${i}`,
        code: code('RS', index, d, i),
        batchId: `${k.menu.id}-promo-${date}`,
        menuName: k.menu.name,
        quantity,
        price,
        originalPrice: k.menu.prices.regular,
        status: 'picked_up',
        paymentStatus: 'paid',
        expiresAt: iso(created + 3 * 3600000),
        pickedUpAt: iso(pickedAt),
      };
      const review = rating(r, pickedAt + 20 * 60000);
      if (review) claim.rating = review;
      promo += quantity;
      promoRevenue += price * quantity;
      archivedClaims.push(claim);
    }
    if (!withTickets) {
      pre = between(r, 3, 5);
      preRevenue = pre * avgPrice;
      promo = between(r, 1, 2);
      promoRevenue = promo * promoPrice(k.menu.prices.regular, r);
    }
    const walkin = between(r, 8, 16);
    const waste = between(r, 0, 3);
    const internal = r() < 0.25 ? 1 : 0;
    history.push({
      id: `sample-${k.menu.id}-${date}`,
      date,
      produced: pre + walkin + promo + waste + internal,
      preorders: pre,
      walkin,
      rescue: promo,
      waste,
      wasteKg: Math.round(waste * 0.2 * 100) / 100,
      internal,
      endingStock: 0,
      difference: 0,
      revenue: preRevenue + walkin * avgPrice + promoRevenue,
      closed: true,
    });
  }

  // Today: a few completed sales. Production is raised by exactly what they
  // consume (and capacity by the same amount) so free stock is unchanged.
  const todayDate = k.businessDate;
  const orders: Order[] = [];
  const claims: RescueClaim[] = [];
  let todayPre = 0;
  for (let i = 0; i < 2; i++) {
    const user = between(r, 0, NAMES.length - 1);
    const created = anchor + (9 * 60 + 10 + i * 35) * 60000;
    const portion = i === 0 ? 'regular' : 'small';
    const pickedAt = created + between(r, 40, 80) * 60000;
    const order: Order = {
      ...ticketBase(k, r, user, created, todayDate),
      id: `sample-${k.menu.id}-${todayDate}-${i}`,
      code: code('PL', index, 0, i),
      menuId: k.menu.id,
      menuName: k.menu.name,
      portion,
      quantity: 1,
      price: k.menu.prices[portion],
      slotId: 'asap',
      slotLabel: 'Pesan sekarang',
      status: 'picked_up',
      paymentStatus: 'paid',
      note: '',
      pickedUpAt: iso(pickedAt),
    };
    const review = rating(r, pickedAt + 25 * 60000);
    if (review) order.rating = review;
    todayPre += 1;
    orders.push(order);
  }
  const todayPromo = 1;
  {
    const user = between(r, 0, NAMES.length - 1);
    const created = anchor + (12 * 60 + between(r, 0, 60)) * 60000;
    const pickedAt = created + between(r, 15, 45) * 60000;
    claims.push({
      ...ticketBase(k, r, user, created, todayDate),
      id: `sample-${k.menu.id}-${todayDate}-promo-0`,
      code: code('RS', index, 0, 0),
      batchId: `${k.menu.id}-promo-${todayDate}`,
      menuName: k.menu.name,
      quantity: todayPromo,
      price: promoPrice(k.menu.prices.regular, r),
      originalPrice: k.menu.prices.regular,
      status: 'picked_up',
      paymentStatus: 'paid',
      expiresAt: iso(created + 3 * 3600000),
      pickedUpAt: iso(pickedAt),
    });
  }
  const todayWalkin = between(r, 6, 12);
  const consumed = todayPre + todayWalkin + todayPromo;

  k.archivedOrders = [...(k.archivedOrders ?? []), ...archivedOrders];
  k.archivedClaims = [...(k.archivedClaims ?? []), ...archivedClaims];
  k.history = history;
  k.orders = [...k.orders, ...orders];
  k.claims = [...k.claims, ...claims];
  k.walkin += todayWalkin;
  k.walkinRevenue += todayWalkin * avgPrice;
  k.produced += consumed;
  k.capacity += consumed;
  const at = iso(anchor + 8 * 3600000);
  const ref = `sample-${k.menu.id}-${todayDate}`;
  const movement = (
    type: StockMovement['type'],
    quantity: number,
    suffix: string,
  ): StockMovement => ({
    id: `${ref}-${suffix}`,
    sessionId: k.sessionId,
    type,
    quantity,
    reference: ref,
    actor: 'Data contoh',
    at,
  });
  k.movements = [
    ...(k.movements ?? []),
    movement('production_confirmed', consumed, 'production'),
    movement('preorder_pickup', -todayPre, 'preorder'),
    movement('walkin_sale', -todayWalkin, 'walkin'),
    movement('rescue_pickup', -todayPromo, 'promo'),
  ];
}

function seedPromo(k: StoreState, o: SampleOptions) {
  if (k.menu.prices.regular <= 0 || !k.menu.active) return;
  if (k.rescues.some((b) => b.active)) return;
  const r = rng(`${k.menu.id}-promo`);
  const now = o.now ?? Date.now();
  const quantity = between(r, 3, 6);
  const batch: RescueBatch = {
    id: `${k.menu.id}-promo`,
    outletId: k.menu.outletId,
    allergens: [...k.menu.allergens],
    menuId: k.menu.id,
    menuName: k.menu.name,
    description: `Promo Terbatas ${k.menu.name}. Stok matang sudah diperiksa gerai.`,
    quantity,
    available: quantity,
    price: promoPrice(k.menu.prices.regular, r),
    originalPrice: k.menu.prices.regular,
    expiresAt: iso(now + (o.promoHours ?? 36) * 3600000),
    publishedAt: iso(now),
    foodChecked: true,
    active: true,
  };
  k.rescues = [...k.rescues, batch];
  k.produced += quantity;
  k.capacity += quantity;
}

function seedStudent(kitchens: StoreState[], o: SampleOptions) {
  if (!o.studentId) return;
  const r = rng(`student-${o.studentId}`);
  const plan: { kitchen: number; day: number; promo: boolean }[] = [
    { kitchen: 0, day: 1, promo: false },
    { kitchen: 3, day: 2, promo: false },
    { kitchen: 6, day: 3, promo: false },
    { kitchen: 1, day: 4, promo: true },
    { kitchen: 9, day: 6, promo: false },
    { kitchen: 12, day: 8, promo: true },
    { kitchen: 15, day: 9, promo: false },
    { kitchen: 4, day: 10, promo: true },
  ];
  for (const [n, step] of plan.entries()) {
    const k = kitchens[step.kitchen % kitchens.length];
    if ((k.archivedOrders ?? []).some((t) => t.userId === o.studentId)) continue;
    const anchor = Date.parse(`${k.businessDate}T00:00:00+07:00`);
    const dayStart = anchor - step.day * DAY;
    const date = dateOf(dayStart + 12 * 3600000);
    const created = dayStart + (11 * 60 + between(r, 0, 60)) * 60000;
    const pickedAt = created + between(r, 30, 70) * 60000;
    const base = {
      ...ticketBase(k, r, 0, created, date),
      outletName: k.menu.outlet,
      pickupLocation: k.menu.location,
      userId: o.studentId,
      customer: o.studentName ?? 'Teman Porsi',
    };
    const review = rating(r, pickedAt + 25 * 60000);
    if (step.promo) {
      const price = promoPrice(k.menu.prices.regular, r);
      k.archivedClaims = [
        ...(k.archivedClaims ?? []),
        {
          ...base,
          id: `sample-student-${n}-promo`,
          code: `RS-XS${n}${step.day}`,
          batchId: `${k.menu.id}-promo-${date}`,
          menuName: k.menu.name,
          quantity: 1,
          price,
          originalPrice: k.menu.prices.regular,
          status: 'picked_up',
          paymentStatus: 'paid',
          expiresAt: iso(created + 3 * 3600000),
          pickedUpAt: iso(pickedAt),
          ...(review ? { rating: review } : {}),
        },
      ];
    } else {
      const portion = n % 2 ? 'small' : 'regular';
      k.archivedOrders = [
        ...(k.archivedOrders ?? []),
        {
          ...base,
          id: `sample-student-${n}`,
          code: `PL-XS${n}${step.day}`,
          menuId: k.menu.id,
          menuName: k.menu.name,
          portion,
          quantity: n % 3 === 0 ? 2 : 1,
          price: k.menu.prices[portion],
          slotId: 'asap',
          slotLabel: 'Pesan sekarang',
          status: 'picked_up',
          paymentStatus: 'paid',
          note: '',
          pickedUpAt: iso(pickedAt),
          ...(review ? { rating: review } : {}),
        },
      ];
    }
  }
}

/** Fill every kitchen with synthetic history. Safe to call more than once. */
export function seedSampleData(root: StoreState, options: SampleOptions = {}) {
  const kitchens = [root, ...(root.kitchens ?? [])];
  kitchens.forEach((k, i) => seedKitchen(k, i, options));
  kitchens.forEach((k) => seedPromo(k, options));
  seedStudent(kitchens, options);
  return root;
}

/**
 * Fresh demo marketplace with synthetic history. Set PORSI_SAMPLE_DATA=off to
 * start from the bare fixture (used by the automated test servers).
 */
export function createDemoMarketplace(at = Date.now()): StoreState {
  const state = createMarketplaceState(at);
  if (process.env.PORSI_SAMPLE_DATA === 'off') return state;
  return seedSampleData(state, {
    now: at,
    studentId: DEMO_USERS.student.id,
    studentName: DEMO_USERS.student.name,
  });
}

export const sampleTicketCount = (root: StoreState) =>
  sum([root, ...(root.kitchens ?? [])], (k) =>
    [
      ...k.orders,
      ...(k.archivedOrders ?? []),
      ...k.claims,
      ...(k.archivedClaims ?? []),
    ].filter((t) => t.sample).length,
  );
