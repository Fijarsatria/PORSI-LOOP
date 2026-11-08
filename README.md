<p align="center">
  <img src="public/brand/logo.png" alt="Logo PORSI LOOP" width="280" />
</p>

<h1 align="center">PORSI LOOP</h1>
<p align="center"><strong>Porsi pas. Waktu lebih lepas.</strong></p>
<p align="center">Pemesanan makanan kantin yang membantu pembeli, gerai, dan pengelola bekerja lebih terencana.</p>
<p align="center">
  <a href="https://porsi-loop.vercel.app">Lihat aplikasi</a> ·
  <a href="#cara-menjalankan">Jalankan lokal</a> ·
  <a href="docs/README.md">Dokumentasi</a>
</p>
<p align="center">
  <a href="https://github.com/Fijarsatria/PORSI-LOOP/actions/workflows/ci.yml">
    <img src="https://github.com/Fijarsatria/PORSI-LOOP/actions/workflows/ci.yml/badge.svg" alt="Status CI" />
  </a>
</p>

## Tentang proyek

**PORSI LOOP** membantu customer memesan makanan sebelum datang ke kantin, gerai mengatur pesanan dan stok, serta pengelola memantau aktivitas kantin. Produksi, penjualan, promo, dan sisa makanan dicatat agar keputusan memasak tidak hanya berdasarkan perkiraan.

Proyek **Trinity LFA · CR YOUTH 2026** ini memiliki tiga ruang utama:

