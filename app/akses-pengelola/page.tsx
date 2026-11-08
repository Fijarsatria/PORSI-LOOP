import { Suspense } from 'react';
import { Auth } from '@/components/auth';
import { PageLoading } from '@/components/ui';
export const metadata = {
  title: 'Akses pengelola',
  robots: { index: false, follow: false },
};
export default function Page() {
  return (
    <Suspense fallback={<PageLoading />}>
      <Auth admin />
    </Suspense>
  );
}
