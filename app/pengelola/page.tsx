import { Suspense } from 'react';
import { AppShell } from '@/components/app-shell';
import { PageLoading } from '@/components/ui';
export const metadata = { title: 'Ruang pengelola', robots: { index: false } };
export default function Page() {
  return (
    <Suspense fallback={<PageLoading role="admin" />}>
      <AppShell role="admin" />
    </Suspense>
  );
}
