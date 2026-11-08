# PORSI LOOP

**Rencanakan sebelum memasak. Selamatkan bila tersisa. Ukur dampaknya.**

Web kantin kampus untuk Hackathon CR YOUTH 2026 oleh Trinity LFA. MVP satu gerai, satu menu dengan dua pilihan porsi, tiga slot pickup, dan tiga peran pengguna. Dibangun dengan Next.js, TypeScript, Supabase/PostgreSQL, dan penyimpanan demo SQLite.

## Jalankan demo

Gunakan Node.js **24 LTS** (minimal 22.13).

```bash
npm ci
npm run check:config
npm run dev
```

Buka `http://localhost:3000`. Mode bawaan adalah simulasi; tidak memerlukan Supabase atau data pribadi. Jam simulasi dimulai pada 10.00 WIB saat database pertama kali dibuat dan terus bergerak. Data disimpan pada `.data/porsi-loop.sqlite`.

| Ruang | Alamat | Akses demo |
| --- | --- | --- |
| Landing | `/` | Publik |
| Mahasiswa | `/masuk` → `/mahasiswa` | Masuk sebagai mahasiswa |
| Pemilik gerai | `/masuk?peran=gerai` → `/gerai` | Masuk sebagai pemilik gerai |
| Pengelola | `/akses-pengelola` → `/pengelola` | Akses terpisah; tidak ditawarkan pada login publik |

Akun demo dibagi menurut peran untuk presentasi. Pesanan demo bukan transaksi sungguhan dan angka awal bukan hasil pilot.

## Alur yang tersedia

- Mahasiswa: katalog menu, ukuran porsi, slot pickup, pre-order, pembatalan sebelum cutoff, tiket/kode, rescue, dan riwayat pengambilan sendiri.
- Gerai: pengaturan menu/lokasi/alergen/harga, perencanaan `P + W + buffer`, penyesuaian dengan alasan, produksi aktual, penjualan walk-in, pencatatan permintaan tak terlayani, pickup, rescue, dan rekonsiliasi.
- Pengelola: agregat operasional, histori, penerimaan rescue, waste intensity, kualitas rekonsiliasi, ledger stok, dan log. Tidak menerima daftar pesanan individu.
- Sesi berikutnya: setelah rekonsiliasi lengkap, gerai memilih tanggal/cutoff/pickup baru. Histori dan tiket lama disimpan. Stok akhir lama tidak otomatis menjadi produksi sesi baru.

Reservasi menahan kuota; hanya pickup yang menurunkan stok dan menambah porsi terlayani. Saran produksi tidak membuat stok. Pre-order dan histori walk-in dipisahkan agar tidak dihitung dua kali.

## Verifikasi

```bash
npm test
npm run build
npm run typecheck
npm run test:integration
```

Tes integrasi menyalakan server produksi dengan database sementara dan memeriksa akses peran, CSRF/origin, rollback, kuota serentak, idempotensi, logout, dan siklus hingga sesi baru. Tidak mengubah data demo pengembangan.

Tes browser tersedia untuk layar 390px dan desktop 1440px:

```bash
npx playwright install --with-deps chromium
npm run test:e2e
```

Tes browser memeriksa login peran, pemesanan, dialog/Escape, retry respons hilang, reduced motion, dan overflow. Screenshot disimpan pada hasil tes. Konfigurasi CI berada di `.github/workflows/ci.yml`; keberhasilan browser dan workflow harus diperiksa pada hasil eksekusinya, bukan diasumsikan dari keberadaan file.

## Supabase dan deployment

Ikuti [panduan deployment](docs/deployment.md) dan [kontrak backend](docs/backend.md). Mode Supabase memerlukan proyek nyata, skema, akun, dan secrets pada server. **Akun Supabase yang terhubung pada kelanjutan ini tidak menampilkan proyek**, sehingga pemasangan dan pengujian cloud belum dilakukan. Mode nyata tidak beralih ke demo jika konfigurasi gagal.

Demo SQLite membutuhkan disk persisten pada satu instance server. Untuk deployment dengan beberapa instance atau filesystem sementara, gunakan mode Supabase. Dockerfile disediakan sebagai opsi packaging; build image belum diverifikasi pada lingkungan tanpa Docker.

## Dokumen

- [Skenario demo langkah demi langkah](docs/demo.md)
- [Backend, keamanan, dan API](docs/backend.md)
- [Deployment dan Supabase](docs/deployment.md)
- [Sumber, lisensi, dan batas klaim](docs/research.md)

Penerimaan rescue adalah pendapatan bruto aktual dari pickup. Manfaat bersih dan penurunan waste memerlukan baseline serta biaya yang valid; aplikasi tidak mengarang klaim tersebut atau mengonversi porsi menjadi emisi. Perluasan ke banyak gerai memerlukan model tenant/tabel relasional serta pengujian akses lintas gerai; hal tersebut tidak diklaim sebagai fitur MVP satu gerai ini.
