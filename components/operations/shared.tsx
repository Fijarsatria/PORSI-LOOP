'use client';

import { createContext, useContext, useState } from 'react';

import { CookingPot, Info } from 'lucide-react';
import { useApp } from '../provider';
import { Badge, Field } from '../ui';
import {
  clock,
  statusNames,
  type Snapshot,
  type OrderStatus,
} from '@/lib/domain';

export const dateLabel = (value: string) =>
  new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value));
export const number = (value: FormDataEntryValue | null) => Number(value ?? 0);
export const statusTone = (status: OrderStatus) =>
  status === 'picked_up' || status === 'ready'
    ? ('green' as const)
    : status === 'confirmed' ||
        status === 'pending_payment' ||
        status === 'preparing'
      ? ('orange' as const)
      : ('neutral' as const);
export const safePercent = (part: number, total: number) =>
  total > 0 ? Math.round((part / total) * 100) : 0;

const OperationsContext = createContext<Snapshot | null>(null);

export function OperationsScope({
  state,
  children,
}: {
  state: Snapshot;
  children: React.ReactNode;
}) {
  return (
    <OperationsContext.Provider value={state}>
      {children}
    </OperationsContext.Provider>
  );
}

export function useOperations() {
  const context = useApp();
  const scoped = useContext(OperationsContext);
  const state = scoped ?? context.state;
  const messages: Record<string, string> = {
    pickup_order: 'Pengambilan Pick up dikonfirmasi.',
    pickup_rescue: 'Pengambilan Promo Terbatas dikonfirmasi.',
    scan_pickup: 'QR valid. Penyerahan makanan berhasil dicatat satu kali.',
    prepare_order: 'Pesanan sedang disiapkan. Status customer diperbarui.',
    verify_cash_payment: 'Pembayaran tunai dikonfirmasi.',
    confirm_cash_refund:
      'Pengembalian uang tunai dikonfirmasi. Status pembeli diperbarui.',
    ready_order: 'Pesanan ditandai siap diambil.',
    record_production: 'Produksi selesai dicatat. Stok siap jual diperbarui.',
    record_walkin: 'Penjualan langsung dicatat.',
    save_menu: 'Informasi menu disimpan.',
    save_slot: 'Kuota slot pengambilan disimpan.',
    override_plan: 'Keputusan perencanaan disimpan.',
    accept_plan: 'Saran persiapan diterima. Stok belum berubah.',
    publish_rescue: 'Penawaran Promo Terbatas diterbitkan.',
    close_rescue: 'Penawaran Promo Terbatas ditutup dan sisa kuota dilepas.',
    advance_demo:
      'Waktu simulasi dimajukan. Status pesanan dan reservasi diperbarui.',
    reconcile: 'Catatan rekonsiliasi disimpan.',
    record_stockout: 'Satu permintaan yang tidak terlayani dicatat.',
  };
  return {
    ...context,
    state,
    busy:
      context.busy ||
      Boolean(state?.user?.role === 'seller' && state.reconciliation.complete),
    action: async (payload: Record<string, unknown>) => {
      const orderAction = [
        'prepare_order',
        'ready_order',
        'verify_cash_payment',
        'confirm_cash_refund',
        'scan_pickup',
      ].includes(String(payload.type));
      const success = await context.action({
        ...(scoped && !orderAction ? { menuId: scoped.menu.id } : {}),
        ...payload,
      });
      if (success && messages[String(payload.type)])
        context.toast(messages[String(payload.type)]);
      return success;
    },
  };
}

export function PanelHeading({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="ops-panel-heading">
      <div>
        <h2>{title}</h2>
        {description && <p className="muted">{description}</p>}
      </div>
      {children}
    </div>
  );
}

export function StatusPill({ status }: { status: OrderStatus }) {
  return <Badge tone={statusTone(status)}>{statusNames[status]}</Badge>;
}

