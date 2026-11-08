'use client';

import {
  CalendarClock,
  Flame,
  Leaf,
  Sprout,
  Star,
  Store,
  Trophy,
  Utensils,
  Wallet,
} from 'lucide-react';
import {
  Badge,
  EmptyState,
  LinkButton,
  SectionHeading,
  Stat,
} from '@/components/ui';
import {
  rupiah,
  statusNames,
  type CommunityImpact,
  type Order,
  type RescueClaim,
} from '@/lib/domain';
import './student-impact.css';

type Ticket = Order | RescueClaim;
interface Day {
  date: string;
  regular: number;
  promo: number;
}

const LEVELS = [
  { min: 0, name: 'Langkah Pertama', hint: 'Ambil pesanan pertamamu.' },
  { min: 3, name: 'Pelanggan Pas', hint: 'Mulai terbiasa memesan secukupnya.' },
  { min: 6, name: 'Pejuang Promo', hint: 'Promo Terbatas jadi pilihan rutinmu.' },
  { min: 12, name: 'Loop Master', hint: 'Kamu sudah jadi bagian tetap dari loop.' },
];
const WIB = 'Asia/Jakarta';
const dayKey = (value: string | number) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: WIB }).format(new Date(value));
const weekday = (date: string) =>
  new Intl.DateTimeFormat('id-ID', { weekday: 'short', timeZone: WIB }).format(
    new Date(`${date}T12:00:00+07:00`),
  );
const longDate = (date: string) =>
  new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    timeZone: WIB,
  }).format(new Date(`${date}T12:00:00+07:00`));
const isPromo = (ticket: Ticket): ticket is RescueClaim => 'batchId' in ticket;
const ticketDate = (ticket: Ticket) =>
  ticket.serviceDate ?? dayKey(ticket.pickedUpAt ?? ticket.createdAt);

function lastDays(anchor: string) {
  const end = Date.parse(`${anchor}T12:00:00+07:00`);
  return Array.from({ length: 7 }, (_, i) => dayKey(end - (6 - i) * 86400000));
}

