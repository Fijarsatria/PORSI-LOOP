'use client';
import { useState } from 'react';
import { Leaf, ArrowRight } from 'lucide-react';
export function LoadingExperience() {
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
        <Leaf size={38} strokeWidth={1.5} />
      </div>
      <h2>Satu porsi. Satu langkah baik.</h2>
      <p>Menyiapkan ruangmu…</p>
      <button type="button" onClick={() => setTip((tip + 1) % tips.length)}>
        {tips[tip]}
        <ArrowRight size={16} />
      </button>
    </div>
  );
}
