# Menjalankan dan men-deploy PORSI LOOP

## Pilihan penyimpanan

| Mode       | Kebutuhan                                               | Batas                                                                                       |
| ---------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `demo`     | Node.js 24 LTS dan disk persisten                       | Akun peran bersama, seluruh angka simulasi, satu instance server                            |
| `supabase` | Proyek Supabase, Auth, skema PostgreSQL, secrets server | Adapter cloud tersedia; perlu verifikasi pada proyek tujuan sebelum menerima pengguna nyata |

Tidak ada proyek Supabase yang terlihat pada akun plugin saat kelanjutan 8 November 2026. Tidak ada proyek berbayar, database, akun, atau deployment cloud yang dibuat tanpa target yang terverifikasi.

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

1. Pilih proyek milik tim yang aksesnya sudah diberikan. Ambil project URL, publishable key, serta service role key melalui dashboard. Service role key hanya berada di secrets server.
2. Tinjau dan pasang `supabase/schemas/porsi.sql` melalui SQL Editor atau workflow skema deklaratif tim. Tabel `porsi_state` dan `porsi_sessions` sengaja tidak dapat dibaca oleh `anon`/`authenticated`; server memakai service role. Fungsi compare-and-swap hanya dapat dijalankan service role dan memakai `SECURITY INVOKER`.
3. Isi konfigurasi berikut pada host. Buat `SESSION_SECRET` dengan generator kriptografis, minimal 32 karakter. Jangan menggunakan teks contoh sebagai secret.

```dotenv
PORSI_MODE=supabase
SUPABASE_URL=https://PROJECT.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=...
SESSION_SECRET=...
APP_ORIGIN=https://domain-tujuan.example
```

4. Buat akun uji melalui Supabase Auth. Mahasiswa adalah peran bawaan. Administrator tepercaya menetapkan `app_metadata.role` menjadi `seller` atau `admin` menggunakan Admin API. `user_metadata` dan pilihan peran pada formulir tidak memberikan hak akses.
5. Jalankan pemeriksaan konfigurasi, build, lalu server. Instalasi cloud dimulai tanpa transaksi, produksi, histori, dan penawaran sintetis; menu awal tidak aktif. Gerai harus mengisi nama, lokasi, harga, deskripsi, dan informasi alergen sebelum mengaktifkan menu.
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
- MVP ini satu gerai. Jangan mengklaim isolasi banyak tenant sebelum tabel/role/outlet dan pengujian lintas gerai dikembangkan.
