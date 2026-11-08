# Database Supabase

Skema aplikasi: [`schemas/porsi.sql`](schemas/porsi.sql). Pemeriksaan read-only: [`verify.sql`](verify.sql).

## Kontrak penyimpanan

| Objek                           | Fungsi                                                                                                |
| ------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `auth.users`                    | Akun nyata customer, penjual dan pengelola melalui Supabase Auth                                      |
| `public.porsi_sessions`         | Sesi server yang dapat dicabut; mengacu ke `auth.users.id`                                            |
| `public.porsi_state`            | Dokumen operasional: gerai, menu/foto, stok, pesanan, pembayaran, promo, chat, riwayat dan pencatatan |
| `public.porsi_compare_and_swap` | Menyimpan dokumen hanya jika revisinya cocok; mencegah dua permintaan menimpa perubahan masing-masing |

Ini adalah kontrak yang benar-benar digunakan adapter `lib/server/supabase.ts`. Akun/kredensial tidak disimpan di dokumen operasional. Instalasi cloud dimulai tanpa transaksi sintetis; akun demo lokal tidak dipindahkan menjadi akun cloud.

Aplikasi server memeriksa identitas dan kepemilikan tiket/gerai, kemudian menyusun respons yang sesuai peran. Dokumen lengkap dan sesi tidak dibuka ke browser. Kedua tabel memakai RLS dan hanya server dengan service role memperoleh akses yang diperlukan. Fungsi transaksi memakai `SECURITY INVOKER`, bukan peningkatan hak `SECURITY DEFINER`. Kunci server hanya berada di konfigurasi privat host.

Dokumen global dengan revisi sesuai untuk demonstrasi/pilot terbatas. Beban banyak kantin memerlukan pemisahan agregat/tabel dan pengujian beban; keberadaan database tidak membuktikan kesiapan skala tersebut.

## Pemasangan dan bukti

1. Masuk ke proyek tujuan menggunakan akun yang berwenang. Proyek aktif adalah **PORSI LOOP** pada organisasi **Fijarsatria**, region Singapore, referensi `eemuhrlpfewujfuflapl`.
2. Tinjau lalu jalankan `schemas/porsi.sql` di SQL Editor. Skema deklaratif ini tidak menghapus data yang sudah ada. Jangan memasukkan data demo ke proyek nyata.
3. Jalankan `verify.sql`. Dua tabel harus ditemukan dengan RLS aktif dan dipaksa. `anon`/`authenticated` tidak boleh memiliki akses tabel atau eksekusi fungsi; service role hanya mendapat operasi yang dinyatakan pada skema. Fungsi harus menunjukkan `security_definer=false`.
4. Tinjau Security/Performance Advisors pada dashboard.
5. Isi konfigurasi privat berdasarkan [panduan konfigurasi](../docs/configuration.md). Uji koneksi dan alur akun/pemesanan dengan mode `supabase`, bukan `demo`. Hasil query dan pengujian cloud harus dicatat sebelum menyatakan pemasangan terverifikasi.

## Status pemasangan cloud

Skema sudah dijalankan pada [proyek PORSI LOOP](https://supabase.com/dashboard/project/eemuhrlpfewujfuflapl). Pemeriksaan SQL menunjukkan kedua tabel memiliki `rls_enabled=true`, `rls_forced=true`, `anon_read=false`, dan `user_update=false`.

[Pengujian transaksi](tests/transaction.sql) juga telah dijalankan di database tersebut dan menghasilkan PASS: service role bisa menyimpan revisi yang benar, revisi lama ditolak, serta role anon/authenticated tidak bisa membaca dokumen. Seluruh data uji di-rollback. Ini membuktikan skema dan pembatasan akses database. Runtime Vercel yang memakai proyek ini juga sudah lulus pengujian pemesanan HTTPS; lihat [status rilis](../docs/release-status.md).
