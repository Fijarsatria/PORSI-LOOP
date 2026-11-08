'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Check, Clock3, CreditCard, QrCode, Wallet } from 'lucide-react';
import { Button } from '@/components/ui';
import { clock, rupiah, type PaymentMethod } from '@/lib/domain';
import './demo-payment.css';

// Demo checkout: there is no payment provider. The page shows what the
// customer would pay with, then confirms on its own after AUTO_MS, exactly as
// if the payment had arrived. No money moves.
const AUTO_MS = 4000;
const names: Record<PaymentMethod, string> = {
  qris: 'QRIS',
  ewallet: 'E-wallet',
  bank_transfer: 'Transfer bank',
  cash: 'Bayar di gerai',
};

function DemoQris({ payload }: { payload: string }) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    let live = true;
    void import('qrcode')
      .then((qr) =>
        qr.toDataURL(payload, {
          width: 260,
          margin: 1,
          errorCorrectionLevel: 'M',
          color: { dark: '#111111', light: '#ffffff' },
        }),
      )
      .then((url) => live && setSrc(url))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [payload]);
  return (
    <div className="demo-qris">
      <div className="demo-qris-head">
        <strong>QRIS</strong>
        <span>DEMO · bukan pembayaran sungguhan</span>
      </div>
      <div className="demo-qris-code">
        {src ? (
          <Image src={src} alt="Kode QRIS demo" width={190} height={190} unoptimized />
        ) : (
          <QrCode size={64} aria-hidden="true" />
        )}
      </div>
      <small>NMID DEMO · PORSI LOOP</small>
    </div>
  );
}

export function DemoPayment({
  method,
  amount,
  code,
  outlet,
  expiresAt,
  busy,
  onPay,
}: {
  method: PaymentMethod;
  amount: number;
  code: string;
  outlet?: string;
  expiresAt?: string;
  busy: boolean;
  onPay: () => Promise<boolean> | void;
}) {
  const [left, setLeft] = useState(AUTO_MS);
  const fired = useRef(false);
  useEffect(() => {
    const start = Date.now();
    const tick = setInterval(() => {
      const remaining = Math.max(0, AUTO_MS - (Date.now() - start));
      setLeft(remaining);
      if (remaining === 0 && !fired.current) {
        fired.current = true;
        clearInterval(tick);
        void onPay();
      }
    }, 100);
    return () => clearInterval(tick);
    // The countdown runs once per opened payment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);
  const pay = () => {
    if (fired.current) return;
    fired.current = true;
    void onPay();
  };
  const digits = code.replace(/\D/g, '').padStart(6, '0').slice(-6);
  const done = left === 0;

  return (
    <div className="market-payment-view demo-payment">
      <div className="market-demo-label">SIMULASI PEMBAYARAN</div>
      {method === 'qris' ? (
        <DemoQris payload={`PORSILOOP-DEMO|${code}|${amount}`} />
      ) : (
        <div className="market-payment-symbol">
          {method === 'ewallet' ? <Wallet size={48} /> : <CreditCard size={48} />}
        </div>
      )}
      <p className="market-payment-label">
        Total pembayaran {names[method]}
        {outlet ? ` · ${outlet}` : ''}
      </p>
      <strong className="market-payment-amount">{rupiah(amount)}</strong>
      {method !== 'qris' && (
        <p className="demo-account">
          {method === 'bank_transfer' ? 'Virtual account demo' : 'Nomor tagihan demo'}{' '}
          <strong>8808 {digits.slice(0, 3)} {digits.slice(3)}</strong>
        </p>
      )}
      <div className="demo-auto" role="status" aria-live="polite">
        <div className="demo-auto-bar" aria-hidden="true">
          <span style={{ transform: `scaleX(${1 - left / AUTO_MS})` }} />
        </div>
        <p>
          {done
            ? 'Pembayaran diterima. Memperbarui pesananmu…'
            : `Menunggu pembayaran… terkonfirmasi otomatis dalam ${Math.ceil(left / 1000)} detik.`}
        </p>
      </div>
      {expiresAt && (
        <span className="market-payment-expiry">
          <Clock3 size={14} /> Batas pembayaran {clock(expiresAt)} WIB
        </span>
      )}
      <Button loading={busy || done} onClick={pay}>
        Simulasikan pembayaran berhasil <Check size={17} />
      </Button>
      <small>
        Demo: tidak ada uang yang berpindah. Pembayaran ditandai lunas seperti
        sudah dibayar.
      </small>
    </div>
  );
}
