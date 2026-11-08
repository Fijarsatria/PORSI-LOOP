import type { Metadata, Viewport } from 'next';
import '@fontsource-variable/plus-jakarta-sans';
import '@fontsource-variable/dm-sans';
import './globals.css';
import { AppProvider } from '@/components/provider';
import { IntroSplash } from '@/components/intro-splash';
import { introGate } from '@/components/intro-gate';

export const metadata: Metadata = {
  title: {
    default: 'PORSI LOOP — Porsi pas. Waktu lebih lepas.',
    template: '%s · PORSI LOOP',
  },
  description:
    'Pesan langsung tanpa wajib login. Pilih Dine in atau Pick up, pantau pesanan, dan temukan Promo Terbatas dari gerai kantin kampus.',
  applicationName: 'PORSI LOOP',
  manifest: '/manifest.webmanifest',
  icons: { icon: '/icon.png', apple: '/icon.png' },
  openGraph: {
    title: 'PORSI LOOP — Porsi pas. Waktu lebih lepas.',
    description: 'Satu loop untuk makan siang yang lebih terencana.',
    locale: 'id_ID',
    type: 'website',
  },
};
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#F5F7F2',
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body id="top">
        <script dangerouslySetInnerHTML={{ __html: introGate }} />
        <noscript>
          <style>{'.intro-splash{display:none!important}'}</style>
        </noscript>
        <IntroSplash />
        <a className="skip-link" href="#main">
          Langsung ke konten
        </a>
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
