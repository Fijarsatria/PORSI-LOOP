<p align="center"><img src="public/brand/logo.png" alt="PORSI LOOP" width="320" /></p>
<p align="center"><strong>Porsi pas. Waktu lebih lepas.</strong><br />Platform kantin kampus · Trinity LFA · CR YOUTH 2026</p>
<p align="center"><a href="https://github.com/Fijarsatria/PORSI-LOOP/actions/workflows/ci.yml"><img src="https://github.com/Fijarsatria/PORSI-LOOP/actions/workflows/ci.yml/badge.svg" alt="Pemeriksaan aplikasi" /></a></p>

PORSI LOOP menghubungkan customer, pemilik gerai, dan pengelola kantin: pesan makanan dari jauh, ambil saat siap, dan rencanakan produksi dengan catatan penjualan serta sisa makanan yang dapat ditelusuri.

[Mulai lokal](#menjalankan-lokal) · [Dokumentasi](docs/README.md) · [Database](supabase/README.md) · [Kontribusi](CONTRIBUTING.md)

## Tiga ruang, satu alur kantin

| Ruang            | Fitur utama                                                                                              | Akses                                              |
| ---------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Customer         | Pesan tanpa wajib login, Dine in/Pick up, tiket QR, chat gerai, promo, rating setelah diterima           | `/customer` · akun opsional `/masuk` dan `/daftar` |
| Pemilik gerai    | Antrean pesanan, scan QR, foto/menu/stok, penjualan langsung, riwayat harian, promo dan rencana produksi | `/masuk/gerai`                                     |
| Pengelola kantin | Ringkasan visual, pemasukan, penambahan gerai/akun penjual, laporan produksi dan sisa                    | `/akses-pengelola`                                 |

Sesi belanja dan sesi kerja terpisah. Customer hanya mendapat tiket miliknya; penjual hanya mengelola gerainya; laporan pengelola tidak membuka tiket atau chat pribadi customer. Pengambilan memakai QR sekali pakai. Reservasi menahan kuota, sedangkan stok berkurang saat penyerahan atau penjualan langsung dicatat.

## Menjalankan lokal

Gunakan **Node.js 24 LTS** (minimum 22.13).

```bash
npm ci
npm run dev
```

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

## Penyimpanan dan kesiapan layanan

| Mode     | Penyimpanan                                                                    | Penggunaan                                                                            |
| -------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| Demo     | SQLite di disk lokal                                                           | Demonstrasi dan pengujian dengan data sintetis                                        |
| Supabase | PostgreSQL, Supabase Auth, sesi server dan transaksi dengan pemeriksaan revisi | Memerlukan pemasangan skema, secrets server dan verifikasi koneksi pada proyek tujuan |

Lihat [panduan database](supabase/README.md) dan [deployment](docs/deployment.md) sebelum mengaktifkan cloud. Skema kompatibel dengan aplikasi berada di `supabase/schemas/porsi.sql`. Status pemasangan pada proyek cloud harus dibuktikan dengan query verifikasi; keberadaan berkas SQL bukan bukti database sudah terpasang.

Pembayaran digital masih simulasi di demo dan dinonaktifkan di cloud sampai gateway nyata terintegrasi. Data contoh bukan hasil pilot. Porsi promo yang diambil tidak otomatis membuktikan pengurangan limbah; berat sisa berasal dari penimbangan dan memerlukan baseline pembanding.
