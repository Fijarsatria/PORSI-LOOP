import { Suspense } from 'react';
import { Auth } from '@/components/auth';
export const metadata = {
  title: 'Akses pengelola',
  robots: { index: false, follow: false },
};
export default function Page() {
  return (
    <Suspense fallback={null}>
      <Auth admin />
    </Suspense>
  );
}
