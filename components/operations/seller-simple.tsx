'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowRight,
  Check,
  CheckCheck,
  ChefHat,
  ClipboardList,
  CookingPot,
  Edit3,
  Leaf,
  Package,
  Plus,
  ScanLine,
  ShoppingBag,
  Sprout,
  Store,
  Wallet,
} from 'lucide-react';
import { useApp } from '../provider';
import {
  Badge,
  Button,
  EmptyState,
  Field,
  Modal,
  SectionHeading,
  Stat,
} from '../ui';
import { MenuPicker } from '../controls';
import { rupiah, statusNames, type Snapshot } from '@/lib/domain';
import { Closing, Planning, Rescue } from './seller';
import { OperationsScope } from './shared';
import { PickupScanner } from './pickup-scanner';
import './simple.css';

export function SellerDashboard({ tab }: { tab: string }) {
  const params = useSearchParams();
  const { state, action, busy, toast } = useApp();
  const [selectedId, setSelectedId] = useState('');
  const [edit, setEdit] = useState<Snapshot | 'new' | null>(null);
  const [stock, setStock] = useState<Snapshot | null>(null);
  const [queue, setQueue] = useState('new');
  useEffect(() => {
    const status = params.get('status');
    if (status && ['new', 'processing', 'done'].includes(status))
      setQueue(status);
  }, [params]);
  const [closing, setClosing] = useState(false);
  const [promo, setPromo] = useState(false);
  const [walkin, setWalkin] = useState(false);
  if (!state) return null;
  const kitchens = (state.kitchens ?? [state]).filter(
    (k) => k.menu.outletId === state.user?.outletId,
  );
  const selected =
    kitchens.find((k) => k.menu.id === selectedId) ?? kitchens[0] ?? state;
  const scoped = { ...selected, user: state.user, menus: state.menus };
  const orders = [
    ...state.orders.map((o) => ({ ...o, promo: false })),
    ...state.claims.map((o) => ({ ...o, promo: true })),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const groups = {
    new: orders.filter((o) =>
      ['pending_payment', 'confirmed'].includes(o.status),
    ),
    processing: orders.filter((o) => ['preparing', 'ready'].includes(o.status)),
    done: orders.filter(
      (o) =>
        !['pending_payment', 'confirmed', 'preparing', 'ready'].includes(
          o.status,
        ),
    ),
  };
  const process = async (payload: Record<string, unknown>, message: string) => {
    if (await action(payload)) toast(message);
  };
  const picker = (
    <MenuPicker
      label="Pilih menu"
      value={selected.menu.id}
      options={kitchens.map((k) => ({
        value: k.menu.id,
        label: k.menu.name,
        description: `${k.metrics.availableStock} porsi tersedia`,
      }))}
      onChange={setSelectedId}
    />
  );
  return (
    <div className="simple-seller stack">
      <SectionHeading
        level={tab === 'planning' ? 2 : 1}
        eyebrow={state.menu.outlet}
        title={
          tab === 'orders'
            ? 'Pesanan gerai'
            : tab === 'menu'
              ? 'Menu gerai'
              : tab === 'scan'
                ? 'Serahkan dengan pasti.'
                : tab === 'planning'
                  ? 'Rencana hari ini'
                  : 'Halo, selamat berjualan.'
        }
        description={
          tab === 'orders'
            ? 'Terima, siapkan, lalu serahkan.'
            : tab === 'menu'
              ? 'Atur makanan, harga, dan stok dalam satu tempat.'
              : tab === 'scan'
                ? 'Pindai QR customer yang sudah siap diambil.'
                : tab === 'planning'
                  ? 'Siapkan secukupnya, berdasarkan permintaan.'
                  : 'Yang perlu Anda perhatikan hari ini.'
        }
        action={
          tab === 'menu' ? (
            <Button onClick={() => setEdit('new')}>
              <Plus size={18} />
              Tambah menu
            </Button>
          ) : undefined
        }
      />
      {(tab === 'overview' || tab === 'orders') && (
        <div className="seller-queue-summary">
          {[
            {
              id: 'new',
              label: 'Pesanan masuk',
              icon: ShoppingBag,
              n: groups.new.length,
            },
            {
              id: 'processing',
              label: 'Diproses',
              icon: ChefHat,
              n: groups.processing.length,
            },
            {
              id: 'done',
              label: 'Selesai',
              icon: CheckCheck,
              n: groups.done.filter((o) => o.status === 'picked_up').length,
            },
          ].map((s) => (
            <Link
              key={s.id}
              className={`seller-queue-stat ${s.id}`}
              href={`/gerai?tab=orders&status=${s.id}`}
              onClick={() => setQueue(s.id)}
            >
              <s.icon size={22} />
              <strong>{s.n}</strong>
              <span>{s.label}</span>
            </Link>
          ))}
        </div>
      )}
      {tab === 'overview' && (
        <>
          <div className="seller-quick-actions">
            <Link href="/gerai?tab=scan" className="seller-scan-tile">
              <span>
                <ScanLine size={32} />
              </span>
              <div>
                <strong>Scan & serahkan</strong>
                <p>Verifikasi QR sekali pakai.</p>
              </div>
              <ArrowRight size={21} />
            </Link>
            <Link href="/gerai?tab=menu" className="seller-menu-tile">
              <Store size={25} />
              <strong>Kelola menu</strong>
              <span>
                {kitchens.length} pilihan makanan <ArrowRight size={17} />
              </span>
            </Link>
          </div>
          <section className="panel">
            <SectionHeading
              title="Perjalanan porsi hari ini"
              description="Dari yang dimasak sampai yang diserahkan."
            />
            <div className="simple-flow-bars">
              {[
                {
                  label: 'Diproduksi',
                  n: state.metrics.produced,
                  color: 'leaf',
                },
                {
                  label: 'Normal diserahkan',
                  n:
                    state.kitchens?.reduce(
                      (sum, k) =>
                        sum +
                        k.reconciliation.preorderPickedUp +
                        k.metrics.walkin,
                      0,
                    ) ?? 0,
                  color: 'mint',
                },
                {
                  label: 'Promo diambil',
                  n: state.metrics.rescued,
                  color: 'lime',
                },
                { label: 'Dibuang', n: state.metrics.waste, color: 'peach' },
              ].map((s) => (
                <div key={s.label}>
                  <span>{s.label}</span>
                  <div>
                    <i
                      className={s.color}
                      style={{
                        width: `${Math.max(1, Math.min(100, (s.n / Math.max(1, state.metrics.produced)) * 100))}%`,
                      }}
                    />
                  </div>
                  <strong>{s.n}</strong>
                </div>
              ))}
            </div>
            <p className="fine-print">
              Porsi terjual dihitung sesudah diserahkan. Reservasi masih menahan
              kuota.
            </p>
          </section>
          <div className="simple-button-row">
            <Button variant="secondary" onClick={() => setWalkin(true)}>
              <ShoppingBag size={17} />
              Catat penjualan langsung
            </Button>
          </div>
          <div className="seller-notes">
            <Leaf size={23} />
            <p>Lebih sedikit tersisa dimulai dari rencana yang pas.</p>
            <Link href="/gerai?tab=planning">
              Lihat rencana <ArrowRight size={16} />
            </Link>
          </div>
        </>
      )}
      {tab === 'orders' && (
        <>
          <div className="segmented" aria-label="Kelompok pesanan">
            {[
              ['new', 'Masuk', groups.new.length],
              ['processing', 'Diproses', groups.processing.length],
              ['done', 'Selesai', groups.done.length],
            ].map(([id, label, n]) => (
              <button
                key={id}
                className={queue === id ? 'selected' : ''}
                aria-pressed={queue === id}
                onClick={() => setQueue(String(id))}
              >
                {label}
                <span>{n}</span>
              </button>
            ))}
          </div>
          <div className="seller-order-grid">
            {groups[queue as keyof typeof groups].map((o) => (
              <article key={o.id} className="seller-order-card">
                <div className="seller-order-top">
                  <span>{o.code}</span>
                  <Badge tone={o.status === 'picked_up' ? 'neutral' : 'green'}>
                    {statusNames[o.status]}
                  </Badge>
                </div>
                <h3>{o.menuName}</h3>
                <p>
                  {o.customer} · {o.quantity} porsi ·{' '}
                  {o.fulfillment === 'dine_in' ? 'Dine in' : 'Pick up'}
                  {o.promo ? ' · Promo' : ''}
                </p>
                <div className="seller-order-payment">
                  <strong>{rupiah(o.price * o.quantity)}</strong>
                  <span>
                    {o.paymentStatus === 'paid'
                      ? 'Lunas'
                      : o.paymentStatus === 'refund_pending'
                        ? 'Perlu pengembalian'
                        : o.paymentMethod === 'cash'
                          ? 'Tunai belum diterima'
                          : 'Menunggu pembayaran'}
                  </span>
                </div>
                {o.note && <div className="seller-order-note">{o.note}</div>}
                <div className="seller-order-actions">
                  {o.status === 'pending_payment' &&
                    o.paymentMethod === 'cash' && (
                      <Button
                        loading={busy}
                        onClick={() =>
                          void process(
                            {
                              type: 'verify_cash_payment',
                              ...(o.promo
                                ? { claimId: o.id }
                                : { orderId: o.id }),
                            },
                            'Pembayaran diterima.',
                          )
                        }
                      >
                        Konfirmasi tunai <Wallet size={16} />
                      </Button>
                    )}
                  {o.status === 'confirmed' && o.paymentStatus === 'paid' && (
                    <Button
                      loading={busy}
                      onClick={() =>
                        void process(
                          {
                            type: o.promo ? 'prepare_rescue' : 'prepare_order',
                            ...(o.promo
                              ? { claimId: o.id }
                              : { orderId: o.id }),
                          },
                          'Pesanan mulai disiapkan.',
                        )
                      }
                    >
                      Mulai siapkan <CookingPot size={17} />
                    </Button>
                  )}
                  {o.status === 'preparing' && (
                    <Button
                      loading={busy}
                      onClick={() =>
                        void process(
                          {
                            type: o.promo ? 'ready_rescue' : 'ready_order',
                            ...(o.promo
                              ? { claimId: o.id }
                              : { orderId: o.id }),
                          },
                          'Customer diberi kabar: pesanan siap.',
                        )
                      }
                    >
                      Tandai siap <Check size={17} />
                    </Button>
                  )}
                  {o.status === 'ready' && (
                    <Link
                      className="button button-secondary"
                      href="/gerai?tab=scan"
                    >
                      <ScanLine size={17} />
                      Scan saat diambil
                    </Link>
                  )}
                  {o.paymentStatus === 'refund_pending' &&
                    o.paymentMethod === 'cash' && (
                      <Button
                        variant="secondary"
                        loading={busy}
                        onClick={() =>
                          void process(
                            {
                              type: 'confirm_cash_refund',
                              ...(o.promo
                                ? { claimId: o.id }
                                : { orderId: o.id }),
                            },
                            'Pengembalian dikonfirmasi.',
                          )
                        }
                      >
                        Konfirmasi pengembalian
                      </Button>
                    )}
                </div>
              </article>
            ))}
          </div>
          {!groups[queue as keyof typeof groups].length && (
            <div className="panel">
              <EmptyState
                icon={ClipboardList}
                title="Antrean ini sudah rapi."
                description="Pesanan akan muncul sesuai tahapnya."
              />
            </div>
          )}
        </>
      )}
      {tab === 'scan' && (
        <section className="seller-scan-page panel">
          <span className="scan-focus-mark">
            <ScanLine size={64} strokeWidth={1.1} />
          </span>
          <PickupScanner />
          <h2>Satu scan. Satu serah terima.</h2>
          <p className="muted">
            Pembayaran dan kesiapan diperiksa sebelum stok berkurang.
          </p>
          <p className="fine-print">
            Kamera memerlukan izin. Token QR bisa dimasukkan jika kamera tidak
            tersedia.
          </p>
        </section>
      )}
      {tab === 'menu' && (
        <>
          <div className="seller-menu-grid">
            {kitchens.map((k) => (
              <article className="seller-menu-card" key={k.menu.id}>
                <div className="seller-menu-art">
                  <img
                    src={k.menu.image}
                    width={160}
                    height={130}
                    alt={`Ilustrasi ${k.menu.name}`}
                  />
                  <Badge tone={k.menu.active ? 'green' : 'neutral'}>
                    {k.menu.active ? 'Tersedia' : 'Disembunyikan'}
                  </Badge>
                </div>
                <div className="seller-menu-body">
                  <h3>{k.menu.name}</h3>
                  <p>
                    {rupiah(k.menu.prices.regular)}{' '}
                    <span>· {k.metrics.availableStock} porsi tersedia</span>
                  </p>
                  <div className="seller-menu-actions">
                    <Button variant="secondary" onClick={() => setEdit(k)}>
                      <Edit3 size={16} />
                      Edit
                    </Button>
                    <Button
                      onClick={() => setStock(k)}
                      disabled={k.reconciliation.complete}
                    >
                      <Plus size={17} />
                      Stok
                    </Button>
                  </div>
                  <button
                    className="seller-availability"
                    disabled={busy}
                    onClick={() =>
                      void process(
                        {
                          type: 'save_menu',
                          menuId: k.menu.id,
                          active: !k.menu.active,
                        },
                        k.menu.active
                          ? 'Menu disembunyikan.'
                          : 'Menu tersedia.',
                      )
                    }
                  >
                    <span className={k.menu.active ? 'on' : ''} />
                    {k.menu.active ? 'Sembunyikan menu' : 'Tampilkan menu'}
                  </button>
                </div>
              </article>
            ))}
          </div>
          <section className="panel stack">
            <SectionHeading
              title="Promo & sisa makanan"
              description="Gunakan stok yang masih layak. Catat sisanya."
            />
            {picker}
            <div className="simple-button-row">
              <Button variant="secondary" onClick={() => setPromo(true)}>
                <Sprout size={17} />
                Atur Promo Terbatas
              </Button>
              <Button variant="ghost" onClick={() => setClosing(true)}>
                <Leaf size={17} />
                Catat sisa hari ini
              </Button>
            </div>
          </section>
        </>
      )}
      {tab === 'planning' && (
        <>
          {picker}
          <OperationsScope state={scoped}>
            <Planning state={scoped} />
          </OperationsScope>
        </>
      )}
      <Modal
        open={!!edit}
        onClose={() => setEdit(null)}
        title={edit === 'new' ? 'Tambah menu' : 'Edit menu'}
      >
        {edit && (
          <MenuForm
            kitchen={edit === 'new' ? null : edit}
            onDone={() => setEdit(null)}
          />
        )}
      </Modal>
      <Modal
        open={walkin}
        onClose={() => setWalkin(false)}
        title="Catat penjualan langsung"
      >
        <form
          className="stack"
          onSubmit={async (e) => {
            e.preventDefault();
            const data = new FormData(e.currentTarget);
            if (
              await action({
                type: 'record_walkin',
                menuId: selected.menu.id,
                quantity: Number(data.get('quantity')),
              })
            ) {
              setWalkin(false);
              toast('Penjualan langsung dicatat. Stok diperbarui.');
            }
          }}
        >
          {picker}
          <Field label="Porsi terjual">
            <input
              name="quantity"
              type="number"
              min={1}
              max={Math.max(1, selected.metrics.availableStock)}
              defaultValue={1}
              required
              inputMode="numeric"
            />
          </Field>
          <p className="fine-print">
            Stok bebas {selected.metrics.availableStock} porsi. Pesanan online
            dan promo tetap dicadangkan.
          </p>
          <Button
            loading={busy}
            disabled={selected.metrics.availableStock < 1}
            type="submit"
          >
            Catat penjualan <Check size={17} />
          </Button>
        </form>
      </Modal>
      <Modal
        open={!!stock}
        onClose={() => setStock(null)}
        title="Tambah stok siap jual"
      >
        {stock && (
          <form
            className="stack"
            onSubmit={async (e) => {
              e.preventDefault();
              const data = new FormData(e.currentTarget);
              if (
                await action({
                  type: 'record_production',
                  menuId: stock.menu.id,
                  quantity: Number(data.get('quantity')),
                })
              ) {
                setStock(null);
                toast('Produksi dicatat. Stok siap jual bertambah.');
              }
            }}
          >
            <p className="muted">
              {stock.menu.name} · stok fisik {stock.metrics.stock} porsi.
            </p>
            <Field label="Porsi yang selesai dimasak">
              <input
                name="quantity"
                type="number"
                inputMode="numeric"
                min={1}
                max={Math.max(
                  1,
                  stock.recommendation.capacity - stock.metrics.produced,
                )}
                defaultValue={1}
                required
              />
            </Field>
            <p className="fine-print">
              Catat hasil produksi yang sudah matang, bukan target rencana.
            </p>
            <Button loading={busy} type="submit">
              Tambah stok <Check size={17} />
            </Button>
          </form>
        )}
      </Modal>
      <Modal
        open={promo}
        onClose={() => setPromo(false)}
        title="Promo Terbatas"
      >
        <OperationsScope state={scoped}>
          <Rescue state={scoped} />
        </OperationsScope>
      </Modal>
      <Modal
        open={closing}
        onClose={() => setClosing(false)}
        title="Catat sisa hari ini"
      >
        <OperationsScope state={scoped}>
          <Closing key={selected.menu.id + selected.sessionId} state={scoped} />
        </OperationsScope>
      </Modal>
    </div>
  );
}

function MenuForm({
  kitchen,
  onDone,
}: {
  kitchen: Snapshot | null;
  onDone: () => void;
}) {
  const { action, busy, toast } = useApp();
  return (
    <form
      className="stack"
      onSubmit={async (e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        const payload = {
          type: kitchen ? 'save_menu' : 'add_menu',
          ...(kitchen?.menu.draft ? { active: true } : {}),
          ...(kitchen ? { menuId: kitchen.menu.id } : {}),
          name: String(data.get('name')),
          description: String(data.get('description')),
          smallPrice: Number(data.get('smallPrice')),
          regularPrice: Number(data.get('regularPrice')),
          allergens: String(data.get('allergens'))
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          category: String(data.get('category')),
        };
        if (await action(payload)) {
          onDone();
          toast(
            kitchen
              ? 'Menu diperbarui.'
              : 'Menu ditambahkan. Catat produksi untuk mengisi stok.',
          );
        }
      }}
    >
      <Field label="Nama makanan">
        <input
          name="name"
          defaultValue={kitchen?.menu.name}
          placeholder="Contoh: Nasi ayam bakar"
          required
          minLength={2}
          maxLength={100}
        />
      </Field>
      <div className="form-grid">
        <Field label="Harga porsi kecil">
          <input
            type="number"
            name="smallPrice"
            min={1000}
            max={1000000}
            step={500}
            defaultValue={kitchen?.menu.prices.small || 13000}
            inputMode="numeric"
            required
          />
        </Field>
        <Field label="Harga porsi reguler">
          <input
            type="number"
            name="regularPrice"
            min={1000}
            max={1000000}
            step={500}
            defaultValue={kitchen?.menu.prices.regular || 18000}
            inputMode="numeric"
            required
          />
        </Field>
      </div>
      <Field label="Deskripsi singkat">
        <textarea
          name="description"
          defaultValue={kitchen?.menu.description}
          rows={2}
          maxLength={300}
          placeholder="Nasi, ayam, lalapan, dan sambal terpisah."
          required
        />
      </Field>
      <Field label="Kategori">
        <input
          name="category"
          defaultValue={kitchen?.menu.category || 'Nasi & lauk'}
          maxLength={60}
        />
      </Field>
      <Field label="Alergen (pisahkan dengan koma)">
        <input
          name="allergens"
          defaultValue={kitchen?.menu.allergens.join(', ')}
          placeholder="Contoh: kedelai, telur"
          maxLength={200}
        />
      </Field>
      {!kitchen && (
        <p className="account-note">
          Stok awal 0. Tambahkan hasil produksi yang selesai dimasak agar bisa
          dipesan segera.
        </p>
      )}
      <Button type="submit" loading={busy}>
        Simpan menu <Check size={17} />
      </Button>
    </form>
  );
}
