import { Suspense } from 'react';
import { Auth } from '@/components/auth';
export const metadata = { title: 'Masuk pemilik gerai' };
export default function Page() {
  return (
    <Suspense fallback={null}>
      <Auth seller />
    </Suspense>
  );
}
