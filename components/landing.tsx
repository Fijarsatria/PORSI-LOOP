'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCheck,
  Clock3,
  Leaf,
  Menu as MenuIcon,
  ShoppingBag,
  Sprout,
  Store,
  Ticket,
  Utensils,
  X,
  ChartNoAxesCombined,
  CalendarClock,
  Plus,
  Minus,
} from 'lucide-react';
import { Brand, LinkButton } from '@/components/ui';

const roles = [
  {
    id: 'student',
    label: 'Untuk mahasiswa',
    icon: Utensils,
    title: 'Jam istirahatmu,\nbuat menikmati makan.',
    body: 'Lihat menu, pilih porsi yang pas, lalu tentukan waktu ambil. Datang ke gerai dengan kode pesananmu.',
    bullets: [
      'Pilihan porsi kecil atau reguler',
      'Slot pengambilan yang jelas',
      'Promo Terbatas makanan layak yang masih tersedia',
    ],
    action: 'Pilih makan siangmu',
    href: '/mahasiswa',
  },
  {
    id: 'seller',
    label: 'Untuk gerai',
    icon: Store,
    title: 'Masak dengan rencana.\nBukan kira-kira.',
    body: 'Satukan pesanan terjadwal dan perkiraan walk-in untuk merencanakan produksi. Catat yang benar-benar dimasak dan diserahkan.',
    bullets: [
      'Saran produksi dengan alasan yang terbuka',
      'Kuota, pesanan, dan stok dalam satu tempat',
      'Promo Terbatas dari stok layak yang benar-benar tersisa',
    ],
    action: 'Buka ruang gerai',
    href: '/masuk?peran=gerai',
  },
  {
    id: 'manager',
    label: 'Untuk pengelola kantin',
    icon: ChartNoAxesCombined,
    title: 'Lihat alurnya.\nPahami yang tersisa.',
    body: 'PORSI LOOP menyediakan sistem untuk kantin Anda. Pantau penjualan, penerimaan pembayaran, pesanan, dan operasional seluruh gerai dari satu ruang pengelola.',
    bullets: [
      'Ringkasan pengambilan dan no-show',
      'Rekonsiliasi produksi sampai stok akhir',
      'Berat sisa terukur per 100 porsi tersaji',
    ],
    action: 'Masuk sebagai pengelola kantin',
    href: '/akses-pengelola',
  },
];

export function PublicHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="public-header glass">
      <Brand />
      <nav aria-label="Navigasi utama" className="public-nav">
        <a href="/#cara-kerja">Cara kerja</a>
        <a href="/#satu-loop">Untuk siapa?</a>
        <a href="/#dampak">Kenapa PORSI?</a>
      </nav>
      <div className="header-actions">
        <Link href="/mahasiswa" className="header-login">
          Pilih menu <ArrowUpRight size={17} />
        </Link>
        <button
          className="icon-button mobile-menu"
          aria-label={open ? 'Tutup menu' : 'Buka menu'}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <MenuIcon />}
        </button>
      </div>
      <AnimatePresence>
        {open && (
          <motion.nav
            className="mobile-dropdown"
            aria-label="Navigasi seluler"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.18 }}
          >
            <a onClick={() => setOpen(false)} href="/#cara-kerja">
              Cara kerja <ArrowUpRight size={17} />
            </a>
            <a onClick={() => setOpen(false)} href="/#satu-loop">
              Untuk siapa? <ArrowUpRight size={17} />
            </a>
            <a onClick={() => setOpen(false)} href="/#dampak">
              Kenapa PORSI? <ArrowUpRight size={17} />
            </a>
            <Link href="/masuk?peran=gerai">
              Masuk sebagai gerai <Store size={17} />
            </Link>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}

