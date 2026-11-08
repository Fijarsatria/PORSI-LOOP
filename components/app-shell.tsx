'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  ChartNoAxesCombined,
  ClipboardCheck,
  Clock3,
  DoorOpen,
  FlaskConical,
  LayoutDashboard,
  Leaf,
  ListChecks,
  LogOut,
  NotebookPen,
  RefreshCw,
  Settings2,
  ShieldCheck,
  ShoppingBag,
  Sprout,
  Store,
  Ticket,
  Utensils,
  Wallet,
  ScanLine,
  type LucideIcon,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useApp } from '@/components/provider';
import { Brand, Badge, Button, Modal, PageLoading } from '@/components/ui';
import { StudentDashboard } from '@/components/student';
import { clock, roleNames, type Role } from '@/lib/domain';

const SellerDashboard = dynamic(
  () => import('@/components/operations').then((m) => m.SellerDashboard),
  { loading: () => <PageLoading /> },
);
const AdminDashboard = dynamic(
  () => import('@/components/operations').then((m) => m.AdminDashboard),
  { loading: () => <PageLoading /> },
);
const navs: Record<
  Role,
  { id: string; label: string; mobile?: string; icon: LucideIcon }[]
> = {
  student: [
    { id: 'menu', label: 'Jelajahi kantin', mobile: 'Menu', icon: Utensils },
    { id: 'orders', label: 'Pesananmu', mobile: 'Pesanan', icon: ShoppingBag },
    { id: 'rescue', label: 'Promo Terbatas', mobile: 'Promo', icon: Sprout },
    { id: 'impact', label: 'Loop baikmu', mobile: 'Jejakmu', icon: Leaf },
  ],
  seller: [
    { id: 'overview', label: 'Ringkasan', icon: LayoutDashboard },
    { id: 'orders', label: 'Pesanan & ambil', mobile: 'Pesanan', icon: Ticket },
    { id: 'scan', label: 'Scan QR', icon: ScanLine },
    { id: 'menu', label: 'Menu gerai', mobile: 'Menu', icon: Utensils },
    {
      id: 'planning',
      label: 'Rencana produksi',
      mobile: 'Rencana',
      icon: NotebookPen,
    },
  ],
  admin: [
    {
      id: 'overview',
      label: 'Ringkasan kantin',
      mobile: 'Ringkasan',
      icon: LayoutDashboard,
    },
    {
      id: 'finance',
      label: 'Penjualan & pemasukan',
      mobile: 'Penjualan',
      icon: Wallet,
    },
    { id: 'outlets', label: 'Gerai & akses', mobile: 'Gerai', icon: Store },
    {
      id: 'impact',
      label: 'Laporan dampak',
      mobile: 'Dampak',
      icon: ChartNoAxesCombined,
    },
    {
      id: 'ledger',
      label: 'Jejak pencatatan',
      mobile: 'Catatan',
      icon: ListChecks,
    },
  ],
};
const routes = { student: '/customer', seller: '/gerai', admin: '/pengelola' };

