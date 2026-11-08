'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  ShieldCheck,
  Store,
  Utensils,
} from 'lucide-react';
import { Brand, Button, Field } from '@/components/ui';
import { PlateScene } from '@/components/landing';
import { useApp } from '@/components/provider';
import type { Role } from '@/lib/domain';
import { PasswordInput } from './controls';

export function Auth({
  admin = false,
  signup = false,
  seller = false,
}: {
  admin?: boolean;
  signup?: boolean;
  seller?: boolean;
}) {
  const params = useSearchParams();
  const [role, setRole] = useState<Role>(
    admin
      ? 'admin'
      : seller || params.get('peran') === 'gerai'
        ? 'seller'
        : 'student',
  );
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const { state, loading, busy, error, login, account } = useApp();
  const router = useRouter();
  const target =
    role === 'student'
      ? '/customer'
      : role === 'seller'
        ? '/gerai'
        : '/pengelola';
  return (
    <main id="main" className={`auth-page ${admin ? 'auth-admin' : ''}`}>
      <section className="auth-story">
        <Brand />
        <Link className="auth-back text-link" href="/#top">
          <ArrowLeft size={16} /> Kembali ke beranda
        </Link>
        <div className="auth-story-copy">
          <p className="eyebrow">
            {admin
              ? 'PENGELOLA KANTIN'
              : role === 'seller'
                ? 'RUANG KERJA GERAI'
                : 'KANTIN DALAM JANGKAUANMU'}
          </p>
          <h1>
            {admin ? (
              <>
                Pantau kantin.
                <br />
                <span>Rencanakan esok.</span>
              </>
            ) : role === 'seller' ? (
              <>
                Kelola dapur.
                <br />
                <span>Layani lebih mudah.</span>
              </>
            ) : (
              <>
                Pilih sekarang.
                <br />
                Nikmati saat
                <br />
                <span>istirahat.</span>
              </>
            )}
          </h1>
          <p>
            {admin
              ? 'Kelola kantin Anda dengan ringkasan penjualan, penerimaan pembayaran, pesanan, dan operasional seluruh gerai.'
              : role === 'seller'
                ? 'Menu, pesanan, dan rencana memasak. Semua kebutuhan geraimu, dalam satu ruang.'
                : 'Pilih menu, tentukan waktu ambil, dan pantau kesiapan makananmu.'}
          </p>
        </div>
        {admin ? (
          <div className="auth-admin-art">
            <ShieldCheck size={100} strokeWidth={0.8} />
            <span>Akses khusus pengelola yang terdaftar.</span>
          </div>
        ) : role === 'seller' ? (
          <div className="auth-admin-art">
            <Store size={100} strokeWidth={0.8} />
            <span>Dari dapurmu, untuk pelangganmu.</span>
          </div>
        ) : (
          <PlateScene compact />
        )}
        <span className="auth-story-foot">Rencanakan. Nikmati. Teruskan.</span>
      </section>
      <section className="auth-form-area">
        <Link className="auth-mobile-back text-link" href="/#top">
          <ArrowLeft size={16} /> Beranda
        </Link>
        <div className="auth-form-card">
          <p className="eyebrow">
            {admin ? 'AKSES TERBATAS' : 'SELAMAT DATANG'}
          </p>
          <h2>
            {signup
              ? 'Buat akun customer'
              : admin
                ? 'Masuk sebagai pengelola'
                : role === 'seller'
                  ? 'Ruang pemilik gerai'
                  : 'Mau makan apa hari ini?'}
          </h2>
          <p className="muted">
            {admin
              ? 'Akses untuk pengelola kantin pelanggan PORSI LOOP. Gunakan akun yang diberikan penyedia platform untuk memantau seluruh gerai kantin Anda.'
              : role === 'seller'
                ? 'Masuk dengan akun gerai untuk mengubah menu, mengatur ketersediaan, dan memperbarui status pesanan.'
                : 'Langsung pesan sebagai tamu. Masuk dengan akun tersedia sebagai pilihan.'}
          </p>
          {role === 'student' && !signup && (
            <div className="stack" style={{ marginBlock: 24 }}>
              <Link
                className="button button-primary full-width"
                href="/customer"
              >
                Langsung pilih menu <ArrowRight size={18} />
              </Link>
              <p className="muted">
                Tanpa wajib login. Pesanan tamu tersimpan di browser yang kamu
                gunakan.
              </p>
              <div className="auth-divider">
                <span>atau masuk dengan akun</span>
              </div>
            </div>
          )}
          <form
            className="auth-fields stack"
            onSubmit={async (event) => {
              event.preventDefault();
              if (
                signup
                  ? await account({ type: 'register', name, email, password })
                  : await login(role, state?.mode === 'demo', email, password)
              )
                router.push(target);
            }}
          >
            {signup && (
              <Field label="Nama panggilan">
                <input
                  autoComplete="nickname"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Panggil kamu siapa?"
                  minLength={2}
                  maxLength={100}
                  required
                />
              </Field>
            )}
            <Field label="Alamat email">
              <input
                type="email"
                autoComplete="username"
                placeholder="Email akun terdaftar"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                maxLength={254}
              />
            </Field>
            <Field label="Kata sandi">
              <PasswordInput
                autoComplete={signup ? 'new-password' : 'current-password'}
                placeholder="Masukkan kata sandi"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={signup ? 8 : 1}
                maxLength={128}
              />
            </Field>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <Button
              className="full-width"
              type="submit"
              loading={busy}
              disabled={loading || !state}
            >
              {signup ? 'Buat akun' : 'Masuk'} <ArrowRight size={18} />
            </Button>
          </form>
          {role === 'student' && (
            <p className="auth-signup-link">
              {signup ? (
                <>
                  Sudah punya akun? <Link href="/masuk">Masuk</Link>
                </>
              ) : (
                <>
                  Belum punya akun? <Link href="/daftar">Daftar customer</Link>
                </>
              )}
            </p>
          )}
          {signup && (
            <p className="account-note">
              Akun menyimpan pesanan dan memungkinkan rating setelah makanan
              diterima. Pesanan tamu di browser ini ikut ditautkan.
            </p>
          )}
          {role === 'seller' && (
            <p className="account-note">
              Akun gerai diberikan oleh pengelola kantin. Hubungi pengelola jika
              belum memiliki akses.
            </p>
          )}
          <div className="auth-bottom">
            <ShieldCheck size={16} />
            <span>
              {role === 'student'
                ? 'Akun opsional. Cukup nama panggilan saat memesan.'
                : 'Peran dan kepemilikan gerai diverifikasi oleh server.'}
            </span>
          </div>
        </div>
        <span className="auth-copyright">
          PORSI LOOP · Trinity LFA · CR YOUTH 2026
        </span>
      </section>
    </main>
  );
}
