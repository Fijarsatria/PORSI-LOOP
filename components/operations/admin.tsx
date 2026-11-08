'use client';

import { useMemo, useState } from 'react';

import {
  ArrowRight,
  ClipboardCheck,
  Clock3,
  CookingPot,
  Info,
  Leaf,
  Package,
  Search,
  ShoppingBag,
  Sprout,
  TicketCheck,
  TrendingUp,
  Utensils,
} from 'lucide-react';

import { Badge, Button, EmptyState, Stat } from '../ui';
import { clock, rupiah, type Snapshot } from '@/lib/domain';
import './styles.css';

import {
  useOperations,
  PanelHeading,
  StockFlow,
  MovementLedger,
  dateLabel,
  safePercent,
  ProductionInsight,
} from './shared';

function HistoryChart({ state }: { state: Snapshot }) {
  const entries = state.history.slice(-7);
  const maximum = Math.max(1, ...entries.map((item) => item.produced));
  return (
    <div className="ops-history-chart">
      <div className="ops-chart-legend">
        <span>
          <i className="preorder" />
          Produksi
        </span>
        <span>
          <i className="walkin" />
          Porsi terlayani
        </span>
        <span>
          <i className="waste" />
          Dibuang
        </span>
      </div>
      <div className="ops-chart-bars">
        {entries.map((entry) => (
          <div
            key={entry.date}
            className="ops-chart-group"
            title={`${entry.date}: produksi ${entry.produced}, terlayani ${entry.preorders + entry.walkin + entry.rescue}, dibuang ${entry.waste}`}
          >
            <div className="ops-chart-columns">
              <span
                className="preorder"
                style={{ height: `${(entry.produced / maximum) * 100}%` }}
              >
                <b>{entry.produced}</b>
              </span>
              <span
                className="walkin"
                style={{
                  height: `${((entry.preorders + entry.walkin + entry.rescue) / maximum) * 100}%`,
                }}
              >
                <b>{entry.preorders + entry.walkin + entry.rescue}</b>
              </span>
              <span
                className="waste"
                style={{
                  height: `${Math.max(2, (entry.waste / maximum) * 100)}%`,
                }}
              >
                <b>{entry.waste}</b>
              </span>
            </div>
            <small>
              {new Intl.DateTimeFormat('id-ID', {
                day: 'numeric',
                month: 'short',
              }).format(new Date(entry.date))}
            </small>
          </div>
        ))}
      </div>
      <p className="ops-footnote">
        {state.mode === 'demo'
          ? 'Histori simulasi untuk mendemonstrasikan pencatatan. Angka ini bukan hasil pilot lapangan.'
          : 'Produksi dan layanan dari sesi yang tercatat. Gunakan sesi lengkap untuk pembanding.'}
      </p>
    </div>
  );
}

