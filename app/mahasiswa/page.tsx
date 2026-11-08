import { Suspense } from 'react';
import { AppShell } from '@/components/app-shell';
export const metadata = { title: 'Ruang customer', robots: { index: false } };
export default function Page() {
  return (
    <Suspense fallback={null}>
      <AppShell role="student" />
    </Suspense>
  );
}
