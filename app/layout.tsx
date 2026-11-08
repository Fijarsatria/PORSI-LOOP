import type { Metadata, Viewport } from 'next';
import '@fontsource-variable/plus-jakarta-sans';
import '@fontsource-variable/dm-sans';
import './globals.css';
import { AppProvider } from '@/components/provider';

export const metadata: Metadata = {
  title: {
    default: 'PORSI LOOP — Porsi pas. Waktu lebih lepas.',
    template: '%s · PORSI LOOP',
  },
  description:
    'Rencanakan sebelum memasak. Selamatkan bila tersisa. Ukur dampaknya. Pre-order, slot ambil, dan rescue makanan untuk kantin kampus.',
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
    <html lang="id">
      <body>
        <a className="skip-link" href="#main">
          Langsung ke konten
        </a>
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
