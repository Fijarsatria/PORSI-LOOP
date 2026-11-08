'use client';
import { Button } from '@/components/ui';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="main" className="access-page">
      <h1>Halaman belum bisa dibuka.</h1>
      <p>
        Coba muat kembali. Pesanan yang sudah dikonfirmasi tersimpan di server.
      </p>
      <Button onClick={reset}>Muat kembali</Button>
    </main>
  );
}
