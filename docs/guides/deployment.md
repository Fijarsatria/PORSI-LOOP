# Menjalankan dan men-deploy PORSI LOOP

## Pilihan penyimpanan

| Mode       | Kebutuhan                                               | Batas                                                                |
| ---------- | ------------------------------------------------------- | -------------------------------------------------------------------- |
| `demo`     | Node.js 24 LTS dan disk persisten                       | Kredensial staf wajib, seluruh angka simulasi, satu instance server  |
| `supabase` | Proyek Supabase, Auth, skema PostgreSQL, secrets server | Aktif pada Vercel; skema, akses dan alur transaksi cloud sudah diuji |

Proyek aktif: **PORSI LOOP**, organisasi **Fijarsatria**, region Singapore, referensi `eemuhrlpfewujfuflapl`. Skema dan pembatasan akses sudah diuji pada database cloud. [Kontrak, bukti dan query verifikasi](../../supabase/README.md) tersedia di repositori. Runtime web aktif di [porsi-loop.vercel.app](https://porsi-loop.vercel.app). Pengujian HTTPS pada aplikasi publik dan database Supabase sudah lulus; lihat [bukti rilis](../release-status.md).

## Server Node.js

```bash
npm ci
npm run build
npm run check:config
npm start
```

Set variabel pada pengaturan secrets host atau `.env.local` lokal yang tidak di-commit. Untuk produksi, jalankan `NODE_ENV=production npm run check:config`. `APP_ORIGIN` harus sama persis dengan origin HTTPS situs yang dipakai browser. Jika hostname/domain berubah, ubah origin tersebut juga. Cookie produksi memakai Secure, HttpOnly, dan SameSite=Lax.

Mode demo membaca `PORSI_DATA_DIR` (bawaan `.data/`). Pasang volume persisten, gunakan satu instance, dan cadangkan SQLite secara konsisten dengan WAL menggunakan fasilitas backup SQLite atau hentikan proses sebelum menyalin keseluruhan file database beserta WAL. Jangan mengandalkan disk sementara untuk mempertahankan transaksi. `PORSI_COOKIE_INSECURE=true` hanya untuk pengujian produksi pada localhost HTTP; bukan layanan publik.

## Menghubungkan Supabase

1. Pilih proyek milik tim yang aksesnya sudah diberikan. Ambil project URL, publishable key, serta secret key server melalui dashboard. Service role key hanya berada di secrets server.
2. Tinjau dan pasang `supabase/schemas/porsi.sql` melalui SQL Editor atau workflow skema deklaratif tim. Tabel `porsi_state` dan `porsi_sessions` sengaja tidak dapat dibaca oleh `anon`/`authenticated`; server memakai service role. Fungsi compare-and-swap hanya dapat dijalankan service role dan memakai `SECURITY INVOKER`.
3. Isi konfigurasi privat pada host dengan mengikuti [panduan konfigurasi](configuration.md). Buat `SESSION_SECRET` menggunakan generator kriptografis dengan minimal 32 karakter. Jangan menaruh file environment atau nilai kredensial di repository.

4. Buat akun pengelola pertama melalui Admin API, dengan password acak privat serta `app_metadata.role=admin`. Opsional: isi `PORSI_OWNER_USER_ID` dengan UUID Auth akun tersebut. Jangan memberikan hak pengelola berdasarkan email yang diklaim saat pendaftaran. Customer adalah peran bawaan. Administrator tepercaya menetapkan `app_metadata.role` menjadi `seller` atau `admin` menggunakan Admin API; penjual juga wajib memiliki `app_metadata.outletId` yang cocok dengan gerainya. `user_metadata` dan pilihan peran pada formulir tidak memberikan hak akses.
5. Jalankan pemeriksaan konfigurasi, build, lalu server. Instalasi cloud baru dimulai tanpa transaksi, produksi, histori, dan penawaran; delapan belas menu awal pada enam gerai tidak aktif dan perlu dikonfigurasi. Untuk presentasi, data contoh bertanda `sample: true` dapat ditambahkan secara eksplisit (lihat [backend](../reference/backend.md)). Gerai harus mengisi nama, lokasi, harga, deskripsi, dan informasi alergen sebelum mengaktifkan menu.
6. Uji login setiap peran, penolakan peran yang salah, pembatalan sebelum cutoff, konkurensi slot terakhir, pickup, logout/cookie lama, dan rekonsiliasi pada proyek uji. Jangan menguji reset simulasi terhadap layanan nyata; operasi tersebut memang ditolak.
7. Jalankan Security/Performance Advisors di dashboard Supabase dan tinjau hasilnya sebelum pilot. Pengujian lokal tidak menggantikan validasi RLS/privilege dan koneksi pada proyek nyata.

Cek pemasangan dasar pada SQL Editor:

```sql
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('porsi_state', 'porsi_sessions');

select has_table_privilege('anon', 'public.porsi_state', 'SELECT') as anon_can_read,
       has_table_privilege('authenticated', 'public.porsi_state', 'UPDATE') as user_can_replace,
       has_function_privilege('anon', 'public.porsi_compare_and_swap(bigint,jsonb)', 'EXECUTE') as anon_can_write;
```

Kedua tabel harus memiliki `rowsecurity=true`; ketiga pemeriksaan privilege terakhir harus `false`. Setelah login pertama, revisi dokumen bertambah ketika transaksi berhasil. Periksa melalui akses administrator, bukan membuka dokumen ke client.

## Hosting aktif dan pendaftaran demo

- GitHub `main` terhubung ke proyek Vercel `porsi-loop`; setiap push membangun deployment produksi baru. Build yang gagal tidak menggantikan versi sehat sebelumnya.
- `APP_ORIGIN` dan Supabase Auth Site URL memakai `https://porsi-loop.vercel.app`.
- Paket yang dipilih: Vercel Hobby dan Supabase Free. Kuota dan kebijakan layanan mengikuti penyedia; paket gratis bukan jaminan kapasitas produksi. Proyek Supabase Free dapat dijeda karena tidak aktif.
- Untuk demo hackathon, **Confirm email dimatikan atas pilihan pemilik proyek**. Customer langsung masuk setelah mendaftar. Identitas email/telepon customer belum diverifikasi; aktifkan verifikasi email dan SMTP yang sesuai sebelum pemakaian publik operasional.
- Pengelola dan penjual memakai akun khusus dari administrator. Publik tidak dapat memilih atau menetapkan peran tersebut melalui pendaftaran.
- Aktifkan menu dan catat produksi melalui akun penjual sebelum menawarkan makanan. QRIS, e-wallet, dan transfer adalah simulasi tanpa uang sungguhan; tunai dikonfirmasi gerai. Gateway pembayaran nyata belum terhubung.

## Container

`Dockerfile` menggunakan Node.js 24, build bertahap, secrets di runtime, user non-root, dan volume `/app/.data`. Contoh mode demo:

```bash
docker build -t porsi-loop .
docker run --rm -p 3000:3000 --env-file .env.production -v porsi-data:/app/.data porsi-loop
```

Buat `.env.production` lokal yang diabaikan Git. Set `APP_ORIGIN` ke domain publik dan terminasi TLS pada reverse proxy/host. Build container belum dijalankan pada lingkungan kelanjutan ini karena Docker tidak tersedia.

## Pemeriksaan sebelum pilot

- Seluruh alur utama lulus di mode yang benar-benar akan dipakai, pada mobile dan desktop.
- Proyek dan origin tepat; secrets tidak masuk Git, log, screenshot, atau bundle browser.
- Data demo tidak bercampur dengan hasil pilot. Catat metode timbang dan baseline secara eksplisit.
- Instalasi awal menyediakan enam gerai contoh nonaktif; pengelola dapat membuat gerai tambahan. Isolasi per-menu/per-gerai dijalankan pada server. Dokumen global JSONB memiliki batas kontensi; gunakan tabel/RPC per agregat bila beban meningkat.
