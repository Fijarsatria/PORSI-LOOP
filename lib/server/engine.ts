import { randomBytes, randomUUID } from 'node:crypto';
import type {
  Action,
  AuditLog,
  HistoricalSession,
  Menu,
  Order,
  Recommendation,
  RescueBatch,
  RescueClaim,
  Role,
  Slot,
  Snapshot,
  StockMovement,
  User,
} from '../domain';

export class DomainError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export interface StoreState {
  kitchens?: StoreState[];
  schema: 1;
  sessionId?: string;
  movements?: StockMovement[];
  archivedMovements?: StockMovement[];
  archivedOrders?: Order[];
  archivedClaims?: RescueClaim[];
  stockouts?: number;
  createdAt: string;
  demoClock: string;
  businessDate: string;
  menu: Menu;
  slots: Slot[];
  orders: Order[];
  rescues: RescueBatch[];
  claims: RescueClaim[];
  produced: number;
  walkin: number;
  walkinRevenue: number;
  internal: number;
  waste: number;
  wasteKg: number;
  capacity: number;
  buffer: number;
  manualBaseline: number;
  history: HistoricalSession[];
  logs: AuditLog[];
  override?: {
    target: number;
    reason: string;
    at: string;
    originalTarget?: number;
  };
  acceptedPlan?: { target: number; at: string };
  closed: boolean;
  endingStock?: number;
  idempotency: string[];
}
const active = (status: string) => ['pending_payment', 'confirmed', 'preparing', 'ready'].includes(status);
const sum = <T>(items: T[], value: (item: T) => number) =>
  items.reduce((a, b) => a + value(b), 0);
const iso = (ms: number) => new Date(ms).toISOString();
const withoutPickupToken = <T extends { pickupToken?: string }>(ticket: T) => {
  const { pickupToken: _token, ...visible } = ticket;
  return visible;
};
export const DEMO_USERS: Record<Role, User> = {
  student: {
    id: 'demo-student',
    role: 'student',
    name: 'Teman Porsi',
    email: 'mahasiswa@demo.porsiloop.id',
  },
  seller: {
    id: 'demo-seller',
    role: 'seller',
    name: 'Bu Ratna',
    email: 'seller@porsiloop.local',
    outletId: 'outlet-bu-ratna',
  },
  admin: {
    id: 'demo-admin',
    role: 'admin',
    name: 'Pengelola kantin',
    email: 'admin@porsiloop.local',
  },
};

export function createState(at = Date.now(), empty = false): StoreState {
  const date = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(at));
  const clock = new Date(`${date}T10:00:00+07:00`).getTime();
  const menu: Menu = {
    outletId: 'outlet-bu-ratna',
    id: 'menu-ayam',
    name: 'Nasi ayam rempah',
    description:
      'Ayam berbumbu rempah, nasi hangat, tumis sayur, dan sambal terpisah. Pilih porsi yang pas untukmu.',
    outlet: 'Dapur Bu Ratna',
    location: 'Kantin kampus · Gerai A-03',
    image: '/images/nasi-ayam.webp',
    category: 'Nasi & lauk',
    tags: ['Dimasak hari ini', 'Sambal terpisah'],
    allergens: ['Kedelai', 'Gandum (kecap)'],
    prices: { small: 13000, regular: 18000 },
    portionLabels: { small: 'Porsi kecil', regular: 'Porsi reguler' },
    variableCost: empty ? 0 : 9000,
    active: true,
  };
  const slots: Slot[] = [0, 1, 2].map((i) => ({
    id: `slot-${i + 1}`,
    label: `${11 + Math.floor((30 + i * 30) / 60)}:${((30 + i * 30) % 60).toString().padStart(2, '0')}–${12 + Math.floor(i / 2)}:${((i % 2) * 30).toString().padStart(2, '0')}`,
    start: iso(clock + (90 + i * 30) * 60000),
    end: iso(clock + (120 + i * 30) * 60000),
    cutoff: iso(clock + 60 * 60000),
    capacity: 20,
    reserved: 0,
    available: 20,
    closed: false,
  }));
  const orders: Order[] = empty
    ? []
    : Array.from({ length: 12 }, (_, i) => ({
        id: `seed-order-${i + 1}`,
        serviceDate: date,
        outletName: menu.outlet,
        pickupLocation: menu.location,
        code: `PL-${(7100 + i).toString()}`,
        userId: `seed-student-${i + 1}`,
        customer: `Mahasiswa ${String(i + 1).padStart(2, '0')}`,
        menuId: menu.id,
        menuName: menu.name,
        portion: i % 3 === 0 ? 'small' : 'regular',
        quantity: 2,
        price: i % 3 === 0 ? 13000 : 18000,
        slotId: slots[i % 3].id,
        slotLabel: slots[i % 3].label,
        status: 'confirmed',
        outletId: menu.outletId,
        fulfillment: 'pick_up',
        paymentStatus: 'paid',
        paymentMethod: 'qris',
        pickupToken: randomBytes(32).toString('base64url'),
        note: '',
        createdAt: iso(clock - (30 - i) * 60000),
      }));
  if (empty) {
    Object.assign(menu, {
      name: 'Menu gerai Anda',
      description:
        'Lengkapi nama, harga, komposisi, dan alergen sebelum membuka pemesanan.',
      outlet: 'Gerai kampus',
      location: 'Lokasi belum diatur',
      active: false,
      tags: [],
      allergens: [],
      prices: { small: 0, regular: 0 },
    });
  }
  const history = empty
    ? []
    : [22, 28, 23, 25, 22, 24, 24].map((walkin, i) => ({
        date: iso(clock - (7 - i) * 86400000).slice(0, 10),
        produced: 50,
        preorders: 20,
        walkin,
        rescue: 2,
        waste: Math.max(0, 50 - 20 - walkin - 2),
        wasteKg:
          Math.round(Math.max(0, 50 - 20 - walkin - 2) * 0.18 * 100) / 100,
        closed: true,
      }));
  return {
    schema: 1,
    sessionId: randomUUID(),
    stockouts: 0,
    movements: empty
      ? []
      : [
          {
            id: 'seed-production',
            type: 'production_confirmed',
            quantity: 32,
            reference: 'seed-production',
            actor: 'Fixture simulasi',
            at: iso(clock),
          },
        ],
    archivedOrders: [],
    archivedClaims: [],
    createdAt: iso(at),
    demoClock: iso(clock),
    businessDate: date,
    menu,
    slots,
    orders,
    rescues: empty
      ? []
      : [
          {
            id: 'rescue-today',
            allergens: [...menu.allergens],
            menuId: menu.id,
            menuName: menu.name,
            description:
              'Porsi matang yang tersedia lebih awal. Lauk dan sayur mengikuti ketersediaan gerai.',
            quantity: 6,
            available: 6,
            price: 10000,
            originalPrice: 18000,
            expiresAt: iso(clock + 210 * 60000),
            publishedAt: iso(clock),
            foodChecked: true,
            active: true,
          },
        ],
    claims: [],
    produced: empty ? 0 : 32,
    walkin: 0,
    walkinRevenue: 0,
    internal: 0,
    waste: 0,
    wasteKg: 0,
    capacity: 50,
    buffer: 2,
    manualBaseline: empty ? 0 : 24,
    history,
    logs: [],
    closed: false,
    idempotency: [],
  };
}

