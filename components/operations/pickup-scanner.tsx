'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import jsQR from 'jsqr';
import { Camera, CameraOff, ScanLine, ShieldCheck } from 'lucide-react';
import { Button, Field, Modal } from '../ui';
import { useApp } from '../provider';
import { useOperations } from './shared';

function CameraScanner({ onRedeemed }: { onRedeemed: () => void }) {
  const { action } = useOperations();
  const { busy } = useApp();
  const [token, setToken] = useState('');
  const [camera, setCamera] = useState<
    'starting' | 'scanning' | 'stopped' | 'error'
  >('starting');
  const [message, setMessage] = useState('Menyiapkan kamera belakang…');
  const video = useRef<HTMLVideoElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const frame = useRef<number | null>(null);
  const mounted = useRef(true);
  const starting = useRef(false);
  const scanning = useRef(false);
  const submitting = useRef(false);
  const actionRef = useRef(action);
  const doneRef = useRef(onRedeemed);
  actionRef.current = action;
  doneRef.current = onRedeemed;

  function stopCamera() {
    scanning.current = false;
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    if (video.current) video.current.srcObject = null;
  }

  async function redeem(value: string) {
    if (!value.trim() || submitting.current) return;
    submitting.current = true;
    stopCamera();
    if (mounted.current) {
      setCamera('stopped');
      setToken(value.trim());
      setMessage('Memeriksa pembayaran, kesiapan, gerai, dan pemakaian QR…');
    }
    try {
      const success = await actionRef.current({
        type: 'scan_pickup',
        token: value.trim(),
      });
      if (!mounted.current) return;
      if (success) doneRef.current();
      else
        setMessage(
          'QR belum dapat ditukar. Periksa pesan di atas, lalu pindai ulang atau masukkan token lain.',
        );
    } finally {
      submitting.current = false;
    }
  }

  async function startCamera() {
    if (starting.current) return;
    starting.current = true;
    stopCamera();
    setCamera('starting');
    setMessage('Menyiapkan kamera belakang…');
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(
          'Kamera memerlukan browser yang mendukung akses kamera dan koneksi HTTPS atau localhost. Gunakan token QR sebagai alternatif.',
        );
      }
      const media = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } },
        audio: false,
      });
      if (!mounted.current) {
        media.getTracks().forEach((track) => track.stop());
        return;
      }
      stream.current = media;
      if (!video.current) {
        stopCamera();
        return;
      }
      video.current.srcObject = media;
      await video.current.play();
      if (!mounted.current) {
        stopCamera();
        return;
      }
      scanning.current = true;
      setCamera('scanning');
      setMessage(
        'Arahkan QR customer ke tengah kamera. Pemindaian akan berhenti setelah QR terbaca.',
      );
      let previous = 0;
      const decode = (at: number) => {
        if (!mounted.current || !scanning.current) return;
        const source = video.current;
        const target = canvas.current;
        if (source && target && source.readyState >= 2 && at - previous > 150) {
          previous = at;
          const scale = Math.min(1, 800 / source.videoWidth);
          target.width = Math.round(source.videoWidth * scale);
          target.height = Math.round(source.videoHeight * scale);
          const context = target.getContext('2d', { willReadFrequently: true });
          if (context && target.width && target.height) {
            context.drawImage(source, 0, 0, target.width, target.height);
            const pixels = context.getImageData(
              0,
              0,
              target.width,
              target.height,
            );
            const result = jsQR(pixels.data, pixels.width, pixels.height, {
              inversionAttempts: 'attemptBoth',
            });
            if (result?.data) {
              void redeem(result.data);
              return;
            }
          }
        }
        frame.current = requestAnimationFrame(decode);
      };
      frame.current = requestAnimationFrame(decode);
    } catch (error) {
      stopCamera();
      if (!mounted.current) return;
      setCamera('error');
      const name = error instanceof DOMException ? error.name : '';
      setMessage(
        name === 'NotAllowedError'
          ? 'Izin kamera belum diberikan. Izinkan kamera melalui pengaturan browser atau masukkan token QR di bawah.'
          : name === 'NotFoundError'
            ? 'Kamera tidak ditemukan pada perangkat ini. Masukkan token QR dari pesanan customer.'
            : name === 'NotReadableError'
              ? 'Kamera sedang digunakan aplikasi lain. Tutup aplikasi tersebut, lalu coba lagi, atau masukkan token QR.'
              : error instanceof Error
                ? error.message
                : 'Kamera belum dapat dibuka. Gunakan token QR atau coba lagi.',
      );
    } finally {
      starting.current = false;
    }
  }

  useEffect(() => {
    mounted.current = true;
    void startCamera();
    return () => {
      mounted.current = false;
      stopCamera();
    };
    // Camera lifetime follows the dialog, not polling updates to the order list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await redeem(token);
  }

  return (
    <div className="stack ops-scanner">
      <div
        className={`ops-camera-preview ${camera === 'scanning' ? 'is-scanning' : ''}`}
      >
        <video
          ref={video}
          muted
          playsInline
          aria-label="Pratinjau kamera pemindai QR"
        />
        {camera === 'scanning' ? (
          <div className="ops-camera-target" aria-hidden="true" />
        ) : (
          <div className="ops-camera-placeholder">
            <CameraOff size={32} />
            <span>
              {camera === 'starting' ? 'Membuka kamera' : 'Kamera berhenti'}
            </span>
          </div>
        )}
        <canvas ref={canvas} hidden />
      </div>
      <p
        className={camera === 'error' ? 'form-error' : 'ops-footnote'}
        role={camera === 'error' ? 'alert' : 'status'}
      >
        {message}
      </p>
      {camera !== 'scanning' && camera !== 'starting' && (
        <Button
          variant="secondary"
          type="button"
          onClick={() => void startCamera()}
          disabled={busy}
        >
          <Camera size={17} />
          Coba kamera lagi
        </Button>
      )}
      <form className="stack" onSubmit={submit}>
        <Field
          label="Token QR pengambilan"
          hint="Salin token yang tercantum di bawah QR. Pemeriksaannya sama dengan kamera."
        >
          <textarea
            value={token}
            onChange={(event) => setToken(event.target.value)}
            maxLength={1024}
            rows={2}
            required
            autoComplete="off"
            spellCheck={false}
            placeholder="Tempel token pengambilan"
          />
        </Field>
        <Button type="submit" loading={busy} disabled={!token.trim()}>
          <ShieldCheck size={17} />
          Verifikasi &amp; serahkan
        </Button>
      </form>
      <p className="ops-footnote">
        Hanya pesanan lunas, siap, dan milik gerai ini yang bisa ditukar. QR
        berlaku sekali; pemindaian ulang tidak mencatat penyerahan baru.
      </p>
    </div>
  );
}

export function PickupScanner() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        <ScanLine size={20} />
        Scan QR
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Verifikasi pengambilan"
      >
        <CameraScanner onRedeemed={() => setOpen(false)} />
      </Modal>
    </>
  );
}
