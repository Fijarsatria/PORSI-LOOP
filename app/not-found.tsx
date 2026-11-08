import Link from 'next/link';
import { ArrowLeft, Search } from 'lucide-react';
import { Brand } from '@/components/ui';
export default function NotFound() {
  return (
    <main id="main" className="access-page">
      <Brand />
      <Search size={46} />
      <p className="eyebrow">404 · HALAMANNYA BELUM ADA</p>
      <h1>Sepertinya salah belok.</h1>
      <p>Kembali ke beranda untuk menemukan menu dan ruangmu.</p>
      <Link className="button button-primary" href="/">
        <ArrowLeft size={17} /> Kembali ke beranda
      </Link>
    </main>
  );
}
