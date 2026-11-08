'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, ArrowRight, Eye, EyeOff, ShieldCheck, Store, Utensils } from 'lucide-react';
import { Brand, Button, Field } from '@/components/ui';
import { PlateScene } from '@/components/landing';
import { useApp } from '@/components/provider';
import type { Role } from '@/lib/domain';

export function Auth({ admin = false }: { admin?: boolean }) {
  const params = useSearchParams();
  const [role, setRole] = useState<Role>(admin ? 'admin' : params.get('peran') === 'gerai' ? 'seller' : 'student');
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { state, loading, busy, error, login } = useApp();
  const router = useRouter();
  const target = role === 'student' ? '/mahasiswa' : role === 'seller' ? '/gerai' : '/pengelola';
  return (
    <main id="main" className={`auth-page ${admin ? 'auth-admin' : ''}`}>
      <section className="auth-story">
        <Brand />
        <Link className="auth-back text-link" href="/"><ArrowLeft size={16} /> Kembali ke beranda</Link>
        <div className="auth-story-copy">
          <p className="eyebrow">{admin ? 'PENGELOLA KANTIN' : 'KANTIN DALAM JANGKAUANMU'}</p>
          <h1>{admin ? <>Pantau kantin.<br /><span>Rencanakan esok.</span></> : <>Pilih sekarang.<br />Nikmati saat<br /><span>istirahat.</span></>}</h1>
          <p>{admin ? 'Lihat operasional seluruh gerai, dari produksi dan pesanan hingga sisa makanan.' : 'Pesan dari kelas, pilih waktu ambil, dan pantau kesiapan makananmu.'}</p>
        </div>
        {admin ? <div className="auth-admin-art"><ShieldCheck size={100} strokeWidth={0.8} /><span>Akses khusus pengelola yang terdaftar.</span></div> : <PlateScene compact />}
        <span className="auth-story-foot">Rencanakan. Nikmati. Teruskan.</span>
      </section>
      <section className="auth-form-area">
        <Link className="auth-mobile-back text-link" href="/"><ArrowLeft size={16} /> Beranda</Link>
        <div className="auth-form-card">
          <p className="eyebrow">{admin ? 'AKSES TERBATAS' : 'SELAMAT DATANG'}</p>
          <h2>{admin ? 'Masuk sebagai pengelola' : role === 'seller' ? 'Ruang pemilik gerai' : 'Mau makan apa hari ini?'}</h2>
          <p className="muted">{admin ? 'Gunakan kredensial pengelola yang diberikan penyedia platform.' : role === 'seller' ? 'Masuk dengan akun gerai untuk menerima pesanan dan mengatur produksi.' : 'Langsung pesan sebagai tamu. Masuk dengan akun tersedia sebagai pilihan.'}</p>
          {!admin && <div className="auth-role-switch" aria-label="Pilih ruang">
            <button type="button" onClick={() => setRole('student')} aria-pressed={role === 'student'} className={role === 'student' ? 'selected' : ''}><Utensils size={18} /> Mahasiswa</button>
            <button type="button" onClick={() => setRole('seller')} aria-pressed={role === 'seller'} className={role === 'seller' ? 'selected' : ''}><Store size={18} /> Pemilik gerai</button>
          </div>}
          {role === 'student' && <div className="stack" style={{ marginBlock: 24 }}>
            <Link className="button button-primary full-width" href="/mahasiswa">Langsung pilih menu <ArrowRight size={18} /></Link>
            <p className="muted">Tanpa wajib login. Pesanan tamu tersimpan di browser yang kamu gunakan.</p>
            <div className="auth-divider"><span>atau masuk dengan akun</span></div>
          </div>}
          <form className="auth-fields stack" onSubmit={async (event) => {
            event.preventDefault();
            if (await login(role, state?.mode === 'demo', email, password)) router.push(target);
          }}>
            <Field label="Alamat email"><input type="email" autoComplete="username" placeholder="Email akun terdaftar" value={email} onChange={(event) => setEmail(event.target.value)} required maxLength={254} /></Field>
            <Field label="Kata sandi"><span className="password-input">
              <input type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Masukkan kata sandi" value={password} onChange={(event) => setPassword(event.target.value)} required maxLength={1024} />
              <button type="button" aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={19} /> : <Eye size={19} />}</button>
            </span></Field>
            {error && <p className="form-error" role="alert">{error}</p>}
            <Button className="full-width" type="submit" loading={busy} disabled={loading || !state}>Masuk <ArrowRight size={18} /></Button>
          </form>
          <div className="auth-bottom"><ShieldCheck size={16} /><span>{role === 'student' ? 'Akun opsional. Cukup nama panggilan saat memesan.' : 'Peran dan kepemilikan gerai diverifikasi oleh server.'}</span></div>
        </div>
        <span className="auth-copyright">PORSI LOOP · Trinity LFA · CR YOUTH 2026</span>
      </section>
    </main>
  );
}