export const DEMO_OUTLETS = [
  { id: 'outlet-bu-ratna', name: 'Dapur Bu Ratna', location: 'Kantin kampus · Gerai A-03', category: 'Nasi & lauk', email: 'seller@porsiloop.local', menus: ['Nasi ayam rempah', 'Nasi telur balado', 'Nasi ikan kunyit'] },
  { id: 'outlet-mie-pak-dedi', name: 'Mie Pak Dedi', location: 'Kantin kampus · Gerai A-04', category: 'Mie & bakso', email: 'dedi@porsiloop.local', menus: ['Mie ayam jamur', 'Bakso kuah sapi', 'Mie goreng sayur'] },
  { id: 'outlet-sayur-bu-sari', name: 'Sayur Bu Sari', location: 'Kantin kampus · Gerai B-01', category: 'Sayur & vegetarian', email: 'sari@porsiloop.local', menus: ['Gado-gado lontong', 'Pecel nasi merah', 'Tahu tempe sayur'] },
  { id: 'outlet-soto-pak-hadi', name: 'Soto Pak Hadi', location: 'Kantin kampus · Gerai B-02', category: 'Soto & sup', email: 'hadi@porsiloop.local', menus: ['Soto ayam bening', 'Sup ayam kentang', 'Rawon daging'] },
  { id: 'outlet-dapur-nusantara', name: 'Dapur Nusantara', location: 'Kantin kampus · Gerai C-01', category: 'Masakan rumahan', email: 'nusantara@porsiloop.local', menus: ['Nasi rendang', 'Ayam sambal matah', 'Nasi perkedel sayur'] },
  { id: 'outlet-roti-kopi', name: 'Roti & Kopi Kampus', location: 'Kantin kampus · Gerai C-02', category: 'Roti & camilan', email: 'roti@porsiloop.local', menus: ['Roti telur keju', 'Sandwich ayam', 'Roti sayur panggang'] },
] as const;

export function createMarketplaceState(at = Date.now(), empty = false): StoreState {
  const kitchens = DEMO_OUTLETS.flatMap((outlet, outletIndex) => outlet.menus.map((name, menuIndex) => {
    const kitchen = createState(at, empty);
    const id = outletIndex === 0 && menuIndex === 0 ? 'menu-ayam' : `menu-${outlet.id.slice(7)}-${menuIndex + 1}`;
    const regular = 15000 + ((outletIndex + menuIndex) % 4) * 2000;
    kitchen.menu = {
      ...kitchen.menu, id, name, outletId: outlet.id, outlet: outlet.name, location: outlet.location,
      category: outlet.category, image: `/images/menu-${outletIndex + 1}-${menuIndex + 1}.svg`,
      description: empty ? 'Menu belum dibuka. Gerai perlu mengisi harga, komposisi, dan alergen sebelum menerima pesanan.' : `${name} dari ${outlet.name}, disiapkan hari ini. Sambal atau saus disajikan terpisah.`,
      allergens: empty ? [] : outletIndex === 2 ? ['Kacang', 'Kedelai'] : outletIndex === 5 ? ['Gandum', 'Telur', 'Susu'] : ['Kedelai'],
      prices: empty ? { small: 0, regular: 0 } : { small: regular - 5000, regular }, variableCost: empty ? 0 : Math.round(regular * .5),
    };
    kitchen.orders.forEach((order, i) => Object.assign(order, {
      id: `${id}-seed-${i + 1}`, code: `PL-${outletIndex + 1}${menuIndex + 1}${7100 + i}`,
      menuId: id, menuName: name, outletId: outlet.id, outletName: outlet.name, pickupLocation: outlet.location,
      price: kitchen.menu.prices[order.portion],
    }));
    kitchen.rescues.forEach(batch => Object.assign(batch, {
      id: `${id}-promo`, menuId: id, menuName: name, outletId: outlet.id,
      allergens: [...kitchen.menu.allergens], originalPrice: regular, price: regular - 6000,
      description: `Promo Terbatas ${name}. Stok matang sudah diperiksa gerai.`,
    }));
    return kitchen;
  }));
  const [first, ...rest] = kitchens;
  first.kitchens = rest;
  return first;
}

export function serverNow(
  state: StoreState,
  mode: 'demo' | 'supabase',
  realNow = Date.now(),
) {
  return mode === 'demo'
    ? new Date(state.demoClock).getTime() +
        Math.max(0, realNow - new Date(state.createdAt).getTime())
    : realNow;
}
export function expire(state: StoreState, now: number) {
  for (const kitchen of state.kitchens ?? []) expire(kitchen, now);
  for (const order of state.orders) {
    if (order.status === 'pending_payment' && now >= Date.parse(order.paymentExpiresAt ?? order.createdAt) ) {
      order.status = 'expired';
      order.paymentStatus = 'expired';
      delete order.pickupToken;
      continue;
    }
    const slot = state.slots.find((s) => s.id === order.slotId);
    if (active(order.status) && ((slot && now >= new Date(slot.end).getTime()) || (order.slotId === 'asap' && now >= Date.parse(order.createdAt) + 2 * 3600000)))
      order.status = 'no_show';
  }
  for (const claim of state.claims) {
    if (claim.status === 'pending_payment' && now >= Date.parse(claim.paymentExpiresAt ?? claim.createdAt)) {
      claim.status = 'expired';
      claim.paymentStatus = 'expired';
      delete claim.pickupToken;
      continue;
    }
    if (active(claim.status) && now >= new Date(claim.expiresAt).getTime())
      claim.status = 'expired';
  }
  for (const batch of state.rescues)
    if (now >= new Date(batch.expiresAt).getTime()) batch.active = false;
}
export function stock(state: StoreState) {
  return (
    state.produced -
    sum(
      state.orders.filter((o) => o.status === 'picked_up'),
      (o) => o.quantity,
    ) -
    state.walkin -
    sum(
      state.claims.filter((c) => c.status === 'picked_up'),
      (c) => c.quantity,
    ) -
    state.internal -
    state.waste
  );
}
export function batchAvailable(state: StoreState, batch: RescueBatch) {
  return Math.max(
    0,
    batch.quantity -
      sum(
        state.claims.filter(
          (c) =>
            c.batchId === batch.id &&
            (active(c.status) || c.status === 'picked_up'),
        ),
        (c) => c.quantity,
      ),
  );
}
const rescueHeld = (state: StoreState) =>
  sum(
    state.rescues.filter((r) => r.active),
    (r) =>
      Math.max(
        0,
        r.quantity -
          sum(
            state.claims.filter(
              (c) => c.batchId === r.id && c.status === 'picked_up',
            ),
            (c) => c.quantity,
          ),
      ),
  );
const committedCapacity = (state: StoreState) =>
  sum(
    state.orders.filter(
      (o) => !['cancelled', 'expired', 'no_show'].includes(o.status),
    ),
    (o) => o.quantity,
  ) +
  state.walkin +
  rescueHeld(state) +
  sum(
    state.claims.filter((c) => c.status === 'picked_up'),
    (c) => c.quantity,
  ) +
  state.internal +
  state.waste;
const preorderHeld = (state: StoreState) =>
  sum(
    state.orders.filter((o) => active(o.status)),
    (o) => o.quantity,
  );
const newCode = (state: StoreState, prefix: string) => {
  let code: string;
  do {
    code = `${prefix}-${randomUUID().slice(0, 6).toUpperCase()}`;
  } while (
    state.orders.some((o) => o.code === code) ||
    state.claims.some((c) => c.code === code)
  );
  return code;
};
export const availableStock = (state: StoreState) =>
  Math.max(0, stock(state) - preorderHeld(state) - rescueHeld(state));
