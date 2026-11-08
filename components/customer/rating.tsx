'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Star, Check } from 'lucide-react';
import type { Order, RescueClaim } from '@/lib/domain';
import { useApp } from '../provider';
import { Button, Field, Modal } from '../ui';
import '../controls.css';

export function OrderRating({ order }: { order: Order | RescueClaim }) {
  const { state, action, busy, toast } = useApp();
  const [open, setOpen] = useState(false);
  const [stars, setStars] = useState(order.rating?.stars ?? 5);
  const [comment, setComment] = useState(order.rating?.comment ?? '');
  if (order.status !== 'picked_up') return null;
  return (
    <div className="order-rating">
      <Button variant="ghost" onClick={() => setOpen(true)}>
        <Star size={16} />
        {order.rating ? `${order.rating.stars}/5 · Edit rating` : 'Beri rating'}
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Bagaimana makanannya?"
      >
        {state?.user?.isGuest ? (
          <div className="stack">
            <p className="muted">
              Masuk atau daftar untuk memberi rating pada pesanan yang sudah
              diterima. Pesanan tamu di browser ini ikut ditautkan ke akunmu.
            </p>
            <Link className="button button-primary" href="/masuk">
              Masuk untuk memberi rating
            </Link>
            <Link className="button button-secondary" href="/daftar">
              Buat akun customer
            </Link>
          </div>
        ) : (
          <form
            className="stack"
            onSubmit={async (e) => {
              e.preventDefault();
              if (
                await action({
                  type: 'rate_order',
                  orderId: order.id,
                  stars,
                  comment,
                })
              ) {
                setOpen(false);
                toast('Terima kasih. Rating pesananmu tersimpan.');
              }
            }}
          >
            <p className="muted">
              {order.menuName} · {order.outletName}
            </p>
            <div
              className="rating-stars"
              role="group"
              aria-label="Pilih rating 1 sampai 5 bintang"
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  type="button"
                  key={n}
                  aria-label={`${n} bintang`}
                  aria-pressed={stars === n}
                  className={n <= stars ? 'chosen' : ''}
                  onClick={() => setStars(n)}
                >
                  <Star size={25} />
                </button>
              ))}
            </div>
            <Field label="Ceritakan singkat (opsional)">
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                maxLength={300}
                placeholder="Rasa, porsi, atau pengalaman mengambil pesanan..."
              />
            </Field>
            <Button loading={busy} type="submit">
              Simpan rating <Check size={17} />
            </Button>
          </form>
        )}
      </Modal>
    </div>
  );
}
