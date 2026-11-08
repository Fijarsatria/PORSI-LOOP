"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  CookingPot,
  Info,
  Leaf,
  Package,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Sprout,
  TicketCheck,
  TrendingUp,
  Users,
  Utensils,
} from "lucide-react";
import { useApp } from "./provider";
import { Badge, Button, EmptyState, Field, Modal, Stat } from "./ui";
import {
  clock,
  rupiah,
  statusNames,
  type Snapshot,
  type OrderStatus,
} from "@/lib/domain";
import "./operations.css";

const dateLabel = (value: string) =>
  new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
const number = (value: FormDataEntryValue | null) => Number(value ?? 0);
const statusTone = (status: OrderStatus) =>
  status === "picked_up" || status === "ready"
    ? ("green" as const)
    : status === "confirmed"
      ? ("orange" as const)
      : ("neutral" as const);
const safePercent = (part: number, total: number) =>
  total > 0 ? Math.round((part / total) * 100) : 0;

function useOperations() {
  const context = useApp();
  const messages: Record<string, string> = {
    pickup_order: "Pengambilan pre-order dikonfirmasi.",
    pickup_rescue: "Pengambilan rescue dikonfirmasi.",
    ready_order: "Pesanan ditandai siap diambil.",
    record_production: "Produksi selesai dicatat. Stok siap jual diperbarui.",
    record_walkin: "Penjualan langsung dicatat.",
    save_menu: "Informasi menu disimpan.",
    save_slot: "Kuota slot pengambilan disimpan.",
    override_plan: "Keputusan perencanaan disimpan.",
    accept_plan: "Saran persiapan diterima. Stok belum berubah.",
    publish_rescue: "Penawaran rescue diterbitkan.",
    close_rescue: "Penawaran rescue ditutup dan sisa kuota dilepas.",
    advance_demo:
      "Waktu simulasi dimajukan. Status pesanan dan reservasi diperbarui.",
    reconcile: "Catatan rekonsiliasi disimpan.",
  };
  return {
    ...context,
    busy:
      context.busy ||
      Boolean(
        context.state?.user?.role === "seller" &&
        context.state.reconciliation.complete,
      ),
    action: async (payload: Record<string, unknown>) => {
      const success = await context.action(payload);
      if (success && messages[String(payload.type)])
        context.toast(messages[String(payload.type)]);
      return success;
    },
  };
}