export function recommendation(state: StoreState): Recommendation {
  const history = state.history
    .filter(
      (h) =>
        h.closed &&
        h.id !== (state.sessionId ?? state.createdAt) &&
        Number.isFinite(h.walkin),
    )
    .slice(-7);
  const historyEnough = history.length >= 3;
  const walkinEstimate = historyEnough
    ? Math.round(sum(history, (h) => h.walkin) / history.length)
    : state.manualBaseline;
  const preorders = sum(
    state.orders.filter((o) => !['cancelled', 'expired'].includes(o.status)),
    (o) => o.quantity,
  );
  const target = Math.min(
    state.capacity,
    preorders + walkinEstimate + state.buffer,
  );
  const walkinRange: [number, number] = historyEnough
    ? [
        Math.min(...history.map((h) => h.walkin)),
        Math.max(...history.map((h) => h.walkin)),
      ]
    : [walkinEstimate, walkinEstimate];
  return {
    preorders,
    walkinEstimate,
    walkinRange,
    buffer: state.buffer,
    target,
    capacity: state.capacity,
    readyStock: stock(state),
    toProduce: Math.max(
      0,
      (state.override?.target ?? state.acceptedPlan?.target ?? target) -
        state.produced,
    ),
    source: historyEnough ? 'history' : 'manual',
    historyDays: history.length,
    override: state.override,
    accepted: state.acceptedPlan,
  };
}

export function snapshot(
  state: StoreState,
  user: User | null,
  mode: 'demo' | 'supabase',
  realNow = Date.now(),
): Snapshot {
  if (state.kitchens) return marketplaceSnapshot(state, user, mode, realNow);
  if (user?.role === 'seller' && (!user.outletId || user.outletId !== state.menu.outletId)) throw new DomainError('Akun ini tidak memiliki akses ke gerai tersebut.', 403);
  const now = serverNow(state, mode, realNow);
  expire(state, now);
  const slots = state.slots.map((slot) => {
    const reserved = sum(
      state.orders.filter(
        (o) =>
          o.slotId === slot.id &&
          !['cancelled', 'expired', 'no_show'].includes(o.status),
      ),
      (o) => o.quantity,
    );
    return {
      ...slot,
      reserved,
      available: Math.max(
        0,
        Math.min(
          slot.capacity - reserved,
          state.capacity - committedCapacity(state),
        ),
      ),
      closed: state.closed || now >= new Date(slot.cutoff).getTime(),
    };
  });
  const picked = sum(
    state.orders.filter((o) => o.status === 'picked_up'),
    (o) => o.quantity,
  );
  const rescued = sum(
    state.claims.filter((c) => c.status === 'picked_up'),
    (c) => c.quantity,
  );
  const endingStock = state.endingStock ?? stock(state);
  const reconciliation = {
    openingStock: 0,
    produced: state.produced,
    preorderPickedUp: picked,
    walkin: state.walkin,
    rescuePickedUp: rescued,
    internal: state.internal,
    waste: state.waste,
    endingStock,
    difference:
      state.produced -
      picked -
      state.walkin -
      rescued -
      state.internal -
      state.waste -
      endingStock,
    wasteKg: state.wasteKg,
    complete: state.closed,
    recorded: state.endingStock !== undefined,
  };
  const isStaff = user?.role === 'seller' || user?.role === 'admin';
  const isSeller = user?.role === 'seller';
  const eligible = sum(
    state.orders.filter((o) => !['cancelled', 'expired'].includes(o.status)),
    (o) => o.quantity,
  );
  const pickupRate = eligible ? Math.round((picked / eligible) * 100) : 0;
  const rescueRevenue = sum(
    state.claims.filter((c) => c.status === 'picked_up'),
    (c) => c.price * c.quantity,
  );
  return {
    sessionId: state.sessionId ?? state.createdAt,
    movements: isStaff
      ? [...(state.archivedMovements ?? []), ...(state.movements ?? [])]
      : [],
    user,
    mode,
    now: iso(now),
    demoLabel:
      mode === 'demo'
        ? 'Simulasi interaktif · data contoh, bukan hasil uji lapangan'
        : null,
    businessDate: state.businessDate,
    menu: {
      ...state.menu,
      availableStock: availableStock(state),
      variableCost: isStaff ? state.menu.variableCost : 0,
    },
    slots,
    orders: user
      ? [
          ...state.orders,
          ...(user.role === 'student' ? (state.archivedOrders ?? []) : []),
        ].filter(
          (o) => isSeller || (user.role === 'student' && o.userId === user.id),
        ).map(order => isSeller ? withoutPickupToken(order) : order)
      : [],
    rescues: state.rescues.map((r) => ({
      ...r,
      available: r.active ? batchAvailable(state, r) : 0,
    })),
    claims: user
      ? [
          ...state.claims,
          ...(user.role === 'student' ? (state.archivedClaims ?? []) : []),
        ].filter(
          (c) => isSeller || (user.role === 'student' && c.userId === user.id),
        ).map(claim => isSeller ? withoutPickupToken(claim) : claim)
      : [],
    recommendation: isStaff ? recommendation(state) : { preorders: 0, walkinEstimate: 0, walkinRange: [0, 0], buffer: 0, target: 0, capacity: 0, readyStock: 0, toProduce: 0, source: 'manual', historyDays: 0 },
    metrics: {
      stockouts: state.stockouts ?? 0,
      totalOrders: state.orders.length,
      activeOrders: state.orders.filter((o) => active(o.status)).length,
      preorderPortions: preorderHeld(state),
      produced: state.produced,
      walkin: state.walkin,
      rescued,
      rescueReserved: sum(
        state.claims.filter((c) => active(c.status)),
        (c) => c.quantity,
      ),
      stock: stock(state),
      availableStock: availableStock(state),
      waste: state.waste,
      wasteKg: state.wasteKg,
      revenue: isStaff
        ? sum(
            state.orders.filter((o) => o.status === 'picked_up'),
            (o) => o.price * o.quantity,
          ) +
          rescueRevenue +
          state.walkinRevenue
        : 0,
      rescueRevenue: isStaff ? rescueRevenue : 0,
      pickupRate,
      preorderEligible: eligible,
      noShow: sum(
        state.orders.filter((o) => o.status === 'no_show'),
        (o) => o.quantity,
      ),
      completionRate: pickupRate,
    },
    logs: isStaff ? state.logs.slice(0, 100) : [],
    reconciliation: isStaff ? reconciliation : { openingStock: 0, produced: 0, preorderPickedUp: 0, walkin: 0, rescuePickedUp: 0, internal: 0, waste: 0, endingStock: 0, difference: 0, wasteKg: 0, complete: false },
    history: isStaff ? state.history : [],
    ...(user?.role === 'admin' ? { orderTraffic: orderTraffic([state]) } : {}),
  };
}

function orderTraffic(states: StoreState[]): NonNullable<Snapshot['orderTraffic']> {
  const groups = new Map<string, NonNullable<Snapshot['orderTraffic']>[number]>();
  for (const state of states) {
    for (const ticket of [...state.orders, ...(state.archivedOrders ?? []), ...state.claims, ...(state.archivedClaims ?? [])]) {
      const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date(ticket.createdAt));
      const outletId = ticket.outletId ?? state.menu.outletId ?? 'outlet-bu-ratna';
      const key = `${date}:${outletId}`;
      const row = groups.get(key) ?? { date, outletId, outletName: ticket.outletName ?? state.menu.outlet, orders: 0, portions: 0, normal: 0, promo: 0, paid: 0, served: 0, pending: 0, preparing: 0, ready: 0, active: 0 };
      row.orders++;
      row.portions += ticket.quantity;
      if ('batchId' in ticket) row.promo++; else row.normal++;
      if (ticket.paymentStatus === 'paid') row.paid++;
      if (ticket.status === 'picked_up') row.served++;
      if (ticket.status === 'pending_payment') row.pending++;
      if (ticket.status === 'preparing') row.preparing++;
      if (ticket.status === 'ready') row.ready++;
      if (active(ticket.status)) row.active++;
      groups.set(key, row);
    }
  }
  return [...groups.values()].sort((a, b) => a.date.localeCompare(b.date) || a.outletName.localeCompare(b.outletName));
}

