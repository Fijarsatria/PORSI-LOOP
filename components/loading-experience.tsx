'use client';
import { useEffect, useState } from 'react';
import { ArrowRight, Store, ShieldCheck, Utensils } from 'lucide-react';
export function LoadingExperience({
  role = 'student',
}: {
  role?: 'student' | 'seller' | 'admin';
}) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), 6000);
    return () => clearTimeout(timer);
  }, []);
  const Icon =
    role === 'admin' ? ShieldCheck : role === 'seller' ? Store : Utensils;
  const [tip, setTip] = useState(0);
  const tips = [
    'Pilih porsi yang pas untukmu.',
    'Pesanan siap? Tunjukkan QR saat mengambil.',
    'Masak sesuai rencana, kurangi yang tersisa.',
  ];
  return (
    <div
      className="loop-loading"
      role="status"
      aria-label="Menyiapkan PORSI LOOP"
    >
      <div className="loading-orbit">
        <span />
        <span />
        <span />
        <Icon size={38} strokeWidth={1.5} />
      </div>
      <span className="loading-wordmark">PORSI LOOP</span>
      <h2>
        {role === 'admin'
          ? 'Menyiapkan ruang pengelola'
          : role === 'seller'
            ? 'Membuka gerai Anda'
            : 'Sebentar, kantinmu sedang disiapkan'}
      </h2>
      <p>
        {slow
          ? 'Koneksi sedang lebih lambat. Kami masih menghubungkan datamu…'
          : 'Menghubungkan menu, pesanan, dan kabar terbaru.'}
      </p>
      <div className="loading-progress" aria-hidden="true">
        <span />
      </div>
      <button type="button" onClick={() => setTip((tip + 1) % tips.length)}>
        {tips[tip]}
        <ArrowRight size={16} />
      </button>
    </div>
  );
}