function PanelHeading({
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

function StatusPill({ status }: { status: OrderStatus }) {
  return <Badge tone={statusTone(status)}>{statusNames[status]}</Badge>;
}

function StockFlow({ state }: { state: Snapshot }) {
  const r = state.reconciliation;
  const total = r.openingStock + r.produced;
  const items = [
    {
      label: "Pre-order diambil",
      value: r.preorderPickedUp,
      className: "preorder",
    },
    { label: "Pembeli langsung", value: r.walkin, className: "walkin" },
    { label: "Rescue diambil", value: r.rescuePickedUp, className: "rescue" },
    { label: "Konsumsi internal", value: r.internal, className: "internal" },
    { label: "Makanan dibuang", value: r.waste, className: "waste" },
    {
      label: "Stok saat ini",
      value: state.metrics.stock,
      className: "remaining",
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

function PickupForm() {
  const { action, busy } = useOperations();
  const [code, setCode] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      await action({
        type: code.trim().toUpperCase().startsWith("RS-")
          ? "pickup_rescue"
          : "pickup_order",
        code: code.trim().toUpperCase(),
      })
    )
      setCode("");
  }
  return (
    <form onSubmit={submit} className="ops-pickup-form">
      <div className="ops-input-action">
        <Field label="Kode pengambilan">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            required
            maxLength={24}
            autoComplete="off"
            placeholder="Contoh: PL-A7K2"
            aria-label="Kode pengambilan"
          />
        </Field>
        <Button type="submit" disabled={busy || !code.trim()}>
          <TicketCheck size={17} />
          <span>Validasi pickup</span>
        </Button>
      </div>
      <p className="ops-footnote">
        Cocokkan kode dengan pesanan mahasiswa sebelum menyerahkan makanan.
      </p>
    </form>
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
            type: "record_production",
            quantity: number(data.get("quantity")),
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
        if (await action({ type: "record_walkin", quantity })) setQuantity(1);
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
        dicatat terpisah dari pre-order.
      </p>
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
            type: "save_menu",
            name: data.get("name"),
            description: data.get("description"),
            regularPrice: number(data.get("regularPrice")),
            smallPrice: number(data.get("smallPrice")),
            active: data.get("active") === "on",
          })
        )
          onDone();
      }}
    >
      <Field label="Nama menu">
        <input
          name="name"
          defaultValue={state.menu.name}
          maxLength={100}
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
        <span>Menu tersedia untuk pre-order</span>
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
    (order) => order.status === "confirmed" || order.status === "ready",
  );
  return (
    <div className="stack ops-page">
      <div className="ops-greeting">
        <div>
          <span className="eyebrow">DAPUR YANG LEBIH TERENCANA</span>
          <h1>
            Selamat datang, {state.user?.name.split(" ")[0] || "Mitra"}
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
          label="Pre-order aktif"
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
          label="Rescue tersalurkan"
          value={state.metrics.rescued}
          note="Sudah diserahkan, bukan reservasi"
          icon={Sprout}
        />
      </div>
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
            {state.recommendation.preorders} pre-order +{" "}
            {state.recommendation.walkinEstimate} estimasi walk-in +{" "}
            {state.recommendation.buffer} buffer.
          </p>
          <div className="ops-plan-source">
            <Sparkles size={16} />
            {state.recommendation.source === "manual"
              ? "Baseline manual · data terbatas"
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
            description="Untuk pre-order dan reservasi rescue."
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
            <Badge tone={state.menu.active ? "green" : "neutral"}>
              {state.menu.active ? "Tersedia" : "Ditutup"}
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
            description="Pre-order yang masuk akan muncul di sini, lengkap dengan slot pengambilannya."
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
        <Badge tone={r.source === "manual" ? "orange" : "green"}>
          {r.source === "manual"
            ? "Data terbatas · baseline manual"
            : "Histori walk-in tersedia"}
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
              <span>Pre-order</span>
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
            Estimasi walk-in {r.walkinRange[0]}–{r.walkinRange[1]} porsi.{" "}
            {r.source === "manual"
              ? "Angka awal berasal dari baseline yang Anda masukkan, bukan prediksi model."
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
                <small>Tercatat pukul {clock(r.override.at)} WIB</small>
              </div>
            </div>
          )}
          <div className="ops-button-row">
            <Button
              disabled={busy}
              onClick={() =>
                action({
                  type: "accept_plan",
                  target: r.target,
                })
              }
            >
              <Check size={17} />
              {r.accepted ? "Saran diterima" : "Terima saran"}
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
                  type: "override_plan",
                  manualBaseline: number(data.get("walkinEstimate")),
                  buffer: number(data.get("buffer")),
                  capacity: number(data.get("capacity")),
                  target: Math.min(
                    number(data.get("capacity")),
                    r.preorders +
                      (r.source === "history"
                        ? r.walkinEstimate
                        : number(data.get("walkinEstimate"))) +
                      number(data.get("buffer")),
                  ),
                  reason: String(data.get("reason") || ""),
                });
              }}
            >
              <Field
                label="Baseline pembeli langsung (porsi)"
                hint={
                  r.source === "history"
                    ? "Histori walk-in sedang digunakan. Baseline ini disimpan untuk saat data histori belum mencukupi."
                    : "Masukkan hanya pembeli walk-in; pisahkan pelanggan pre-order."
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
              Histori penjualan total tidak dijumlahkan dengan pre-order.
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
                type: "override_plan",
                target: number(data.get("target")),
                reason: data.get("reason"),
              })
            )
              setOverrideOpen(false);
          }}
        >
          <Field
            label="Jumlah persiapan pilihan Anda"
            hint={`Minimal ${r.preorders} porsi untuk komitmen pre-order; maksimal kapasitas ${r.capacity}.`}
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
                type: "save_slot",
                slotId: slot.id,
                capacity: number(data.get("capacity")),
              });
            }}
          >
            <div>
              <Clock3 size={17} />
              <strong>{slot.label}</strong>
              <Badge tone={slot.closed ? "neutral" : "green"}>
                {slot.closed ? "Ditutup" : "Terbuka"}
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