function marketplaceSnapshot(state: StoreState, user: User | null, mode: 'demo' | 'supabase', realNow: number): Snapshot {
  const states = [{ ...state, kitchens: undefined }, ...(state.kitchens ?? [])];
  const all = states.map(kitchen => snapshot(kitchen, user?.role === 'seller' && kitchen.menu.outletId !== user.outletId ? null : user, mode, realNow));
  const scoped = all.filter(kitchen => user?.role !== 'seller' || kitchen.menu.outletId === user.outletId);
  if (user?.role === 'seller' && !scoped.length) throw new DomainError('Akun gerai belum terhubung ke gerai yang valid.', 403);
  const selected = scoped[0] ?? all[0];
  const staff = user?.role === 'seller' || user?.role === 'admin';
  const aggregateMetrics = (kitchens: Snapshot[]) => {
    const result = { ...kitchens[0].metrics };
    for (const key of Object.keys(result) as (keyof typeof result)[]) {
      if (key !== 'pickupRate' && key !== 'completionRate') result[key] = kitchens.reduce((total, kitchen) => total + kitchen.metrics[key], 0);
    }
    result.pickupRate = result.preorderEligible ? Math.round(kitchens.reduce((n, k) => n + k.reconciliation.preorderPickedUp, 0) / result.preorderEligible * 100) : 0;
    result.completionRate = result.pickupRate;
    return result;
  };
  const metrics = aggregateMetrics(scoped);
  const reconciliation = { ...selected.reconciliation };
  for (const key of ['openingStock', 'produced', 'preorderPickedUp', 'walkin', 'rescuePickedUp', 'internal', 'waste', 'endingStock', 'difference', 'wasteKg'] as const) reconciliation[key] = scoped.reduce((n, k) => n + k.reconciliation[key], 0);
  reconciliation.complete = scoped.every(k => k.reconciliation.complete);
  reconciliation.recorded = scoped.every(k => k.reconciliation.recorded);
  const historyByDate = new Map<string, HistoricalSession>();
  for (const kitchen of scoped) for (const session of kitchen.history) {
    const old = historyByDate.get(session.date);
    if (!old) historyByDate.set(session.date, { ...session });
    else {
      for (const key of ['produced', 'preorders', 'walkin', 'rescue', 'waste', 'wasteKg', 'internal', 'endingStock', 'difference'] as const) old[key] = (old[key] ?? 0) + (session[key] ?? 0);
      old.closed = old.closed && session.closed;
    }
  }
  const outletIds = [...new Set(all.map(kitchen => kitchen.menu.outletId!))];
  return {
    ...selected,
    menus: all.map(kitchen => ({ ...kitchen.menu, slots: kitchen.slots, variableCost: user?.role === 'admin' || (user?.role === 'seller' && kitchen.menu.outletId === user.outletId) ? kitchen.menu.variableCost : 0 })),
    outlets: outletIds.map(id => {
      const group = all.filter(kitchen => kitchen.menu.outletId === id);
      return { id, name: group[0].menu.outlet, location: group[0].menu.location, category: group[0].menu.category, menuIds: group.map(k => k.menu.id), ...(staff && (user.role === 'admin' || id === user.outletId) ? { metrics: aggregateMetrics(group) } : {}) };
    }),
    selectedOutletId: user?.role === 'seller' ? user.outletId : undefined,
    ...(staff ? { kitchens: scoped.map(k => ({ ...k, kitchens: undefined, menus: undefined, outlets: undefined })) } : {}),
    orders: user?.role === 'admin' ? [] : scoped.flatMap(k => k.orders),
    claims: user?.role === 'admin' ? [] : scoped.flatMap(k => k.claims),
    rescues: all.flatMap(k => k.rescues), metrics, reconciliation,
    history: [...historyByDate.values()].sort((a, b) => a.date.localeCompare(b.date)),
    logs: scoped.flatMap(k => k.logs).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 100),
    movements: scoped.flatMap(k => k.movements),
    ...(user?.role === 'admin' ? { orderTraffic: orderTraffic(states) } : {}),
  };
}

const integer = (value: unknown, label: string, min = 1, max = 10000) => {
  if (
    typeof value !== 'number' ||
    !Number.isSafeInteger(value) ||
    value < min ||
    value > max
  )
    throw new DomainError(`${label} harus bilangan bulat ${min}–${max}.`);
  return value;
};
const text = (value: unknown, max = 300) =>
  typeof value === 'string' ? value.trim().slice(0, max) : '';
const fulfillment = (value: unknown) => {
  if (value === undefined || value === 'pick_up') return 'pick_up' as const;
  if (value === 'dine_in') return 'dine_in' as const;
  throw new DomainError('Pilih Dine in atau Pick up.');
};
const paymentMethod = (value: unknown) => {
  if (value === undefined || value === 'qris') return 'qris' as const;
  if (value === 'ewallet' || value === 'bank_transfer' || value === 'cash') return value;
  throw new DomainError('Pilih metode pembayaran yang tersedia.');
};
const customerName = (value: unknown, user: User) => {
  if (value === undefined) return user.name;
  const name = text(value, 100);
  if (name.length < 2) throw new DomainError('Isi nama pemesan sedikitnya 2 karakter.');
  return name;
};
const refund = (ticket: Order | RescueClaim, mode: 'demo' | 'supabase') => {
  if (ticket.paymentStatus === 'paid') ticket.paymentStatus = mode === 'demo' ? 'refunded' : 'refund_pending';
  else ticket.paymentStatus = 'expired';
  delete ticket.pickupToken;
};
const requireRole = (user: User, roles: Role[]) => {
  if (!roles.includes(user.role))
    throw new DomainError(
      'Akun ini tidak memiliki akses untuk tindakan tersebut.',
      403,
    );
};
const requireReason = (value: unknown) => {
  const reason = text(value);
  if (reason.length < 5)
    throw new DomainError('Tuliskan alasan sedikitnya 5 karakter.');
  return reason;
};
function log(
  state: StoreState,
  user: User,
  action: string,
  detail: string,
  now: number,
) {
  state.logs.unshift({
    id: randomUUID(),
    actor: user.name,
    action,
    detail,
    at: iso(now),
  });
}

