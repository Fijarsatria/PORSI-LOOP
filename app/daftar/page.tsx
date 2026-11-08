import { Suspense } from 'react';
import { Auth } from '@/components/auth';
export const metadata = { title: 'Daftar customer' };
export default function Page() {
  return (
    <Suspense fallback={null}>
      <Auth signup />
    </Suspense>
  );
}
