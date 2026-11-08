'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  CookingPot,
  Info,
  Package,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  Sprout,
  TicketCheck,
  Users,
  Utensils,
} from 'lucide-react';
import { useApp } from '../provider';
import { Badge, Button, EmptyState, Field, Modal, Stat } from '../ui';
import { clock, rupiah, type Snapshot, type Order, type RescueClaim } from '@/lib/domain';
import './styles.css';

import {
  useOperations,
  PanelHeading,
  StatusPill,
  StockFlow,
  number,
  OperationsScope,
  ProductionInsight,
} from './shared';
import { PickupScanner } from './pickup-scanner';

function PickupForm() {
  return (
    <div className="ops-pickup-form">
      <PickupScanner />
      <p className="ops-footnote">
        Verifikasi lunas, siap, gerai yang benar, dan QR sekali pakai sebelum makanan diserahkan.
      </p>
    </div>
  );
}

function ProductionForm({
  state,
  onDone,
}: {
  state: Snapshot;
  onDone?: () => void;
}) {
  const { action, busy } = useOperations();
  return (
    <form
      className="stack"
      onSubmit={async (event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        if (
          await action({
            type: 'record_production',
            quantity: number(data.get('quantity')),
          })
        )
          onDone?.();
      }}
    >
      <div className="callout">
        <CookingPot size={19} />
        <p>
          Catat porsi yang sudah selesai dimasak. Tindakan ini menambah stok
          siap jual, bukan sekadar menyimpan rencana.
        </p>
      </div>
      <Field
        label="Produksi selesai (porsi)"
        hint={`Kapasitas sesi ${state.recommendation.capacity} porsi. Saran tambahan saat ini ${state.recommendation.toProduce} porsi.`}
      >
        <input
          name="quantity"
          type="number"
          min="1"
          max={Math.max(
            1,
            state.recommendation.capacity - state.metrics.produced,
          )}
          step="1"
          defaultValue={Math.max(1, state.recommendation.toProduce)}
          required
          inputMode="numeric"
        />
      </Field>
      <Button
        type="submit"
        disabled={
          busy || state.metrics.produced >= state.recommendation.capacity
        }
      >
        <CheckCircle2 size={17} />
        Konfirmasi produksi selesai
      </Button>
    </form>
  );
}

function WalkinForm({ state }: { state: Snapshot }) {
  const { action, busy } = useOperations();
  const [quantity, setQuantity] = useState(1);
  return (
    <form
      className="stack"
      onSubmit={async (event) => {
        event.preventDefault();
        if (await action({ type: 'record_walkin', quantity })) setQuantity(1);
      }}
    >
      <div className="ops-walkin-row">
        <div>
          <label htmlFor="walkin-quantity">Porsi terjual</label>
          <p className="muted">Pembelian langsung di gerai</p>
        </div>
        <div className="ops-stepper">
          <button
            type="button"
            aria-label="Kurangi porsi walk-in"
            disabled={quantity <= 1}
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
          >
            −
          </button>
          <input
            id="walkin-quantity"
            type="number"
            inputMode="numeric"
            min="1"
            max={Math.max(1, state.metrics.availableStock)}
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            required
          />
          <button
            type="button"
            aria-label="Tambah porsi walk-in"
            disabled={quantity >= state.metrics.availableStock}
            onClick={() => setQuantity(quantity + 1)}
          >
            +
          </button>
        </div>
      </div>
      <Button
        variant="secondary"
        type="submit"
        disabled={
          busy ||
          state.metrics.availableStock < 1 ||
          quantity < 1 ||
          quantity > state.metrics.availableStock
        }
      >
        <Plus size={17} />
        Catat penjualan langsung
      </Button>
      <p className="ops-footnote">
        Stok bebas komitmen: {state.metrics.availableStock} porsi. Kanal ini
        dicatat terpisah dari Pick up terjadwal.
      </p>
      {state.metrics.availableStock === 0 && (
        <Button
          type="button"
          variant="ghost"
          disabled={busy}
          onClick={() =>
            action({
              type: 'record_stockout',
              reason:
                'Satu permintaan walk-in tidak terpenuhi karena stok bebas habis.',
            })
          }
        >
          Catat 1 permintaan tak terlayani
        </Button>
      )}
    </form>
  );
}

function MenuSettings({
  state,
  onDone,
}: {
  state: Snapshot;
  onDone: () => void;
}) {
  const { action, busy } = useOperations();
  return (
    <form
      className="stack"
      onSubmit={async (event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        if (
          await action({
            type: 'save_menu',
            name: data.get('name'),
            description: data.get('description'),
            outlet: data.get('outlet'),
            location: data.get('location'),
            allergens: String(data.get('allergens') ?? '')
              .split(',')
              .map((value) => value.trim())
              .filter(Boolean),
            variableCost: number(data.get('variableCost')),
            regularPrice: number(data.get('regularPrice')),
            smallPrice: number(data.get('smallPrice')),
            active: data.get('active') === 'on',
          })
        )
          onDone();
      }}
    >
      <div className="form-grid">
        <Field label="Nama gerai">
          <input
            name="outlet"
            defaultValue={state.menu.outlet}
            maxLength={100}
            required
          />
        </Field>
        <Field label="Lokasi pengambilan">
          <input
            name="location"
            defaultValue={state.menu.location}
            maxLength={150}
            required
          />
        </Field>
      </div>
      <Field label="Nama menu">
        <input
          name="name"
          defaultValue={state.menu.name}
          maxLength={100}
          required
        />
      </Field>
      <Field
        label="Alergen yang diketahui"
        hint="Pisahkan dengan koma. Jika belum diketahui, konfirmasikan komposisi sebelum membuka menu."
      >
        <input
          name="allergens"
          defaultValue={state.menu.allergens.join(', ')}
          maxLength={500}
          placeholder="Contoh: kedelai, gandum, telur"
        />
      </Field>
      <Field
        label="Biaya variabel per porsi (Rp)"
        hint="Biaya bahan dan biaya variabel aktual; bukan harga jual."
      >
        <input
          name="variableCost"
          type="number"
          min="0"
          max="1000000"
          step="1"
          defaultValue={state.menu.variableCost}
          required
        />
      </Field>
      <Field label="Deskripsi menu">
        <textarea
          name="description"
          defaultValue={state.menu.description}
          rows={3}
          required
        />
      </Field>
      <div className="form-grid">
        <Field label={`Harga ${state.menu.portionLabels.small}`}>
          <input
            type="number"
            name="smallPrice"
            defaultValue={state.menu.prices.small}
            min="1000"
            step="500"
            required
          />
        </Field>
        <Field label={`Harga ${state.menu.portionLabels.regular}`}>
          <input
            type="number"
            name="regularPrice"
            defaultValue={state.menu.prices.regular}
            min="1000"
            step="500"
            required
          />
        </Field>
      </div>
      <label className="ops-checkbox">
        <input
          type="checkbox"
          name="active"
          defaultChecked={state.menu.active}
        />
        <span>Menu tersedia untuk dipesan</span>
      </label>
      <Button type="submit" disabled={busy}>
        Simpan menu
      </Button>
    </form>
  );
}