export function applyAction(
  state: StoreState,
  user: User,
  action: Action,
  now: number,
  mode: 'demo' | 'supabase' = 'demo',
): StoreState {
  if (mode === 'supabase' && action.type === 'pay_order') throw new DomainError('Pembayaran digital belum tersedia. Gunakan tunai dan minta gerai memverifikasi pembayaran.', 503);
  if (mode === 'supabase' && ['preorder', 'claim_rescue'].includes(action.type) && action.paymentMethod !== 'cash') throw new DomainError('QRIS, e-wallet, dan transfer belum tersedia sampai penyedia pembayaran dikonfigurasi. Pilih tunai.', 503);
  if (state.kitchens) {
    const kitchens = [state, ...state.kitchens];
    const referenced = kitchens.find(k =>
      k.orders.some(o => o.id === action.orderId || (typeof action.token === 'string' && o.pickupToken === action.token)) ||
      k.claims.some(c => c.id === action.claimId || (typeof action.token === 'string' && c.pickupToken === action.token)) ||
      k.rescues.some(r => r.id === action.batchId));
    const selected = typeof action.menuId === 'string' ? kitchens.find(k => k.menu.id === action.menuId) : referenced ?? (user.role === 'seller' ? kitchens.find(k => k.menu.outletId === user.outletId) : state);
    if (!selected || (referenced && referenced !== selected)) throw new DomainError('Menu atau pesanan tidak ditemukan.', 404);
    if (user.role === 'seller' && selected.menu.outletId !== user.outletId) throw new DomainError('Akun ini tidak memiliki akses ke gerai tersebut.', 403);
    applyKitchenAction(selected, user, action, now, mode);
    return state;
  }
  if (user.role === 'seller' && (!user.outletId || user.outletId !== state.menu.outletId)) throw new DomainError('Akun ini tidak memiliki akses ke gerai tersebut.', 403);
  if (action.menuId !== undefined && action.menuId !== state.menu.id) throw new DomainError('Menu tidak ditemukan.', 404);
  return applyKitchenAction(state, user, action, now, mode);
}