function OrderTable({
  state,
  query = "",
  filter = "all",
  limit,
}: {
  state: Snapshot;
  query?: string;
  filter?: string;
  limit?: number;
}) {
  const { action, busy } = useOperations();
  const orders = state.orders.filter(
    (order) =>
      (!query ||
        `${order.code} ${order.customer} ${order.menuName}`
          .toLowerCase()
          .includes(query.toLowerCase())) &&
      (filter === "all" || order.status === filter),
  );
  const shown = limit
    ? orders
        .filter(
          (order) => order.status === "confirmed" || order.status === "ready",
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
            <th>Slot pickup</th>
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
                  {order.quantity} × {state.menu.portionLabels[order.portion]} ·{" "}
                  {rupiah(order.price * order.quantity)}
                </span>
              </td>
              <td>
                <span className="ops-table-slot">
                  <Clock3 size={14} />
                  {order.slotLabel}
                </span>
              </td>
              <td>
                <StatusPill status={order.status} />
              </td>
              <td>
                <div className="ops-row-actions">
                  {order.status === "confirmed" && (
                    <Button
                      variant="ghost"
                      disabled={busy}
                      onClick={() =>
                        action({ type: "ready_order", orderId: order.id })
                      }
                    >
                      Tandai siap
                    </Button>
                  )}
                  {(order.status === "ready" ||
                    order.status === "confirmed") && (
                    <Button
                      variant="ghost"
                      disabled={busy}
                      onClick={() =>
                        action({ type: "pickup_order", code: order.code })
                      }
                    >
                      <Check size={15} />
                      Diambil
                    </Button>
                  )}
                </div>
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
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  return (
    <div className="stack ops-page">
      <div className="ops-greeting">
        <div>
          <span className="eyebrow">LAYANI SESUAI SLOT</span>
          <h1>Pesanan yang sudah pasti.</h1>
          <p className="muted">
            Periksa slot, cocokkan kode, lalu konfirmasi makanan sudah
            diserahkan.
          </p>
        </div>
        <Badge tone="green">{state.metrics.activeOrders} pesanan aktif</Badge>
      </div>
      <section className="panel">
        <PanelHeading
          title="Validasi pickup"
          description="Masukkan kode pre-order atau rescue mahasiswa."
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
            <option value="confirmed">Terkonfirmasi</option>
            <option value="ready">Siap diambil</option>
            <option value="picked_up">Sudah diambil</option>
            <option value="cancelled">Dibatalkan</option>
            <option value="no_show">Tidak diambil</option>
          </select>
        </div>
        <OrderTable state={state} query={query} filter={filter} />
      </section>
      <div className="callout">
        <Clock3 size={19} />
        <p>
          Pesanan yang melewati akhir slot tanpa diambil ditandai tidak diambil
          oleh server. Porsinya tidak masuk hitungan pre-order terlayani.
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
            rescue.
          </p>
        </div>
        <Button
          onClick={() => setOpen(true)}
          disabled={state.metrics.availableStock < 1}
        >
          <Plus size={17} />
          Buat penawaran rescue
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
          label="Rescue tersalurkan"
          value={state.metrics.rescued}
          note="Pickup terkonfirmasi"
          icon={Sprout}
        />
      </div>
      <section className="panel">
        <PanelHeading
          title="Penawaran rescue"
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
                        ? "green"
                        : "neutral"
                    }
                  >
                    {active.some((a) => a.id === batch.id)
                      ? "Penawaran aktif"
                      : "Selesai"}
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
            title="Belum ada penawaran rescue"
            description="Jika ada stok yang masih layak menjelang akhir sesi, buat penawaran dengan kuota dan batas pickup yang jelas."
          />
        )}
      </section>
      <section className="panel">
        <PanelHeading
          title="Reservasi & pengambilan"
          description="Kuota ditahan saat reservasi; distribusi tercatat setelah pickup."
        />
        {state.claims.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Kode & pemesan</th>
                  <th>Porsi</th>
                  <th>Batas pickup</th>
                  <th>Status</th>
                  <th>
                    <span className="sr-only">Tindakan</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {state.claims.map((claim) => (
                  <tr key={claim.id}>
                    <td>
                      <strong className="ops-code">{claim.code}</strong>
                      <span className="ops-table-sub">{claim.customer}</span>
                    </td>
                    <td>{claim.quantity} porsi</td>
                    <td>{clock(claim.expiresAt)} WIB</td>
                    <td>
                      <StatusPill status={claim.status} />
                    </td>
                    <td>
                      {(claim.status === "confirmed" ||
                        claim.status === "ready") && (
                        <Button
                          variant="ghost"
                          disabled={busy}
                          onClick={() =>
                            action({ type: "pickup_rescue", code: claim.code })
                          }
                        >
                          <Check size={15} />
                          Diambil
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">
            Reservasi mahasiswa akan muncul di sini setelah penawaran diklaim.
          </p>
        )}
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
        title="Tutup penawaran rescue"
      >
        <form
          className="stack"
          onSubmit={async (event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            if (
              await action({
                type: "close_rescue",
                batchId: closingBatch,
                reason: data.get("reason"),
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
            Tutup penawaran rescue
          </Button>
        </form>
      </Modal>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Buat penawaran rescue"
      >
        <form
          className="stack"
          onSubmit={async (event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            if (
              await action({
                type: "publish_rescue",
                quantity: number(data.get("quantity")),
                price: number(data.get("price")),
                durationMinutes: number(data.get("expiresInMinutes")),
                description: data.get("description"),
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
              Informasi alergen menu:{" "}
              {state.menu.allergens.join(", ") || "Belum dicantumkan"}.
            </p>
          </div>
          <div className="form-grid">
            <Field label="Kuota rescue (porsi)">
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
            Terbitkan penawaran rescue
            <ArrowRight size={17} />
          </Button>
        </form>
      </Modal>
    </div>
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
    ["Stok awal", r.openingStock],
    ["Produksi selesai", r.produced],
    ["Pre-order diambil", r.preorderPickedUp],
    ["Penjualan langsung", r.walkin],
    ["Rescue diambil", r.rescuePickedUp],
    ["Konsumsi internal", internal],
    ["Makanan dibuang", waste],
    ["Stok akhir", ending],
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
        <Badge tone={r.complete ? "green" : "orange"}>
          {r.complete ? "Rekonsiliasi lengkap" : "Perlu rekonsiliasi"}
        </Badge>
      </div>
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
                type: "reconcile",
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
              className={`ops-balance-message ${difference === 0 ? "balanced" : ""}`}
            >
              {difference === 0 ? (
                <CheckCircle2 size={21} />
              ) : (
                <Info size={21} />
              )}
              <div>
                <strong>
                  {difference === 0
                    ? "Jumlah porsi sudah seimbang"
                    : `Masih ada selisih ${Math.abs(difference)} porsi`}
                </strong>
                <p>
                  {difference === 0
                    ? "Simpan untuk menutup sesi dengan catatan lengkap."
                    : "Periksa kembali produksi, penjualan, dan hasil akhir. Catatan berselisih disimpan sebagai belum lengkap."}
                </p>
              </div>
            </div>
            <Button type="submit" disabled={busy}>
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
                className={index === 2 ? "ops-ledger-divider" : ""}
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
            Reservasi aktif dan pre-order tidak diambil tidak dihitung sebagai
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
  if (loading || !state)
    return (
      <div className="ops-loading" aria-live="polite">
        <span />
        <p>Menyiapkan ringkasan gerai…</p>
      </div>
    );
  if (tab === "planning") return <Planning state={state} />;
  if (tab === "orders") return <Orders state={state} />;
  if (tab === "rescue") return <Rescue state={state} />;
  if (tab === "closing") return <Closing state={state} />;
  return <SellerOverview state={state} />;
}

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
              {new Intl.DateTimeFormat("id-ID", {
                day: "numeric",
                month: "short",
              }).format(new Date(entry.date))}
            </small>
          </div>
        ))}
      </div>
      <p className="ops-footnote">
        {state.mode === "demo"
          ? "Histori simulasi untuk mendemonstrasikan pencatatan. Angka ini bukan hasil pilot lapangan."
          : "Produksi dan layanan dari sesi yang tercatat. Gunakan sesi lengkap untuk pembanding."}
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
            <th>Pre-order diambil</th>
            <th>Walk-in</th>
            <th>Rescue</th>
            <th>Dibuang</th>
            <th>Kualitas data</th>
          </tr>
        </thead>
        <tbody>
          {state.history.map((item) => (
            <tr key={item.date}>
              <td>
                <strong>{dateLabel(item.date)}</strong>
              </td>
              <td>{item.produced}</td>
              <td>{item.preorders}</td>
              <td>{item.walkin}</td>
              <td>{item.rescue}</td>
              <td>{item.wasteKg.toLocaleString("id-ID")} kg</td>
              <td>
                <Badge tone={item.closed ? "green" : "orange"}>
                  {item.closed ? "Lengkap" : "Belum lengkap"}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
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
          note="Pre-order, walk-in & rescue diambil"
          icon={Utensils}
        />
        <Stat
          label="Rescue tersalurkan"
          value={state.metrics.rescued}
          note="Berdasarkan pickup terkonfirmasi"
          icon={Sprout}
        />
        <Stat
          label="Makanan dibuang"
          value={`${state.metrics.wasteKg.toLocaleString("id-ID")} kg`}
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
          <Badge tone={completeness >= 80 ? "green" : "orange"}>
            {completeness >= 80
              ? "Target pencatatan simulasi tercapai"
              : "Perlu melengkapi catatan sesi"}
          </Badge>
        </section>
      </div>
      <section className="panel">
        <PanelHeading
          title="Gerai dalam pemantauan"
          description="Lingkup MVP: satu gerai dan satu menu."
        />
        <div className="ops-outlet-row">
          <div className="ops-outlet-avatar">
            <CookingPot size={25} />
          </div>
          <div>
            <h3>{state.menu.outlet}</h3>
            <p className="muted">
              {state.menu.location} · {state.menu.name}
            </p>
          </div>
          <div>
            <span className="ops-table-sub">Status pencatatan sesi</span>
            <Badge tone={state.reconciliation.complete ? "green" : "orange"}>
              {state.reconciliation.complete
                ? "Lengkap"
                : "Menunggu penutupan sesi"}
            </Badge>
          </div>
        </div>
      </section>
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
          {state.mode === "demo"
            ? "Data simulasi · belum hasil pilot"
            : "Ringkasan pencatatan operasional"}
        </Badge>
      </div>
      <section className="panel">
        <PanelHeading
          title="Outcome operasional"
          description="Layanan yang tercatat pada sesi berjalan."
        />
        <div className="stat-grid">
          <Stat
            label="Pre-order diambil"
            value={r.preorderPickedUp}
            note="Porsi, berdasarkan validasi pickup"
            icon={ShoppingBag}
          />
          <Stat
            label="Tingkat pickup"
            value={eligible ? `${state.metrics.pickupRate}%` : "—"}
            note={
              eligible
                ? `${r.preorderPickedUp} dari ${eligible} porsi selesai/terlewat`
                : "Belum ada porsi yang selesai/terlewat"
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
            label="Rescue tersalurkan"
            value={r.rescuePickedUp}
            note={`${state.metrics.rescueReserved} porsi masih dalam reservasi`}
            icon={Leaf}
          />
        </div>
      </section>
      <div className="grid-2">
        <section className="panel ops-environment-card">
          <div className="ops-round-icon">
            <Leaf size={23} />
          </div>
          <span className="eyebrow">INDIKATOR LINGKUNGAN</span>
          <h2>Waste intensity</h2>
          <div className="ops-impact-value">
            {intensity === null
              ? "—"
              : intensity.toLocaleString("id-ID", { maximumFractionDigits: 2 })}
            <span>kg / 100 porsi terlayani</span>
          </div>
          <p className="muted">
            {intensity === null
              ? "Tersedia setelah sesi direkonsiliasi lengkap, limbah ditimbang, dan ada porsi terlayani."
              : `${r.wasteKg.toLocaleString("id-ID")} kg makanan dibuang ÷ ${served} porsi terlayani × 100.`}
          </p>
          <div className="ops-impact-context">
            <strong>Histori sesi lengkap</strong>
            <span>
              {historicalServed
                ? `${((historicalWaste / historicalServed) * 100).toLocaleString("id-ID", { maximumFractionDigits: 2 })} kg / 100 porsi`
                : "Belum tersedia"}
            </span>
            <small>
              {state.mode === "demo"
                ? "Simulasi pencatatan; bukan baseline pengurangan limbah yang tervalidasi."
                : "Bukan baseline pengurangan limbah tanpa penetapan lingkup dan metode pembanding."}
            </small>
          </div>
        </section>
        <section className="panel">
          <div className="ops-round-icon">
            <TrendingUp size={23} />
          </div>
          <span className="eyebrow">CATATAN EKONOMI</span>
          <h2>Penerimaan rescue</h2>
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
          Rescue dilaporkan sebagai porsi tersalurkan. Pengurangan limbah
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
              Denominator mencakup pre-order diambil, walk-in terjual, dan
              rescue diambil. Reservasi dan no-show tidak masuk.
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
  const [query, setQuery] = useState("");
  const logs = useMemo(
    () =>
      state.logs.filter((log) =>
        `${log.action} ${log.detail} ${log.actor}`
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
      {state.mode === "demo" && (
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
              onClick={() => action({ type: "advance_demo", minutes: 30 })}
            >
              <Clock3 size={17} />
              Majukan 30 menit
            </Button>
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => action({ type: "advance_demo", minutes: 180 })}
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
      <section className="panel">
        <div className="ops-table-toolbar">
          <h2>Log aktivitas</h2>
          <div className="ops-search">
            <Search size={18} />
            <input
              type="search"
              aria-label="Cari log aktivitas"
              placeholder="Cari aktivitas atau pelaku…"
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
                  <h3>{log.action.replaceAll("_", " ")}</h3>
                  <p>{log.detail}</p>
                  <small>
                    {log.actor} · {dateLabel(log.at)}
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
  if (tab === "impact") return <Impact state={state} />;
  if (tab === "ledger") return <Ledger state={state} />;
  return <AdminOverview state={state} />;
}