/** Two-series stacked bars: regular portions with promo portions on top. */
function DayBars({
  days,
  caption,
  unit,
}: {
  days: Day[];
  caption: string;
  unit: string;
}) {
  const max = Math.max(1, ...days.map((d) => d.regular + d.promo));
  return (
    <figure className="impact-chart">
      <figcaption>{caption}</figcaption>
      <div className="impact-legend" aria-hidden="true">
        <span>
          <i className="swatch-regular" /> Menu reguler
        </span>
        <span>
          <i className="swatch-promo" /> Promo Terbatas
        </span>
      </div>
      <div className="impact-bars">
        {days.map((day) => {
          const total = day.regular + day.promo;
          const label = `${weekday(day.date)} ${longDate(day.date)}: ${total} ${unit}, ${day.promo} dari promo`;
          return (
            <div
              key={day.date}
              className="impact-bar"
              tabIndex={0}
              role="img"
              aria-label={label}
            >
              <span className="impact-bar-value">{total}</span>
              <div className="impact-bar-track">
                <div className="impact-bar-stack" style={{ height: `${(total / max) * 100}%` }}>
                  {day.promo > 0 && (
                    <span className="seg-promo" style={{ flexGrow: day.promo }} />
                  )}
                  {day.regular > 0 && (
                    <span className="seg-regular" style={{ flexGrow: day.regular }} />
                  )}
                </div>
              </div>
              <span className="impact-bar-day">{weekday(day.date)}</span>
              <span className="impact-tip" role="presentation">
                <strong>{longDate(day.date)}</strong>
                {day.regular} reguler · {day.promo} promo
              </span>
            </div>
          );
        })}
      </div>
      <details className="impact-table">
        <summary>Lihat sebagai tabel</summary>
        <table>
          <thead>
            <tr>
              <th>Hari</th>
              <th>Reguler</th>
              <th>Promo</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {days.map((day) => (
              <tr key={day.date}>
                <td>
                  {weekday(day.date)} {longDate(day.date)}
                </td>
                <td>{day.regular}</td>
                <td>{day.promo}</td>
                <td>{day.regular + day.promo}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

export function ImpactPanel({
  orders,
  claims,
  community,
  businessDate,
  name,
  guest,
}: {
  orders: Order[];
  claims: RescueClaim[];
  community?: CommunityImpact;
  businessDate: string;
  name?: string;
  guest: boolean;
}) {
  const tickets: Ticket[] = [...orders, ...claims];
  const picked = tickets.filter((t) => t.status === 'picked_up');
  const active = tickets.filter((t) =>
    ['pending_payment', 'confirmed', 'preparing', 'ready'].includes(t.status),
  );
  const portions = picked.reduce((n, t) => n + t.quantity, 0);
  const promoPortions = picked
    .filter(isPromo)
    .reduce((n, t) => n + t.quantity, 0);
  const savings = picked
    .filter(isPromo)
    .reduce(
      (n, t) => n + Math.max(0, (t.originalPrice ?? t.price) - t.price) * t.quantity,
      0,
    );
  const level = [...LEVELS].reverse().find((l) => portions >= l.min)!;
  const next = LEVELS.find((l) => l.min > portions);
  const progress = next
    ? Math.round(((portions - level.min) / (next.min - level.min)) * 100)
    : 100;

  const week = lastDays(businessDate);
  const mine: Day[] = week.map((date) => ({ date, regular: 0, promo: 0 }));
  for (const t of picked) {
    const row = mine.find((d) => d.date === ticketDate(t));
    if (!row) continue;
    if (isPromo(t)) row.promo += t.quantity;
    else row.regular += t.quantity;
  }
  const activeDays = new Set(picked.map(ticketDate));
  let streak = 0;
  for (let i = week.length - 1; i >= 0; i--) {
    if (activeDays.has(week[i])) streak++;
    else if (i === week.length - 1) continue;
    else break;
  }
  const rated = picked.filter((t) => t.rating);
  const myRating = rated.length
    ? Math.round((rated.reduce((n, t) => n + t.rating!.stars, 0) / rated.length) * 10) / 10
    : 0;
  const outlets = new Map<string, number>();
  for (const t of picked)
    outlets.set(t.outletName ?? 'Gerai', (outlets.get(t.outletName ?? 'Gerai') ?? 0) + t.quantity);
  const favourite = [...outlets.entries()].sort((a, b) => b[1] - a[1])[0];
  const recent = [...tickets]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5);

  const communityDays: Day[] =
    community?.days.map((d) => ({
      date: d.date,
      regular: Math.max(0, d.served - d.promo),
      promo: d.promo,
    })) ?? [];

  return (
    <>
      <SectionHeading
        eyebrow="PILIHAN KECILMU, TERCATAT DI SINI"
        title="Loop baikmu"
        level={1}
        description="Perjalananmu bersama kantin yang lebih terencana, ditambah kabar dari seluruh kantin minggu ini."
      />

      <section className="impact-hero" aria-label="Tingkatanmu">
        <div className="impact-hero-copy">
          <span className="impact-level">
            <Trophy size={16} /> {level.name}
          </span>
          <h2>
            {name && !guest ? `Halo, ${name}.` : 'Halo, teman kantin.'}
            <br />
            <span>Satu porsi pas, satu kebiasaan baik.</span>
          </h2>
          <p>{level.hint}</p>
          <div
            className="impact-progress"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
            aria-label={next ? `Menuju ${next.name}` : 'Tingkat tertinggi'}
          >
            <span style={{ width: `${progress}%` }} />
          </div>
          <small>
            {next
              ? `${next.min - portions} porsi lagi menuju ${next.name}`
              : 'Kamu sudah di tingkat tertinggi. Terima kasih!'}
          </small>
        </div>
        <Sprout className="impact-hero-art" size={118} strokeWidth={0.9} />
      </section>

      <div className="stat-grid impact-stats">
        <Stat
          label="Porsi diambil"
          value={portions}
          note="Serah terima diverifikasi gerai"
          icon={Utensils}
        />
        <Stat
          label="Porsi promo"
          value={promoPortions}
          note="Dari Promo Terbatas"
          icon={Sprout}
        />
        <Stat
          label="Hemat dari promo"
          value={rupiah(savings)}
          note="Dibanding harga normal"
          icon={Wallet}
        />
        <Stat
          label="Hari beruntun"
          value={streak}
          note={streak ? 'Mengambil pesanan berturut-turut' : 'Mulai dari pesanan berikutnya'}
          icon={Flame}
        />
      </div>

      {!picked.length && !active.length ? (
        <div className="market-empty">
          <EmptyState
            icon={Leaf}
            title="Perjalananmu mulai dari pesanan pertama"
            description={
              guest
                ? 'Pesanan sebagai tamu tersimpan di browser ini. Setelah gerai memverifikasi pengambilan, tingkat dan statistikmu muncul di sini.'
                : 'Setelah gerai memverifikasi pengambilan, tingkat dan statistikmu muncul di sini.'
            }
          />
          <LinkButton href="/customer" arrow>
            Pilih menu
          </LinkButton>
        </div>
      ) : (
        <div className="impact-two">
          <article className="impact-card">
            <DayBars days={mine} caption="Porsi yang kamu ambil, 7 hari terakhir" unit="porsi" />
            <ul className="impact-facts">
              {favourite && (
                <li>
                  <Store size={16} /> Gerai favorit: <strong>{favourite[0]}</strong>
                </li>
              )}
              {myRating > 0 && (
                <li>
                  <Star size={16} /> Rating yang kamu beri:{' '}
                  <strong>{myRating.toLocaleString('id-ID')}</strong> dari {rated.length} ulasan
                </li>
              )}
              {active.length > 0 && (
                <li>
                  <CalendarClock size={16} /> <strong>{active.length}</strong> pesanan masih berjalan
                </li>
              )}
            </ul>
          </article>
          <article className="impact-card">
            <h3 className="impact-card-title">Jejak pesanan terbaru</h3>
            <ol className="impact-timeline">
              {recent.map((t) => (
                <li key={t.id}>
                  <span className={isPromo(t) ? 'dot dot-promo' : 'dot'} />
                  <div>
                    <strong>{t.menuName}</strong>
                    <small>
                      {t.outletName ?? 'Gerai'} · {longDate(ticketDate(t))} · {t.quantity} porsi
                    </small>
                  </div>
                  <div className="impact-timeline-end">
                    {isPromo(t) && <Badge tone="orange">Promo</Badge>}
                    <small>{t.status === 'picked_up' ? 'Diambil' : statusNames[t.status]}</small>
                    {t.rating && (
                      <span className="impact-stars" aria-label={`${t.rating.stars} dari 5 bintang`}>
                        {'★'.repeat(t.rating.stars)}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </article>
        </div>
      )}

      {community && (
        <section className="impact-community" aria-label="Loop kantin minggu ini">
          <div className="impact-community-head">
            <div>
              <p className="eyebrow">KABAR DARI SELURUH KANTIN</p>
              <h2>Loop kantin minggu ini</h2>
            </div>
            {community.includesSample && <Badge tone="neutral">Termasuk data contoh</Badge>}
          </div>
          <div className="impact-community-stats">
            <div>
              <strong>{community.servedPortions.toLocaleString('id-ID')}</strong>
              <span>porsi dilayani</span>
            </div>
            <div>
              <strong>
                {community.promoPortions.toLocaleString('id-ID')}
                <small> ({community.promoShare}%)</small>
              </strong>
              <span>lewat Promo Terbatas</span>
            </div>
            <div>
              <strong>{rupiah(community.promoSavings)}</strong>
              <span>dihemat pembeli dari promo</span>
            </div>
            <div>
              <strong>
                {community.ratingCount ? community.ratingAverage.toLocaleString('id-ID') : '—'}
                <small> / 5</small>
              </strong>
              <span>{community.ratingCount} ulasan</span>
            </div>
          </div>
          <DayBars days={communityDays} caption="Porsi dilayani seluruh gerai per hari" unit="porsi" />
          <div className="impact-community-foot">
            <div className="impact-promo-now">
              <Sprout size={20} />
              <p>
                {community.activePromos
                  ? `Sekarang ada ${community.activePromos} Promo Terbatas dari ${community.outletsWithPromo} gerai.`
                  : 'Belum ada Promo Terbatas yang terbuka saat ini.'}
              </p>
              <LinkButton href="/customer?tab=rescue" variant="secondary" arrow>
                Lihat promo
              </LinkButton>
            </div>
            {community.topMenus.length > 0 && (
              <div className="impact-top">
                <h3>Menu paling disukai</h3>
                <ol>
                  {community.topMenus.map((menu) => (
                    <li key={`${menu.menuName}-${menu.outletName}`}>
                      <span>
                        <strong>{menu.menuName}</strong>
                        <small>{menu.outletName}</small>
                      </span>
                      <span className="impact-top-score">
                        ★ {menu.average.toLocaleString('id-ID')}
                        <small> ({menu.count})</small>
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        </section>
      )}

      <section className="impact-how" aria-label="Cara loop ini bekerja">
        <h2>Kantin modern yang memasak dengan rencana</h2>
        <p>
          PORSI LOOP membantu kantin menyiapkan porsi sesuai kebutuhan, sehingga lebih sedikit
          makanan layak yang tersisa. Kalau tetap ada, Promo Terbatas memberi kesempatan kedua
          dengan harga lebih ringan.
        </p>
        <ol>
          <li>
            <span>1</span>
            <strong>Pesan lebih awal</strong>
            <small>Pesananmu membantu gerai memperkirakan berapa porsi yang perlu dimasak.</small>
          </li>
          <li>
            <span>2</span>
            <strong>Ambil promo bila ada</strong>
            <small>Stok layak yang tersisa ditawarkan dengan batas waktu ambil yang jelas.</small>
          </li>
          <li>
            <span>3</span>
            <strong>Dampak dicatat jujur</strong>
            <small>Hanya pengambilan yang diverifikasi gerai yang dihitung.</small>
          </li>
        </ol>
      </section>

      <div className="market-impact-note">
        <h3>Angkanya jelas, asalnya juga.</h3>
        <p>
          Statistik pribadi berasal dari pesananmu yang sudah diambil; pesanan yang dibatalkan,
          kedaluwarsa, atau belum diambil tidak dihitung. Ringkasan kantin bersifat agregat dan
          tidak memuat identitas siapa pun.
        </p>
        <div className="market-info-note">
          <Leaf size={20} />
          <p>
            Jumlah porsi tidak otomatis setara dengan makanan yang terhindar dari pembuangan. Berat
            sisa dicatat terpisah oleh gerai.
          </p>
        </div>
      </div>
    </>
  );
}
