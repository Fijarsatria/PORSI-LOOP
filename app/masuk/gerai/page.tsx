import { Suspense } from 'react';
import { Auth } from '@/components/auth';
import { PageLoading } from '@/components/ui';
export const metadata = { title: 'Masuk pemilik gerai' };
export default function Page() {
  return (
    <Suspense fallback={<PageLoading />}>
      <Auth seller />
    </Suspense>
  );
}
