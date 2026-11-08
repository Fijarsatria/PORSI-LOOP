export type Role = 'student' | 'seller' | 'admin';
export type Portion = 'small' | 'regular';
export type OrderStatus = 'confirmed' | 'ready' | 'picked_up' | 'cancelled' | 'no_show' | 'expired';

export interface User {
  id: string;
  role: Role;
  name: string;
  email?: string;
}
export interface Menu {
  id: string;
  name: string;
  description: string;
  outlet: string;
  location: string;
  image: string;
  category: string;
  tags: string[];
  allergens: string[];
  prices: Record<Portion, number>;
  portionLabels: Record<Portion, string>;
  variableCost: number;
  active: boolean;
}
export interface Slot {
  id: string;
  label: string;
  start: string;
  end: string;
  cutoff: string;
  capacity: number;
  reserved: number;
  available: number;
  closed: boolean;
}
export interface Order {
  id: string;
  code: string;
  userId: string;
  customer: string;
  menuId: string;
  menuName: string;
  portion: Portion;
  quantity: number;
  price: number;
  slotId: string;
  slotLabel: string;
  status: OrderStatus;
  note: string;
  createdAt: string;
  pickedUpAt?: string;
}
export interface RescueBatch {
  id: string;
  menuId: string;
  menuName: string;
  description: string;
  quantity: number;
  available: number;
  price: number;
  originalPrice: number;
  expiresAt: string;
  publishedAt: string;
  foodChecked: boolean;
  active: boolean;
}
export interface RescueClaim {
  id: string;
  code: string;
  userId: string;
  customer: string;
  batchId: string;
  menuName: string;
  quantity: number;
  price: number;
  status: OrderStatus;
  createdAt: string;
  expiresAt: string;
  pickedUpAt?: string;
}
export interface Recommendation {
  preorders: number;
  walkinEstimate: number;
  walkinRange: [number, number];
  buffer: number;
  target: number;
  capacity: number;
  readyStock: number;
  toProduce: number;
  source: 'history' | 'manual';
  historyDays: number;
  accepted?: { target: number; at: string };
  override?: { target: number; reason: string; at: string; originalTarget?: number };
}
export interface StockMovement {
  id: string;
  type: 'opening_balance' | 'production_confirmed' | 'preorder_pickup' | 'walkin_sale' | 'rescue_pickup' | 'internal' | 'waste' | 'reconciliation_correction';
  quantity: number;
  reference: string;
  actor: string;
  at: string;
}
export interface AuditLog {
  id: string;
  action: string;
  detail: string;
  actor: string;
  at: string;
}
export interface Reconciliation {
  openingStock: number;
  produced: number;
  preorderPickedUp: number;
  walkin: number;
  rescuePickedUp: number;
  internal: number;
  waste: number;
  endingStock: number;
  difference: number;
  wasteKg: number;
  complete: boolean;
  recorded?: boolean;
}
export interface Metrics {
  stockouts: number;
  totalOrders: number;
  activeOrders: number;
  preorderPortions: number;
  produced: number;
  walkin: number;
  rescued: number;
  rescueReserved: number;
  stock: number;
  availableStock: number;
  waste: number;
  wasteKg: number;
  revenue: number;
  rescueRevenue: number;
  pickupRate: number;
  preorderEligible: number;
  noShow: number;
  completionRate: number;
}
export interface HistoricalSession {
  id?: string;
  endingStock?: number;
  internal?: number;
  difference?: number;
  date: string;
  produced: number;
  preorders: number;
  walkin: number;
  rescue: number;
  waste: number;
  wasteKg: number;
  closed: boolean;
}
export interface Snapshot {
  sessionId: string;
  movements: StockMovement[];
  user: User | null;
  mode: 'demo' | 'supabase';
  now: string;
  demoLabel: string | null;
  businessDate: string;
  menu: Menu;
  slots: Slot[];
  orders: Order[];
  rescues: RescueBatch[];
  claims: RescueClaim[];
  recommendation: Recommendation;
  metrics: Metrics;
  logs: AuditLog[];
  reconciliation: Reconciliation;
  history: HistoricalSession[];
}
export type Action = { type: string; idempotencyKey?: string; [key: string]: unknown };
export const roleNames: Record<Role, string> = { student: 'Mahasiswa', seller: 'Pemilik gerai', admin: 'Pengelola kantin' };
export const statusNames: Record<OrderStatus, string> = { confirmed: 'Terkonfirmasi', ready: 'Siap diambil', picked_up: 'Sudah diambil', cancelled: 'Dibatalkan', no_show: 'Tidak diambil', expired: 'Kedaluwarsa' };
export const rupiah = (amount: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount);
export const clock = (date: string) => new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' }).format(new Date(date));
