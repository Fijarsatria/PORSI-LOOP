# Canteen Flow Implementation Plan

**Goal:** Menghubungkan katalog tamu, operasi gerai, dan pengelola dalam alur pemesanan dan stok yang bisa diuji.
**Architecture:** Mesin domain per menu dengan kepemilikan gerai, sesi tamu server, pembayaran eksplisit, dan token pengambilan sekali pakai. Antarmuka memakai snapshot privat sesuai peran.
**Tech Stack:** Next.js, TypeScript, SQLite, Supabase, React, Motion, QRCode, jsQR, Playwright.
**Spec:** ../specs/2026-11-08-canteen-flow-design.md

## Global Constraints

- Promo Terbatas; Dine in; Pick up sebagai istilah UI.
- Akses penjual/admin diperiksa server; tidak ada eskalasi peran dari input pengguna.
- Stok berkurang hanya saat serah terima; rekomendasi tidak menambah stok.
- Pembayaran demo tidak pernah disajikan sebagai pembayaran nyata.

## Review Focus

- Dua pembeli berebut stok terakhir dan retry setelah respons hilang.
- Penjual mencoba token, menu, atau pesanan milik gerai lain.
- QR belum dibayar, belum siap, kedaluwarsa, dan sudah dipakai.
- Sesi tamu berbeda, logout/login, serta riwayat dan privasi pembeli.
- Mobile 390px, desktop, dialog keyboard, dan reduced motion.

## Tasks

- [x] Backend: perluas domain, katalog enam gerai, kitchen per menu, sesi tamu, auth kredensial, payment state, pickup token, dan isolasi outlet. Tulis regresi dan jalankan unit/integration.
- [x] Mahasiswa: katalog/filter/search, checkout, Dine in/Pick up, simulasi pembayaran, QR, progres dan riwayat pribadi.
- [x] Penjual/pengelola: pemindaian kamera, antrean pesanan, insight produksi/penjualan/promo/waste, agregat gerai dan trafik.
- [x] Integrasi: shell tamu, auth form, notifikasi polling, copy landing, dokumentasi konfigurasi.
- [x] Verifikasi: typecheck, unit, build, API integration, browser mobile/desktop; review independen dan perbaikan temuan; paket perubahan.


Verified: 43 unit tests, 5 production API integration tests, 12 Chromium browser tests (mobile and desktop), typecheck, and production build. Supabase schema/privilege checks passed; runtime server key and real payment gateway remain external configuration limits documented in flow-v2.md.