function applyKitchenAction(
  state: StoreState,
  user: User,
  action: Action,
  now: number,
  mode: 'demo' | 'supabase',
): StoreState {
  expire(state, now);
  const key = text(action.idempotencyKey, 100);
  if (key && state.idempotency.includes(`${user.id}:${key}`)) return state;
  // Existing installations retain their measured balance without fabricating
  // individual historical production or sale events during this upgrade.
  if (!state.movements)
    state.movements = [
      {
        id: randomUUID(),
        type: 'opening_balance',
        quantity: stock(state),
        reference: state.createdAt,
        actor: 'system-upgrade',
        at: iso(now),
      },
    ];
  const beforeStock = stock(state);
  const beforeInternal = state.internal;
  const beforeWaste = state.waste;
  let reference = '';
  if (state.closed && !['reset_demo', 'start_session'].includes(action.type))
    throw new DomainError(
      'Sesi sudah direkonsiliasi. Mulai sesi baru sebelum mencatat transaksi.',
    );
  switch (action.type) {
    case 'start_session': {
      requireRole(user, ['seller']);
      if (!state.closed)
        throw new DomainError(
          'Rekonsiliasi sesi berjalan harus lengkap sebelum membuka sesi berikutnya.',
        );
      const date = text(action.businessDate, 10);
      const startTime = text(action.pickupStart, 5);
      const cutoffTime = text(action.cutoffTime, 5);
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime) ||
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(cutoffTime)
      )
        throw new DomainError(
          'Isi tanggal, batas pesan, dan awal Pick up dalam WIB.',
        );
      const start = Date.parse(`${date}T${startTime}:00+07:00`);
      const cutoff = Date.parse(`${date}T${cutoffTime}:00+07:00`);
      if (
        !Number.isFinite(start) ||
        new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(
          new Date(start),
        ) !== date ||
        cutoff <= now ||
        cutoff > start ||
        start + 90 * 60000 >= Date.parse(`${date}T23:59:59+07:00`)
      )
        throw new DomainError(
          'Jadwal harus valid: batas pesan masih di depan, sebelum Pick up, dan seluruh slot di hari yang sama.',
        );
      const previous = {
        createdAt: state.createdAt,
        demoClock: state.demoClock,
        archivedMovements: [
          ...(state.archivedMovements ?? []),
          ...(state.movements ?? []),
        ].map((m) => ({
          ...m,
          sessionId: m.sessionId ?? state.sessionId ?? state.createdAt,
        })),
        history: state.history,
        archivedOrders: [...(state.archivedOrders ?? []), ...state.orders],
        archivedClaims: [...(state.archivedClaims ?? []), ...state.claims],
        menu: state.menu,
        logs: state.logs,
        capacity: state.capacity,
        buffer: state.buffer,
        manualBaseline: state.manualBaseline,
        slots: state.slots,
      };
      const next = createState(now, true);
      next.slots = previous.slots.map((slot, i) => {
        const from = start + i * 30 * 60000;
        const until = from + 30 * 60000;
        const fmt = (ms: number) =>
          new Intl.DateTimeFormat('id-ID', {
            timeZone: 'Asia/Jakarta',
            hour: '2-digit',
            minute: '2-digit',
          }).format(new Date(ms));
        return {
          ...slot,
          start: iso(from),
          end: iso(until),
          cutoff: iso(cutoff),
          label: `${fmt(from)}–${fmt(until)}`,
          reserved: 0,
          available: slot.capacity,
          closed: false,
        };
      });
      Object.assign(state, next, {
        history: previous.history,
        archivedMovements: previous.archivedMovements,
        archivedOrders: previous.archivedOrders,
        archivedClaims: previous.archivedClaims,
        menu: previous.menu,
        logs: previous.logs,
        capacity: previous.capacity,
        buffer: previous.buffer,
        manualBaseline: previous.manualBaseline,
        businessDate: date,
        createdAt: previous.createdAt,
        demoClock: previous.demoClock,
        idempotency: state.idempotency,
      });
      delete state.endingStock;
      delete state.override;
      delete state.acceptedPlan;
      log(
        state,
        user,
        'Sesi baru dibuka',
        `${date} · Pick up ${startTime} WIB · stok awal baru 0; stok akhir lama tetap di arsip`,
        now,
      );
      break;
    }
    case 'record_stockout': {
      requireRole(user, ['seller']);
      if (availableStock(state) > 0)
        throw new DomainError(
          'Masih ada stok bebas. Stockout hanya dicatat saat stok bebas habis.',
        );
      const reason = requireReason(action.reason);
      state.stockouts = (state.stockouts ?? 0) + 1;
      log(state, user, 'Permintaan walk-in tidak terpenuhi', reason, now);
      break;
    }
    case 'preorder': {
      requireRole(user, ['student']);
      if (!state.menu.active)
        throw new DomainError(
          'Menu sedang tidak tersedia. Pilih menu lain nanti.',
        );
      const quantity = integer(action.quantity ?? 1, 'Jumlah porsi', 1, 5);
      const portion =
        action.portion === 'small'
          ? 'small'
          : action.portion === 'regular'
            ? 'regular'
            : null;
      if (!portion) throw new DomainError('Pilih ukuran porsi.');
      const immediate = action.slotId === 'asap' || !action.slotId;
      const slot = immediate ? { id: 'asap', label: 'Pesan sekarang', capacity: state.capacity, start: iso(now), end: iso(now + 2 * 3600000), cutoff: iso(now + 15 * 60000) } : state.slots.find((s) => s.id === action.slotId);
      if (!slot || now >= new Date(slot.cutoff).getTime())
        throw new DomainError(
          'Batas pemesanan slot ini sudah lewat. Pilih slot yang masih terbuka.',
        );
      const occupied = sum(
        state.orders.filter(
          (o) =>
            o.slotId === slot.id &&
            !['cancelled', 'expired', 'no_show'].includes(o.status),
        ),
        (o) => o.quantity,
      );
      if (occupied + quantity > slot.capacity)
        throw new DomainError('Slot baru saja penuh. Pilih slot lain.');
      if (immediate && availableStock(state) < quantity) throw new DomainError('Stok siap saji menu ini tidak cukup. Pilih jadwal atau menu lain.');
      const assigned = committedCapacity(state);
      if (assigned + quantity > state.capacity)
        throw new DomainError(
          'Kuota produksi menu ini sudah habis. Cek Promo Terbatas yang tersedia.',
        );
      const order: Order = {
        id: randomUUID(),
        serviceDate: state.businessDate,
        outletName: state.menu.outlet,
        pickupLocation: state.menu.location,
        code: newCode(state, 'PL'),
        userId: user.id,
        customer: customerName(action.customer, user),
        menuId: state.menu.id,
        menuName: state.menu.name,
        portion,
        quantity,
        price: state.menu.prices[portion],
        slotId: slot.id,
        slotLabel: slot.label,
        status: 'pending_payment',
        outletId: state.menu.outletId,
        fulfillment: fulfillment(action.fulfillment),
        paymentStatus: 'pending',
        paymentMethod: paymentMethod(action.paymentMethod),
        paymentExpiresAt: iso(Math.min(now + 15 * 60000, Date.parse(slot.end))),
        note: text(action.note, 200),
        createdAt: iso(now),
      };
      state.orders.unshift(order);
      log(
        state,
        user,
        'Pesanan dibuat',
        `${quantity} ${state.menu.portionLabels[portion]} · ${slot.label}`,
        now,
      );
      break;
    }
    case 'cancel_order': {
      requireRole(user, ['student']);
      const order = state.orders.find(
        (o) => o.id === action.orderId && o.userId === user.id,
      );
      if (!order || !['pending_payment', 'confirmed'].includes(order.status))
        throw new DomainError('Pesanan tidak dapat dibatalkan.');
      const slot = state.slots.find((s) => s.id === order.slotId);
      if (slot && now >= new Date(slot.cutoff).getTime())
        throw new DomainError('Pembatalan ditutup setelah batas pemesanan.');
      order.status = 'cancelled';
      refund(order, mode);
      log(state, user, 'Pembatalan', order.code, now);
      break;
    }
    case 'pickup_order':
    case 'pickup_rescue':
      throw new DomainError('Pengambilan harus memakai QR pesanan yang sudah dibayar dan siap. Gunakan pemindai QR gerai.', 403);
    case 'pay_order':
    case 'verify_cash_payment': {
      const ticket = action.claimId ? state.claims.find(c => c.id === action.claimId) : state.orders.find(o => o.id === action.orderId);
      if (!ticket) throw new DomainError('Pesanan tidak ditemukan.', 404);
      if (action.type === 'verify_cash_payment') {
        requireRole(user, ['seller']);
        if (ticket.paymentMethod !== 'cash') throw new DomainError('Verifikasi tunai hanya untuk pesanan dengan pembayaran tunai.');
      } else {
        requireRole(user, ['student']);
        if (ticket.userId !== user.id) throw new DomainError('Pesanan tidak ditemukan.', 404);
        if (ticket.paymentMethod === 'cash') throw new DomainError('Pembayaran tunai harus diverifikasi gerai.');
      }
      if (ticket.paymentStatus === 'paid') break;
      if (ticket.status !== 'pending_payment' || ticket.paymentStatus !== 'pending') throw new DomainError('Batas pembayaran berakhir atau pesanan sudah diproses.', 409);
      ticket.paymentStatus = 'paid';
      ticket.status = 'confirmed';
      ticket.pickupToken = randomBytes(32).toString('base64url');
      log(state, user, 'Pembayaran diterima', ticket.code, now);
      break;
    }
    case 'confirm_cash_refund': {
      requireRole(user, ['seller']);
      const ticket = action.claimId ? state.claims.find(claim => claim.id === action.claimId) : state.orders.find(order => order.id === action.orderId);
      if (!ticket || ticket.status !== 'cancelled' || ticket.paymentMethod !== 'cash') throw new DomainError('Pengembalian tunai hanya untuk pesanan tunai yang dibatalkan.');
      if (ticket.paymentStatus === 'refunded') break;
      if (ticket.paymentStatus !== 'refund_pending') throw new DomainError('Tidak ada pengembalian tunai yang menunggu konfirmasi.');
      ticket.paymentStatus = 'refunded';
      log(state, user, 'Pengembalian tunai dikonfirmasi', ticket.code, now);
      break;
    }
    case 'prepare_order':
    case 'prepare_rescue':
    case 'ready_rescue':
    case 'ready_order': {
      requireRole(user, ['seller']);
      const order = action.claimId ? state.claims.find(c => c.id === action.claimId) : state.orders.find((o) => o.id === action.orderId);
      const preparing = action.type.startsWith('prepare');
      if (!order || order.paymentStatus !== 'paid' || order.status !== (preparing ? 'confirmed' : 'preparing'))
        throw new DomainError(preparing ? 'Pesanan harus sudah dibayar sebelum disiapkan.' : 'Pesanan harus dibayar dan sedang disiapkan sebelum ditandai siap.');
      if ((action.claimId ? stock(state) : stock(state) - rescueHeld(state)) < order.quantity)
        throw new DomainError('Catat produksi terlebih dahulu.');
      order.status = preparing ? 'preparing' : 'ready';
      log(state, user, preparing ? 'Pesanan disiapkan' : 'Pesanan siap', order.code, now);
      break;
    }
    case 'scan_pickup': {
      requireRole(user, ['seller']);
      const token = text(action.token, 200);
      if (!/^[A-Za-z0-9_-]{43}$/.test(token)) throw new DomainError('QR tidak valid. Pindai QR pembayaran pada tiket.');
      const order = state.orders.find(o => o.pickupToken === token);
      const claim = state.claims.find(c => c.pickupToken === token);
      const ticket = order ?? claim;
      if (!ticket) throw new DomainError('QR tidak ditemukan di gerai ini.', 404);
      if (ticket.status === 'picked_up') throw new DomainError('QR sudah digunakan. Pesanan sudah diproses.', 409);
      if (ticket.paymentStatus !== 'paid' || ticket.status !== 'ready') throw new DomainError('Pesanan harus sudah dibayar dan siap sebelum diambil.', 409);
      if (ticket.outletId !== user.outletId) throw new DomainError('QR ini untuk gerai lain.', 403);
      const slot = order && state.slots.find(s => s.id === order.slotId);
      if (slot && now < Date.parse(slot.start)) throw new DomainError('Slot pengambilan belum dimulai.');
      if ((order ? stock(state) - rescueHeld(state) : stock(state)) < ticket.quantity) throw new DomainError('Stok fisik tidak mencukupi. Periksa pencatatan stok.');
      reference = ticket.id;
      ticket.status = 'picked_up';
      ticket.pickedUpAt = iso(now);
      log(state, user, claim ? 'Promo Terbatas diambil' : 'Pengambilan pesanan', `${ticket.code} · ${ticket.quantity} porsi`, now);
      break;
    }
    case 'record_production': {
      requireRole(user, ['seller']);
      const quantity = integer(action.quantity, 'Produksi', 1, 500);
      if (state.produced + quantity > state.capacity)
        throw new DomainError(
          `Total produksi melampaui kapasitas ${state.capacity} porsi. Ubah kapasitas dengan alasan terlebih dahulu.`,
        );
      state.produced += quantity;
      log(state, user, 'Produksi aktual', `+${quantity} porsi matang`, now);
      break;
    }
    case 'record_walkin': {
      requireRole(user, ['seller']);
      const quantity = integer(action.quantity, 'Jumlah walk-in', 1, 100);
      if (availableStock(state) < quantity)
        throw new DomainError(
          'Stok bebas tidak cukup. Stok pesanan dan Promo Terbatas tetap dicadangkan.',
        );
      const price =
        action.price === undefined
          ? state.menu.prices.regular
          : integer(action.price, 'Harga', 0, 1000000);
      state.walkin += quantity;
      state.walkinRevenue += quantity * price;
      log(state, user, 'Penjualan walk-in', `${quantity} porsi`, now);
      break;
    }
    case 'override_plan': {
      requireRole(user, ['seller']);
      const reason = requireReason(action.reason);
      const originalTarget = recommendation(state).target;
      if (action.capacity !== undefined)
        state.capacity = integer(
          action.capacity,
          'Kapasitas',
          Math.max(state.produced, preorderHeld(state)),
          500,
        );
      if (action.buffer !== undefined)
        state.buffer = integer(action.buffer, 'Buffer', 0, 50);
      if (action.manualBaseline !== undefined)
        state.manualBaseline = integer(
          action.manualBaseline,
          'Baseline walk-in',
          0,
          500,
        );
      const target = integer(
        action.target,
        'Target produksi',
        Math.min(state.capacity, preorderHeld(state)),
        state.capacity,
      );
      state.override = { target, reason, at: iso(now), originalTarget };
      log(
        state,
        user,
        'Penyesuaian rencana',
        `Target ${target} porsi · ${reason}`,
        now,
      );
      break;
    }
    case 'accept_plan': {
      requireRole(user, ['seller']);
      const target = recommendation(state).target;
      if (action.target !== undefined && action.target !== target)
        throw new DomainError(
          'Saran telah berubah. Muat ulang sebelum menerima rencana.',
        );
      state.acceptedPlan = { target, at: iso(now) };
      delete state.override;
      log(
        state,
        user,
        'Rencana diterima',
        `Target ${target} porsi · stok belum berubah`,
        now,
      );
      break;
    }
    case 'save_menu': {
      requireRole(user, ['seller']);
      if (action.name !== undefined) {
        const name = text(action.name, 100);
        if (name.length < 3)
          throw new DomainError('Nama menu sedikitnya 3 karakter.');
        state.menu.name = name;
      }
      if (action.outlet !== undefined) {
        const outlet = text(action.outlet, 100);
        if (!outlet) throw new DomainError('Isi nama gerai.');
        state.menu.outlet = outlet;
      }
      if (action.location !== undefined) {
        const location = text(action.location, 150);
        if (!location) throw new DomainError('Isi lokasi gerai.');
        state.menu.location = location;
      }
      if (action.description !== undefined)
        state.menu.description = text(action.description, 500);
      if (typeof action.active === 'boolean') state.menu.active = action.active;
      if (action.smallPrice !== undefined)
        state.menu.prices.small = integer(
          action.smallPrice,
          'Harga porsi kecil',
          0,
          1000000,
        );
      if (action.regularPrice !== undefined)
        state.menu.prices.regular = integer(
          action.regularPrice,
          'Harga porsi reguler',
          0,
          1000000,
        );
      if (action.variableCost !== undefined)
        state.menu.variableCost = integer(
          action.variableCost,
          'Biaya variabel per porsi',
          0,
          1000000,
        );
      if (Array.isArray(action.allergens))
        state.menu.allergens = action.allergens
          .filter((a) => typeof a === 'string')
          .map((a) => text(a, 50))
          .slice(0, 10);
      if (
        state.menu.active &&
        (!state.menu.description ||
          state.menu.prices.small <= 0 ||
          state.menu.prices.regular <= 0)
      )
        throw new DomainError(
          'Lengkapi deskripsi dan harga positif sebelum membuka menu.',
        );
      log(state, user, 'Perubahan menu', state.menu.name, now);
      break;
    }
    case 'save_slot': {
      requireRole(user, ['seller']);
      const slot = state.slots.find((s) => s.id === action.slotId);
      if (!slot) throw new DomainError('Slot tidak ditemukan.');
      const occupied = sum(
        state.orders.filter(
          (o) =>
            o.slotId === slot.id &&
            !['cancelled', 'expired', 'no_show'].includes(o.status),
        ),
        (o) => o.quantity,
      );
      slot.capacity = integer(
        action.capacity,
        'Kapasitas slot',
        Math.max(1, occupied),
        500,
      );
      if (action.cutoff !== undefined) {
        const cutoff = new Date(String(action.cutoff)).getTime();
        if (!Number.isFinite(cutoff) || cutoff > new Date(slot.start).getTime())
          throw new DomainError('Batas pesan harus sebelum waktu pengambilan.');
        slot.cutoff = iso(cutoff);
      }
      log(
        state,
        user,
        'Perubahan slot',
        `${slot.label} · ${slot.capacity} porsi`,
        now,
      );
      break;
    }
    case 'publish_rescue': {
      requireRole(user, ['seller']);
      const quantity = integer(action.quantity, 'Porsi Promo Terbatas', 1, 100);
      if (action.foodChecked !== true)
        throw new DomainError(
          'Periksa kelayakan pangan dan konfirmasikan sebelum menerbitkan Promo Terbatas.',
        );
      if (availableStock(state) < quantity)
        throw new DomainError(
          'Promo Terbatas hanya boleh memakai stok matang yang belum dicadangkan.',
        );
      const expiresAt = action.expiresAt
        ? new Date(String(action.expiresAt)).getTime()
        : now +
          integer(action.durationMinutes ?? 60, 'Durasi Promo Terbatas', 5, 180) *
            60000;
      if (
        !Number.isFinite(expiresAt) ||
        expiresAt <= now ||
        expiresAt > now + 3 * 3600000
      )
        throw new DomainError(
          'Batas pengambilan Promo Terbatas harus 1–180 menit dari sekarang.',
        );
      const price = integer(
        action.price ?? 10000,
        'Harga Promo Terbatas',
        0,
        state.menu.prices.regular,
      );
      state.rescues.unshift({
        outletId: state.menu.outletId,
        id: randomUUID(),
        allergens: [...state.menu.allergens],
        menuId: state.menu.id,
        menuName: state.menu.name,
        description:
          text(action.description, 300) ||
          'Makanan matang yang telah diperiksa gerai. Ambil sebelum batas waktu.',
        quantity,
        available: quantity,
        price,
        originalPrice: state.menu.prices.regular,
        expiresAt: iso(expiresAt),
        publishedAt: iso(now),
        foodChecked: true,
        active: true,
      });
      log(
        state,
        user,
        'Promo Terbatas diterbitkan',
        `${quantity} porsi · layak diperiksa gerai`,
        now,
      );
      break;
    }
    case 'close_rescue': {
      requireRole(user, ['seller']);
      const batch = state.rescues.find(
        (r) => r.id === action.batchId && r.active,
      );
      if (!batch) throw new DomainError('Promo Terbatas sudah ditutup.');
      const reason = requireReason(action.reason);
      batch.active = false;
      for (const claim of state.claims)
        if (claim.batchId === batch.id && active(claim.status)) {
          claim.status = 'cancelled';
          refund(claim, mode);
        }
      log(
        state,
        user,
        'Promo Terbatas ditutup gerai',
        `${batch.menuName} · ${reason}`,
        now,
      );
      break;
    }
    case 'claim_rescue': {
      requireRole(user, ['student']);
      const batch = state.rescues.find(
        (r) => r.id === action.batchId && r.active,
      );
      const quantity = integer(action.quantity ?? 1, 'Jumlah Promo Terbatas', 1, 2);
      if (
        !batch ||
        !batch.foodChecked ||
        new Date(batch.expiresAt).getTime() <= now ||
        batchAvailable(state, batch) < quantity
      )
        throw new DomainError(
          'Promo Terbatas sudah habis, belum lolos pemeriksaan, atau batas ambil sudah lewat.',
        );
      if (
        state.claims.some(
          (c) =>
            c.userId === user.id && c.batchId === batch.id && active(c.status),
        )
      )
        throw new DomainError(
          'Kamu sudah memiliki klaim aktif untuk penawaran ini.',
        );
      state.claims.unshift({
        id: randomUUID(),
        serviceDate: state.businessDate,
        outletName: state.menu.outlet,
        pickupLocation: state.menu.location,
        code: newCode(state, 'RS'),
        userId: user.id,
        customer: customerName(action.customer, user),
        batchId: batch.id,
        note: text(action.note, 200),
        menuName: batch.menuName,
        quantity,
        price: batch.price,
        status: 'pending_payment',
        outletId: state.menu.outletId,
        fulfillment: fulfillment(action.fulfillment),
        paymentStatus: 'pending',
        paymentMethod: paymentMethod(action.paymentMethod),
        paymentExpiresAt: iso(Math.min(now + 15 * 60000, Date.parse(batch.expiresAt))),
        createdAt: iso(now),
        expiresAt: batch.expiresAt,
      });
      log(
        state,
        user,
        'Promo Terbatas dicadangkan',
        `${quantity} porsi · belum dihitung sebagai pengambilan`,
        now,
      );
      break;
    }
    case 'cancel_rescue': {
      requireRole(user, ['student']);
      const claim = state.claims.find(
        (c) => c.id === action.claimId && c.userId === user.id,
      );
      if (!claim || !['pending_payment', 'confirmed'].includes(claim.status))
        throw new DomainError('Klaim sudah diproses atau kedaluwarsa.');
      claim.status = 'cancelled';
      refund(claim, mode);
      log(state, user, 'Promo Terbatas dibatalkan', claim.code, now);
      break;
    }
    case 'record_waste':
    case 'record_internal': {
      requireRole(user, ['seller']);
      const quantity = integer(action.quantity, 'Jumlah porsi', 1, 500);
      const reason = requireReason(action.reason);
      if (availableStock(state) < quantity)
        throw new DomainError(
          'Stok bebas tidak cukup. Selesaikan atau lepaskan cadangan terlebih dahulu.',
        );
      if (action.type === 'record_waste') {
        if (
          typeof action.weightKg !== 'number' ||
          !Number.isFinite(action.weightKg) ||
          action.weightKg <= 0 ||
          action.weightKg > 500
        )
          throw new DomainError(
            'Masukkan berat hasil penimbangan dalam kilogram.',
          );
        state.waste += quantity;
        state.wasteKg =
          Math.round((state.wasteKg + action.weightKg) * 1000) / 1000;
      } else state.internal += quantity;
      log(
        state,
        user,
        action.type === 'record_waste'
          ? 'Food waste ditimbang'
          : 'Konsumsi internal',
        `${quantity} porsi · ${reason}`,
        now,
      );
      break;
    }
    case 'reconcile': {
      requireRole(user, ['seller']);
      if ([...state.orders, ...state.claims].some(ticket => ticket.paymentStatus === 'refund_pending')) throw new DomainError('Konfirmasikan pengembalian tunai yang tertunda sebelum menutup sesi.');
      if (
        state.orders.some((o) => active(o.status)) ||
        state.claims.some((c) => active(c.status))
      )
        throw new DomainError(
          'Selesaikan pengambilan atau tunggu pesanan/klaim kedaluwarsa sebelum menutup sesi.',
        );
      if (action.internal !== undefined)
        state.internal = integer(
          action.internal,
          'Total konsumsi internal',
          0,
          500,
        );
      if (action.waste !== undefined)
        state.waste = integer(action.waste, 'Total porsi waste', 0, 500);
      if (action.wasteKg !== undefined) {
        if (
          typeof action.wasteKg !== 'number' ||
          !Number.isFinite(action.wasteKg) ||
          action.wasteKg < 0 ||
          action.wasteKg > 500
        )
          throw new DomainError(
            'Masukkan berat hasil penimbangan dalam kilogram.',
          );
        state.wasteKg = Math.round(action.wasteKg * 1000) / 1000;
      }
      if (
        (state.waste > 0 && state.wasteKg <= 0) ||
        (state.waste === 0 && state.wasteKg > 0)
      )
        throw new DomainError(
          'Cocokkan porsi makanan dibuang dengan berat hasil penimbangan.',
        );
      if (stock(state) < 0)
        throw new DomainError(
          'Total pengeluaran stok melampaui produksi. Periksa konsumsi internal dan waste.',
        );
      const endingStock = integer(
        action.endingStock,
        'Stok akhir aktual',
        0,
        500,
      );
      const difference = stock(state) - endingStock;
      state.endingStock = endingStock;
      state.closed = difference === 0;
      if (state.closed)
        state.rescues.forEach((r) => {
          r.active = false;
        });
      const entry: HistoricalSession = {
        id: state.sessionId ?? state.createdAt,
        date: state.businessDate,
        produced: state.produced,
        preorders: sum(
          state.orders.filter((o) => o.status === 'picked_up'),
          (o) => o.quantity,
        ),
        walkin: state.walkin,
        rescue: sum(
          state.claims.filter((c) => c.status === 'picked_up'),
          (c) => c.quantity,
        ),
        waste: state.waste,
        wasteKg: state.wasteKg,
        internal: state.internal,
        endingStock,
        difference,
        closed: state.closed,
      };
      const existing = state.history.findIndex((h) => h.id === entry.id);
      if (existing < 0) state.history.push(entry);
      else state.history[existing] = entry;
      log(
        state,
        user,
        state.closed
          ? 'Rekonsiliasi sesi lengkap'
          : 'Rekonsiliasi belum lengkap',
        `Stok akhir ${endingStock} porsi · selisih ${difference} · internal ${state.internal} · waste ${state.waste} porsi/${state.wasteKg} kg`,
        now,
      );
      break;
    }
    case 'reset_demo':
      throw new DomainError('Reset ditangani penyimpanan demo.');
    default:
      throw new DomainError('Tindakan tidak dikenali.');
  }
  if (stock(state) < 0)
    throw new DomainError('Transaksi ditolak karena stok akan negatif.', 409);
  if (action.type !== 'start_session') {
    const movement = (type: StockMovement['type'], quantity: number) => {
      if (!quantity) return;
      (state.movements ??= []).push({
        id: randomUUID(),
        type,
        quantity,
        sessionId: state.sessionId ?? state.createdAt,
        reference: reference || state.logs[0]?.id || randomUUID(),
        actor: user.id,
        at: iso(now),
      });
    };
    if (action.type === 'reconcile') {
      movement('reconciliation_correction', beforeInternal - state.internal);
      movement('reconciliation_correction', beforeWaste - state.waste);
    } else {
      const kinds: Record<string, StockMovement['type']> = {
        record_production: 'production_confirmed',
        pickup_order: 'preorder_pickup',
        record_walkin: 'walkin_sale',
        pickup_rescue: 'rescue_pickup',
        record_internal: 'internal',
        record_waste: 'waste',
        scan_pickup: state.claims.some(c => c.id === reference) ? 'rescue_pickup' : 'preorder_pickup',
      };
      if (kinds[action.type])
        movement(kinds[action.type], stock(state) - beforeStock);
    }
  }
  if (key)
    state.idempotency = [...state.idempotency.slice(-999), `${user.id}:${key}`];
  return state;
}