export function StockFlow({ state }: { state: Snapshot }) {
  const r = state.reconciliation;
  const total = r.openingStock + r.produced;
  const items = [
    {
      label: 'Pesanan normal diserahkan',
      value: r.preorderPickedUp,
      className: 'preorder',
    },
    { label: 'Pembeli langsung', value: r.walkin, className: 'walkin' },
    {
      label: 'Promo Terbatas diambil',
      value: r.rescuePickedUp,
      className: 'rescue',
    },
    { label: 'Konsumsi internal', value: r.internal, className: 'internal' },
    { label: 'Makanan dibuang', value: r.waste, className: 'waste' },
    {
      label: 'Stok saat ini',
      value: state.metrics.stock,
      className: 'remaining',
    },
  ];
  return (
    <div className="ops-stock-flow">
      <div className="ops-stock-total">
        <div>
          <span className="eyebrow">STOK FISIK SAAT INI</span>
          <strong>
            {state.metrics.stock}
            <small>porsi</small>
          </strong>
        </div>
        <div className="ops-round-icon">
          <CookingPot size={27} strokeWidth={1.6} />
        </div>
      </div>
      <div
        className="ops-stock-track"
        aria-label={`Distribusi dari ${total} porsi`}
      >
        {items.map((item) => (
          <span
            key={item.label}
            className={item.className}
            style={{ flex: item.value || 0.01 }}
            title={`${item.label}: ${item.value} porsi`}
          />
        ))}
      </div>
      <div className="ops-flow-legend">
        {items.map((item) => (
          <div key={item.label}>
            <span className={`ops-dot ${item.className}`} />
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>
      <p className="ops-footnote">
        <Info size={14} /> {state.metrics.availableStock} porsi bebas komitmen.
        Reservasi menahan kuota; stok berkurang saat diambil.
      </p>
    </div>
  );
}

export function ProductionInsight({ state }: { state: Snapshot }) {
  const r = state.reconciliation;
  const normal = r.preorderPickedUp + r.walkin;
  const total = r.openingStock + r.produced;
  const outputs = [
    { label: 'Terjual normal', value: normal, style: 'normal' },
    {
      label: 'Promo Terbatas diambil',
      value: r.rescuePickedUp,
      style: 'promo',
    },
    { label: 'Dibuang', value: r.waste, style: 'waste' },
    { label: 'Konsumsi internal', value: r.internal, style: 'internal' },
    { label: 'Stok tersisa', value: state.metrics.stock, style: 'remaining' },
  ];
  return (
    <section className="panel ops-production-insight">
      <PanelHeading
        title="Ke mana porsi produksi tersalurkan?"
        description="Hanya penyerahan yang selesai dihitung sebagai penjualan. Pembayaran dan reservasi belum termasuk."
      >
        <Badge tone={r.complete ? 'green' : 'neutral'}>
          {r.complete ? 'Sesi lengkap' : 'Sesi berjalan'}
        </Badge>
      </PanelHeading>
      <div className="ops-insight-equation">
        <div>
          <strong>{r.produced}</strong>
          <span>porsi diproduksi</span>
          {r.openingStock > 0 && <small>+ {r.openingStock} stok awal</small>}
        </div>
        <b aria-hidden="true">=</b>
        <p>
          {normal} normal + {r.rescuePickedUp} promo + {r.waste} dibuang +{' '}
          {r.internal} internal + {state.metrics.stock} tersisa
        </p>
      </div>
      {total > 0 ? (
        <div
          className="ops-insight-track"
          aria-label={`Distribusi ${total} porsi`}
        >
          {outputs
            .filter((item) => item.value > 0)
            .map((item) => (
              <span
                key={item.style}
                className={`ops-segment-${item.style}`}
                style={{ flex: item.value }}
                title={`${item.label}: ${item.value} porsi`}
              />
            ))}
        </div>
      ) : (
        <p className="ops-footnote">
          Belum ada produksi tercatat. Konfirmasikan produksi selesai untuk
          mulai memantau porsi.
        </p>
      )}
      <div className="ops-insight-values">
        {outputs.map((item) => (
          <div key={item.style}>
            <span className={`ops-insight-key ops-segment-${item.style}`} />
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>
      {r.difference !== 0 && (
        <p className="ops-footnote">
          Selisih rekonsiliasi tersimpan: {r.difference} porsi. Lengkapi catatan
          akhir sebelum menggunakan sesi sebagai pembanding.
        </p>
      )}
      <details className="ops-example">
        <summary>Contoh rekonsiliasi: 50 = 40 + 8 + 2</summary>
        <p>
          <strong>Simulasi terpisah dari sesi di atas:</strong> 50 porsi
          diproduksi, 40 terjual normal, 8 Promo Terbatas diambil, dan 2
          dibuang. Stok akhir serta konsumsi internal nol; 48 porsi benar-benar
          terlayani. Contoh ini bukan hasil pilot atau klaim pengurangan limbah.
        </p>
      </details>
    </section>
  );
}

export function MovementLedger({ state }: { state: Snapshot }) {
  const [selection, setSelection] = useState('');
  const session = selection || state.sessionId;
  const entries = state.movements.filter(
    (movement) => (movement.sessionId ?? state.sessionId) === session,
  );
  const labels = {
    opening_balance: 'Saldo saat pembaruan sistem',
    production_confirmed: 'Produksi selesai',
    preorder_pickup: 'Pesanan normal diserahkan',
    walkin_sale: 'Penjualan langsung',
    rescue_pickup: 'Promo Terbatas diambil',
    internal: 'Konsumsi internal',
    waste: 'Makanan dibuang',
    reconciliation_correction: 'Koreksi rekonsiliasi',
  };
  return (
    <section className="panel stack">
      <PanelHeading
        title="Pergerakan stok fisik"
        description="Setiap pergerakan tetap tersimpan setelah sesi berganti."
      />
      <Field label="Sesi yang ditampilkan">
        <select
          value={session}
          onChange={(event) => setSelection(event.target.value)}
        >
          <option value={state.sessionId}>
            Sesi berjalan · {dateLabel(state.businessDate)}
          </option>
          {state.history
            .filter((item) => item.id && item.id !== state.sessionId)
            .map((item) => (
              <option key={item.id} value={item.id}>
                {dateLabel(item.date)} ·{' '}
                {item.closed ? 'Lengkap' : 'Belum lengkap'}
              </option>
            ))}
        </select>
      </Field>
      {entries.length ? (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Waktu (WIB)</th>
                <th scope="col">Pergerakan</th>
                <th scope="col">Porsi</th>
                <th scope="col">Referensi</th>
              </tr>
            </thead>
            <tbody>
              {entries
                .slice()
                .reverse()
                .map((movement) => (
                  <tr key={movement.id}>
                    <td>{clock(movement.at)}</td>
                    <td>{labels[movement.type]}</td>
                    <td>
                      {movement.quantity > 0 ? '+' : ''}
                      {movement.quantity}
                    </td>
                    <td>
                      <code title={movement.reference}>
                        {movement.reference.slice(0, 8)}
                      </code>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="muted">Belum ada pergerakan stok pada sesi ini.</p>
      )}
    </section>
  );
}
