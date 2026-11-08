'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  ArrowDown, ArrowRight, ArrowUpRight, Check, CheckCheck, ChevronRight,
  CircleCheck, Clock3, Copy, CreditCard, Leaf, MapPin, Minus, Plus,
  QrCode, ReceiptText, Search, ShieldCheck, ShoppingBag, Sprout, Store,
  Ticket, Utensils, Wallet, X,
} from 'lucide-react';
import { useApp } from '@/components/provider';
import { Badge, Button, EmptyState, Field, Modal, SectionHeading, Stat } from '@/components/ui';
import { clock, rupiah, statusNames, type Order, type Portion, type RescueClaim } from '@/lib/domain';
import './student.css';

type Purchase = Order | RescueClaim;
type PaymentMethod = 'qris' | 'ewallet' | 'bank_transfer' | 'cash';
type CheckoutSelection = { kind: 'menu'; id: string } | { kind: 'promo'; id: string };
type TicketSelection = { id: string; promo: boolean };
const activeStatuses = ['pending_payment', 'confirmed', 'preparing', 'ready'];
const paymentNames: Record<PaymentMethod, string> = {
  qris: 'QRIS', ewallet: 'E-wallet', bank_transfer: 'Transfer bank', cash: 'Bayar di gerai',
};
const dateLabel = (date: string) => new Intl.DateTimeFormat('id-ID', {
  timeZone: 'Asia/Jakarta', day: 'numeric', month: 'long',
}).format(new Date(date));

function MenuArt({ name, category = '', index = 0, compact = false }: { name: string; category?: string; index?: number; compact?: boolean }) {
  const text = `${name} ${category}`.toLowerCase();
  const drink = /minum|teh|kopi|jus|cokelat|jeruk|matcha/.test(text);
  const noodle = /mie|mi |bakso|soto|ramen|bihun/.test(text);
  const greens = /sayur|gado|pecel|salad|vege/.test(text);
  const snack = /roti|pisang|tahu|tempe|snack|camilan|kentang/.test(text) && !/nasi/.test(text);
  const palette = ['#e9edda', '#f4e3cf', '#e1ebe6', '#f1e5d9', '#e8e6d9', '#eee5cf'];
  return <div className={`market-food-art ${compact ? 'art-compact' : ''}`} style={{ backgroundColor: palette[index % palette.length] }}>
    <svg viewBox="0 0 340 230" role="img" aria-label={`Ilustrasi ${name}`}>
      <ellipse cx="174" cy="194" rx={drink ? 61 : 115} ry="15" fill="#294e3720" />
      {drink ? <g>
        <path d="M127 56h88l-11 128q-34 19-66 0z" fill="#fffdf1" stroke="#c6cbb4" strokeWidth="3" />
        <path d="M134 93h74l-8 88q-29 13-58 0z" fill={/kopi|cokelat/.test(text) ? '#986647' : /teh/.test(text) ? '#c38b3d' : '#b8ce70'} />
        <path d="m181 17-10 113" stroke="#476a46" strokeWidth="8" strokeLinecap="round" />
        <ellipse cx="171" cy="58" rx="44" ry="8" fill="#f5f0df" stroke="#c6cbb4" strokeWidth="3" />
        <path d="m181 17-4 43" stroke="#476a46" strokeWidth="8" strokeLinecap="round" />
        <rect x="144" y="100" width="20" height="18" rx="5" fill="#fff" opacity=".55" transform="rotate(13 154 109)" />
        <rect x="176" y="127" width="21" height="18" rx="5" fill="#fff" opacity=".4" transform="rotate(-17 186 136)" />
        <path d="M103 174q-11-30-36-22 12 29 36 22" fill="#688a4b" /><path d="M231 175q12-25 35-16-15 23-35 16" fill="#8fa85b" />
      </g> : <g>
        <ellipse cx="170" cy="128" rx="120" ry="73" fill="#c6cfb7" /><ellipse cx="170" cy="121" rx="120" ry="73" fill="#faf9ef" /><ellipse cx="170" cy="121" rx="100" ry="58" fill="#e8e9d6" />
        {noodle ? <g>
          <ellipse cx="171" cy="120" rx="86" ry="48" fill="#b78945" />
          {Array.from({ length: 9 }, (_, i) => <path key={i} d={`M${105 + i * 4} ${89 + i * 5}q30-19 61 3t57 1`} fill="none" stroke={i % 2 ? '#e5bf65' : '#f3d992'} strokeWidth="6" strokeLinecap="round" />)}
          <circle cx="125" cy="112" r="19" fill="#af8860" /><circle cx="155" cy="91" r="18" fill="#bb936c" /><circle cx="182" cy="131" r="22" fill="#fffdf0" /><circle cx="182" cy="131" r="11" fill="#e7ad40" /><path d="m215 98 20 10-12 19-20-12z" fill="#51714a" />
        </g> : snack ? <g>
          {[0, 1, 2, 3, 4].map((n) => <g key={n} transform={`translate(${100 + (n % 3) * 42} ${86 + Math.floor(n / 3) * 38}) rotate(${n % 2 ? -12 : 10} 20 14)`}><rect width="51" height="31" rx="9" fill={n % 2 ? '#d8a64d' : '#c58b3b'} /><path d="m8 10 30 3M12 20l25 2" stroke="#ecc87c" strokeWidth="3" strokeLinecap="round" /></g>)}
          <ellipse cx="230" cy="127" rx="22" ry="17" fill="#fff7e4" /><ellipse cx="230" cy="126" rx="15" ry="11" fill="#ac4f30" />
        </g> : <g>
          <path d="M88 130q1-58 58-58 57 0 60 58-54 34-118 0" fill="#fffdf0" />
          {Array.from({ length: 15 }, (_, i) => <path key={i} d={`m${108 + ((i * 19) % 76)} ${91 + ((i * 11) % 40)} 5 2`} stroke="#dedbc4" strokeWidth="2.3" strokeLinecap="round" />)}
          {greens ? <g>{[0, 1, 2, 3, 4].map((n) => <ellipse key={n} cx={192 + (n % 3) * 22} cy={104 + Math.floor(n / 3) * 24} rx="23" ry="15" fill={n % 2 ? '#8da75b' : '#5e854e'} transform={`rotate(${n * 18} ${192 + (n % 3) * 22} ${104 + Math.floor(n / 3) * 24})`} />)}<path d="m180 95 58 35m-49-13 40 25" stroke="#d5aa63" strokeWidth="8" strokeLinecap="round" /></g> : <g><path d="M189 83q41-8 56 21 13 25-16 39-29 13-48-10-16-23 8-50" fill={/rendang|sapi/.test(text) ? '#84553b' : '#b9783c'} /><path d="m195 95 30 10m-35 8 36 10m-29 4 20 6" stroke="#dda461" strokeWidth="5" strokeLinecap="round" /></g>}
          <path d="M119 150q-5-21 14-24 16-14 25 4 24-8 22 15-23 23-61 5" fill="#648c4f" /><path d="m136 145 25-4" stroke="#a4bb77" strokeWidth="3" strokeLinecap="round" /><ellipse cx="219" cy="151" rx="18" ry="13" fill="#dce6a8" /><ellipse cx="219" cy="151" rx="10" ry="7" fill="#b2c17a" /><ellipse cx="242" cy="143" rx="15" ry="12" fill="#bc5841" /><ellipse cx="242" cy="143" rx="8" ry="6" fill="#e69a76" />
        </g>}
      </g>}
      <path d="M281 61q-2 19-19 21 0-17 19-21" fill="#8da56a" /><path d="m272 72 9-11" stroke="#58724b" strokeWidth="1.5" /><circle cx="69" cy="65" r="3" fill="#be8c57" /><circle cx="290" cy="156" r="3" fill="#be8c57" />
    </svg>
    {!compact && <span className="market-art-caption">Ilustrasi penyajian</span>}
  </div>;
}

