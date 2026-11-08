# Hasil pemeriksaan kelanjutan

## Integrasi

PR #1 (`31cc8f5`, Luthfi) digabungkan ke `main` pada `505ccbf`. Pemeriksaan awal branch: 46 pengujian unit dan build produksi lulus. Perubahan pendaftaran customer, akses gerai, rating, sesi terpisah, serta penyederhanaan UI dilanjutkan melalui commit terpisah di `main`.

## Pemeriksaan lokal

- **50 pengujian unit lulus.** Termasuk pembatasan peran/gerai, stok, kapasitas, idempotensi, hash kata sandi, akun persisten, penautan pesanan tamu, dan rating berdasarkan serah terima.
- **5 pengujian HTTP produksi lulus.** Memeriksa privasi tamu, kredensial, isolasi gerai, pembayaran, rollback, kedaluwarsa, pencabutan sesi, serta QR sekali pakai.
- **24 pengujian browser lulus** pada Chromium mobile dan desktop. Pemesanan, QR asli yang didekode ulang, notifikasi status, tunai/promo, fokus dialog, Escape, reduced motion, pengembalian gulir ke beranda, keuangan pengelola, edit menu, dan alur gerai sampai rating.
- TypeScript dan build produksi lulus. Katalog diperiksa pada lebar 375, 768, 1024 dan 1440 piksel; halaman penjual baru diperiksa pada ukuran mobile dan desktop.
- Pemeriksaan axe pada checkout, halaman scan penjual, dan ringkasan pengelola lulus pada cakupan WCAG 2 A/AA yang diotomatisasi. Ini bukan klaim audit aksesibilitas manual lengkap.

Setelah perapian angka ringkasan dan nama aksesibel tombol belanja pada layar kecil, build diulang dan empat skenario browser baru kembali lulus. Pemeriksaan GitHub pada commit sebelumnya menemukan nama aksesibel tautan belanja mobile yang hilang; tautan tersebut sekarang memiliki label eksplisit untuk pembaca layar.

Alur browser baru benar-benar membuat gerai dan akun dari panel pengelola, masuk sebagai penjual baru, menambah makanan dengan stok nol, mencatat tiga porsi produksi, memperbarui harga, memesan sebagai customer tanpa mengeluarkan sesi kerja, mengonfirmasi tunai, menyiapkan, menandai siap, memvalidasi token QR, mendaftarkan customer, menautkan pesanan tamu, dan menyimpan rating. Keluar dari akun customer tidak mengeluarkan sesi penjual.

## Cara mengulang

```bash
npm ci
npm test
npm run build
npm run typecheck
npm run test:integration
npx playwright install chromium
npm run test:e2e
```

Tes browser memakai server produksi port 3100, database sementara, dan kredensial uji. Sesi pengelola untuk persiapan fixture digunakan ulang agar pengujian tidak melewati pembatasan percobaan masuk; pembatasan aplikasi tidak dilonggarkan.

## Batas verifikasi

Semua transaksi memakai data demo. Gateway pembayaran nyata, kamera pada perangkat fisik, dan runtime/provisioning Supabase cloud tidak diverifikasi pada kelanjutan ini. Mode cloud tetap menolak simulasi pembayaran daring. Tidak ada pilot kantin, pembuktian akurasi peramalan, sertifikasi keamanan pangan, atau klaim pengurangan emisi.

Pratinjau lokal dijalankan pada loopback, terpisah dari database demo lama. Data lama tidak dihapus. Publikasi atau deployment hosting eksternal tidak dilakukan sebagai bagian dari penggabungan branch ini.