| Pengguna | Yang bisa dilakukan | Halaman |
| --- | --- | --- |
| **Customer** | Lihat menu, pesan **Dine in/Pick up**, cek status dan QR pengambilan, chat, beri rating | [`/customer`](https://porsi-loop.vercel.app/customer) |
| **Gerai** | Kelola menu/stok, antrean, scan QR, penjualan langsung, promo, dan rencana produksi | [`/masuk/gerai`](https://porsi-loop.vercel.app/masuk/gerai) |
| **Pengelola** | Pantau ringkasan kantin, laporan, gerai, dan akun penjual | [`/akses-pengelola`](https://porsi-loop.vercel.app/akses-pengelola) |

Customer dapat memesan sebagai tamu; akun bersifat opsional. Pemesanan meminta nomor telepon dan pilihan pengambilan.

### Alur singkat

1. **Customer** memilih menu, jumlah porsi, waktu, serta metode pemesanan.
2. **Gerai** mengelola antrean: **Masuk → Diproses → Siap diambil → Selesai**.
3. **Customer** menunjukkan tiket QR setelah pesanan siap dan pembayaran terverifikasi.
4. **Gerai** memindai QR untuk mencatat penyerahan sekali saja. Data stok dan riwayat ikut diperbarui.

> **Catatan:** Pembayaran digital pada versi demo masih **simulasi**, bukan transaksi uang sungguhan. Angka dan menu contoh juga bukan hasil uji lapangan.

## Cara menjalankan

Siapkan **Node.js 24 LTS** (minimum **22.13**), lalu jalankan dari folder proyek:

```bash
git clone https://github.com/Fijarsatria/PORSI-LOOP.git
cd PORSI-LOOP
npm ci
npm run dev
```

Buka **http://localhost:3000/customer** di browser. Secara bawaan, aplikasi berjalan dalam **mode demo** dengan data contoh dan penyimpanan SQLite lokal. Tidak perlu menyiapkan Supabase untuk mencoba aplikasi.

Pengguna Windows juga dapat menggunakan [`scripts/mulai-lokal.cmd`](scripts/mulai-lokal.cmd) setelah dependensi terpasang.

<details>
<summary><strong>Akun demo untuk pengembangan lokal</strong></summary>

| Peran | Email | Kata sandi |
| --- | --- | --- |
| Customer | `student@porsiloop.local` | `PorsiStudent2026!` |
| Penjual | `seller@porsiloop.local` | `PorsiSeller2026!` |
| Pengelola | `admin@porsiloop.local` | `PorsiAdmin2026!` |

Akun di atas hanya untuk **pengembangan/demo**. Jangan gunakan kredensial ini untuk layanan nyata; akun pada mode Supabase dikelola terpisah.

</details>

### Menggunakan Supabase

Untuk menjalankan mode cloud, buat `.env.local` pada komputer atau isi environment variables di layanan hosting. Atur `PORSI_MODE=supabase`, URL dan kunci Supabase, `SESSION_SECRET`, serta `APP_ORIGIN` sesuai [panduan konfigurasi](docs/guides/configuration.md).

**Jangan commit file environment yang berisi secrets.** Panduan pemasangan skema dan pemeriksaannya ada di [folder Supabase](supabase/README.md).

## Struktur proyek

```text
PORSI-LOOP/
├── app/                 Halaman, layout, dan API Next.js
├── components/
│   ├── customer/        UI pemesanan dan pengalaman customer
│   ├── landing/         Beranda, intro, dan bagian pengenalan
│   ├── operations/      Antarmuka gerai dan pengelola
│   └── ...              Komponen bersama, autentikasi, provider
├── lib/
│   ├── client/          Utilitas untuk browser
│   └── server/          Logika server, sesi, transaksi, database
├── public/              Logo, ikon, dan gambar menu
├── supabase/            Skema SQL dan verifikasi database
├── scripts/             Perintah bantu pengembangan
├── tests/               Tes unit, integrasi, dan end-to-end
├── docs/
│   ├── guides/          Cara konfigurasi, demo, dan deployment
│   ├── reference/       Alur sistem, backend, dan aturan bisnis
│   └── riwayat/         Catatan perubahan dan audit terdahulu
└── .github/workflows/   Pemeriksaan otomatis (CI)
```

Folder `app/` mengikuti **Next.js App Router**; lokasi dan nama route sengaja tidak diubah agar URL aplikasi tetap sama. `components/` dikelompokkan menurut bagian aplikasi, sedangkan `lib/` menyimpan aturan dan akses data. Aset publik tetap berada di `public/`.

**Teknologi:** Next.js 16, React 19, TypeScript, SQLite (demo), PostgreSQL/Supabase (cloud), serta Playwright untuk pengujian browser.

## Pemeriksaan proyek

```bash
npm run check:config
npm test
npm run build
npm run typecheck
npm run test:integration
npx playwright install chromium
npm run test:e2e
```

Perintah ini juga menjadi dasar pemeriksaan di GitHub Actions. Tes browser memakai server dan data pengujian terpisah; hasil CI terbaru dapat dilihat melalui badge di atas.

## Panduan lebih lanjut

| Bacaan | Isi |
| --- | --- |
| [Indeks dokumentasi](docs/README.md) | Semua panduan dalam satu halaman |
| [Skenario demo](docs/guides/demo.md) | Langkah mencoba alur customer hingga pengelola |
| [Konfigurasi](docs/guides/configuration.md) | Environment variables dan pengaturan mode |
| [Deployment](docs/guides/deployment.md) | Menjalankan server, Docker, dan Supabase |
| [Alur dan arsitektur](docs/reference/flow-v2.md) | Alur utama dan batas implementasi |
| [Status rilis](docs/release-status.md) | Hasil pemeriksaan dan hal yang belum didukung |

## Batas penggunaan

Aplikasi publik menggunakan Vercel dan Supabase. Akun serta izin kerja dibatasi berdasarkan peran. Namun, **gateway pembayaran nyata belum terintegrasi**, data contoh tidak membuktikan dampak pengurangan limbah, dan identitas customer pada demo belum melalui verifikasi OTP. Lihat [status rilis](docs/release-status.md) sebelum memakai proyek untuk pilot atau operasional nyata.

Untuk berkontribusi, baca [CONTRIBUTING.md](CONTRIBUTING.md). Jangan menyertakan password, token, database lokal, atau data customer asli dalam commit.
