# Pengelola kantin, laporan keuangan, dan kembali ke beranda

**Goal:** Memperjelas peran pelanggan pengelola kantin, menyediakan ringkasan penjualan/penerimaan seluruh gerai, dan memastikan tautan beranda selalu membuka bagian teratas.
**Architecture:** Pertahankan tiga peran operasional yang sudah ada. Penyedia platform adalah pemilik layanan dan penyedia akses, sedangkan `admin` adalah pengelola kantin pelanggan. Laporan dihitung server dari transaksi per menu sesi berjalan dan hanya diberikan kepada staf yang berwenang.
**Tech Stack:** Next.js, TypeScript, React, mesin domain SQLite/Supabase yang sama.

## Perilaku

- Akun penjual tetap mengelola menu, produksi, dan status pesanan hanya di gerainya.
- Akun pengelola memantau seluruh gerai pada kantin yang dilayani instalasi ini. Pendapatan penjualan gerai tidak disamakan dengan pendapatan langganan penyedia platform.
- Laporan menampilkan penjualan normal/promo yang telah diserahkan, pembayaran diterima, refund selesai/tertunda, pembayaran belum lunas, serta rincian per gerai dan metode pembayaran. Ruang lingkup adalah sesi berjalan tiap menu; tidak merekonstruksi penerimaan historis yang belum tercatat.
- Pembayaran diterima termasuk uang yang kemudian dikembalikan; penerimaan setelah refund mengurangi pengembalian yang benar-benar dikonfirmasi. Refund tertunda masih termasuk uang diterima dan ditampilkan terpisah.
- Kembali ke beranda melalui logo maupun tautan selalu menargetkan `/#top`; tautan navigasi bagian landing tetap menargetkan bagian yang dipilih.

## Tugas

- [x] Tulis dan jalankan regresi navigasi ke bagian atas dan hitungan uang/isolasi akses.
- [x] Implementasikan agregasi keuangan server dan panel pengelola dengan filter gerai.
- [x] Perjelas teks akun pengelola/penyedia, tautan masuk, serta seluruh tautan kembali ke beranda.
- [x] Verifikasi unit, build/typecheck, alur browser desktop/mobile, lalu commit dan push pada PR yang sama.

## Batas

Tidak menambahkan panel internal penyedia platform, tagihan SaaS, gerbang pembayaran nyata, atau pengelolaan beberapa organisasi dalam perubahan ini. Pengelola kantin tetap pelanggan operasional layanan ini; kunci infrastruktur bukan kredensial pengelola kantin.

Verified:46 unit tests,5 production API tests,20 browser tests across mobile/desktop; final finance caption rechecked in both browsers. Production build and typecheck pass. Independent review has no open findings.
