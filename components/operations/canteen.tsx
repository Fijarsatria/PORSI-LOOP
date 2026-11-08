'use client';
import { useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  Check,
  ChartNoAxesCombined,
  Leaf,
  Plus,
  ShieldCheck,
  Store,
  Users,
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
import { PasswordInput } from '../controls';
import { rupiah, type Snapshot } from '@/lib/domain';
import './canteen.css';

export function CanteenPulse({ state }: { state: Snapshot }) {
  const normal =
    state.kitchens?.reduce(
      (n, k) => n + k.reconciliation.preorderPickedUp + k.metrics.walkin,
      0,
    ) ?? 0;
  const served = normal + state.metrics.rescued;
  const produced = state.metrics.produced;
  const ratio = produced
    ? Math.min(100, Math.round((served / produced) * 100))
    : 0;
  const pending = state.orderTraffic?.reduce((n, r) => n + r.pending, 0) ?? 0;
  const active = state.orderTraffic?.reduce((n, r) => n + r.active, 0) ?? 0;
  return (
    <div className="stack canteen-pulse">
      <SectionHeading
        eyebrow="RUANG PENGELOLA KANTIN"
        title="Satu pandangan. Seluruh kantin."
        level={1}
        description="Pantau pesanan, pemasukan, dan perjalanan setiap porsi."
        action={
          <Link href="/pengelola?tab=outlets" className="button button-primary">
            <Plus size={17} />
            Kelola gerai
          </Link>
        }
      />
      <div className="stat-grid">
        <Stat
          icon={Store}
          label="Gerai terhubung"
          value={state.outlets?.length ?? 0}
          note={`${state.menus?.length ?? 0} menu di kantin`}
        />
        <Stat
          icon={Activity}
          label="Pesanan aktif"
          value={active}
          note={`${pending} menunggu pembayaran`}
        />
        <Stat
          icon={Wallet}
          label="Pembayaran diterima"
          value={
            <abbr
              title={rupiah(state.finance?.netPayments ?? 0)}
            >{`Rp${new Intl.NumberFormat('id-ID', { notation: 'compact', maximumFractionDigits: 1 }).format(state.finance?.netPayments ?? 0)}`}</abbr>
          }
          note="Penerimaan setelah refund"
        />
        <Stat
          icon={Leaf}
          label="Promo tersalurkan"
          value={`${state.metrics.rescued} porsi`}
          note="Sudah diserahkan ke customer"
        />
      </div>
      <div className="canteen-chart-grid">
        <section className="panel canteen-donut-panel">
          <SectionHeading
            title="Ke mana porsi hari ini?"
            description="Dihitung dari pencatatan sesi yang berjalan."
          />
          <div
            className="canteen-donut"
            style={{
              background: `conic-gradient(var(--leaf) 0 ${ratio}%, #e5ebdc ${ratio}% 100%)`,
            }}
            role="img"
            aria-label={`${served} dari ${produced} porsi produksi sudah tersalurkan, ${ratio} persen`}
          >
            <div>
              <strong>
                {ratio}
                <small>%</small>
              </strong>
              <span>tersalurkan</span>
            </div>
          </div>
          <div className="canteen-donut-legend">
            <span>
              <i className="normal" />
              Normal<strong>{normal}</strong>
            </span>
            <span>
              <i className="promo" />
              Promo<strong>{state.metrics.rescued}</strong>
            </span>
            <span>
              <i className="rest" />
              Stok fisik<strong>{state.metrics.stock}</strong>
            </span>
            <span>
              <i className="waste" />
              Dibuang<strong>{state.metrics.waste}</strong>
            </span>
          </div>
          <p className="fine-print">
            Reservasi dan pembayaran belum berarti makanan sudah diserahkan.
          </p>
        </section>
        <section className="panel canteen-bars">
          <SectionHeading
            title="Aktivitas per gerai"
            description="Porsi tersalurkan dibandingkan produksi."
          />
          <div>
            {state.outlets?.map((outlet) => {
              const k =
                state.kitchens?.filter((k) => k.menu.outletId === outlet.id) ??
                [];
              const sent = k.reduce(
                (n, k) =>
                  n +
                  k.reconciliation.preorderPickedUp +
                  k.metrics.walkin +
                  k.metrics.rescued,
                0,
              );
              const total = outlet.metrics?.produced ?? 0;
              return (
                <article key={outlet.id}>
                  <div>
                    <span>{outlet.name}</span>
                    <strong>
                      {sent}
                      <small> / {total} porsi</small>
                    </strong>
                  </div>
                  <div className="canteen-bar-track">
                    <i
                      style={{
                        width: `${total ? Math.min(100, (sent / total) * 100) : 0}%`,
                      }}
                    />
                  </div>
                </article>
              );
            })}
          </div>
          <Link className="text-link" href="/pengelola?tab=finance">
            Buka penjualan & pemasukan <ArrowRight size={16} />
          </Link>
        </section>
      </div>
      <div className="canteen-insights">
        <article>
          <Activity size={24} />
          <div>
            <strong>
              {active
                ? `${active} pesanan dalam antrean`
                : 'Antrean sedang tenang'}
            </strong>
            <p>
              {pending
                ? `${pending} pesanan masih menunggu pembayaran.`
                : 'Gerai memperbarui status saat makanan disiapkan dan siap diambil.'}
            </p>
          </div>
        </article>
        <article>
          <Leaf size={24} />
          <div>
            <strong>
              {state.metrics.wasteKg.toLocaleString('id-ID')} kg sisa tercatat
            </strong>
            <p>
              Berat dari penimbangan gerai. Bandingkan dampak hanya pada sesi
              lengkap.
            </p>
            <Link href="/pengelola?tab=impact">
              Lihat laporan dampak <ArrowRight size={14} />
            </Link>
          </div>
        </article>
      </div>
    </div>
  );
}
function ShoppingIcon(props: React.ComponentProps<typeof Activity>) {
  return <Activity {...props} />;
}

export function CanteenOutlets({ state }: { state: Snapshot }) {
  const { account, busy, toast } = useApp();
  const [open, setOpen] = useState(false);
  const [outletId, setOutletId] = useState('');
  const [success, setSuccess] = useState('');
  return (
    <div className="stack">
      <SectionHeading
        eyebrow="GERAI & AKSES"
        title="Tim kantin Anda, terhubung."
        level={1}
        description="Pengelola menambahkan gerai dan memberikan akun kepada penjual."
        action={
          <Button
            onClick={() => {
              setOutletId('');
              setOpen(true);
            }}
          >
            <Plus size={18} />
            Tambah gerai
          </Button>
        }
      />
      {success && (
        <div className="callout" role="status">
          <ShieldCheck size={20} />
          <span>{success}</span>
        </div>
      )}
      <div className="canteen-outlet-grid">
        {state.outlets?.map((o) => (
          <article className="panel canteen-outlet" key={o.id}>
            <div className="canteen-outlet-icon">
              <Store size={28} />
            </div>
            <Badge tone="neutral">{o.menuIds.length} menu</Badge>
            <h2>{o.name}</h2>
            <p>{o.location}</p>
            <div className="canteen-outlet-mini">
              <span>
                Produksi<strong>{o.metrics?.produced ?? 0}</strong>
              </span>
              <span>
                Stok fisik<strong>{o.metrics?.stock ?? 0}</strong>
              </span>
              <span>
                Antrean
                <strong>
                  {state.orderTraffic
                    ?.filter((r) => r.outletId === o.id)
                    .reduce((n, r) => n + r.active, 0) ?? 0}
                </strong>
              </span>
            </div>
            <div className="canteen-accounts">
              {state.staffAccounts
                ?.filter((a) => a.outletId === o.id)
                .map((a) => (
                  <span key={a.id}>
                    <Users size={14} />
                    <span>
                      {a.name}
                      <small>{a.email}</small>
                    </span>
                  </span>
                ))}
            </div>
            <Button
              variant="secondary"
              onClick={() => {
                setOutletId(o.id);
                setOpen(true);
              }}
            >
              <Plus size={16} />
              Tambah akses penjual
            </Button>
          </article>
        ))}
      </div>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={outletId ? 'Beri akses penjual' : 'Tambah gerai & akun penjual'}
      >
        <form
          className="stack"
          onSubmit={async (e) => {
            e.preventDefault();
            const values = Object.fromEntries(new FormData(e.currentTarget));
            if (
              await account({
                type: 'seller_access',
                ...values,
                ...(outletId ? { outletId } : {}),
              })
            ) {
              setOpen(false);
              setSuccess(
                `Akun ${values.email} siap digunakan. Sampaikan kata sandi kepada penjual melalui jalur pribadi.`,
              );
              toast(
                outletId
                  ? 'Akses penjual ditambahkan.'
                  : 'Gerai dan akun penjual dibuat.',
              );
            }
          }}
        >
          {!outletId && (
            <>
              <Field label="Nama gerai">
                <input
                  name="outletName"
                  placeholder="Contoh: Dapur Sehat"
                  minLength={2}
                  maxLength={100}
                  required
                />
              </Field>
              <Field label="Lokasi gerai">
                <input
                  name="location"
                  placeholder="Kantin Asrama · A-07"
                  minLength={2}
                  maxLength={160}
                  required
                />
              </Field>
              <Field label="Kategori">
                <input
                  name="category"
                  defaultValue="Nasi & lauk"
                  maxLength={60}
                />
              </Field>
            </>
          )}
          <Field label="Nama penjual">
            <input
              name="name"
              autoComplete="off"
              minLength={2}
              maxLength={100}
              placeholder="Nama pemilik atau petugas"
              required
            />
          </Field>
          <Field label="Email akun penjual">
            <input
              name="email"
              type="email"
              autoComplete="off"
              maxLength={254}
              placeholder="nama@contoh.id"
              required
            />
          </Field>
          <Field
            label="Kata sandi awal"
            hint="Minimal 8 karakter. Sampaikan langsung kepada penerima akun."
          >
            <PasswordInput
              aria-label="Kata sandi awal"
              name="password"
              autoComplete="new-password"
              minLength={8}
              maxLength={128}
              required
            />
          </Field>
          <p className="account-note">
            Akun hanya dapat mengelola gerai yang ditetapkan. Gerai baru dimulai
            tanpa stok siap jual.
          </p>
          <Button type="submit" loading={busy}>
            {outletId ? 'Beri akses' : 'Buat gerai & akun'}
            <Check size={17} />
          </Button>
        </form>
      </Modal>
    </div>
  );
}