function HistoryTable({ state }: { state: Snapshot }) {
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Tanggal sesi</th>
            <th>Produksi</th>
            <th>Pesanan normal diserahkan</th>
            <th>Walk-in</th>
            <th>Promo Terbatas</th>
            <th>Dibuang</th>
            <th>Kualitas data</th>
          </tr>
        </thead>
        <tbody>
          {state.history.map((item) => (
            <tr key={item.id ?? item.date}>
              <td>
                <strong>{dateLabel(item.date)}</strong>
              </td>
              <td>{item.produced}</td>
              <td>{item.preorders}</td>
              <td>{item.walkin}</td>
              <td>{item.rescue}</td>
              <td>{item.wasteKg.toLocaleString('id-ID')} kg</td>
              <td>
                <Badge tone={item.closed ? 'green' : 'orange'}>
                  {item.closed ? 'Lengkap' : 'Belum lengkap'}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OutletComparison({ state }: { state: Snapshot }) {
  const outlets = state.outlets?.length ? state.outlets : [{ id: state.menu.outletId ?? 'current', name: state.menu.outlet, location: state.menu.location, category: state.menu.category, menuIds: [state.menu.id], metrics: state.metrics }];
  return <section className="panel">
    <PanelHeading title="Bandingkan layanan antar gerai" description="Porsi yang diserahkan, stok fisik, dan limbah dari sesi yang tercatat. Identitas pembeli tidak ditampilkan."><Badge tone="neutral">{outlets.length} gerai · {state.menus?.length ?? 1} menu</Badge></PanelHeading>
    <div className="table-wrap"><table className="data-table ops-outlet-comparison"><thead><tr><th>Gerai</th><th>Produksi</th><th>Normal diserahkan</th><th>Promo diserahkan</th><th>Stok fisik</th><th>Dibuang</th><th>Antrean aktif</th></tr></thead>
      <tbody>{outlets.map((outlet) => {
        const kitchens = state.kitchens?.filter((kitchen) => kitchen.menu.outletId === outlet.id) ?? [];
        const normal = kitchens.length ? kitchens.reduce((sum, kitchen) => sum + kitchen.reconciliation.preorderPickedUp + kitchen.metrics.walkin, 0) : state.orders.filter((order) => order.outletId === outlet.id && order.status === 'picked_up').reduce((sum, order) => sum + order.quantity, 0) + (outlet.metrics?.walkin ?? 0);
        const active = state.orderTraffic?.filter((item) => item.outletId === outlet.id).reduce((sum, item) => sum + item.active, 0) ?? [...state.orders, ...state.claims].filter((item) => item.outletId === outlet.id && ['pending_payment', 'confirmed', 'preparing', 'ready'].includes(item.status)).length;
        return <tr key={outlet.id}><td><strong>{outlet.name}</strong><span className="ops-table-sub">{outlet.location} · {outlet.menuIds.length} menu</span></td><td>{outlet.metrics?.produced ?? 0}</td><td>{normal}</td><td>{outlet.metrics?.rescued ?? 0}</td><td>{outlet.metrics?.stock ?? 0}</td><td>{outlet.metrics?.waste ?? 0} porsi<span className="ops-table-sub">{(outlet.metrics?.wasteKg ?? 0).toLocaleString('id-ID')} kg tercatat</span></td><td><Badge tone={active ? 'orange' : 'neutral'}>{active} pesanan</Badge></td></tr>;
      })}</tbody>
    </table></div>
  </section>;
}

function OrderTraffic({ state }: { state: Snapshot }) {
  const all = [...state.orders.map((order) => ({ ...order, channel: 'normal' })), ...state.claims.map((claim) => ({ ...claim, channel: 'promo' }))];
  const groups = new Map<string, { date: string; outlet: string; total: number; portions: number; normal: number; promo: number; paid: number; served: number }>();
  for (const item of all) {
    const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date(item.createdAt));
    const outlet = state.outlets?.find((entry) => entry.id === item.outletId)?.name ?? state.menu.outlet;
    const key = `${date}-${item.outletId ?? outlet}`;
    const row = groups.get(key) ?? { date, outlet, total: 0, portions: 0, normal: 0, promo: 0, paid: 0, served: 0 };
    row.total += 1;
    row.portions += item.quantity;
    if (item.channel === 'normal') row.normal += 1;
    else row.promo += 1;
    if (item.paymentStatus === 'paid') row.paid += 1;
    if (item.status === 'picked_up') row.served += 1;
    groups.set(key, row);
  }
  const rows = state.orderTraffic?.map((item) => ({ date: item.date, outlet: item.outletName, total: item.orders, portions: item.portions, normal: item.normal, promo: item.promo, paid: item.paid, served: item.served })).sort((a, b) => b.date.localeCompare(a.date) || a.outlet.localeCompare(b.outlet)) ?? [...groups.values()].sort((a, b) => b.date.localeCompare(a.date) || a.outlet.localeCompare(b.outlet));
  const total = state.orderTraffic?.reduce((sum, item) => sum + item.orders, 0) ?? all.length;
  const pending = state.orderTraffic?.reduce((sum, item) => sum + item.pending, 0) ?? all.filter((item) => item.paymentStatus === 'pending').length;
  const preparing = state.orderTraffic?.reduce((sum, item) => sum + item.preparing, 0) ?? all.filter((item) => item.status === 'preparing').length;
  const ready = state.orderTraffic?.reduce((sum, item) => sum + item.ready, 0) ?? all.filter((item) => item.status === 'ready').length;
  return <section className="panel">
    <PanelHeading title="Arus pesanan yang tercatat" description="Riwayat permintaan per hari dan gerai, tanpa nama, akun, atau token pembeli." />
    <div className="ops-traffic-summary"><div><strong>{total}</strong><span>pesanan tercatat</span></div><div><strong>{pending}</strong><span>menunggu pembayaran</span></div><div><strong>{preparing}</strong><span>sedang disiapkan</span></div><div><strong>{ready}</strong><span>siap diserahkan</span></div></div>
    {rows.length ? <div className="table-wrap"><table className="data-table"><thead><tr><th>Tanggal masuk</th><th>Gerai</th><th>Pesanan</th><th>Normal / Promo</th><th>Porsi dipesan</th><th>Pesanan lunas</th><th>Pesanan diserahkan</th></tr></thead><tbody>{rows.map((row) => <tr key={`${row.date}-${row.outlet}`}><td>{dateLabel(row.date)}</td><td><strong>{row.outlet}</strong></td><td>{row.total}</td><td>{row.normal} / {row.promo}</td><td>{row.portions}</td><td>{row.paid}</td><td>{row.served}</td></tr>)}</tbody></table></div> : <EmptyState icon={ShoppingBag} title="Belum ada arus pesanan" description="Pesanan baru akan muncul sebagai ringkasan per hari dan gerai setelah mahasiswa memesan." />}
    <p className="ops-footnote">Porsi dipesan dapat mencakup pembatalan dan pesanan belum lunas. Pesanan diserahkan hanya bertambah sesudah verifikasi penyerahan.</p>
  </section>;
}

function AdminOverview({ state }: { state: Snapshot }) {
  const served =
    state.reconciliation.preorderPickedUp +
    state.metrics.walkin +
    state.metrics.rescued;
  const historicalComplete = state.history.filter(
    (entry) => entry.closed,
  ).length;
  const completeness = safePercent(historicalComplete, state.history.length);
  return (
    <div className="stack ops-page">
      <div className="ops-greeting">
        <div>
          <span className="eyebrow">PANDANGAN UTUH, KEPUTUSAN TERARAH</span>
          <h1>Kantin yang terus belajar.</h1>
          <p className="muted">
            Pantau layanan, kualitas pencatatan, dan hasil setiap sesi dalam
            satu pandangan.
          </p>
        </div>
        <span className="ops-date">
          <Clock3 size={16} />
          {dateLabel(state.now)}
        </span>
      </div>
      <div className="stat-grid">
        <Stat
          label="Porsi terlayani hari ini"
          value={served}
          note="Normal & Promo Terbatas diserahkan"
          icon={Utensils}
        />
        <Stat
          label="Promo Terbatas tersalurkan"
          value={state.metrics.rescued}
          note="Berdasarkan pickup terkonfirmasi"
          icon={Sprout}
        />
        <Stat
          label="Makanan dibuang"
          value={`${state.metrics.wasteKg.toLocaleString('id-ID')} kg`}
          note="Berat yang dicatat saat rekonsiliasi"
          icon={Package}
        />
        <Stat
          label="Kelengkapan histori"
          value={`${completeness}%`}
          note={`${historicalComplete} dari ${state.history.length} sesi lengkap`}
          icon={ClipboardCheck}
        />
      </div>
      <OutletComparison state={state} />
      <OrderTraffic state={state} />
      <ProductionInsight state={state} />
      <div className="ops-main-grid">
        <section className="panel">
          <PanelHeading
            title="Porsi dari waktu ke waktu"
            description="Produksi dan hasil layanan pada sesi yang tercatat."
          >
            <Badge tone="neutral">
              {Math.min(7, state.history.length)} sesi terakhir
            </Badge>
          </PanelHeading>
          <HistoryChart state={state} />
        </section>
        <section className="panel ops-health-panel">
          <span className="eyebrow">KUALITAS PROGRAM</span>
          <div
            className="ops-health-ring"
            style={{
              background: `conic-gradient(var(--ops-green) ${completeness}%, #e8ece7 0)`,
            }}
          >
            <div>
              <strong>{completeness}%</strong>
              <span>Sesi lengkap</span>
            </div>
          </div>
          <h3>Catatan yang bisa diperiksa.</h3>
          <p>
            Target evaluasi awal: minimal 80% sesi lengkap. Kualitas input
            menentukan kualitas pembanding.
          </p>
          <Badge tone={completeness >= 80 ? 'green' : 'orange'}>
            {completeness >= 80
              ? 'Target pencatatan simulasi tercapai'
              : 'Perlu melengkapi catatan sesi'}
          </Badge>
        </section>
      </div>
      <section className="panel">
        <PanelHeading
          title="Riwayat sesi"
          description="Sesi belum lengkap tetap terlihat dan tidak dijadikan pembanding."
        />
        <HistoryTable state={state} />
      </section>
    </div>
  );
}

function Impact({ state }: { state: Snapshot }) {
  const r = state.reconciliation;
  const served = r.preorderPickedUp + r.walkin + r.rescuePickedUp;
  const intensity =
    served > 0 && r.complete ? (r.wasteKg / served) * 100 : null;
  const eligible = state.metrics.preorderEligible;
  const rescueRevenue = state.metrics.rescueRevenue;
  const complete = state.history.filter((item) => item.closed);
  const historicalServed = complete.reduce(
    (sum, item) => sum + item.preorders + item.walkin + item.rescue,
    0,
  );
  const historicalWaste = complete.reduce((sum, item) => sum + item.wasteKg, 0);
  return (
    <div className="stack ops-page">
      <div className="ops-greeting">
        <div>
          <span className="eyebrow">UKUR YANG BENAR-BENAR TERJADI</span>
          <h1>Dampak, dengan konteks.</h1>
          <p className="muted">
            Pisahkan hasil operasional, penerimaan ekonomi, dan pengukuran
            lingkungan.
          </p>
        </div>
        <Badge tone="neutral">
          {state.mode === 'demo'
            ? 'Data simulasi · belum hasil pilot'
            : 'Ringkasan pencatatan operasional'}
        </Badge>
      </div>
      <section className="panel">
        <PanelHeading
          title="Outcome operasional"
          description="Layanan yang tercatat pada sesi berjalan."
        />
        <div className="stat-grid">
          <Stat
            label="Pesanan normal diserahkan"
            value={r.preorderPickedUp}
            note="Porsi, berdasarkan validasi pickup"
            icon={ShoppingBag}
          />
          <Stat
            label="Tingkat pickup"
            value={eligible ? `${state.metrics.pickupRate}%` : '—'}
            note={
              eligible
                ? `${r.preorderPickedUp} dari ${eligible} porsi dikonfirmasi (termasuk yang masih menunggu)`
                : 'Belum ada pesanan terkonfirmasi'
            }
            icon={TicketCheck}
          />
          <Stat
            label="Tidak diambil"
            value={state.metrics.noShow}
            note="Tidak dihitung sebagai terlayani"
            icon={Clock3}
          />
          <Stat
            label="Promo Terbatas tersalurkan"
            value={r.rescuePickedUp}
            note={`${state.metrics.rescueReserved} porsi masih dalam reservasi`}
            icon={Leaf}
          />
        </div>
      </section>
      <div className="callout">
        <Info size={20} />
        <p>
          <strong>
            {state.metrics.stockouts} permintaan walk-in tidak terpenuhi
          </strong>{' '}
          dicatat gerai pada sesi ini. Angka hanya mencakup kejadian yang
          benar-benar dicatat, bukan perkiraan permintaan hilang.
        </p>
      </div>
      <div className="grid-2">
        <section className="panel ops-environment-card">
          <div className="ops-round-icon">
            <Leaf size={23} />
          </div>
          <span className="eyebrow">INDIKATOR LINGKUNGAN</span>
          <h2>Waste intensity</h2>
          <div className="ops-impact-value">
            {intensity === null
              ? '—'
              : intensity.toLocaleString('id-ID', { maximumFractionDigits: 2 })}
            <span>kg / 100 porsi terlayani</span>
          </div>
          <p className="muted">
            {intensity === null
              ? 'Tersedia setelah sesi direkonsiliasi lengkap, limbah ditimbang, dan ada porsi terlayani.'
              : `${r.wasteKg.toLocaleString('id-ID')} kg makanan dibuang ÷ ${served} porsi terlayani × 100.`}
          </p>
          <div className="ops-impact-context">
            <strong>Histori sesi lengkap</strong>
            <span>
              {historicalServed
                ? `${((historicalWaste / historicalServed) * 100).toLocaleString('id-ID', { maximumFractionDigits: 2 })} kg / 100 porsi`
                : 'Belum tersedia'}
            </span>
            <small>
              {state.mode === 'demo'
                ? 'Simulasi pencatatan; bukan baseline pengurangan limbah yang tervalidasi.'
                : 'Bukan baseline pengurangan limbah tanpa penetapan lingkup dan metode pembanding.'}
            </small>
          </div>
        </section>
        <section className="panel">
          <div className="ops-round-icon">
            <TrendingUp size={23} />
          </div>
          <span className="eyebrow">CATATAN EKONOMI</span>
          <h2>Penerimaan Promo Terbatas</h2>
          <div className="ops-impact-value money">
            {rupiah(rescueRevenue)}
            <span>Penerimaan dari pickup terkonfirmasi</span>
          </div>
          <p className="muted">
            Nilai ini belum dikurangi kemasan, biaya tambahan, atau perubahan
            penjualan normal.
          </p>
          <div className="ops-impact-context">
            <strong>Manfaat ekonomi bersih</strong>
            <span>Belum dapat dihitung</span>
            <small>
              Memerlukan biaya terhindar yang terverifikasi, biaya tambahan,
              serta baseline penjualan yang sebanding.
            </small>
          </div>
        </section>
      </div>
      <div className="callout">
        <Info size={20} />
        <p>
          Promo Terbatas dilaporkan sebagai porsi tersalurkan. Pengurangan limbah
          memerlukan perbandingan berat limbah aktual dengan baseline yang
          sebanding. MVP tidak menampilkan klaim emisi karbon.
        </p>
      </div>
      <section className="panel">
        <PanelHeading
          title="Cara membaca pengukuran"
          description="Satu ukuran untuk satu jenis hasil."
        />
        <div className="ops-method-grid">
          <div>
            <span className="ops-round-icon">
              <Utensils size={21} />
            </span>
            <h3>Hitung layanan aktual</h3>
            <p>
              Denominator mencakup pesanan normal diserahkan, walk-in terjual, dan
              Promo Terbatas diambil. Reservasi dan no-show tidak masuk.
            </p>
          </div>
          <div>
            <span className="ops-round-icon">
              <Package size={21} />
            </span>
            <h3>Timbang dengan konsisten</h3>
            <p>
              Gunakan lingkup dan metode timbang yang sama. Pisahkan kemasan dan
              sisa di luar lingkup pencatatan.
            </p>
          </div>
          <div>
            <span className="ops-round-icon">
              <ClipboardCheck size={21} />
            </span>
            <h3>Bandingkan sesi lengkap</h3>
            <p>
              Perhatikan menu, hari, harga, dan kegiatan kampus. Sesi belum
              lengkap tetap tercatat, tetapi dikecualikan dari pembanding.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function Ledger({ state }: { state: Snapshot }) {
  const { action, busy } = useOperations();
  const [query, setQuery] = useState('');
  const logs = useMemo(
    () =>
      state.logs.filter((log) =>
        `${log.action} ${log.detail}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [query, state.logs],
  );
  return (
    <div className="stack ops-page">
      <div className="ops-greeting">
        <div>
          <span className="eyebrow">JEJAK YANG BISA DITELUSURI</span>
          <h1>Dari tindakan ke catatan.</h1>
          <p className="muted">
            Perubahan operasional dicatat beserta pelaku dan waktunya.
          </p>
        </div>
        <Badge tone="green">{state.logs.length} aktivitas tercatat</Badge>
      </div>
      {state.mode === 'demo' && (
        <section className="panel ops-demo-controls">
          <PanelHeading
            title="Coba batas waktu pesanan"
            description={`Jam simulasi saat ini ${clock(state.now)} WIB. Kontrol ini hanya tersedia pada data contoh.`}
          />
          <p className="muted">
            Majukan waktu untuk melihat batas pemesanan, reservasi kedaluwarsa,
            dan pesanan tidak diambil. Pesanan yang melewati slotnya akan
            berubah status.
          </p>
          <div className="ops-button-row">
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => action({ type: 'advance_demo', minutes: 30 })}
            >
              <Clock3 size={17} />
              Majukan 30 menit
            </Button>
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => action({ type: 'advance_demo', minutes: 180 })}
            >
              Lewati jam pickup (+3 jam)
              <ArrowRight size={17} />
            </Button>
          </div>
        </section>
      )}
      <section className="panel">
        <PanelHeading
          title="Ringkasan neraca sesi"
          description="Angka aktual dari produksi dan pengambilan."
        />
        <StockFlow state={state} />
      </section>
      <MovementLedger state={state} />
      <section className="panel">
        <div className="ops-table-toolbar">
          <h2>Log aktivitas</h2>
          <div className="ops-search">
            <Search size={18} />
            <input
              type="search"
              aria-label="Cari log aktivitas"
              placeholder="Cari aktivitas operasional…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
        {logs.length ? (
          <div className="ops-audit-list">
            {logs.map((log) => (
              <article key={log.id}>
                <span className="ops-audit-icon">
                  <ClipboardCheck size={17} />
                </span>
                <div>
                  <h3>{log.action.replaceAll('_', ' ').replace(/pre-order/gi, 'Pick up').replace(/rescue/gi, 'Promo Terbatas')}</h3>
                  <p>{log.detail.replace(/pre-order/gi, 'Pick up').replace(/rescue/gi, 'Promo Terbatas')}</p>
                  <small>
                    Catatan operasional · {dateLabel(log.at)}
                  </small>
                </div>
                <time dateTime={log.at}>
                  {clock(log.at)}
                  <small>WIB</small>
                </time>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Search}
            title="Tidak ada aktivitas yang cocok"
            description="Coba kata pencarian lain untuk menemukan catatan operasional."
          />
        )}
      </section>
    </div>
  );
}

export function AdminDashboard({ tab }: { tab: string }) {
  const { state, loading } = useOperations();
  if (loading || !state)
    return (
      <div className="ops-loading" aria-live="polite">
        <span />
        <p>Menyiapkan ringkasan kantin…</p>
      </div>
    );
  if (tab === 'impact') return <Impact state={state} />;
  if (tab === 'ledger') return <Ledger state={state} />;
  return <AdminOverview state={state} />;
}
