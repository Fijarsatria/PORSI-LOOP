# PORSI LOOP

Platform kantin kampus oleh Trinity LFA untuk CR YOUTH 2026. Mahasiswa bisa langsung memesan tanpa wajib login; penjual mengelola gerai melalui akun; pengelola memantau operasional seluruh kantin melalui akses khusus.

Versi alur 8 November 2026 menyediakan **6 gerai, 18 menu**, Dine in / Pick up segera atau terjadwal, **Promo Terbatas**, simulasi beberapa metode pembayaran, progres pesanan, QR pengambilan sekali pakai, pemindai kamera penjual, dan insight produksi/penjualan/sisa.

## Jalankan lokal

Gunakan Node.js minimal 22.13 (disarankan 24 LTS).

```bash
npm ci
npm run dev
```

Buka http://localhost:3000/mahasiswa. Mode bawaan adalah demo SQLite dengan data sintetis; pembayaran tidak memindahkan uang sungguhan.

| Ruang | Alamat | Kredensial lokal pengembangan |
| --- | --- | --- |
| Mahasiswa | `/mahasiswa` | Tanpa login; akun opsional `student@porsiloop.local` / `PorsiStudent2026!` |
| Dapur Bu Ratna | `/masuk?peran=gerai` | `seller@porsiloop.local` / `PorsiSeller2026!` |
| Gerai lainnya | `/masuk?peran=gerai` | `dedi`, `sari`, `hadi`, `nusantara`, atau `roti` pada `@porsiloop.local`; kata sandi penjual yang sama |
| Pengelola | `/akses-pengelola` | `admin@porsiloop.local` / `PorsiAdmin2026!` |

Kredensial contoh hanya menjadi default pada pengembangan. Server demo produksi wajib memakai DEMO_ADMIN_EMAIL, DEMO_ADMIN_PASSWORD, DEMO_SELLER_EMAIL, dan DEMO_SELLER_PASSWORD yang dikonfigurasi sendiri. Mode Supabase memakai akun Auth nyata; tidak menerima pintasan akun demo.

## Alur utama

- Mahasiswa: pilih gerai dan menu → Dine in/Pick up → jadwal → pembayaran → pantau status → QR pengambilan.
- Penjual: lihat pesanan/notifikasi → konfirmasi tunai bila perlu → siapkan → siap → Scan QR saat serah terima.
- Pengelola: perbandingan gerai, trafik pesanan anonim, produksi, penjualan normal, Promo Terbatas terambil, waste, dan rekonsiliasi.
- Produksi: permintaan terkonfirmasi + estimasi walk-in terpisah + buffer; keputusan penjual tidak menambah stok sampai produksi selesai dicatat.
- Stok: reservasi menahan kuota; hanya serah terima mengurangi stok dan menambah porsi terlayani. Promo berasal dari surplus aktual yang diperiksa penjual.

## Verifikasi

```bash
npm run check:config
npm test
npm run build
npm run typecheck
npm run test:integration
npx playwright install chromium
npm run test:e2e
```

Tes browser menjalankan server produksi dengan kredensial uji tersendiri dan basis data sementara. Tes mencakup tamu, checkout, QR asli yang dapat didekode, persiapan penjual, pengambilan sekali pakai, privasi, dialog keyboard, dan tampilan mobile/desktop.

## Supabase

Proyek **PORSI LOOP** telah dibuat: [buka dashboard](https://supabase.com/dashboard/project/wcodhmpstpdmjpqbwoeo). Skema privat dan pembatasan akses database telah dipasang serta diperiksa. Koneksi aplikasi masih membutuhkan SUPABASE_SERVICE_ROLE_KEY di konfigurasi server yang tidak di-commit. Mode cloud tidak beralih diam-diam ke demo bila konfigurasi tidak lengkap. QRIS/E-wallet/transfer nyata membutuhkan integrasi gateway; mode cloud menyediakan jalur tunai terverifikasi dan menolak simulasi pembayaran.

## Dokumen

- [Alur, keamanan, notifikasi, dan batas implementasi terkini](docs/flow-v2.md)
- [Audit lengkap PRD dan proposal dengan rujukan halaman](docs/requirements-audit-2026-11-08.md)
- [Kontrak backend](docs/backend.md)
- [Deployment](docs/deployment.md)
- [Sumber dan batas klaim](docs/research.md)

Data demo bukan hasil pilot. Porsi Promo Terbatas terambil adalah outcome distribusi, bukan otomatis bukti pengurangan waste. Kg waste berasal dari penimbangan; manfaat ekonomi membutuhkan baseline dan biaya yang valid.