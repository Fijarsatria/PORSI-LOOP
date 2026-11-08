'use client';
import { useState } from 'react';
import { useApp } from '../provider';
import { Field, Button, Badge } from '../ui';
import { rupiah, type Snapshot } from '@/lib/domain';
export function SalesHistory({ state }: { state: Snapshot }) {
  const [date, setDate] = useState(state.businessDate);
  const days = [
    ...new Set([state.businessDate, ...state.history.map((h) => h.date)]),
  ]
    .sort()
    .reverse();
  const past = state.history.filter((h) => h.date === date);
  const current = date === state.businessDate;
  const normal = current
    ? (state.kitchens ?? [state]).reduce(
        (n, k) => n + k.reconciliation.preorderPickedUp + k.metrics.walkin,
        0,
      )
    : past.reduce((n, h) => n + h.preorders + h.walkin, 0);
  const promo = current
    ? state.metrics.rescued
    : past.reduce((n, h) => n + h.rescue, 0);
  const revenue = current
    ? state.metrics.revenue
    : past.length && past.every((h) => h.revenue !== undefined)
      ? past.reduce((n, h) => n + (h.revenue ?? 0), 0)
      : null;
  return (
    <section className="panel sales-history">
      <div>
        <h2>Penjualan per hari</h2>
        <p className="muted">
          Pesanan yang sudah diserahkan dan penjualan langsung.
        </p>
      </div>
      <Field label="Tanggal penjualan">
        <select value={date} onChange={(e) => setDate(e.target.value)}>
          {days.map((d) => (
            <option key={d} value={d}>
              {new Intl.DateTimeFormat('id-ID', {
                dateStyle: 'full',
                timeZone: 'Asia/Jakarta',
              }).format(new Date(d + 'T12:00:00+07:00'))}
            </option>
          ))}
        </select>
      </Field>
      <div className="sales-day-grid">
        <div>
          <small>Normal</small>
          <strong>{normal} porsi</strong>
        </div>
        <div>
          <small>Promo</small>
          <strong>{promo} porsi</strong>
        </div>
        <div>
          <small>Nilai penjualan tersalurkan</small>
          <strong>
            {revenue === null ? 'Belum dicatat' : rupiah(revenue)}
          </strong>
        </div>
      </div>
      <p className="fine-print">
        {current
          ? 'Hari ini masih berjalan.'
          : 'Riwayat mengikuti catatan sesi yang sudah direkonsiliasi. Nilai rupiah pada data lama mungkin belum tersedia.'}
      </p>
    </section>
  );
}
export function SimplePromo({ state }: { state: Snapshot }) {
  const { action, busy, toast } = useApp();
  const [minutes, setMinutes] = useState('30');
  return (
    <div className="stack">
      <div className="promo-intro">
        <Badge tone="green">{state.metrics.availableStock} porsi bebas</Badge>
        <h3>{state.menu.name}</h3>
        <p>Bagikan stok yang masih layak dengan harga lebih ringan.</p>
      </div>
      {state.rescues
        .filter((b) => b.active)
        .map((b) => (
          <article className="promo-live" key={b.id}>
            <div>
              <strong>{rupiah(b.price)} / porsi</strong>
              <p>
                {b.available} porsi tersedia · berakhir{' '}
                {new Date(b.expiresAt).toLocaleTimeString('id-ID', {
                  timeZone: 'Asia/Jakarta',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
            <Button
              variant="ghost"
              disabled={busy}
              onClick={async () => {
                if (
                  await action({
                    type: 'close_rescue',
                    menuId: state.menu.id,
                    batchId: b.id,
                    reason: 'Penjual menghentikan penawaran dari panel promo',
                  })
                )
                  toast('Promo dihentikan. Kuota yang bebas dikembalikan.');
              }}
            >
              Hentikan
            </Button>
          </article>
        ))}
      <form
        className="stack"
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const data = new FormData(form);
          if (
            await action({
              type: 'publish_rescue',
              menuId: state.menu.id,
              quantity: Number(data.get('quantity')),
              price: Number(data.get('price')),
              durationMinutes: Number(minutes),
              description: String(data.get('description')),
              foodChecked: true,
            })
          ) {
            toast('Promo diterbitkan. Customer sekarang bisa memesan.');
            form.reset();
          }
        }}
      >
        <div className="form-grid">
          <Field label="Jumlah porsi">
            <input
              name="quantity"
              type="number"
              min={1}
              max={state.metrics.availableStock}
              defaultValue={1}
              required
            />
          </Field>
          <Field label="Harga promo per porsi">
            <input
              name="price"
              type="number"
              min={1000}
              max={state.menu.prices.regular}
              defaultValue={Math.max(
                1000,
                Math.floor((state.menu.prices.regular * 0.7) / 500) * 500,
              )}
              step={500}
              required
            />
          </Field>
        </div>
        <Field label="Berlaku selama">
          <div className="segmented promo-duration">
            {['15', '30', '45', '60'].map((n) => (
              <button
                type="button"
                key={n}
                className={minutes === n ? 'selected' : ''}
                aria-pressed={minutes === n}
                onClick={() => setMinutes(n)}
              >
                {n} menit
              </button>
            ))}
          </div>
        </Field>
        <Field label="Informasi untuk customer">
          <textarea
            name="description"
            rows={2}
            minLength={10}
            maxLength={400}
            required
            placeholder="Kondisi makanan, komposisi, dan cara penyimpanan"
          />
        </Field>
        <label className="checkbox-field">
          <input type="checkbox" required />
          Saya sudah memeriksa makanan dan memastikan masih layak dikonsumsi.
        </label>
        <Button
          type="submit"
          loading={busy}
          disabled={state.metrics.availableStock < 1}
        >
          Terbitkan promo
        </Button>
        <p className="fine-print">
          Pesanan yang sudah dibayar tetap diproses melalui tiket dan QR.
          Menghentikan promo membatalkan reservasi yang belum diambil sesuai
          aturan pengembalian dana.
        </p>
      </form>
    </div>
  );
}