export function PlateScene({ compact = false }: { compact?: boolean }) {
  const [small, setSmall] = useState(false);
  const [slot, setSlot] = useState(0);
  const reduced = useReducedMotion();
  return (
    <div className={`plate-scene ${compact ? 'plate-compact' : ''}`}>
      <div className="plate-aura" />
      <div className="orbit orbit-one" />
      <div className="orbit orbit-two" />
      <motion.div
        className="hero-plate"
        animate={{ scale: small ? 0.9 : 1, rotate: small ? -8 : 0 }}
        transition={
          reduced
            ? { duration: 0 }
            : { type: 'spring', stiffness: 90, damping: 18 }
        }
      >
        <Image
          src="/images/nasi-ayam.webp"
          alt="Ilustrasi sepiring nasi ayam panggang dengan lalapan dan sambal"
          width={1254}
          height={1254}
          priority
          sizes="(max-width: 700px) 92vw, 620px"
        />
      </motion.div>
      <div className="floating-leaf">
        <Leaf size={27} strokeWidth={1.7} />
      </div>
      <div className="food-label glass">
        <span className="live-dot" />
        Dibuat sesuai rencana.
      </div>
      <motion.div
        className="pickup-ticket glass"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <span className="ticket-icon">
          <CheckCheck size={19} />
        </span>
        <div>
          <small>Waktu ambil pilihanmu</small>
          <button
            className="ticket-time"
            aria-label="Ganti pratinjau waktu ambil"
            onClick={() => setSlot((s) => (s + 1) % 3)}
          >
            {['12.00 – 12.30', '12.30 – 13.00', '13.00 – 13.30'][slot]}
            <ArrowUpRight size={15} />
          </button>
        </div>
        <span className="ticket-divider" />
        <Ticket size={26} strokeWidth={1.4} />
      </motion.div>
      <div
        className="portion-switch glass"
        aria-label="Pratinjau pilihan porsi"
      >
        <span>Porsimu?</span>
        <button
          className={small ? 'selected' : ''}
          onClick={() => setSmall(true)}
          aria-pressed={small}
        >
          Kecil
        </button>
        <button
          className={!small ? 'selected' : ''}
          onClick={() => setSmall(false)}
          aria-pressed={!small}
        >
          Reguler
        </button>
      </div>
      <span className="plate-caption">
        Ilustrasi menu · coba pilih porsi & waktu
      </span>
    </div>
  );
}