export function AppShell({ role }: { role: Role }) {
  const { state, loading, busy, logout, refresh, refreshing, toast, notices } =
    useApp();
  const [profile, setProfile] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const params = useSearchParams();
  const requestedTab = params.get('tab') || navs[role][0].id;
  const tab = navs[role].some((n) => n.id === requestedTab)
    ? requestedTab
    : navs[role][0].id;
  const active = navs[role].find((n) => n.id === tab)!;
  const base = routes[role];
  if (loading)
    return (
      <div className="app-loading-shell">
        <Brand />
        <PageLoading />
      </div>
    );
  if (!state?.user || state.user.role !== role)
    return (
      <main id="main" className="access-page">
        <Brand />
        <span className="empty-icon">
          <ShieldCheck size={32} />
        </span>
        <h1>
          {state?.user ? 'Ruang ini untuk peran berbeda.' : 'Masuk dulu, yuk.'}
        </h1>
        <p>
          {state?.user
            ? `Kamu sedang masuk sebagai ${roleNames[state.user.role].toLowerCase()}.`
            : 'Pesanan dan ruang kerjamu tersimpan sesuai akun yang kamu gunakan.'}
        </p>
        {state?.user && (
          <Link
            className="button button-primary"
            href={routes[state.user.role]}
          >
            Kembali ke ruangmu <ArrowRight size={18} />
          </Link>
        )}
        <Link
          className="button button-secondary"
          href={
            role === 'admin'
              ? '/akses-pengelola'
              : `/masuk${role === 'seller' ? '?peran=gerai' : ''}`
          }
        >
          Masuk sebagai {roleNames[role].toLowerCase()} <ArrowRight size={18} />
        </Link>
        <Link className="text-link" href="/#top">
          <ArrowLeft size={17} /> Kembali ke beranda
        </Link>
      </main>
    );
  const count =
    state.orders.filter((o) =>
      ['pending_payment', 'confirmed', 'preparing', 'ready'].includes(o.status),
    ).length +
    state.claims.filter((c) =>
      ['pending_payment', 'confirmed', 'preparing', 'ready'].includes(c.status),
    ).length;
  const nav = (mobile = false) =>
    navs[role].map((n) => (
      <Link
        key={n.id}
        href={`${base}${n.id === navs[role][0].id ? '' : `?tab=${n.id}`}`}
        className={`app-nav-link ${tab === n.id ? 'active' : ''} ${role === 'seller' && n.id === 'scan' ? 'nav-scan' : ''}`}
        aria-current={tab === n.id ? 'page' : undefined}
      >
        {tab === n.id && (
          <motion.span
            className="nav-highlight"
            layoutId={mobile ? 'mobile-nav' : 'sidebar-nav'}
            transition={{ type: 'spring', bounce: 0.13, duration: 0.45 }}
          />
        )}
        <n.icon size={mobile ? 21 : 19} />
        <span>{mobile ? n.mobile || n.label : n.label}</span>
        {n.id === 'orders' && count > 0 && (
          <span className="nav-count">{count}</span>
        )}
      </Link>
    ));
  return (
    <div className={`app-layout role-${role}`}>
      <aside className="app-sidebar">
        <Brand />
        <div className="workspace-name">
          <span>
            {role === 'student' ? (
              <Utensils size={20} />
            ) : role === 'seller' ? (
              <Store size={20} />
            ) : (
              <ShieldCheck size={20} />
            )}
          </span>
          <div>
            {role === 'student'
              ? 'Ruang customer'
              : role === 'seller'
                ? state.menu.outlet
                : 'Ruang pengelola'}
            <small>
              {role === 'student'
                ? 'Rencana makan siangmu'
                : state.mode === 'demo'
                  ? 'Kantin kampus · simulasi'
                  : state.menu.location}
            </small>
          </div>
        </div>
        <p className="sidebar-label">
          {role === 'student' ? 'HARI YANG LEBIH TERENCANA' : 'RUANG KERJAMU'}
        </p>
        <nav aria-label="Navigasi ruang kerja">{nav()}</nav>
        <div className="sidebar-note">
          <Leaf size={22} />
          <strong>
            Satu loop baik,
            <br />
            mulai dari kantin.
          </strong>
          <p>
            Rencanakan sebelum memasak.
            <br />
            Selamatkan bila tersisa.
          </p>
          <Link href="/tentang">
            Kenali PORSI LOOP <ArrowUpRightIcon />
          </Link>
        </div>
        <button className="sidebar-user" onClick={() => setProfile(true)}>
          <span className="avatar">{state.user.name.slice(0, 1)}</span>
          <span>
            <strong>{state.user.name}</strong>
            <small>
              {state.user.isGuest
                ? 'Tamu · tanpa wajib login'
                : roleNames[role]}
            </small>
          </span>
          <Settings2 size={17} />
        </button>
      </aside>
      <div className="app-main">
        <header className="app-topbar">
          <div className="mobile-app-brand">
            <Brand />
          </div>
          <div className="app-breadcrumb">
            <span>
              {role === 'student'
                ? 'Ruang customer'
                : role === 'seller'
                  ? 'Ruang gerai'
                  : 'Ruang pengelola'}
            </span>
            <span>/</span>
            <strong>{active.label}</strong>
          </div>
          <div className="app-topbar-actions">
            {role !== 'student' && (
              <Link
                className="button button-ghost work-shop-link"
                href="/customer"
              >
                <span className="work-shop-label">Belanja</span>{' '}
                <ShoppingBag size={16} />
              </Link>
            )}
            <span className="app-clock">
              <Clock3 size={15} />
              {clock(state.now)} WIB
            </span>
            <button
              className="icon-button"
              aria-label="Perbarui data"
              disabled={refreshing}
              onClick={async () => {
                if (await refresh()) toast('Data diperbarui.');
              }}
            >
              <RefreshCw
                size={18}
                className={refreshing ? 'spin' : undefined}
              />
            </button>
            <button
              className="icon-button notification-button"
              aria-label="Lihat notifikasi"
              onClick={() => setNotifications(true)}
            >
              <Bell size={20} />
              {(notices.length > 0 || count > 0) && <span />}
            </button>
            <button
              className="avatar mobile-avatar"
              onClick={() => setProfile(true)}
              aria-label="Buka profil"
            >
              {state.user.name.slice(0, 1)}
            </button>
          </div>
        </header>
        <div className="app-content">
          {state.mode === 'demo' && (
            <div className="demo-banner">
              <FlaskConical size={15} />
              <span>
                <strong>Mode simulasi</strong>
                <span className="demo-long">
                  {' '}
                  ·{' '}
                  {state.demoLabel ||
                    'Data contoh, bukan transaksi atau hasil pilot.'}
                </span>
              </span>
              <Link href="/tentang">
                Tentang data <ArrowUpRightIcon />
              </Link>
            </div>
          )}
          <AnimatePresence mode="wait" initial={false}>
            <motion.main
              id="main"
              key={`${role}-${tab}`}
              initial={{ opacity: 0, y: 9 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.16 }}
            >
              {role === 'student' ? (
                <StudentDashboard tab={tab} />
              ) : role === 'seller' ? (
                <SellerDashboard tab={tab} />
              ) : (
                <AdminDashboard tab={tab} />
              )}
            </motion.main>
          </AnimatePresence>
          <footer className="app-footer">
            <Brand compact />
            <span>Rencanakan. Nikmati. Teruskan.</span>
            <Link href="/tentang">Tentang & data</Link>
          </footer>
        </div>
      </div>
      <nav className="app-bottom-nav glass" aria-label="Navigasi seluler">
        {nav(true)}
      </nav>
      <Modal
        open={profile}
        onClose={() => setProfile(false)}
        title="Ruangmu di PORSI LOOP"
      >
        <div className="profile-card">
          <span className="avatar avatar-large">
            {state.user.name.slice(0, 1)}
          </span>
          <h3>{state.user.name}</h3>
          <Badge>{state.user.isGuest ? 'Sesi tamu' : roleNames[role]}</Badge>
          <p className="muted">
            {state.user.isGuest
              ? 'Pesanan tersimpan di browser ini. Simpan tiket QR sebelum menutup atau membersihkan browser.'
              : state.mode === 'demo'
                ? 'Akun demonstrasi. Aktivitas disimpan sebagai data simulasi di instalasi ini.'
                : state.user.email}
          </p>
          <Link className="button button-secondary full-width" href="/#top">
            Lihat beranda <ArrowRight size={17} />
          </Link>
          {state.user.isGuest && (
            <Link className="button button-secondary full-width" href="/masuk">
              Masuk dengan akun (opsional)
            </Link>
          )}
          {!state.user.isGuest && (
            <Button
              variant="ghost"
              loading={busy}
              onClick={async () => {
                if (await logout()) setProfile(false);
              }}
            >
              Keluar dari akun <LogOut size={17} />
            </Button>
          )}
        </div>
      </Modal>
      <Modal
        open={notifications}
        onClose={() => setNotifications(false)}
        title="Notifikasi pesanan"
      >
        <div className="stack">
          {notices.length > 0 ? (
            notices.map((message, index) => (
              <p className="callout" key={`${index}-${message}`}>
                <Bell size={18} />
                <span>{message}</span>
              </p>
            ))
          ) : (
            <p className="muted">
              Pembaruan pesanan akan muncul di sini. Data diperbarui otomatis
              selama halaman terbuka.
            </p>
          )}
          <div className="callout">
            <Clock3 size={22} />
            <div>
              <strong>
                {count ? `${count} pesanan aktif` : 'Belum ada pesanan aktif'}
              </strong>
              <p>
                {role === 'student'
                  ? 'Tunggu status siap, lalu tunjukkan QR ke gerai yang tertera pada tiket.'
                  : 'Pindai QR saat serah terima agar stok dan laporan tetap sesuai.'}
              </p>
            </div>
          </div>
          {role === 'seller' && (
            <div className="callout">
              <ClipboardCheck size={21} />
              <span>
                Catat konsumsi internal, berat makanan dibuang, dan stok akhir
                sebelum menutup sesi.
              </span>
            </div>
          )}
          <Button
            variant="secondary"
            onClick={async () => {
              if (!('Notification' in window)) {
                toast(
                  'Browser ini belum mendukung notifikasi perangkat. Pembaruan tetap muncul di halaman.',
                );
                return;
              }
              const permission = await Notification.requestPermission();
              toast(
                permission === 'granted'
                  ? 'Notifikasi perangkat aktif saat browser mendukungnya.'
                  : 'Pembaruan tetap tersedia di halaman pesanan.',
              );
            }}
          >
            <Bell size={17} /> Aktifkan notifikasi perangkat
          </Button>
          <Button onClick={() => setNotifications(false)}>
            Mengerti <CheckIcon />
          </Button>
        </div>
      </Modal>
    </div>
  );
}
function ArrowUpRightIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <path d="M7 17 17 7M7 7h10v10" />
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="m5 12 4 4 10-10" />
    </svg>
  );
}