function SellerOverview({ state }: { state: Snapshot }) {
  const [productionOpen, setProductionOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const active = state.orders.filter(
    (order) => activeStatuses.includes(order.status),
  );
  return (
    <div className="stack ops-page">
      <div className="ops-greeting">
        <div>
          <span className="eyebrow">DAPUR YANG LEBIH TERENCANA</span>
          <h1>
            Selamat datang, {state.user?.name.split(' ')[0] || 'Mitra'}
            <span className="ops-greeting-dot">.</span>
          </h1>
          <p className="muted">
            Satu tempat untuk merencanakan porsi dan melayani dengan pasti.
          </p>
        </div>
        <Button onClick={() => setProductionOpen(true)}>
          <Plus size={17} />
          Catat produksi
        </Button>
      </div>
      <div className="stat-grid">
        <Stat
          label="Pesanan aktif"
          value={state.metrics.activeOrders}
          note={`${state.recommendation.preorders} porsi terkonfirmasi`}
          icon={ShoppingBag}
        />
        <Stat
          label="Produksi selesai"
          value={state.metrics.produced}
          note="Porsi yang benar-benar diproduksi"
          icon={CookingPot}
        />
        <Stat
          label="Penjualan langsung"
          value={state.metrics.walkin}
          note="Porsi terjual lewat walk-in"
          icon={Users}
        />
        <Stat
          label="Promo Terbatas tersalurkan"
          value={state.metrics.rescued}
          note="Sudah diserahkan, bukan reservasi"
          icon={Sprout}
        />
      </div>
      <ProductionInsight state={state} />
      <div className="ops-main-grid">
        <section className="panel">
          <PanelHeading
            title="Perjalanan porsi hari ini"
            description="Setiap porsi tercatat, dari dapur hingga diambil."
          >
            <Badge tone="green">Sesi berjalan</Badge>
          </PanelHeading>
          <StockFlow state={state} />
        </section>
        <section className="panel ops-plan-teaser">
          <span className="eyebrow">RENCANA PERSIAPAN</span>
          <div className="ops-plan-number">
            {state.recommendation.override?.target ??
              state.recommendation.target}
            <span>porsi</span>
          </div>
          <h2>Mulai dari permintaan nyata.</h2>
          <p>
            {state.recommendation.preorders} Pick up terjadwal +{' '}
            {state.recommendation.walkinEstimate} estimasi walk-in +{' '}
            {state.recommendation.buffer} buffer.
          </p>
          <div className="ops-plan-source">
            <ClipboardCheck size={16} />
            {state.recommendation.source === 'manual'
              ? 'Baseline manual · data terbatas'
              : `${state.recommendation.historyDays} sesi lengkap berlabel walk-in`}
          </div>
          <Link href="/gerai?tab=planning" className="ops-plan-link">
            Tinjau rencana persiapan
            <ArrowRight size={16} />
          </Link>
        </section>
      </div>
      <div className="grid-2">
        <section className="panel">
          <PanelHeading
            title="Konfirmasi pengambilan"
            description="Untuk Dine in, Pick up, dan Promo Terbatas."
          />
          <PickupForm />
        </section>
        <section className="panel">
          <PanelHeading
            title="Pembeli datang langsung?"
            description="Catat dalam satu langkah, tanpa membuat pesanan baru."
          />
          <WalkinForm state={state} />
        </section>
      </div>
      <section className="panel">
        <PanelHeading
          title="Menu sesi ini"
          description="Kelola informasi yang dilihat mahasiswa."
        >
          <Button variant="ghost" onClick={() => setMenuOpen(true)}>
            <Settings2 size={16} />
            Atur menu
          </Button>
        </PanelHeading>
        <div className="ops-menu-summary">
          <img
            src={state.menu.image}
            alt={state.menu.name}
            width={84}
            height={84}
          />
          <div>
            <Badge tone={state.menu.active ? 'green' : 'neutral'}>
              {state.menu.active ? 'Tersedia' : 'Ditutup'}
            </Badge>
            <h3>{state.menu.name}</h3>
            <p className="muted">
              {state.menu.outlet} · {state.menu.location}
            </p>
          </div>
          <strong>
            {rupiah(state.menu.prices.regular)}
            <small>{state.menu.portionLabels.regular}</small>
          </strong>
        </div>
      </section>
      <section className="panel">
        <PanelHeading
          title="Menunggu diambil"
          description={`${active.length} pesanan aktif pada sesi ini.`}
        />
        {active.length ? (
          <OrderTable state={state} limit={5} />
        ) : (
          <EmptyState
            icon={ShoppingBag}
            title="Belum ada pesanan aktif"
            description="Pesanan yang masuk akan muncul di sini beserta pembayaran dan waktu pemenuhannya."
          />
        )}
      </section>
      <Modal
        open={productionOpen}
        onClose={() => setProductionOpen(false)}
        title="Catat produksi selesai"
      >
        <ProductionForm state={state} onDone={() => setProductionOpen(false)} />
      </Modal>
      <Modal
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        title="Atur menu harian"
      >
        <MenuSettings state={state} onDone={() => setMenuOpen(false)} />
      </Modal>
    </div>
  );
}

function Planning({ state }: { state: Snapshot }) {
  const { action, busy } = useOperations();
  const [productionOpen, setProductionOpen] = useState(false);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const r = state.recommendation;
  return (
    <div className="stack ops-page">
      <div className="ops-greeting">
        <div>
          <span className="eyebrow">SEBELUM MULAI MEMASAK</span>
          <h1>Rencanakan porsi, dengan alasan.</h1>
          <p className="muted">
            Saran yang bisa Anda periksa. Keputusan tetap di tangan Anda.
          </p>
        </div>
        <Badge tone={r.source === 'manual' ? 'orange' : 'green'}>
          {r.source === 'manual'
            ? 'Data terbatas · baseline manual'
            : 'Histori walk-in tersedia'}
        </Badge>
      </div>
      <div className="ops-planning-layout">
        <section className="panel ops-recommendation">
          <span className="eyebrow">SARAN PERSIAPAN SESI</span>
          <div className="ops-recommendation-value">
            {r.override?.target ?? r.target}
            <span>porsi</span>
          </div>
          <div className="ops-equation">
            <div>
              <strong>{r.preorders}</strong>
              <span>Pick up terjadwal</span>
            </div>
            <b>+</b>
            <div>
              <strong>{r.walkinEstimate}</strong>
              <span>Walk-in</span>
            </div>
            <b>+</b>
            <div>
              <strong>{r.buffer}</strong>
              <span>Buffer</span>
            </div>
          </div>
          <p>
            Estimasi walk-in {r.walkinRange[0]}–{r.walkinRange[1]} porsi.{' '}
            {r.source === 'manual'
              ? 'Angka awal berasal dari baseline yang Anda masukkan, bukan prediksi model.'
              : `Dihitung dari ${r.historyDays} sesi lengkap pada kanal walk-in.`}
          </p>
          <div className="ops-plan-details">
            <div>
              <span>Stok siap jual</span>
              <strong>{r.readyStock} porsi</strong>
            </div>
            <div>
              <span>Kapasitas sesi</span>
              <strong>{r.capacity} porsi</strong>
            </div>
            <div>
              <span>Saran produksi tambahan</span>
              <strong>{r.toProduce} porsi</strong>
            </div>
          </div>
          {r.override && (
            <div className="ops-override-note">
              <SlidersHorizontal size={17} />
              <div>
                <strong>
                  Anda menyesuaikan menjadi {r.override.target} porsi
                </strong>
                <p>{r.override.reason}</p>
                {r.override.originalTarget !== undefined && (
                  <small>
                    Saran awal saat keputusan: {r.override.originalTarget}{' '}
                    porsi.
                  </small>
                )}
                <small>Tercatat pukul {clock(r.override.at)} WIB</small>
              </div>
            </div>
          )}
          <div className="ops-button-row">
            <Button
              disabled={busy}
              onClick={() =>
                action({
                  type: 'accept_plan',
                  target: r.target,
                })
              }
            >
              <Check size={17} />
              {r.accepted ? 'Saran diterima' : 'Terima saran'}
            </Button>
            <Button variant="secondary" onClick={() => setOverrideOpen(true)}>
              Ubah jumlah
            </Button>
          </div>
          <p className="ops-footnote">
            <Info size={14} />
            Menerima saran tidak menambah stok. Konfirmasikan setelah produksi
            selesai.
          </p>
        </section>
        <div className="stack">
          <section className="panel">
            <PanelHeading
              title="Dasar perencanaan"
              description="Sesuaikan dengan kondisi operasional gerai."
            />
            <form
              className="stack"
              onSubmit={async (event) => {
                event.preventDefault();
                const data = new FormData(event.currentTarget);
                await action({
                  type: 'override_plan',
                  manualBaseline: number(data.get('walkinEstimate')),
                  buffer: number(data.get('buffer')),
                  capacity: number(data.get('capacity')),
                  target: Math.min(
                    number(data.get('capacity')),
                    r.preorders +
                      (r.source === 'history'
                        ? r.walkinEstimate
                        : number(data.get('walkinEstimate'))) +
                      number(data.get('buffer')),
                  ),
                  reason: String(data.get('reason') || ''),
                });
              }}
            >
              <Field
                label="Baseline pembeli langsung (porsi)"
                hint={
                  r.source === 'history'
                    ? 'Histori walk-in sedang digunakan. Baseline ini disimpan untuk saat data histori belum mencukupi.'
                    : 'Masukkan hanya pembeli walk-in; pisahkan komitmen Pick up terjadwal.'
                }
              >
                <input
                  type="number"
                  name="walkinEstimate"
                  defaultValue={r.walkinEstimate}
                  min="0"
                  max="500"
                  step="1"
                  required
                  inputMode="numeric"
                />
              </Field>
              <div className="form-grid">
                <Field label="Buffer (porsi)">
                  <input
                    type="number"
                    name="buffer"
                    defaultValue={r.buffer}
                    min="0"
                    max="50"
                    step="1"
                    required
                    inputMode="numeric"
                  />
                </Field>
                <Field label="Kapasitas sesi">
                  <input
                    type="number"
                    name="capacity"
                    defaultValue={r.capacity}
                    min={Math.max(1, r.preorders)}
                    max="500"
                    step="1"
                    required
                    inputMode="numeric"
                  />
                </Field>
              </div>
              <Field
                label="Alasan pembaruan"
                hint="Perubahan dasar perencanaan dicatat dalam log keputusan."
              >
                <input
                  name="reason"
                  minLength={5}
                  maxLength={300}
                  placeholder="Contoh: kapasitas bertambah untuk acara fakultas"
                  required
                />
              </Field>
              <Button variant="secondary" type="submit" disabled={busy}>
                Perbarui dasar perencanaan
              </Button>
            </form>
          </section>
          <section className="panel ops-quiet-card">
            <ShieldCheck size={24} />
            <h3>Permintaan tidak dihitung dua kali.</h3>
            <p className="muted">
              Histori penjualan total tidak dijumlahkan dengan komitmen Pick up terjadwal.
              Estimasi hanya memakai kanal walk-in dan sesi yang rekonsiliasinya
              lengkap.
            </p>
          </section>
        </div>
      </div>
      <section className="panel">
        <PanelHeading
          title="Sudah selesai dimasak?"
          description="Catat hasil produksi aktual untuk membuka stok siap jual."
        >
          <Button onClick={() => setProductionOpen(true)}>
            <CookingPot size={17} />
            Konfirmasi produksi
          </Button>
        </PanelHeading>
        <div className="ops-production-status">
          <div>
            <span className="ops-round-icon">
              <Package size={22} />
            </span>
            <div>
              <strong>{state.metrics.produced} porsi</strong>
              <span>Produksi selesai tercatat</span>
            </div>
          </div>
          <ArrowRight size={20} />
          <div>
            <span className="ops-round-icon">
              <Utensils size={22} />
            </span>
            <div>
              <strong>{state.metrics.stock} porsi</strong>
              <span>Stok fisik saat ini</span>
            </div>
          </div>
        </div>
      </section>
      <SlotSettings state={state} />
      <Modal
        open={productionOpen}
        onClose={() => setProductionOpen(false)}
        title="Konfirmasi produksi selesai"
      >
        <ProductionForm state={state} onDone={() => setProductionOpen(false)} />
      </Modal>
      <Modal
        open={overrideOpen}
        onClose={() => setOverrideOpen(false)}
        title="Sesuaikan jumlah persiapan"
      >
        <form
          className="stack"
          onSubmit={async (event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            if (
              await action({
                type: 'override_plan',
                target: number(data.get('target')),
                reason: data.get('reason'),
              })
            )
              setOverrideOpen(false);
          }}
        >
          <Field
            label="Jumlah persiapan pilihan Anda"
            hint={`Minimal ${r.preorders} porsi untuk komitmen Pick up terjadwal; maksimal kapasitas ${r.capacity}.`}
          >
            <input
              name="target"
              type="number"
              defaultValue={r.override?.target ?? r.target}
              min={r.preorders}
              max={r.capacity}
              step="1"
              required
            />
          </Field>
          <Field
            label="Alasan penyesuaian"
            hint="Contoh: ada kegiatan fakultas atau bahan baku terbatas."
          >
            <textarea
              name="reason"
              rows={3}
              minLength={5}
              maxLength={300}
              required
              placeholder="Tuliskan konteks keputusan Anda"
            />
          </Field>
          <Button type="submit" disabled={busy}>
            Simpan keputusan produksi
          </Button>
        </form>
      </Modal>
    </div>
  );
}

function SlotSettings({ state }: { state: Snapshot }) {
  const { action, busy } = useOperations();
  return (
    <section className="panel">
      <PanelHeading
        title="Kuota slot pengambilan"
        description="Kapasitas baru tidak boleh lebih rendah dari pesanan yang sudah masuk."
      />
      <div className="ops-slots-grid">
        {state.slots.map((slot) => (
          <form
            className="ops-slot-editor"
            key={slot.id}
            onSubmit={async (event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              await action({
                type: 'save_slot',
                slotId: slot.id,
                capacity: number(data.get('capacity')),
              });
            }}
          >
            <div>
              <Clock3 size={17} />
              <strong>{slot.label}</strong>
              <Badge tone={slot.closed ? 'neutral' : 'green'}>
                {slot.closed ? 'Ditutup' : 'Terbuka'}
              </Badge>
            </div>
            <p>
              {slot.reserved} dipesan · {slot.available} tersedia
            </p>
            <Field label="Kapasitas porsi">
              <input
                name="capacity"
                type="number"
                defaultValue={slot.capacity}
                min={Math.max(1, slot.reserved)}
                max="500"
                required
              />
            </Field>
            <Button variant="ghost" type="submit" disabled={busy}>
              Simpan kuota
              <ChevronRight size={15} />
            </Button>
          </form>
        ))}
      </div>
    </section>
  );
}

const paymentLabels = { pending: 'Belum lunas', paid: 'Lunas', refund_pending: 'Menunggu pengembalian uang', refunded: 'Dikembalikan', expired: 'Pembayaran kedaluwarsa' };
const paymentMethods = { qris: 'QRIS', ewallet: 'Dompet digital', bank_transfer: 'Transfer bank', cash: 'Tunai' };
const activeStatuses = ['pending_payment', 'confirmed', 'preparing', 'ready'];

function PaymentDetails({ item }: { item: Order | RescueClaim }) {
  return <div className="ops-payment-details">
    <Badge tone={item.paymentStatus === 'paid' ? 'green' : item.paymentStatus === 'pending' ? 'orange' : 'neutral'}>
      {item.paymentStatus ? paymentLabels[item.paymentStatus] : 'Catatan pembayaran lama'}
    </Badge>
    <span className="ops-table-sub">{item.paymentMethod ? paymentMethods[item.paymentMethod] : 'Data simulasi lama'}</span>
  </div>;
}

function OrderActions({ item, claim = false }: { item: Order | RescueClaim; claim?: boolean }) {
  const { action } = useOperations();
  const { busy } = useApp();
  const [refundOpen, setRefundOpen] = useState(false);
  const reference = claim ? { claimId: item.id } : { orderId: item.id };
  if (item.paymentStatus === 'refund_pending') return <>
    <Button variant="secondary" disabled={busy} onClick={() => setRefundOpen(true)}>Konfirmasi uang dikembalikan</Button>
    <Modal open={refundOpen} onClose={() => setRefundOpen(false)} title="Konfirmasi pengembalian tunai">
      <form className="stack" onSubmit={async (event) => { event.preventDefault(); if (await action({ type: 'confirm_cash_refund', ...reference })) setRefundOpen(false); }}>
        <p>Kembalikan {rupiah(item.price * item.quantity)} kepada {item.customer} untuk pesanan {item.code} sebelum menyimpan konfirmasi.</p>
        <label className="checkbox-field"><input type="checkbox" required /> Saya sudah mengembalikan uang tunai kepada pembeli.</label>
        <Button type="submit" loading={busy}>Simpan konfirmasi pengembalian</Button>
      </form>
    </Modal>
  </>;
  if (!activeStatuses.includes(item.status)) return null;
  return <div className="ops-row-actions">
    {item.paymentStatus === 'pending' && item.paymentMethod === 'cash' && <Button variant="secondary" disabled={busy} onClick={() => action({ type: 'verify_cash_payment', ...reference })}>Tunai diterima</Button>}
    {item.paymentStatus === 'pending' && item.paymentMethod !== 'cash' && <span className="ops-footnote">Menunggu pembayaran</span>}
    {item.paymentStatus === 'paid' && item.status === 'confirmed' && <Button variant="secondary" disabled={busy} onClick={() => action({ type: 'prepare_order', ...reference })}><CookingPot size={15} />Mulai siapkan</Button>}
    {item.paymentStatus === 'paid' && item.status === 'preparing' && <Button disabled={busy} onClick={() => action({ type: 'ready_order', ...reference })}><Check size={15} />Tandai siap</Button>}
    {item.status === 'ready' && <span className="ops-ready-hint"><TicketCheck size={15} />Scan QR saat serah-terima</span>}
  </div>;
}

function PromoClaimTable({ claims }: { claims: RescueClaim[] }) {
  return claims.length ? <div className="table-wrap"><table className="data-table ops-order-table">
    <thead><tr><th>Pesanan promo</th><th>Menu & porsi</th><th>Pemenuhan</th><th>Pembayaran</th><th>Status & tindakan</th></tr></thead>
    <tbody>{claims.map((claim) => <tr key={claim.id}>
      <td><strong className="ops-code">{claim.code}</strong><span className="ops-table-sub">{claim.customer}</span></td>
      <td><strong>{claim.menuName}</strong><span className="ops-table-sub">{claim.quantity} porsi · {rupiah(claim.price * claim.quantity)}</span></td>
      <td><strong>{claim.fulfillment === 'dine_in' ? 'Dine in' : 'Pick up'}</strong><span className="ops-table-sub">Sebelum {clock(claim.expiresAt)} WIB</span></td>
      <td><PaymentDetails item={claim} /></td>
      <td><StatusPill status={claim.status} /><OrderActions item={claim} claim /></td>
    </tr>)}</tbody>
  </table></div> : <p className="muted">Belum ada pesanan Promo Terbatas yang cocok dengan filter.</p>;
}

function OrderTable({
  state,
  query = '',
  filter = 'all',
  limit,
}: {
  state: Snapshot;
  query?: string;
  filter?: string;
  limit?: number;
}) {
  const orders = state.orders.filter(
    (order) =>
      (!query ||
        `${order.code} ${order.customer} ${order.menuName}`
          .toLowerCase()
          .includes(query.toLowerCase())) &&
      (filter === 'all' || order.status === filter),
  );
  const shown = limit
    ? orders
        .filter(
          (order) => activeStatuses.includes(order.status),
        )
        .slice(0, limit)
    : orders;
  return shown.length ? (
    <div className="table-wrap">
      <table className="data-table ops-order-table">
        <thead>
          <tr>
            <th>Pesanan</th>
            <th>Menu & porsi</th>
            <th>Pemenuhan</th>
            <th>Pembayaran</th>
            <th>Status</th>
            <th>
              <span className="sr-only">Tindakan</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {shown.map((order) => (
            <tr key={order.id}>
              <td>
                <strong className="ops-code">{order.code}</strong>
                <span className="ops-table-sub">{order.customer}</span>
              </td>
              <td>
                <strong>{order.menuName}</strong>
                <span className="ops-table-sub">
                  {order.quantity} × {(state.menus?.find((menu) => menu.id === order.menuId) ?? state.menu).portionLabels[order.portion]} ·{' '}
                  {rupiah(order.price * order.quantity)}
                </span>
              </td>
              <td>
                <strong>{order.fulfillment === 'dine_in' ? 'Dine in' : 'Pick up'}</strong>
                <span className="ops-table-slot">
                  <Clock3 size={14} />
                  {order.slotLabel}
                </span>
              </td>
              <td><PaymentDetails item={order} /></td>
              <td>
                <StatusPill status={order.status} />
              </td>
              <td>
                <OrderActions item={order} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <EmptyState
      icon={ShoppingBag}
      title="Tidak ada pesanan yang cocok"
      description="Coba kode lain atau tampilkan semua status pesanan."
    />
  );
}

function Orders({ state }: { state: Snapshot }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const activeCount = [...state.orders, ...state.claims].filter((item) => activeStatuses.includes(item.status)).length;
  const claims = state.claims.filter((claim) => (filter === 'all' || claim.status === filter) && `${claim.code} ${claim.customer} ${claim.menuName}`.toLowerCase().includes(query.toLowerCase()));
  return (
    <div className="stack ops-page">
      <div className="ops-greeting">
        <div>
          <span className="eyebrow">LAYANI SESUAI SLOT</span>
          <h1>Antrean gerai, dari bayar hingga siap.</h1>
          <p className="muted">
            Semua menu gerai Anda. Siapkan pesanan yang sudah lunas, lalu scan QR saat makanan diserahkan.
          </p>
        </div>
        <Badge tone="green">{activeCount} pesanan aktif</Badge>
      </div>
      <section className="panel">
        <PanelHeading
          title="Serahkan setelah terverifikasi"
          description="Pemindai berlaku untuk Dine in, Pick up, dan Promo Terbatas."
        />
        <PickupForm />
      </section>
      <section className="panel">
        <div className="ops-table-toolbar">
          <div className="ops-search">
            <Search size={18} />
            <input
              type="search"
              aria-label="Cari pesanan"
              placeholder="Cari kode atau nama pemesan…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <select
            aria-label="Filter status pesanan"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">Semua status</option>
            <option value="pending_payment">Menunggu pembayaran</option>
            <option value="confirmed">Terkonfirmasi</option>
            <option value="preparing">Sedang disiapkan</option>
            <option value="ready">Siap diambil</option>
            <option value="picked_up">Sudah diambil</option>
            <option value="cancelled">Dibatalkan</option>
            <option value="no_show">Tidak diambil</option>
            <option value="expired">Kedaluwarsa</option>
          </select>
        </div>
        <OrderTable state={state} query={query} filter={filter} />
      </section>
      <section className="panel"><PanelHeading title="Antrean Promo Terbatas" description="Pembayaran dan tahapan penyerahan diperiksa dengan aturan yang sama." /><PromoClaimTable claims={claims} /></section>
      <div className="callout">
        <Clock3 size={19} />
        <p>
          Pesanan yang melewati akhir slot tanpa diambil ditandai tidak diambil
          oleh server. Porsinya tidak masuk hitungan layanan selesai.
        </p>
      </div>
    </div>
  );
}

function Rescue({ state }: { state: Snapshot }) {
  const { action, busy } = useOperations();
  const [open, setOpen] = useState(false);
  const [closingBatch, setClosingBatch] = useState<string | null>(null);
  const active = state.rescues.filter(
    (batch) => batch.active && new Date(batch.expiresAt) > new Date(state.now),
  );
  return (
    <div className="stack ops-page">
      <div className="ops-greeting">
        <div>
          <span className="eyebrow">SAAT MASIH ADA YANG TERSISA</span>
          <h1>Porsi baik, kesempatan berikutnya.</h1>
          <p className="muted">
            Tawarkan stok aktual yang masih layak. Produksi tambahan bukan untuk
            Promo Terbatas.
          </p>
        </div>
        <Button
          onClick={() => setOpen(true)}
          disabled={state.metrics.availableStock < 1}
        >
          <Plus size={17} />
          Buat Promo Terbatas
        </Button>
      </div>
      <div className="stat-grid">
        <Stat
          label="Stok bebas komitmen"
          value={state.metrics.availableStock}
          note="Batas maksimal kuota baru"
          icon={Package}
        />
        <Stat
          label="Dalam reservasi"
          value={state.metrics.rescueReserved}
          note="Belum dihitung tersalurkan"
          icon={Clock3}
        />
        <Stat
          label="Promo Terbatas tersalurkan"
          value={state.metrics.rescued}
          note="Pickup terkonfirmasi"
          icon={Sprout}
        />
      </div>
      <section className="panel">
        <PanelHeading
          title="Penawaran Promo Terbatas"
          description={`${active.length} penawaran aktif pada sesi ini.`}
        />
        {state.rescues.length ? (
          <div className="ops-rescue-grid">
            {state.rescues.map((batch) => (
              <article className="ops-rescue-card" key={batch.id}>
                <div className="ops-rescue-image">
                  <img
                    src={state.menu.image}
                    alt={batch.menuName}
                    width={340}
                    height={180}
                  />
                  <Badge
                    tone={
                      active.some((a) => a.id === batch.id)
                        ? 'green'
                        : 'neutral'
                    }
                  >
                    {active.some((a) => a.id === batch.id)
                      ? 'Penawaran aktif'
                      : 'Selesai'}
                  </Badge>
                </div>
                <div className="ops-rescue-body">
                  <h3>{batch.menuName}</h3>
                  <p className="muted">{batch.description}</p>
                  <div className="ops-rescue-price">
                    <strong>{rupiah(batch.price)}</strong>
                    <del>{rupiah(batch.originalPrice)}</del>
                  </div>
                  <div className="ops-rescue-meta">
                    <span>
                      <Package size={15} />
                      {batch.available} dari {batch.quantity} porsi tersedia
                    </span>
                    <span>
                      <Clock3 size={15} />
                      Ambil sebelum {clock(batch.expiresAt)} WIB
                    </span>
                  </div>
                  <div className="ops-safety-note">
                    <ShieldCheck size={15} />
                    Kelayakan diperiksa oleh penjual
                  </div>
                  {active.some((a) => a.id === batch.id) && (
                    <Button
                      variant="ghost"
                      className="ops-close-offer"
                      onClick={() => setClosingBatch(batch.id)}
                    >
                      Tutup penawaran
                    </Button>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Sprout}
            title="Belum ada Promo Terbatas"
            description="Jika ada stok yang masih layak menjelang akhir sesi, buat penawaran dengan kuota dan batas pickup yang jelas."
          />
        )}
      </section>
      <section className="panel">
        <PanelHeading
          title="Reservasi & pengambilan"
          description="Kuota ditahan saat reservasi; distribusi tercatat setelah pickup."
        ><PickupScanner /></PanelHeading>
        <PromoClaimTable claims={state.claims} />
      </section>
      <div className="callout">
        <ShieldCheck size={20} />
        <p>
          Waktu reservasi tidak memperpanjang kelayakan makanan. Jangan tawarkan
          sisa piring, makanan dengan riwayat penanganan tidak diketahui, atau
          yang menunjukkan tanda kerusakan.
        </p>
      </div>
      <Modal
        open={Boolean(closingBatch)}
        onClose={() => setClosingBatch(null)}
        title="Tutup Promo Terbatas"
      >
        <form
          className="stack"
          onSubmit={async (event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            if (
              await action({
                type: 'close_rescue',
                batchId: closingBatch,
                reason: data.get('reason'),
              })
            )
              setClosingBatch(null);
          }}
        >
          <div className="callout">
            <Info size={19} />
            <p>
              Sisa kuota akan dilepas. Reservasi yang belum diambil dibatalkan.
              Gunakan jika penawaran berakhir lebih cepat atau kondisi makanan
              berubah.
            </p>
          </div>
          <Field label="Alasan penutupan">
            <textarea
              name="reason"
              rows={3}
              minLength={5}
              maxLength={300}
              required
              placeholder="Tuliskan alasan penawaran dihentikan"
            />
          </Field>
          <Button type="submit" disabled={busy}>
            Tutup Promo Terbatas
          </Button>
        </form>
      </Modal>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Buat Promo Terbatas"
      >
        <form
          className="stack"
          onSubmit={async (event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            if (
              await action({
                type: 'publish_rescue',
                quantity: number(data.get('quantity')),
                price: number(data.get('price')),
                durationMinutes: number(data.get('expiresInMinutes')),
                description: data.get('description'),
                foodChecked: true,
              })
            )
              setOpen(false);
          }}
        >
          <div className="callout">
            <Info size={18} />
            <p>
              Maksimal {state.metrics.availableStock} porsi yang bebas komitmen.
              Informasi alergen menu:{' '}
              {state.menu.allergens.join(', ') || 'Belum dicantumkan'}.
            </p>
          </div>
          <div className="form-grid">
            <Field label="Kuota promo (porsi)">
              <input
                name="quantity"
                type="number"
                min="1"
                max={state.metrics.availableStock}
                defaultValue={Math.min(3, state.metrics.availableStock)}
                required
                inputMode="numeric"
              />
            </Field>
            <Field label="Harga per porsi (Rp)">
              <input
                name="price"
                type="number"
                min="1000"
                max={state.menu.prices.regular}
                step="500"
                defaultValue={10000}
                required
                inputMode="numeric"
              />
            </Field>
          </div>
          <Field label="Jendela pickup">
            <select name="expiresInMinutes" defaultValue="30">
              <option value="15">15 menit sejak diterbitkan</option>
              <option value="30">30 menit sejak diterbitkan</option>
              <option value="45">45 menit sejak diterbitkan</option>
              <option value="60">60 menit sejak diterbitkan</option>
            </select>
          </Field>
          <Field
            label="Kondisi makanan & komposisi"
            hint="Jelaskan kondisi penyimpanan dan komposisi yang perlu diketahui pembeli."
          >
            <textarea
              name="description"
              rows={3}
              minLength={10}
              maxLength={400}
              required
              placeholder="Contoh: baru disiapkan untuk sesi ini, disimpan tertutup. Mengandung kedelai."
            />
          </Field>
          <div className="ops-checklist">
            <label className="ops-checkbox">
              <input type="checkbox" required />
              <span>Saya sudah memeriksa kondisi dan kelayakan makanan.</span>
            </label>
            <label className="ops-checkbox">
              <input type="checkbox" required />
              <span>
                Riwayat penanganan dan penyimpanan diketahui; makanan bukan sisa
                piring.
              </span>
            </label>
            <label className="ops-checkbox">
              <input type="checkbox" required />
              <span>Informasi komposisi dan alergen sudah dicantumkan.</span>
            </label>
          </div>
          <Button type="submit" disabled={busy}>
            Terbitkan Promo Terbatas
            <ArrowRight size={17} />
          </Button>
        </form>
      </Modal>
    </div>
  );
}

function SessionStart({ state }: { state: Snapshot }) {
  const { action, toast } = useOperations();
  const { busy } = useApp();
  const tomorrow = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
  }).format(new Date(Date.parse(state.now) + 86400000));
  return (
    <section className="panel stack">
      <PanelHeading
        title="Siapkan sesi berikutnya"
        description="Histori sesi ini tetap tersimpan. Produksi sesi baru dimulai dari nol."
      />
      <div className="callout">
        <Info size={20} />
        <p>
          Stok akhir {state.reconciliation.endingStock} porsi tetap tercatat
          pada sesi lama. Stok tersebut tidak otomatis dipindahkan atau dianggap
          sebagai produksi baru.
        </p>
      </div>
      <form
        className="stack"
        onSubmit={async (event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          if (
            await action({
              type: 'start_session',
              businessDate: data.get('businessDate'),
              cutoffTime: data.get('cutoffTime'),
              pickupStart: data.get('pickupStart'),
            })
          )
            toast(
              'Sesi baru dibuka. Menu dan pengaturan gerai tetap tersimpan.',
            );
        }}
      >
        <Field label="Tanggal pelayanan (WIB)">
          <input
            name="businessDate"
            type="date"
            defaultValue={tomorrow}
            required
          />
        </Field>
        <div className="form-grid">
          <Field label="Batas pemesanan (WIB)">
            <input
              name="cutoffTime"
              type="time"
              defaultValue="10:30"
              required
            />
          </Field>
          <Field
            label="Awal slot pengambilan (WIB)"
            hint="Tiga slot, masing-masing 30 menit."
          >
            <input
              name="pickupStart"
              type="time"
              defaultValue="11:30"
              required
            />
          </Field>
        </div>
        <Button loading={busy} type="submit">
          <Plus size={17} />
          Buka sesi baru
        </Button>
      </form>
    </section>
  );
}

function Closing({ state }: { state: Snapshot }) {
  const { action, busy } = useOperations();
  const r = state.reconciliation;
  const [internal, setInternal] = useState(r.internal);
  const [waste, setWaste] = useState(r.waste);
  const [ending, setEnding] = useState(r.endingStock);
  const [wasteKg, setWasteKg] = useState(r.wasteKg);
  const difference =
    r.openingStock +
    r.produced -
    r.preorderPickedUp -
    r.walkin -
    r.rescuePickedUp -
    internal -
    waste -
    ending;
  const rows = [
    ['Stok awal', r.openingStock],
    ['Produksi selesai', r.produced],
    ['Pesanan normal diserahkan', r.preorderPickedUp],
    ['Penjualan langsung', r.walkin],
    ['Promo Terbatas diambil', r.rescuePickedUp],
    ['Konsumsi internal', internal],
    ['Makanan dibuang', waste],
    ['Stok akhir', ending],
  ] as const;
  return (
    <div className="stack ops-page">
      <div className="ops-greeting">
        <div>
          <span className="eyebrow">TUTUP SESI, LENGKAPI LOOP</span>
          <h1>Setiap porsi punya catatan.</h1>
          <p className="muted">
            Cocokkan hasil sesi agar keputusan berikutnya bertumpu pada data
            yang lengkap.
          </p>
        </div>
        <Badge tone={r.complete ? 'green' : 'orange'}>
          {r.complete ? 'Rekonsiliasi lengkap' : 'Perlu rekonsiliasi'}
        </Badge>
      </div>
      {r.complete && <SessionStart state={state} />}
      {(state.metrics.activeOrders > 0 || state.metrics.rescueReserved > 0) && (
        <div className="callout">
          <Clock3 size={20} />
          <p>
            Masih ada {state.metrics.activeOrders} pesanan aktif dan{' '}
            {state.metrics.rescueReserved} porsi Promo Terbatas dalam reservasi.
            Selesaikan pengambilan atau tunggu batas waktunya sebelum menutup
            sesi.{' '}
            <Link href="/gerai?tab=orders" className="text-link">
              Periksa pesanan <ArrowRight size={16} />
            </Link>
          </p>
        </div>
      )}
      <div className="ops-planning-layout">
        <section className="panel">
          <PanelHeading
            title="Hasil akhir sesi"
            description="Catat porsi tersisa dan limbah yang benar-benar ditimbang."
          />
          <form
            className="stack"
            onSubmit={async (event) => {
              event.preventDefault();
              await action({
                type: 'reconcile',
                internal,
                waste,
                endingStock: ending,
                wasteKg,
              });
            }}
          >
            <div className="form-grid">
              <Field label="Konsumsi internal (porsi)">
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={internal}
                  onChange={(e) => setInternal(Number(e.target.value))}
                  required
                  inputMode="numeric"
                />
              </Field>
              <Field label="Makanan dibuang (porsi)">
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={waste}
                  onChange={(e) => setWaste(Number(e.target.value))}
                  required
                  inputMode="numeric"
                />
              </Field>
              <Field label="Stok akhir (porsi)">
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={ending}
                  onChange={(e) => setEnding(Number(e.target.value))}
                  required
                  inputMode="numeric"
                />
              </Field>
              <Field
                label="Berat makanan dibuang (kg)"
                hint="Timbang makanan sesuai lingkup pilot; pisahkan kemasan."
              >
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={wasteKg}
                  onChange={(e) => setWasteKg(Number(e.target.value))}
                  required
                  inputMode="decimal"
                />
              </Field>
            </div>
            <div
              className={`ops-balance-message ${difference === 0 ? 'balanced' : ''}`}
            >
              {difference === 0 ? (
                <CheckCircle2 size={21} />
              ) : (
                <Info size={21} />
              )}
              <div>
                <strong>
                  {difference === 0
                    ? 'Jumlah porsi sudah seimbang'
                    : `Masih ada selisih ${Math.abs(difference)} porsi`}
                </strong>
                <p>
                  {difference === 0
                    ? 'Simpan untuk menutup sesi dengan catatan lengkap.'
                    : 'Periksa kembali produksi, penjualan, dan hasil akhir. Catatan berselisih disimpan sebagai belum lengkap.'}
                </p>
              </div>
            </div>
            <Button
              type="submit"
              loading={busy}
              disabled={
                state.metrics.activeOrders > 0 ||
                state.metrics.rescueReserved > 0
              }
            >
              <ClipboardCheck size={17} />
              Simpan rekonsiliasi sesi
            </Button>
          </form>
        </section>
        <section className="panel ops-ledger-card">
          <PanelHeading
            title="Neraca porsi"
            description="Produksi + stok awal = seluruh alokasi akhir."
          />
          <div className="ops-ledger-rows">
            {rows.map(([label, value], index) => (
              <div
                key={label}
                className={index === 2 ? 'ops-ledger-divider' : ''}
              >
                <span>{label}</span>
                <strong>
                  {value}
                  <small>porsi</small>
                </strong>
              </div>
            ))}
          </div>
          <div className="ops-ledger-result">
            <span>Selisih pencatatan</span>
            <strong>
              {difference}
              <small>porsi</small>
            </strong>
          </div>
          <p className="ops-footnote">
            Reservasi aktif dan pesanan tidak diambil tidak dihitung sebagai
            porsi terlayani.
          </p>
        </section>
      </div>
      <section className="panel ops-quiet-card">
        <ShieldCheck size={24} />
        <h3>Data belum lengkap tetap berguna.</h3>
        <p className="muted">
          Sesi dengan selisih tetap disimpan sebagai catatan perbaikan
          operasional. Sesi tersebut tidak digunakan sebagai pembanding
          perencanaan hingga rekonsiliasinya lengkap.
        </p>
      </section>
    </div>
  );
}

export function SellerDashboard({ tab }: { tab: string }) {
  const { state, loading } = useOperations();
  const [menuId, setMenuId] = useState('');
  if (loading || !state)
    return (
      <div className="ops-loading" aria-live="polite">
        <span />
        <p>Menyiapkan ringkasan gerai…</p>
      </div>
    );
  const kitchens = (state.kitchens?.length ? state.kitchens : [state]).filter((kitchen) => !state.user?.outletId || kitchen.menu.outletId === state.user.outletId);
  const selected = kitchens.find((kitchen) => kitchen.menu.id === menuId) ?? kitchens.find((kitchen) => kitchen.menu.id === state.menu.id) ?? kitchens[0] ?? state;
  const kitchen = { ...selected, user: state.user, menus: state.menus };
  const content = tab === 'planning' ? <Planning state={kitchen} />
    : tab === 'orders' ? <Orders state={state} />
      : tab === 'rescue' ? <Rescue state={kitchen} />
        : tab === 'closing' ? <Closing key={`${kitchen.menu.id}-${kitchen.sessionId}`} state={kitchen} />
          : <SellerOverview state={kitchen} />;
  return <OperationsScope state={kitchen}><div className="stack ops-page">
    <section className="ops-menu-switch" aria-label="Lingkup gerai dan menu">
      <div><span className="ops-switch-label">Gerai Anda</span><strong>{kitchen.menu.outlet}</strong><p>{tab === 'orders' ? `Antrean seluruh ${kitchens.length} menu · Dine in dan Pick up` : 'Produksi, rencana, promo, dan rekonsiliasi dicatat per menu.'}</p></div>
      {tab !== 'orders' && <Field label="Menu yang dikelola"><select value={kitchen.menu.id} onChange={(event) => setMenuId(event.target.value)}>{kitchens.map((item) => <option key={item.menu.id} value={item.menu.id}>{item.menu.name}</option>)}</select></Field>}
    </section>
    <div key={tab === 'orders' ? 'queue' : kitchen.menu.id}>{content}</div>
  </div></OperationsScope>;
}
