'use client';
import { useState } from 'react';
import { Camera } from 'lucide-react';
export function MenuPhoto({
  initial = '/images/nasi-ayam.webp',
}: {
  initial?: string;
}) {
  const [image, setImage] = useState(initial);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  return (
    <div className="menu-photo">
      <img src={image} alt="Pratinjau foto menu" width={140} height={110} />
      <div>
        <label className="button button-secondary">
          <Camera size={18} />
          Ganti foto
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="photo-input"
            disabled={loading}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setError('');
              if (
                !['image/png', 'image/jpeg', 'image/webp'].includes(
                  file.type,
                ) ||
                file.size > 10000000
              ) {
                setError('Pilih PNG, JPEG, atau WebP maksimal 10 MB.');
                return;
              }
              setLoading(true);
              const url = URL.createObjectURL(file);
              try {
                const img = new Image();
                img.src = url;
                await img.decode();
                const canvas = document.createElement('canvas');
                const scale = Math.min(
                  1,
                  480 / Math.max(img.width, img.height),
                );
                canvas.width = Math.max(1, Math.round(img.width * scale));
                canvas.height = Math.max(1, Math.round(img.height * scale));
                canvas
                  .getContext('2d')!
                  .drawImage(img, 0, 0, canvas.width, canvas.height);
                const result = canvas.toDataURL('image/webp', 0.72);
                if (result.length > 90000)
                  throw Error(
                    'Foto masih terlalu besar. Pilih foto yang lebih sederhana.',
                  );
                setImage(result);
              } catch (err) {
                setError(
                  err instanceof Error
                    ? err.message
                    : 'Foto tidak dapat dibaca.',
                );
              } finally {
                URL.revokeObjectURL(url);
                setLoading(false);
              }
            }}
          />
        </label>
        <p className="fine-print">
          {loading
            ? 'Menyiapkan foto…'
            : 'Foto makanan atau minuman. PNG, JPEG, WebP; maksimal 10 MB.'}
        </p>
        {error && <p role="alert">{error}</p>}
      </div>
      <input type="hidden" name="image" value={image} />
    </div>
  );
}
