import { Suspense } from 'react';
import { AppShell } from '@/components/app-shell';
export const metadata = { title: 'Ruang pengelola', robots: { index: false } };
export default function Page() {
  return (
    <Suspense fallback={null}>
      <AppShell role="admin" />
    </Suspense>
  );
}