function Reveal({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-35px' }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function Landing() {
  const [role, setRole] = useState(0);
  const [previewP, setPreviewP] = useState(24);
  const active = roles[role];
  return (
    <>
      <PublicHeader />
      <main id="main">
        <section className="hero container">
          <div className="hero-copy">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <span className="eyebrow hero-eyebrow">
                <span className="eyebrow-line" />
                LINGKAR BAIK DARI KANTIN KAMPUS
              </span>
              <h1>
                Porsi pas.
                <br />
                Waktu lebih
                <br />
                <span className="hero-word">
                  lepas
                  <svg
                    viewBox="0 0 280 22"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M4 16C80 2 178 1 272 11"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="8"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
                <span className="period">.</span>
              </h1>
              <p className="hero-description">
                Makan siang lebih terencana.
                <br />
                Pilih porsimu, atur waktu ambil, dan bantu
                <br className="desktop-br" /> makanan baik sampai ke piring.
              </p>
              <div className="hero-actions">
                <LinkButton href="/mahasiswa" arrow>
                  Yuk, pilih porsimu
                </LinkButton>
                <a href="#cara-kerja" className="text-link">
                  Kenali loop-nya <ArrowDown size={17} />
                </a>
              </div>
              <div className="hero-note">
                <span className="mini-leaf">
                  <Sprout size={17} />
                </span>
                <span>
                  Lebih terencana untukmu. Lebih berarti untuk kantin.
                </span>
              </div>
            </motion.div>
          </div>
          <PlateScene />
          <a
            href="#cara-kerja"
            className="hero-scroll"
            aria-label="Lihat cara kerja"
          >
            <span>SCROLL UNTUK KENALAN</span>
            <ArrowDown size={15} />
          </a>
        </section>

        <div className="loop-strip">
          <div className="container loop-strip-inner">
            <span>
              <CalendarClock />
              Rencanakan sebelum memasak
            </span>
            <i />
            <span>
              <Sprout />
              Selamatkan bila tersisa
            </span>
            <i />
            <span>
              <ChartNoAxesCombined />
              Ukur dampaknya
            </span>
            <span className="strip-end">
              <span className="live-dot" />
              SATU LOOP. LEBIH TERENCANA.
            </span>
          </div>
        </div>

        <section id="cara-kerja" className="section container">
          <Reveal className="landing-section-title">
            <div>
              <p className="eyebrow">DARI PILIHAN KECIL, JADI KEBIASAAN BAIK</p>
              <h2>
                Makan siang,
                <br />
                tanpa tebak-tebakan.
              </h2>
            </div>
            <p>
              Kamu tahu kapan harus datang.
              <br />
              Gerai tahu berapa yang perlu disiapkan.
              <br />
              Yang tersisa, punya kesempatan berikutnya.
            </p>
          </Reveal>
          <div className="steps-grid">
            {[
              {
                n: '01',
                icon: Utensils,
                title: 'Pilih yang pas.',
                text: 'Lihat menu hari ini dan tentukan porsi yang sesuai dengan seleramu.',
                note: 'Porsi kecil atau reguler',
                className: 'step-lime',
              },
              {
                n: '02',
                icon: CalendarClock,
                title: 'Ambil di waktumu.',
                text: 'Pesan lebih awal, pilih slot yang tersedia, lalu tunjukkan kode saat mengambil.',
                note: 'Lebih jelas, dari pesan sampai ambil',
                className: 'step-mint',
              },
              {
                n: '03',
                icon: Sprout,
                title: 'Teruskan yang baik.',
                text: 'Ada makanan layak tersisa? Klaim Promo Terbatas dan ambil sebelum batas waktunya.',
                note: 'Dicek gerai sebelum ditawarkan',
                className: 'step-peach',
              },
            ].map(({ n, icon: Icon, title, text, note, className }) => (
              <Reveal key={n} className={`step-card ${className}`}>
                <div className="step-card-top">
                  <span className="step-number">{n}</span>
                  <Icon size={25} strokeWidth={1.5} />
                </div>
                <h3>{title}</h3>
                <p>{text}</p>
                <span className="step-note">
                  <Check size={15} />
                  {note}
                </span>
              </Reveal>
            ))}
          </div>
        </section>

        <section id="satu-loop" className="roles-section">
          <div className="container">
            <Reveal className="landing-section-title">
              <div>
                <p className="eyebrow">TERHUBUNG DARI DAPUR SAMPAI PIRING</p>
                <h2>
                  Satu kantin.
                  <br />
                  Satu loop yang utuh.
                </h2>
              </div>
              <div
                className="role-switch"
                role="tablist"
                aria-label="Manfaat per peran"
              >
                {roles.map((r, i) => (
                  <button
                    key={r.id}
                    role="tab"
                    id={`role-tab-${i}`}
                    aria-controls="role-panel"
                    aria-selected={role === i}
                    tabIndex={role === i ? 0 : -1}
                    onKeyDown={(event) => {
                      const next =
                        event.key === 'ArrowRight'
                          ? (i + 1) % roles.length
                          : event.key === 'ArrowLeft'
                            ? (i + roles.length - 1) % roles.length
                            : event.key === 'Home'
                              ? 0
                              : event.key === 'End'
                                ? roles.length - 1
                                : null;
                      if (next !== null) {
                        event.preventDefault();
                        setRole(next);
                        document.getElementById(`role-tab-${next}`)?.focus();
                      }
                    }}
                    onClick={() => setRole(i)}
                    className={role === i ? 'selected' : ''}
                  >
                    {<r.icon size={17} />}
                    <span>{r.label}</span>
                  </button>
                ))}
              </div>
            </Reveal>
            <div
              className="role-content"
              role="tabpanel"
              id="role-panel"
              aria-labelledby={`role-tab-${role}`}
            >
              <motion.div
                className="role-copy"
                key={role}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <h3>
                  {active.title.split('\n').map((t, i) => (
                    <span key={i}>
                      {t}
                      <br />
                    </span>
                  ))}
                </h3>
                <p>{active.body}</p>
                <ul>
                  {active.bullets.map((b) => (
                    <li key={b}>
                      <span>
                        <Check size={15} />
                      </span>
                      {b}
                    </li>
                  ))}
                </ul>
                <LinkButton href={active.href} variant="dark" arrow>
                  {active.action}
                </LinkButton>
              </motion.div>
              <div className="loop-preview">
                <div className="preview-top">
                  <span className="preview-mark">
                    <Leaf size={20} />
                  </span>
                  <span>RENCANA YANG BISA DIPAHAMI</span>
                  <span className="demo-tag">Simulasi</span>
                </div>
                <h4>Berapa porsi hari ini?</h4>
                <p>Geser rencana lewat jumlah pesanan terjadwal.</p>
                <div className="demand-equation">
                  <div>
                    <strong>{previewP}</strong>
                    <span>Pick up</span>
                  </div>
                  <span>+</span>
                  <div>
                    <strong>24</strong>
                    <span>Walk-in¹</span>
                  </div>
                  <span>+</span>
                  <div>
                    <strong>2</strong>
                    <span>Cadangan</span>
                  </div>
                </div>
                <div className="demand-control">
                  <button
                    aria-label="Kurangi pesanan terjadwal simulasi"
                    onClick={() => setPreviewP((n) => Math.max(0, n - 1))}
                  >
                    <Minus size={17} />
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="40"
                    value={previewP}
                    aria-label="Jumlah pesanan terjadwal simulasi"
                    onChange={(e) => setPreviewP(Number(e.target.value))}
                  />
                  <button
                    aria-label="Tambah pesanan terjadwal simulasi"
                    onClick={() => setPreviewP((n) => Math.min(40, n + 1))}
                  >
                    <Plus size={17} />
                  </button>
                </div>
                <div className="demand-result">
                  <span>
                    Rencana produksi
                    <strong>
                      {Math.min(previewP + 26, 50)} <small>porsi</small>
                    </strong>
                  </span>
                  <span className="result-icon">
                    <Utensils size={26} />
                  </span>
                </div>
                <p className="preview-footnote">
                  ¹ Baseline manual contoh. Kapasitas 50 porsi, stok awal 0. Ini
                  alat bantu keputusan, bukan hasil prediksi AI.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="dampak" className="section container context-section">
          <Reveal className="context-copy">
            <p className="eyebrow">MULAI DARI YANG DEKAT</p>
            <h2>
              Makanan terlalu
              <br />
              berarti untuk
              <br />
              <span>berakhir sia-sia.</span>
            </h2>
            <p>
              Perubahan bisa dimulai dari kantin kita. Dengan mengetahui
              kebutuhan sebelum memasak, setiap porsi punya rencana yang lebih
              jelas.
            </p>
            <a
              className="text-link"
              href="https://sdgs.un.org/goals/goal12"
              target="_blank"
              rel="noreferrer"
            >
              Sejalan dengan tujuan SDG 12.3 <ArrowUpRight size={17} />
            </a>
          </Reveal>
          <Reveal className="context-data">
            <div className="context-stat">
              <span className="context-stat-label">
                INDONESIA · KAJIAN 2000–2019
              </span>
              <strong>
                23–48 <span>juta ton</span>
              </strong>
              <p>
                Estimasi susut dan sisa pangan per tahun di seluruh rantai pasok
                Indonesia.
              </p>
              <a
                href="https://lcdi-indonesia.id/wp-content/uploads/2021/07/Report-Kajian-FLW-ENG.pdf"
                target="_blank"
                rel="noreferrer"
              >
                Sumber: Bappenas, 2021 <ArrowUpRight size={14} />
              </a>
            </div>
            <div className="context-stat">
              <span className="context-stat-label">GLOBAL · DATA 2022</span>
              <strong>
                1,05 <span>miliar ton</span>
              </strong>
              <p>
                Limbah pangan dari rumah tangga, layanan makanan, dan ritel,
                termasuk bagian tidak dapat dimakan.
              </p>
              <a
                href="https://www.unep.org/en/news-and-stories/press-release/world-squanders-over-1-billion-meals-day-un-report"
                target="_blank"
                rel="noreferrer"
              >
                Sumber: UNEP Food Waste Index, 2024 <ArrowUpRight size={14} />
              </a>
            </div>
            <p className="data-disclaimer">
              Dua angka ini adalah konteks dengan cakupan berbeda, bukan hasil
              atau proyeksi dampak PORSI LOOP.
            </p>
          </Reveal>
        </section>

        <section className="cta-section container">
          <Reveal className="cta-card">
            <span className="cta-orbit" />
            <div>
              <p className="eyebrow">PORSI KECIL. LANGKAH BERARTI.</p>
              <h2>
                Makan enak.
                <br />
                Rencananya juga baik.
              </h2>
              <p>Mulai satu loop baik dari makan siang berikutnya.</p>
              <LinkButton href="/mahasiswa" variant="lime" arrow>
                Coba PORSI LOOP
              </LinkButton>
            </div>
            <div className="cta-illustration">
              <ShoppingBag size={115} strokeWidth={0.8} />
              <span className="cta-check">
                <Check size={27} />
              </span>
              <span className="cta-caption">
                GOOD FOOD.
                <br />
                BETTER LOOP.
              </span>
            </div>
          </Reveal>
        </section>
      </main>
      <footer className="public-footer container">
        <div className="footer-top">
          <Brand />
          <p>
            Rencanakan sebelum memasak.
            <br />
            Selamatkan bila tersisa. Ukur dampaknya.
          </p>
          <a href="/masuk?peran=gerai" className="text-link">
            Punya gerai? Mulai di sini <ArrowUpRight size={17} />
          </a>
        </div>
        <div className="footer-bottom">
          <span>© 2026 PORSI LOOP · Trinity LFA</span>
          <span>Prototipe CR YOUTH 2026 · Data operasional simulasi</span>
          <Link href="/tentang">
            Tentang & sumber data <ArrowUpRight size={13} />
          </Link>
        </div>
      </footer>
    </>
  );
}
