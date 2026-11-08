import { Suspense } from 'react';
import { Auth } from '@/components/auth';
import { PageLoading } from '@/components/ui';
export const metadata = { title: 'Daftar customer' };
export default function Page() {
  return (
    <Suspense fallback={<PageLoading />}>
      <Auth signup />
    </Suspense>
  );
}
