<p align="center"><img src="public/brand/logo.png" alt="PORSI LOOP" width="320" /></p>
<h1 align="center">PORSI LOOP</h1>
<p align="center"><strong>Porsi pas. Waktu lebih lepas.</strong><br />Kantin yang lebih mudah dipesan dan lebih terencana.<br />Trinity LFA · CR YOUTH 2026</p>
<p align="center"><a href="https://github.com/Fijarsatria/PORSI-LOOP/actions/workflows/ci.yml"><img src="https://github.com/Fijarsatria/PORSI-LOOP/actions/workflows/ci.yml/badge.svg" alt="Pemeriksaan aplikasi" /></a></p>

PORSI LOOP membantu customer memesan makanan sebelum tiba di kantin, membantu gerai menyiapkan pesanan, dan membantu pengelola memahami kegiatan kantinnya. Catatan produksi, penjualan, promo, dan sisa makanan mendukung keputusan memasak yang lebih terencana.

[Buka web](https://porsi-loop.vercel.app) · [Mulai lokal](#menjalankan-lokal) · [Dokumentasi](docs/README.md) · [Database](supabase/README.md) · [Kontribusi](CONTRIBUTING.md)

## Satu kantin, tiga ruang

| Ruang            | Fitur utama                                                                                              | Akses                                              |
| ---------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Customer         | Pesan tanpa wajib login, Dine in/Pick up, tiket QR, chat gerai, promo, rating setelah diterima           | `/customer` · akun opsional `/masuk` dan `/daftar` |
| Pemilik gerai    | Antrean pesanan, scan QR, foto/menu/stok, penjualan langsung, riwayat harian, promo dan rencana produksi | `/masuk/gerai`                                     |
| Pengelola kantin | Ringkasan visual, pemasukan, penambahan gerai/akun penjual, laporan produksi dan sisa                    | `/akses-pengelola`                                 |

Nomor telepon wajib pada pemesanan makanan dan promo. Antrean gerai terdiri dari **Masuk → Diproses → Siap diambil → Selesai**; menandai siap belum menyelesaikan pesanan.

Sesi belanja dan sesi kerja terpisah. Customer hanya mendapat tiket miliknya; penjual hanya mengelola gerainya; laporan pengelola tidak membuka tiket atau chat pribadi customer. Pengambilan memakai QR sekali pakai. Reservasi menahan kuota, sedangkan stok berkurang saat penyerahan atau penjualan langsung dicatat.

## Alur pemesanan

1. Customer memilih menu, mengisi nomor telepon, lalu memilih **Dine in** atau **Pick up**. Akun customer bersifat opsional.
2. Gerai menerima pesanan dan memperbarui antrean: **Masuk → Diproses → Siap diambil → Selesai**.
3. Setelah pembayaran diverifikasi dan makanan siap, customer menunjukkan QR. Gerai memindainya untuk mencatat penyerahan satu kali.
4. Customer dapat menghubungi gerai lewat chat dan memberikan rating setelah pesanan diterima. Gerai mencatat produksi, penjualan langsung, promo, dan sisa makanan untuk perencanaan berikutnya.

## Menjalankan lokal

Gunakan **Node.js 24 LTS** (minimum 22.13).

```bash
npm ci
npm run dev
```

Pada Windows, Anda juga dapat mengeklik dua kali [`scripts/mulai-lokal.cmd`](scripts/mulai-lokal.cmd). Biarkan jendela server terbuka selama memakai aplikasi.

Buka [localhost:3000/customer](http://localhost:3000/customer). Mode bawaan memakai SQLite persisten dengan **6 gerai dan 18 menu contoh**. Seluruh transaksi demo adalah simulasi.

<details>
<summary>Akun demo pengembangan</summary>

| Akses          | Email                     | Kata sandi lokal    |
| -------------- | ------------------------- | ------------------- |
| Customer       | `student@porsiloop.local` | `PorsiStudent2026!` |
| Dapur Bu Ratna | `seller@porsiloop.local`  | `PorsiSeller2026!`  |
| Pengelola      | `admin@porsiloop.local`   | `PorsiAdmin2026!`   |

Gerai lain: `dedi`, `sari`, `hadi`, `nusantara`, atau `roti` pada domain `@porsiloop.local`, dengan kata sandi penjual demo yang sama. Kredensial ini hanya default pengembangan. Hosting mode demo memerlukan kredensial sendiri. Akun demo tidak berlaku pada Supabase Auth.

</details>

Konfigurasi lokal dibuat sendiri dalam `.env.local`, yang diabaikan Git. Daftar variabel dan contoh tanpa kunci tersedia di [panduan konfigurasi](docs/configuration.md). Tidak ada berkas `.env*` yang dilacak repositori.

## Struktur repositori

```text
app/                 Halaman Next.js dan API server
components/          Antarmuka customer, gerai, pengelola dan komponen bersama
lib/                 Model bisnis, autentikasi dan adapter penyimpanan
public/              Identitas visual, ilustrasi dan aset statis
supabase/            Skema database dan pemeriksaan akses
scripts/             Pemeriksaan konfigurasi
tests/               Pengujian unit, API dan browser
docs/                Panduan produk, implementasi dan verifikasi
.github/workflows/   Pemeriksaan otomatis setiap push dan pull request
```

## Pemeriksaan

```bash
npm run check:config
npm test
npm run build
npm run typecheck
npm run test:integration
npx playwright install chromium
npm run test:e2e
```

Tes browser menggunakan database sementara dan server produksi tersendiri. Cakupan meliputi isolasi pengguna/gerai, pembayaran demo, stok, QR sekali pakai, percakapan, foto menu, navigasi, keyboard dan tampilan mobile/desktop.

## Data dan kesiapan layanan

| Mode     | Penyimpanan                                                                    | Penggunaan                                                         |
| -------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| Demo     | SQLite di disk lokal                                                           | Demonstrasi dan pengujian dengan data sintetis                     |
| Supabase | PostgreSQL, Supabase Auth, sesi server dan transaksi dengan pemeriksaan revisi | Aktif pada web publik; alur cloud dan pembatasan akses sudah diuji |

Web publik memakai **Vercel Hobby dan Supabase Free**. Skema, transaksi, isolasi akses, dan alur pemesanan cloud sudah diuji. Lihat [status rilis](docs/release-status.md), [panduan database](supabase/README.md), dan [deployment](docs/deployment.md).

Pengelola memakai akun privat, lalu membuat gerai dan akun penjual dari **Gerai & akses**. Akun demo localhost tidak berlaku di web publik. Menu awal cloud sengaja tidak aktif sampai pengelola/penjual mengonfigurasi informasi dan mencatat stok nyata. Pendaftaran customer demo langsung masuk tanpa verifikasi email; nomor telepon wajib saat memesan, tanpa OTP.

Pembayaran digital masih simulasi di demo dan dinonaktifkan di cloud sampai gateway nyata terintegrasi. Data contoh bukan hasil pilot. Porsi promo yang diambil tidak otomatis membuktikan pengurangan limbah; berat sisa berasal dari penimbangan dan memerlukan baseline pembanding.
