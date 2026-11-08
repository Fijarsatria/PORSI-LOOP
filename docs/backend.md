# Backend dan aturan transaksi

Implementasi MVP mencakup satu gerai, satu menu dengan dua pilihan porsi, tiga slot pengambilan, dan tiga peran. Semua mutasi divalidasi pada server. Tampilan tidak dapat menaikkan stok atau memilih peran layanan nyata secara sepihak.

## Dua mode penyimpanan

### Simulasi lokal yang siap dijalankan

`PORSI_MODE=demo` (nilai bawaan) menggunakan SQLite bawaan Node.js 22.13+. Data tersimpan di `.data/porsi-loop.sqlite`; data dan sesi tidak di-commit. Pengaturan ulang hanya tersedia untuk peran pengelola, menghapus data simulasi, dan mengembalikan fixture awal. SQLite memakai WAL, `busy_timeout`, dan `BEGIN IMMEDIATE` agar pembacaan-validasi-penulisan stok berjalan dalam satu transaksi.

Jam simulasi dimulai pada 10.00 WIB di tanggal server saat basis data diinisialisasi, kemudian bergerak sesuai waktu nyata. Cutoff simulasi 11.00 WIB dan slot 11.30–12.00, 12.00–12.30, 12.30–13.00. Jam ini sengaja diberi label pada produk, bukan pelonggaran batas waktu tersembunyi. Fixture sintetis: 24 porsi pre-order, 32 porsi diproduksi, 6 porsi rescue ditawarkan; cadangan rescue belum dihitung sebagai rescue diambil. Setelah jam simulasi lewat, pengelola dapat mengatur ulang untuk presentasi berikutnya.

Identitas tiga akun demo adalah identitas peran bersama untuk presentasi. Data demo dapat dilihat peserta demo lain pada peran yang sama. Jangan gunakan mode ini untuk menerima identitas, pesanan, atau uang sungguhan.

### Supabase Auth dan PostgreSQL

`PORSI_MODE=supabase` mengaktifkan autentikasi kata sandi Supabase, sesi HttpOnly terenkripsi AES-GCM, dan penyimpanan PostgreSQL. Variabel yang dibutuhkan:

```dotenv
PORSI_MODE=supabase
SUPABASE_URL=https://PROJECT.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=...
SESSION_SECRET=nilai-acak-sekurangnya-32-karakter
APP_ORIGIN=https://domain-porsi-loop-anda.example
```

Key service role hanya dibaca modul server. Jangan menaruhnya dalam variabel `NEXT_PUBLIC_`. Endpoint mengembalikan 503 yang jelas jika konfigurasi belum lengkap; tidak beralih diam-diam ke data simulasi. Mode nyata dimulai tanpa pesanan, produksi, rescue, atau riwayat sintetis. Gunakan domain HTTPS di produksi. `PORSI_COOKIE_INSECURE=true` hanya untuk pengujian `next start` pada localhost HTTP dan jangan aktifkan pada layanan publik.

Pasang skema deklaratif [supabase/schemas/porsi.sql](../supabase/schemas/porsi.sql) pada proyek Supabase melalui SQL Editor atau alur skema deklaratif tim. File tersebut bukan klaim bahwa migrasi telah diterapkan: tidak ada kredensial Supabase pada lingkungan pengembangan ini dan integrasi cloud belum diverifikasi terhadap proyek nyata.

Untuk MVP satu gerai, entitas disimpan dalam satu dokumen JSONB terversi. Server menerapkan mesin aturan yang sama lalu memanggil RPC compare-and-swap atomik, dengan retry terbatas ketika revisi berubah. Ini menjaga konflik kuota tanpa mengandalkan cache browser. Semua akses `anon` dan `authenticated` langsung ke dokumen diblokir RLS/privilege; hanya server dengan service role dapat membaca dokumen dan menjalankan RPC `SECURITY INVOKER`. Snapshot mahasiswa menyaring pesanan/klaim ke pemiliknya; log hanya untuk staf. Pada skala multi-gerai, pecah penyimpanan menjadi tabel berindeks dan RPC per agregat untuk mengurangi kontensi dokumen global.

Buat akun melalui Supabase Auth. Mahasiswa menjadi peran bawaan. Untuk pemilik gerai dan pengelola, administrator tepercaya menetapkan `app_metadata.role` menjadi `seller` atau `admin` melalui dashboard/Admin API. `user_metadata` tidak pernah menjadi sumber otorisasi. Pilihan peran di formulir login hanya dibandingkan dengan peran yang telah diterbitkan. Publik tidak dapat mendaftarkan akun pengelola.

## API

- `GET /api/state`: snapshot terbaru, `Cache-Control: no-store, private`.
- `POST /api/auth`: `{role, demo:true}` pada simulasi; `{role,email,password}` pada Supabase. Menghasilkan snapshot dan cookie sesi HttpOnly.
- `DELETE /api/auth`: menghapus sesi/cookie dan mengembalikan snapshot publik dengan `user:null`.
- `POST /api/actions`: `{type, ...payload, idempotencyKey}`. Menghasilkan snapshot; kesalahan `{error}` dengan status 400/401/403/409/413/429/503 sesuai kondisi.

