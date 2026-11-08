import { Suspense } from 'react';
import { Auth } from '@/components/auth';
export const metadata = { title: 'Masuk' };
export default function Page() {
  return (
    <Suspense fallback={null}>
      <Auth />
    </Suspense>
  );
}
