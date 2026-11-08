'use client';

import { useState } from 'react';
import { Banknote, ClipboardCheck, ReceiptText, RotateCcw, Store, Wallet } from 'lucide-react';
import { Badge, EmptyState, Field, Stat } from '../ui';
import { rupiah, type FinanceMethod, type Snapshot } from '@/lib/domain';
import { dateLabel, PanelHeading } from './shared';

const methods: Record<FinanceMethod['method'], string> = {
  qris: 'QRIS', ewallet: 'Dompet digital', bank_transfer: 'Transfer bank', cash: 'Tunai',
  walk_in: 'Pembeli langsung', unrecorded: 'Metode belum tercatat',
};

export function FinanceDashboard({ state }: { state: Snapshot }) {
  const [selectedOutlet, setSelectedOutlet] = useState('all');
  const report = state.finance;
  if (!report) return <EmptyState icon={ReceiptText} title="Laporan belum tersedia" description="Perbarui data untuk memuat ringkasan penjualan dan penerimaan gerai." />;
  const selection = report.outlets.some(row => row.outletId === selectedOutlet) ? selectedOutlet : 'all';
  const rows = selection === 'all' ? report.outlets : report.outlets.filter(row => row.outletId === selection);
  const totals = selection === 'all' ? report : rows[0];
  return <div className="stack ops-page ops-finance">
    <div className="ops-greeting">
      <div><span className="eyebrow">RUANG PENGELOLA KANTIN</span><h1>Penjualan &amp; pemasukan kantin</h1><p className="muted">Pantau hasil penjualan dan penerimaan seluruh gerai dalam kantin Anda.</p></div>
      <Badge tone="neutral">{rows.length} gerai</Badge>
    </div>
    <div className="ops-finance-toolbar">
      <Field label="Gerai yang ditampilkan"><select value={selection} onChange={event => setSelectedOutlet(event.target.value)}><option value="all">Seluruh gerai kantin</option>{report.outlets.map(outlet => <option value={outlet.outletId} key={outlet.outletId}>{outlet.outletName}</option>)}</select></Field>
      <p className="ops-footnote"><strong>Sesi terkini tiap menu</strong><br />{totals.businessDates.map(dateLabel).join(' · ')}. Riwayat sesi lama tersedia pada laporan operasional.</p>
    </div>
    <div className="stat-grid">
      <Stat label="Penerimaan setelah refund" value={<span data-testid="finance-net-payments">{rupiah(totals.netPayments)}</span>} note="Pembayaran diterima dikurangi uang yang sudah dikembalikan" icon={Wallet} />
      <Stat label="Penjualan selesai" value={<span data-testid="finance-gross-sales">{rupiah(totals.grossSales)}</span>} note={`${totals.servedPortions} porsi benar-benar diserahkan`} icon={ClipboardCheck} />
      <Stat label="Menunggu pembayaran" value={rupiah(totals.awaitingPayment)} note="Pesanan aktif yang belum lunas" icon={ReceiptText} />
      <Stat label="Refund menunggu pengembalian" value={rupiah(totals.refundPending)} note="Masih termasuk penerimaan sampai uang dikembalikan" icon={RotateCcw} />
    </div>
    <div className="ops-finance-breakdown">
      <div><Banknote size={19} /><span>Seluruh pembayaran diterima<strong>{rupiah(totals.grossPayments)}</strong></span></div>
      <div><RotateCcw size={19} /><span>Uang sudah dikembalikan<strong>{rupiah(totals.refunds)}</strong></span></div>
      <div><Store size={19} /><span>Penjualan normal<strong>{rupiah(totals.normalSales)}</strong></span></div>
      <div><ReceiptText size={19} /><span>Penjualan Promo Terbatas<strong>{rupiah(totals.promoSales)}</strong></span></div>
    </div>
    <p className="callout ops-finance-explanation">Pembayaran diterima saat penjual atau sistem mengonfirmasi pelunasan. Penjualan selesai dicatat saat makanan diserahkan. Keduanya dapat berbeda ketika pesanan sudah lunas dan masih disiapkan.</p>
    <section className="panel">
      <PanelHeading title="Rincian penjualan dan penerimaan per gerai" description="Angka berasal dari transaksi dan penjualan langsung yang dicatat penjual." />
      <div className="table-wrap"><table className="data-table ops-finance-table">
        <thead><tr><th>Gerai</th><th>Porsi diserahkan</th><th>Penjualan selesai</th><th>Pembayaran diterima</th><th>Refund selesai</th><th>Refund tertunda</th><th>Penerimaan setelah refund</th></tr></thead>
        <tbody>{rows.map(outlet => <tr key={outlet.outletId} data-testid="finance-outlet-row"><td><strong>{outlet.outletName}</strong><span className="ops-table-sub">{outlet.menuCount} menu · {outlet.completedOrders} pesanan online selesai</span></td><td>{outlet.servedPortions}</td><td>{rupiah(outlet.grossSales)}<span className="ops-table-sub">Normal {rupiah(outlet.normalSales)}<br />Promo {rupiah(outlet.promoSales)}</span></td><td>{rupiah(outlet.grossPayments)}</td><td>{rupiah(outlet.refunds)}</td><td>{rupiah(outlet.refundPending)}</td><td><strong>{rupiah(outlet.netPayments)}</strong></td></tr>)}</tbody>
      </table></div>
    </section>
    <section className="panel">
      <PanelHeading title="Penerimaan menurut metode pembayaran" description="Penerimaan sesudah pengembalian belum dikurangi biaya bahan, operasional, atau biaya transaksi." />
      {totals.paymentMethods.length ? <div className="table-wrap"><table className="data-table"><thead><tr><th>Metode</th><th>Diterima</th><th>Dikembalikan</th><th>Menunggu pengembalian</th><th>Setelah refund</th></tr></thead><tbody>{totals.paymentMethods.map(row => <tr key={row.method}><td><strong>{methods[row.method]}</strong>{row.method === 'walk_in' && <span className="ops-table-sub">Metode pembeli langsung belum dicatat terpisah</span>}</td><td>{rupiah(row.grossPayments)}</td><td>{rupiah(row.refunds)}</td><td>{rupiah(row.refundPending)}</td><td>{rupiah(row.netPayments)}</td></tr>)}</tbody></table></div> : <EmptyState icon={Wallet} title="Belum ada penerimaan tercatat" description="Pembayaran terverifikasi dan penjualan langsung akan masuk ke laporan ini." />}
    </section>
    <p className="ops-footnote">Laporan ini memuat transaksi gerai di kantin yang Anda kelola. Tagihan layanan PORSI LOOP dari penyedia platform tidak termasuk penjualan makanan pada laporan ini.</p>
  </div>;
}