Semua endpoint mutasi memeriksa Origin yang sama (atau `APP_ORIGIN` yang dikonfigurasi untuk reverse proxy), membatasi ukuran badan permintaan, dan membaca identitas dari sesi server. Token demo disimpan dalam bentuk hash SHA-256. Cookie memakai SameSite=Lax dan Secure dalam produksi. Masukkan `idempotencyKey` unik per tindakan; pengulangan key dari pengguna yang sama tidak menggandakan transaksi. Idempotency disimpan untuk 1.000 mutasi terbaru agar dokumen MVP tetap terbatas.

| Peran | Tindakan | Payload |
| --- | --- | --- |
| Mahasiswa | `preorder` | `portion: small\|regular`, `quantity:1..5`, `slotId`, `note?` |
| Mahasiswa | `cancel_order` | `orderId`; hanya sebelum cutoff |
| Mahasiswa | `claim_rescue` | `batchId`, `quantity:1..2` |
| Mahasiswa | `cancel_rescue` | `claimId` |
| Gerai | `record_production` | `quantity` |
| Gerai | `record_walkin` | `quantity`, `price?` |
| Gerai | `ready_order` | `orderId` |
| Gerai | `pickup_order` | `orderId` atau `code` |
| Gerai | `override_plan` | `target`, `reason`, `capacity?`, `buffer?`, `manualBaseline?` |
| Gerai | `accept_plan` | `target?`; harus sama dengan saran terbaru |
| Gerai | `save_menu` | `name?`, `description?`, `active?`, `smallPrice?`, `regularPrice?`, `variableCost?`, `allergens?:string[]` |
| Gerai | `save_slot` | `slotId`, `capacity`, `cutoff?:ISO` |
| Gerai | `publish_rescue` | `quantity`, `price`, `foodChecked:true`, `description?`, `durationMinutes` atau `expiresAt` |
| Gerai | `close_rescue` | `batchId`, `reason`; membatalkan klaim aktif dan melepas cadangan |
| Gerai | `pickup_rescue` | `claimId` atau `code` |
| Gerai | `record_waste` | `quantity`, `weightKg`, `reason` |
| Gerai | `record_internal` | `quantity`, `reason` |
| Gerai/pengelola | `reconcile` | `endingStock`, `internal?`, `waste?`, `wasteKg?`; hanya tanpa pesanan/klaim aktif; nilai opsional adalah total akhir sesi |
| Pengelola | `reset_demo` | hanya pada mode demo |
| Pengelola | `advance_demo` | `minutes:1..240`; hanya pada mode demo, membuat no-show/kedaluwarsa dapat dipresentasikan tanpa menunggu |

## Perhitungan dan batas bukti

Rencana: `T=min(C,P+W+b)`. `P` berasal dari pre-order yang tidak dibatalkan, `W` dari rata-rata maksimal tujuh sesi selesai yang benar-benar memiliki kolom walk-in, `b` buffer yang terlihat, dan `C` kapasitas gerai. Implementasi menetapkan minimal tiga hari riwayat; di bawah itu dipakai baseline manual dengan sumber `manual`/label data terbatas. Rentang `W−2..W+4` adalah rentang ilustrasi untuk fixture MVP, bukan interval statistik terkalibrasi. Override menyimpan target akhir, alasan, dan waktu. Rekomendasi tidak menambah stok.

Stok fisik = produksi − pre-order diambil − walk-in − rescue diambil − konsumsi internal − waste. Pre-order dan penawaran rescue menahan kuota; klaim tidak mengurangi stok fisik lagi. Penjualan walk-in/waste/internal tidak boleh menghabiskan cadangan. Pengambilan ganda, stok negatif, jumlah tidak valid, slot penuh, dan tindakan dari peran salah ditolak server.

Klaim rescue bukan makanan terselamatkan. Angka rescue naik hanya ketika gerai memvalidasi kode pengambilan. Klaim kedaluwarsa tidak menaikkan angka tersebut. Pemeriksaan kelayakan gerai wajib sebelum publikasi; timer bukan sertifikasi keamanan pangan. Porsi tidak otomatis dikonversi ke kilogram atau emisi. Berat waste berasal dari input penimbangan yang eksplisit.

Rekonsiliasi: `produksi = pre-order diambil + walk-in + rescue diambil + internal + waste + stok akhir`. Stok awal MVP adalah nol dan ditampilkan eksplisit. Selisih yang ditemukan tetap disimpan sebagai rekonsiliasi belum lengkap agar dapat ditindaklanjuti; sesi hanya ditutup ketika semua pesanan/klaim telah selesai atau kedaluwarsa dan jumlah stok fisik aktual sesuai catatan. Snapshot pengelola hanya berisi agregat, tanpa daftar pesanan/klaim individu.

## Verifikasi yang dijalankan

`node --import tsx --test tests/domain*.test.ts` menguji aturan perencanaan, isolasi pesanan mahasiswa, cutoff pembatalan, cadangan vs pengambilan rescue, kedaluwarsa, kapasitas/idempotensi, dan alur contoh PRD lengkap `50=23+20+3+1+3+0` dengan satu no-show. Pengujian penyimpanan mengeksekusi transaksi SQLite yang bersaing serta pembuatan/pencabutan sesi server. `npm run typecheck` memverifikasi kontrak TypeScript. Pengujian Supabase cloud tetap membutuhkan proyek dan kredensial nyata; belum diklaim lulus.