function PickupQR({ token }: { token: string }) {
  const [data, setData] = useState('');
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let mounted = true;
    setData(''); setFailed(false);
    void import('qrcode').then((qr) => qr.toDataURL(token, { width: 300, margin: 2, errorCorrectionLevel: 'M', color: { dark: '#173d35', light: '#ffffff' } })).then((url) => { if (mounted) setData(url); }).catch(() => { if (mounted) setFailed(true); });
    return () => { mounted = false; };
  }, [token]);
  return <div className="market-qr-frame">{data ? <Image data-testid="pickup-qr" src={data} alt="QR pengambilan pesanan. Tunjukkan ke gerai saat mengambil." width={240} height={240} unoptimized /> : <div className="market-qr-loading" role="status"><QrCode size={42} /><span>{failed ? 'QR belum dapat dimuat. Gunakan kode di bawah.' : 'Menyiapkan QR pengambilan…'}</span></div>}</div>;
}

export function StudentDashboard({ tab }: { tab: string }) {
  const { state, action, busy, toast, refresh, refreshing } = useApp();
  const reduced = useReducedMotion();
  const [checkout, setCheckout] = useState<CheckoutSelection | null>(null);
  const [portion, setPortion] = useState<Portion>('regular');
  const [quantity, setQuantity] = useState(1);
  const [slotId, setSlotId] = useState('asap');
  const [fulfillment, setFulfillment] = useState<'dine_in' | 'pick_up'>('pick_up');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('qris');
  const [customer, setCustomer] = useState('');
  const [note, setNote] = useState('');
  const [search, setSearch] = useState('');
  const [outletFilter, setOutletFilter] = useState('all');
  const [orderFilter, setOrderFilter] = useState('all');
  const [details, setDetails] = useState<TicketSelection | null>(null);
  const [cancelTarget, setCancelTarget] = useState<TicketSelection | null>(null);
  const [localError, setLocalError] = useState('');
  const [lookup, setLookup] = useState<{ promo: boolean; known: string[] } | null>(null);
  const menus = useMemo(() => state?.menus ?? (state ? [state.menu] : []), [state]);
  const outlets = useMemo(() => [...new Map(menus.map((menu) => [menu.outletId ?? menu.outlet, { id: menu.outletId ?? menu.outlet, name: menu.outlet }])).values()], [menus]);
  const selectedPromo = checkout?.kind === 'promo' ? state?.rescues.find((item) => item.id === checkout.id) : undefined;
  const selectedMenu = checkout?.kind === 'menu' ? menus.find((item) => item.id === checkout.id) : selectedPromo ? menus.find((item) => item.id === selectedPromo.menuId) : undefined;
  const availableSlots = useMemo(() => (selectedMenu?.slots ?? state?.slots ?? []).filter((slot) => !slot.closed && slot.available > 0).sort((a, b) => a.start.localeCompare(b.start)), [selectedMenu, state?.slots]);
  const immediateStock = selectedMenu?.availableStock ?? Number.POSITIVE_INFINITY;
  const hasImmediateStock = immediateStock > 0;
  const selectedSlot = availableSlots.find((slot) => slot.id === slotId);
  const maxQuantity = selectedPromo ? Math.min(2, selectedPromo.available) : Math.min(5, fulfillment === 'dine_in' || slotId === 'asap' ? immediateStock : selectedSlot?.available ?? 0);
  const checkoutAvailable = selectedPromo ? selectedPromo.active && selectedPromo.foodChecked && maxQuantity > 0 : !!selectedMenu?.active && maxQuantity > 0;
  useEffect(() => { if (state?.user && !state.user.isGuest) setCustomer(state.user.name); }, [state?.user?.id, state?.user?.name, state?.user?.isGuest]);
  useEffect(() => { if (state?.mode === 'supabase') setPaymentMethod('cash'); }, [state?.mode]);
  useEffect(() => {
    if (!lookup || !state) return;
    const created = (lookup.promo ? state.claims : state.orders).find((entry) => !lookup.known.includes(entry.id));
    if (created) { setDetails({ id: created.id, promo: lookup.promo }); setLookup(null); }
  }, [state, lookup]);
  useEffect(() => {
    if (!checkout || !selectedMenu || selectedPromo) return;
    if (!hasImmediateStock && (fulfillment === 'dine_in' || slotId === 'asap')) {
      setFulfillment('pick_up');
      setSlotId(availableSlots[0]?.id ?? '');
    } else if (fulfillment === 'pick_up' && slotId !== 'asap' && !selectedSlot) {
      setSlotId(availableSlots[0]?.id ?? (hasImmediateStock ? 'asap' : ''));
    }
    if (maxQuantity > 0 && quantity > maxQuantity) setQuantity(maxQuantity);
  }, [checkout, selectedMenu, selectedPromo, hasImmediateStock, fulfillment, slotId, selectedSlot, availableSlots, maxQuantity, quantity]);
  if (!state) return null;
  const { orders, claims, slots, rescues } = state;
  const price = selectedPromo?.price ?? selectedMenu?.prices[portion] ?? 0;
  const allPurchases = [...orders.map((order) => ({ order, promo: false })), ...claims.map((order) => ({ order, promo: true }))].sort((a, b) => b.order.createdAt.localeCompare(a.order.createdAt));
  const activePurchases = allPurchases.filter(({ order }) => activeStatuses.includes(order.status));
  const currentTicket = details ? (details.promo ? claims : orders).find((order) => order.id === details.id) : undefined;
  const paid = currentTicket?.paymentStatus === 'paid';
  const ticketActive = !!currentTicket && activeStatuses.includes(currentTicket.status);
  const onlinePending = state.mode === 'demo' && !!currentTicket && currentTicket.paymentStatus === 'pending' && currentTicket.paymentMethod !== 'cash' && ticketActive;
  const promoOffers = rescues.filter((item) => item.active && item.available > 0 && new Date(item.expiresAt).getTime() > new Date(state.now).getTime());
  const filteredMenus = menus.filter((menu) => (outletFilter === 'all' || (menu.outletId ?? menu.outlet) === outletFilter) && `${menu.name} ${menu.outlet} ${menu.category} ${menu.tags.join(' ')}`.toLowerCase().includes(search.toLowerCase().trim()));
  const filteredOrders = allPurchases.filter(({ order }) => orderFilter === 'all' || (orderFilter === 'active' ? activeStatuses.includes(order.status) : !activeStatuses.includes(order.status)));
  const picked = orders.filter((order) => order.status === 'picked_up').reduce((sum, order) => sum + order.quantity, 0);
  const promoPicked = claims.filter((order) => order.status === 'picked_up').reduce((sum, order) => sum + order.quantity, 0);
  const canCancel = (order: Purchase) => {
    const menuSlots = 'menuId' in order ? menus.find((menu) => menu.id === order.menuId)?.slots ?? slots : slots;
    return ['pending_payment', 'confirmed'].includes(order.status) && (!('slotId' in order) || order.slotId === 'asap' || menuSlots.some((slot) => slot.id === order.slotId && new Date(slot.cutoff).getTime() > new Date(state.now).getTime()));
  };
  const openCheckout = (selection: CheckoutSelection) => {
    const menu = selection.kind === 'menu' ? menus.find((entry) => entry.id === selection.id) : undefined;
    const scheduledOnly = menu?.availableStock !== undefined && menu.availableStock <= 0;
    const firstSlot = (menu?.slots ?? slots).filter((slot) => !slot.closed && slot.available > 0).sort((a, b) => a.start.localeCompare(b.start))[0];
    setCheckout(selection); setQuantity(1); setPortion('regular'); setSlotId(scheduledOnly ? firstSlot?.id ?? '' : 'asap');
    if (scheduledOnly) setFulfillment('pick_up');
    setNote(''); setLocalError('');
  };
  const submitOrder = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!customer.trim()) { setLocalError('Isi nama pemesan agar gerai dapat mengenali pesananmu.'); return; }
    if (!selectedMenu || !checkout) return;
    if (!checkoutAvailable || quantity > maxQuantity) { setLocalError('Jumlah porsi melebihi stok atau kuota jadwal yang tersedia. Pilih jumlah atau waktu ambil lain.'); return; }
    if (!selectedPromo && !hasImmediateStock && (fulfillment === 'dine_in' || slotId === 'asap')) { setLocalError('Stok siap saji belum tersedia. Pilih Pick up dengan jadwal yang masih terbuka.'); return; }
    if (checkout.kind === 'menu' && fulfillment === 'pick_up' && slotId !== 'asap' && !availableSlots.some((slot) => slot.id === slotId)) { setLocalError('Waktu ambil sudah tidak tersedia. Pilih waktu lain.'); return; }
    const promo = checkout.kind === 'promo';
    const known = (promo ? claims : orders).map((order) => order.id);
    const payload = promo ? { type: 'claim_rescue', batchId: checkout.id, quantity, customer: customer.trim(), fulfillment, paymentMethod, note: note.trim() } : { type: 'preorder', menuId: selectedMenu.id, quantity, portion, slotId: fulfillment === 'dine_in' ? 'asap' : slotId, customer: customer.trim(), fulfillment, paymentMethod, note: note.trim() };
    if (await action(payload)) { setCheckout(null); setLookup({ promo, known }); toast(paymentMethod === 'cash' ? 'Pesanan dibuat. Bayar dan tunggu verifikasi gerai.' : 'Pesanan dibuat. Lanjutkan simulasi pembayaran.'); }
  };
  const copyToken = async (token: string) => { try { await navigator.clipboard.writeText(token); toast('Kode pengambilan disalin.'); } catch { toast('Kode belum dapat disalin. Tunjukkan QR kepada gerai.'); } };
  const cancelPurchase = async () => {
    if (!cancelTarget) return;
    if (await action({ type: cancelTarget.promo ? 'cancel_rescue' : 'cancel_order', [cancelTarget.promo ? 'claimId' : 'orderId']: cancelTarget.id })) { setCancelTarget(null); toast('Pesanan berhasil dibatalkan.'); }
  };
  const ticketStatus = currentTicket ? statusNames[currentTicket.status] : '';
  const progressIndex = currentTicket ? !paid ? 0 : ({ confirmed: 1, preparing: 2, ready: 3, picked_up: 4 } as Record<string, number>)[currentTicket.status] ?? 1 : 0;

  return <div className="marketplace">
    {tab === 'menu' && <>
      <div className="market-welcome"><div><p className="eyebrow">KANTIN KAMPUS, DALAM GENGGAMAN</p><h1>Mau makan apa hari ini<span>?</span></h1><p>Pilih menu favoritmu, tentukan cara menikmatinya.</p></div><div className="market-campus"><MapPin size={18} /><span>Kantin kampus<small>{dateLabel(state.businessDate)}</small></span></div></div>
      <section className="market-hero"><div className="market-hero-copy"><span className="market-overline"><Leaf size={14} /> PORSI PAS. HARI LEBIH LEPAS.</span><h2>Istirahat sebentar.<br />Makan yang benar.</h2><p>Dari dapur favoritmu, untuk jeda yang kamu tunggu. Pesan sekarang, ambil saat siap.</p><a className="button market-hero-button" href="#pilihan-menu">Cari makan siang <ArrowDown size={17} /></a><span className="market-hero-note"><Check size={14} /> Bisa pesan langsung tanpa akun</span></div><div className="market-hero-scene"><div className="market-hero-ring" /><Image src="/images/nasi-ayam.webp" alt="Ilustrasi nasi ayam rempah dengan sayuran dan sambal" width={540} height={540} priority /><span className="market-floating-label"><Utensils size={17} /><span>Selera kamu,<strong>porsi pilihanmu.</strong></span></span><span className="market-scene-note">Ilustrasi penyajian</span></div></section>
      {activePurchases.length > 0 && <Link className="market-active-callout" href="/mahasiswa?tab=orders"><span className="market-round-icon"><Ticket size={21} /></span><span><strong>{activePurchases.length} pesanan aktif</strong><small>Lihat pembayaran, status, dan QR pengambilanmu.</small></span><ArrowRight size={20} /></Link>}
      <section id="pilihan-menu" className="market-catalogue">
        <div className="market-section-top"><div><p className="eyebrow">DARI DAPUR PILIHANMU</p><h2>Temukan yang bikin lapar.</h2><p>{outlets.length} gerai · {menus.length} pilihan menu</p></div><label className="market-search"><Search size={19} /><input aria-label="Cari menu atau gerai" placeholder="Cari menu atau gerai…" value={search} onChange={(event) => setSearch(event.target.value)} />{search && <button type="button" aria-label="Hapus pencarian" onClick={() => setSearch('')}><X size={17} /></button>}</label></div>
        <div className="market-outlet-filters" role="group" aria-label="Pilih gerai"><button className={outletFilter === 'all' ? 'selected' : ''} aria-pressed={outletFilter === 'all'} onClick={() => setOutletFilter('all')}><Utensils size={15} /> Semua gerai <span>{outlets.length}</span></button>{outlets.map((outlet) => <button key={outlet.id} className={outletFilter === outlet.id ? 'selected' : ''} aria-pressed={outletFilter === outlet.id} onClick={() => setOutletFilter(outlet.id)}>{outlet.name}</button>)}</div>
        <div className="market-results-line" aria-live="polite"><span>{filteredMenus.length} menu {search ? `untuk “${search}”` : outletFilter !== 'all' ? 'dari gerai pilihanmu' : 'untuk kamu'}</span><Link href="/mahasiswa?tab=rescue"><Sprout size={15} /> Promo Terbatas <ArrowUpRight size={15} /></Link></div>
        <div className="market-menu-grid">{filteredMenus.map((menu) => { const index = menus.findIndex((item) => item.id === menu.id); const immediateAvailable = menu.availableStock === undefined || menu.availableStock > 0; const scheduledAvailable = (menu.slots ?? slots).some((slot) => !slot.closed && slot.available > 0); const available = menu.active && (immediateAvailable || scheduledAvailable); return <motion.article data-testid="menu-card" className="market-menu-card" key={menu.id} initial={false} whileHover={reduced ? undefined : { y: -4 }} transition={{ duration: .2 }}><div className="market-card-visual"><MenuArt name={menu.name} category={menu.category} index={index} /><span className="market-category">{menu.category}</span>{!available && <span className="market-unavailable">Sedang tidak tersedia</span>}</div><div className="market-card-copy"><span className="market-card-outlet"><Store size={13} />{menu.outlet}</span><h3>{menu.name}</h3>{available && !immediateAvailable && <span className="market-scheduled-label"><Clock3 size={13} /> Tersedia untuk Pick up terjadwal</span>}<p>{menu.description}</p><div className="market-menu-tags">{menu.tags.slice(0, 2).map((tag) => <span key={tag}>{tag}</span>)}</div><div className="market-card-bottom"><div><small>Mulai dari</small><strong>{rupiah(Math.min(menu.prices.small, menu.prices.regular))}</strong></div><Button data-testid="menu-order-button" onClick={() => openCheckout({ kind: 'menu', id: menu.id })} disabled={!available}>Pesan <Plus size={17} /></Button></div></div></motion.article>; })}</div>
        {!filteredMenus.length && <div className="market-empty"><EmptyState icon={Search} title="Belum ketemu yang kamu cari" description="Coba nama makanan atau pilih gerai lain." /><Button variant="secondary" onClick={() => { setSearch(''); setOutletFilter('all'); }}>Lihat semua menu</Button></div>}
      </section>
      <Link className="market-promo-strip" href="/mahasiswa?tab=rescue"><span className="market-promo-mark"><Sprout size={29} /></span><span><small>MASIH ENAK, HARGA LEBIH RINGAN</small><strong>Jangan lewatkan Promo Terbatas.</strong><p>Penawaran dari stok layak yang tersedia di gerai.</p></span><span className="market-promo-link">Lihat promo <ArrowUpRight size={19} /></span></Link>
    </>}

    {tab === 'orders' && <>
      <SectionHeading eyebrow="DARI PESAN SAMPAI SUAPAN PERTAMA" title="Pesananmu" level={1} description="Pembayaran, kabar dari dapur, dan tiket pengambilan." action={<Button variant="secondary" loading={refreshing} onClick={() => void refresh()}>Perbarui status</Button>} />
      <div className="market-order-filters" role="group" aria-label="Filter pesanan">{[['all', 'Semua pesanan'], ['active', `Aktif (${activePurchases.length})`], ['done', 'Riwayat']].map(([value, label]) => <button key={value} aria-pressed={orderFilter === value} className={orderFilter === value ? 'selected' : ''} onClick={() => setOrderFilter(value)}>{label}</button>)}</div>
      <div className="market-orders-grid">{filteredOrders.map(({ order, promo }) => { const menu = menus.find((item) => item.id === ('menuId' in order ? order.menuId : rescues.find((batch) => batch.id === order.batchId)?.menuId)); return <article data-testid="order-card" className={`market-order-card ${activeStatuses.includes(order.status) ? '' : 'market-order-complete'}`} key={order.id}><div className="market-order-head"><span><ReceiptText size={15} /> {order.code}</span><Badge tone={['cancelled', 'expired', 'no_show'].includes(order.status) ? 'orange' : order.status === 'picked_up' ? 'neutral' : 'green'}>{statusNames[order.status]}</Badge></div><div className="market-order-body"><MenuArt name={order.menuName} category={menu?.category} index={Math.max(0, menus.findIndex((item) => item.id === menu?.id))} compact /><div><small>{order.outletName ?? menu?.outlet}{promo ? ' · Promo Terbatas' : ''}</small><h3>{order.menuName}</h3><p>{order.quantity} porsi · {order.fulfillment === 'dine_in' ? 'Dine in' : 'Pick up'}</p><span><Clock3 size={13} />{'slotLabel' in order ? order.slotLabel : `Sebelum ${clock(order.expiresAt)}`}</span></div></div><div className="market-order-footer"><div><strong>{rupiah(order.price * order.quantity)}</strong><small>{order.paymentStatus === 'paid' ? <><CheckCheck size={13} /> Sudah dibayar</> : order.paymentStatus === 'refund_pending' ? 'Menunggu pengembalian dana' : order.paymentStatus === 'refunded' ? 'Pembayaran dikembalikan' : ['cancelled', 'expired'].includes(order.status) ? 'Pesanan ditutup' : order.paymentMethod === 'cash' ? 'Bayar di gerai' : 'Menunggu pembayaran'}</small></div><Button variant={order.paymentStatus === 'pending' && activeStatuses.includes(order.status) && order.paymentMethod !== 'cash' ? 'primary' : 'secondary'} onClick={() => setDetails({ id: order.id, promo })}>{order.paymentStatus === 'pending' && activeStatuses.includes(order.status) && order.paymentMethod !== 'cash' ? 'Bayar sekarang' : 'Lihat pesanan'}<ChevronRight size={16} /></Button></div></article>; })}</div>
      {!filteredOrders.length && <div className="market-empty"><EmptyState icon={ShoppingBag} title={orderFilter === 'done' ? 'Belum ada riwayat pesanan' : 'Lapar? Mulai dari sini.'} description="Pesan makanan favoritmu. Tiket dan statusnya akan tersimpan di sesi ini." /><Link className="button button-primary" href="/mahasiswa">Cari makanan <ArrowRight size={17} /></Link></div>}
      <div className="market-info-note"><ShieldCheck size={19} /><p>Status diperbarui oleh gerai. Tunjukkan QR pengambilan setelah pembayaran diverifikasi.</p></div>
    </>}

    {tab === 'rescue' && <>
      <div className="market-promo-heading"><span><Sprout size={35} /></span><div><p className="eyebrow">PORSI TERBATAS, KESEMPATAN TERBAIK</p><h1>Masih enak.<br />Lebih hemat.</h1><p>Promo Terbatas dari stok layak yang tersedia. Pesan secukupnya dan ambil sebelum waktunya habis.</p></div></div>
      <div className="market-info-note"><ShieldCheck size={20} /><p>Gerai memeriksa kelayakan makanan. Perhatikan alergen dan batas waktu pengambilan pada setiap penawaran.</p></div>
      <div className="market-promo-grid">{promoOffers.map((offer) => { const menu = menus.find((item) => item.id === offer.menuId); const held = claims.some((claim) => claim.batchId === offer.id && activeStatuses.includes(claim.status)); return <article className="market-promo-card" key={offer.id}><div className="market-card-visual"><MenuArt name={offer.menuName} category={menu?.category} index={Math.max(0, menus.findIndex((item) => item.id === offer.menuId))} /><span className="market-promo-badge">{Math.max(0, Math.round((1 - offer.price / offer.originalPrice) * 100))}% lebih hemat</span></div><div className="market-card-copy"><span className="market-card-outlet"><Store size={13} />{menu?.outlet ?? state.menu.outlet}</span><h2>{offer.menuName}</h2><p>{offer.description}</p><div className="market-promo-meta"><span><Clock3 size={15} /> Ambil sebelum {clock(offer.expiresAt)} WIB</span><span><ShoppingBag size={15} /> {offer.available} porsi tersedia</span></div><div className="market-card-bottom"><div><del>{rupiah(offer.originalPrice)}</del><strong>{rupiah(offer.price)}</strong></div><Button disabled={!offer.foodChecked || held} onClick={() => openCheckout({ kind: 'promo', id: offer.id })}>{held ? 'Sudah dipesan' : !offer.foodChecked ? 'Menunggu pemeriksaan' : 'Pesan promo'}<ArrowRight size={16} /></Button></div></div></article>; })}</div>
      {!promoOffers.length && <div className="market-empty"><EmptyState icon={Leaf} title="Belum ada Promo Terbatas" description="Penawaran muncul saat gerai memiliki stok layak yang tersisa. Menu reguler tetap bisa kamu pesan." /><Link className="button button-secondary" href="/mahasiswa">Lihat menu hari ini <ArrowRight size={17} /></Link></div>}
      <p className="market-fine-print">Batas pengambilan membantu operasional gerai dan bukan jaminan keamanan makanan. Porsi baru tercatat diambil setelah gerai memvalidasi serah terima.</p>
    </>}

    {tab === 'impact' && <>
      <SectionHeading eyebrow="PILIHAN KECILMU, TERCATAT DI SINI" title="Loop baikmu" level={1} description="Ringkasan dari pesanan yang sudah kamu ambil." />
      <div className="market-impact-banner"><Sprout size={43} /><div><h2>Satu porsi.<br />Satu kebiasaan baik.</h2><p>Terima kasih sudah memesan secukupnya dan mengambil pesananmu.</p></div></div>
      <div className="stat-grid"><Stat label="Porsi reguler diambil" value={picked} note="Serah terima diverifikasi gerai" icon={Utensils} /><Stat label="Porsi promo diambil" value={promoPicked} note="Dari penawaran stok terbatas" icon={Sprout} /><Stat label="Pesanan aktif" value={activePurchases.length} note="Masih dalam proses" icon={Ticket} /></div>
      <div className="market-impact-note"><h3>Angkanya jelas, asalnya juga.</h3><p>Ringkasan ini berasal dari pesanan sesi kamu. Pesanan yang belum diambil, dibatalkan, atau kedaluwarsa tidak masuk hitungan porsi diambil.</p><div className="market-info-note"><Leaf size={20} /><p>Jumlah porsi tidak otomatis setara dengan makanan yang terhindar dari pembuangan. Berat sisa dicatat terpisah oleh gerai.</p></div></div>
    </>}

    <Modal open={!!checkout} onClose={() => setCheckout(null)} title={selectedPromo ? 'Pesan Promo Terbatas' : 'Pilihanmu, porsi pasmu'}>
      {selectedMenu && <form data-testid="checkout-form" className="market-checkout" onSubmit={(event) => void submitOrder(event)}>
        <div className="market-checkout-menu"><MenuArt name={selectedMenu.name} category={selectedMenu.category} index={Math.max(0, menus.findIndex((item) => item.id === selectedMenu.id))} compact /><div><span>{selectedMenu.outlet}</span><h3>{selectedPromo?.menuName ?? selectedMenu.name}</h3><small><MapPin size={12} /> {selectedMenu.location}</small></div></div>
        {!selectedPromo && !hasImmediateStock && <div className="market-checkout-availability" role="status"><Clock3 size={18} /><div><strong>{availableSlots.length ? 'Tersedia untuk Pick up terjadwal' : 'Menu sedang tidak tersedia'}</strong><p>{availableSlots.length ? 'Stok siap saji belum tersedia. Pilih jadwal ambil yang masih terbuka; gerai menyiapkan pesanan sesuai jadwal.' : 'Stok siap saji dan kuota jadwal sudah habis. Pilih menu lain atau tunggu pembaruan dari gerai.'}</p></div></div>}<Field label="Nama pemesan"><input required autoComplete="name" placeholder="Nama yang dipanggil di gerai" maxLength={80} value={customer} onChange={(event) => { setCustomer(event.target.value); setLocalError(''); }} /></Field>
        <fieldset className="market-fieldset"><legend>Mau dinikmati di mana?</legend><div className="market-choice-grid"><button type="button" disabled={!selectedPromo && !hasImmediateStock} aria-pressed={fulfillment === 'dine_in'} className={fulfillment === 'dine_in' ? 'selected' : ''} onClick={() => setFulfillment('dine_in')}><Utensils size={19} /><span>Dine in<small>Makan di kantin</small></span>{fulfillment === 'dine_in' && <Check size={17} />}</button><button type="button" aria-pressed={fulfillment === 'pick_up'} className={fulfillment === 'pick_up' ? 'selected' : ''} onClick={() => setFulfillment('pick_up')}><ShoppingBag size={19} /><span>Pick up<small>Ambil dan bawa</small></span>{fulfillment === 'pick_up' && <Check size={17} />}</button></div></fieldset>
        {!selectedPromo && <fieldset className="market-fieldset"><legend>Pilih ukuran porsi</legend><div className="market-portion-choices">{(['small', 'regular'] as Portion[]).map((value) => <button type="button" key={value} aria-pressed={portion === value} className={portion === value ? 'selected' : ''} onClick={() => setPortion(value)}><span>{selectedMenu.portionLabels[value]}<small>{value === 'small' ? 'Nasi lebih sedikit' : 'Porsi standar gerai'}</small></span><strong>{rupiah(selectedMenu.prices[value])}</strong>{portion === value && <Check size={16} />}</button>)}</div></fieldset>}
        <div className="market-quantity-row"><div><strong>Jumlah porsi</strong><small>Pesan secukupnya, nikmati semuanya.</small></div><div className="market-quantity-stepper"><button type="button" aria-label="Kurangi jumlah porsi" disabled={quantity <= 1} onClick={() => setQuantity((value) => value - 1)}><Minus size={17} /></button><output aria-live="polite">{quantity}</output><button type="button" aria-label="Tambah jumlah porsi" disabled={quantity >= maxQuantity} onClick={() => setQuantity((value) => value + 1)}><Plus size={17} /></button></div></div>
        <AnimatePresence initial={false}>{fulfillment === 'pick_up' && !selectedPromo && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: reduced ? 0 : .18 }}><Field label="Waktu ambil" hint="Sekarang, atau jadwalkan saat kamu senggang."><select value={slotId} onChange={(event) => { setSlotId(event.target.value); setLocalError(''); }}><option value="asap" disabled={!hasImmediateStock}>{hasImmediateStock ? 'Secepatnya · setelah gerai menyiapkan' : 'Secepatnya · stok siap saji belum tersedia'}</option>{availableSlots.map((slot) => <option value={slot.id} key={slot.id}>{slot.label} WIB · {slot.available} porsi tersedia</option>)}</select></Field></motion.div>}</AnimatePresence>
        {selectedPromo && <div className="market-checkout-deadline"><Clock3 size={17} /><span>Ambil sebelum <strong>{clock(selectedPromo.expiresAt)} WIB</strong></span></div>}
        <Field label="Catatan untuk gerai (opsional)"><textarea rows={2} maxLength={300} placeholder="Contoh: sambal dipisah, tanpa sendok plastik" value={note} onChange={(event) => setNote(event.target.value)} /></Field>
        {((selectedPromo?.allergens ?? selectedMenu.allergens).length > 0) && <p className="market-allergens"><ShieldCheck size={15} /><span>Alergen: {(selectedPromo?.allergens ?? selectedMenu.allergens).join(', ')}. Hubungi gerai untuk kebutuhan khusus.</span></p>}
        <fieldset className="market-fieldset"><legend>Pilih pembayaran</legend><div className="market-payment-choices">{(['qris', 'ewallet', 'bank_transfer', 'cash'] as PaymentMethod[]).map((method) => { const Icon = method === 'qris' ? QrCode : method === 'ewallet' ? Wallet : method === 'bank_transfer' ? CreditCard : Store; return <button type="button" key={method} disabled={state.mode !== 'demo' && method !== 'cash'} aria-pressed={paymentMethod === method} className={paymentMethod === method ? 'selected' : ''} onClick={() => setPaymentMethod(method)}><Icon size={19} /><span>{paymentNames[method]}</span>{paymentMethod === method && <CircleCheck size={17} />}</button>; })}</div><p className="market-demo-note">{state.mode === 'demo' ? 'DEMO · Pembayaran online memakai simulator, tanpa transaksi uang sungguhan. Pembayaran di gerai perlu diverifikasi penjual.' : 'Pembayaran online belum tersedia. Bayar di gerai, lalu penjual memverifikasi pembayaranmu.'}</p></fieldset>
        {localError && <p className="form-error" role="alert">{localError}</p>}
        <div className="market-checkout-total"><div><span>Total · {quantity} porsi</span><strong>{rupiah(price * quantity)}</strong></div><Button type="submit" loading={busy} disabled={!checkoutAvailable || quantity > maxQuantity}>{paymentMethod === 'cash' ? 'Buat pesanan' : 'Lanjut pembayaran'}<ArrowRight size={17} /></Button></div>
      </form>}
    </Modal>

    <Modal open={!!currentTicket} onClose={() => setDetails(null)} title={onlinePending ? 'Selesaikan pembayaran' : 'Status pesananmu'}>
      {currentTicket && <div data-testid="status-modal-content" className="market-ticket-detail">
        <div className="market-ticket-summary"><span><ReceiptText size={15} /> {currentTicket.code}</span><Badge tone={['cancelled', 'expired', 'no_show'].includes(currentTicket.status) ? 'orange' : 'green'}>{ticketStatus}</Badge></div>
        <div className="market-ticket-menu"><small>{currentTicket.outletName ?? menus.find((menu) => menu.id === ('menuId' in currentTicket ? currentTicket.menuId : rescues.find((offer) => offer.id === currentTicket.batchId)?.menuId))?.outlet}</small><h3>{currentTicket.menuName}</h3><p>{currentTicket.quantity} porsi · {currentTicket.fulfillment === 'dine_in' ? 'Dine in' : 'Pick up'} · {currentTicket.customer}</p></div>
        {onlinePending ? <div className="market-payment-view"><div className="market-demo-label">DEMO · SIMULATOR PEMBAYARAN</div><div className="market-payment-symbol">{currentTicket.paymentMethod === 'qris' ? <QrCode size={48} /> : currentTicket.paymentMethod === 'ewallet' ? <Wallet size={48} /> : <CreditCard size={48} />}</div><p className="market-payment-label">Total pembayaran {paymentNames[currentTicket.paymentMethod ?? 'qris']}</p><strong className="market-payment-amount">{rupiah(currentTicket.price * currentTicket.quantity)}</strong><p>{currentTicket.paymentMethod === 'qris' ? 'Kode QR pembayaran tidak diterbitkan pada demo ini.' : 'Tidak perlu membuka aplikasi pembayaran atau mentransfer uang.'} Gunakan tombol simulasi untuk melanjutkan.</p>{currentTicket.paymentExpiresAt && <span className="market-payment-expiry"><Clock3 size={14} /> Batas pembayaran {clock(currentTicket.paymentExpiresAt)} WIB</span>}<Button loading={busy} onClick={() => void action({ type: 'pay_order', [details?.promo ? 'claimId' : 'orderId']: currentTicket.id })}>Simulasikan pembayaran berhasil <Check size={17} /></Button><small>Simulasi hanya menandai pesanan ini sebagai dibayar.</small></div> : <>
          {ticketActive && <div className={`market-status-message status-${currentTicket.status}`} role="status"><span className={`market-status-indicator ${currentTicket.status === 'preparing' ? 'is-preparing' : ''}`}>{currentTicket.status === 'ready' ? <ShoppingBag size={24} /> : !paid ? <Wallet size={24} /> : currentTicket.status === 'preparing' ? <Utensils size={24} /> : <CircleCheck size={24} />}</span><div><h3>{!paid ? 'Menunggu verifikasi pembayaran' : currentTicket.status === 'preparing' ? 'Sedang disiapkan di dapur' : currentTicket.status === 'ready' ? 'Pesananmu sudah siap!' : 'Pesanan diterima gerai'}</h3><p>{!paid ? 'Bayar langsung di gerai. QR pengambilan muncul setelah penjual memverifikasi pembayaran.' : currentTicket.status === 'preparing' ? 'Gerai sedang menyiapkan makananmu. Status akan diperbarui oleh penjual.' : currentTicket.status === 'ready' ? 'Tunjukkan QR di bawah kepada gerai untuk mengambil pesanan.' : 'Pembayaran berhasil. Tunggu kabar berikutnya dari gerai.'}</p></div></div>}
          {['cancelled', 'expired', 'no_show', 'picked_up'].includes(currentTicket.status) && <div className="market-terminal-status"><span>{currentTicket.status === 'picked_up' ? <CheckCheck size={35} /> : <ReceiptText size={35} />}</span><h3>{currentTicket.status === 'picked_up' ? 'Selamat menikmati!' : ticketStatus}</h3><p>{currentTicket.status === 'picked_up' ? 'Pesanan sudah diserahkan dan diverifikasi oleh gerai.' : currentTicket.status === 'expired' ? 'Waktu pembayaran atau pengambilan sudah habis. Kamu bisa membuat pesanan baru.' : currentTicket.status === 'cancelled' ? 'Pesanan ini sudah dibatalkan.' : 'Pesanan tercatat tidak diambil oleh gerai.'}</p></div>}
          {(ticketActive || currentTicket.status === 'picked_up') && <ol className="market-status-steps" aria-label="Perjalanan pesanan">{['Pembayaran', 'Dikonfirmasi', 'Disiapkan', 'Siap diambil', 'Selesai'].map((label, index) => <li key={label} className={index < progressIndex ? 'complete' : index === progressIndex ? 'current' : ''} aria-current={index === progressIndex ? 'step' : undefined}><span>{index < progressIndex ? <Check size={11} /> : index + 1}</span><small>{label}</small></li>)}</ol>}
          {paid && ticketActive && currentTicket.pickupToken && <div className="market-pickup-ticket"><span className="market-qr-heading"><QrCode size={17} /> QR PENGAMBILAN</span><PickupQR token={currentTicket.pickupToken} /><h3>Tunjukkan, lalu nikmati.</h3><p>Pindai sekali di gerai untuk serah terima pesanan.</p><button className="market-copy-token" onClick={() => void copyToken(currentTicket.pickupToken!)}><span data-testid="pickup-token">{currentTicket.pickupToken}</span><Copy size={15} /><span className="sr-only">Salin kode pengambilan</span></button></div>}
        </>}
        <dl className="market-ticket-facts"><div><dt><MapPin size={15} /> Lokasi</dt><dd>{currentTicket.pickupLocation ?? state.menu.location}</dd></div><div><dt><Clock3 size={15} /> {'slotLabel' in currentTicket ? 'Waktu ambil' : 'Batas ambil'}</dt><dd>{'slotLabel' in currentTicket ? currentTicket.slotLabel : `${clock(currentTicket.expiresAt)} WIB`}</dd></div><div><dt><Wallet size={15} /> Pembayaran</dt><dd>{paymentNames[currentTicket.paymentMethod ?? 'cash']} · {paid ? 'Dibayar' : currentTicket.paymentStatus === 'refund_pending' ? 'Menunggu pengembalian dana' : currentTicket.paymentStatus === 'refunded' ? 'Dikembalikan' : 'Belum dibayar'}</dd></div><div className="market-ticket-grand-total"><dt>Total</dt><dd>{rupiah(currentTicket.price * currentTicket.quantity)}</dd></div></dl>
        {currentTicket.paymentStatus === 'refund_pending' && <div className="market-info-note"><Wallet size={18} /><p>Hubungi gerai. Status berubah setelah penjual mengonfirmasi uang sudah dikembalikan.</p></div>}
        {'note' in currentTicket && currentTicket.note && <div className="market-ticket-note"><small>Catatan untuk gerai</small><p>{currentTicket.note}</p></div>}
        {canCancel(currentTicket) ? <button className="market-cancel-link" onClick={() => setCancelTarget({ id: currentTicket.id, promo: !!details?.promo })}>Batalkan pesanan</button> : ticketActive ? <p className="market-fine-print">Pembatalan ditutup setelah pesanan disiapkan atau batas pemesanan terlewati. Hubungi gerai jika memerlukan bantuan.</p> : null}
      </div>}
    </Modal>
    <Modal open={!!cancelTarget} onClose={() => setCancelTarget(null)} title="Batalkan pesanan ini?">
      <div className="market-cancel-dialog"><span className="market-cancel-symbol"><ShoppingBag size={28} /></span><p>Pesanan akan dibatalkan dan stok dikembalikan ke gerai. Pembatalan hanya tersedia sebelum pesanan disiapkan dan sebelum batas pemesanan.</p><p className="market-demo-note">{state.mode === 'demo' ? 'Dalam demo, pembayaran yang sudah berhasil akan dicatat dikembalikan. Tidak ada transaksi uang sungguhan.' : 'Jika sudah membayar, hubungi gerai untuk pengembalian uang. Status akan menunggu konfirmasi penjual.'}</p><div><Button variant="secondary" onClick={() => setCancelTarget(null)}>Tetap pesan</Button><Button loading={busy} onClick={() => void cancelPurchase()}>Ya, batalkan</Button></div></div>
    </Modal>
  </div>;
}
