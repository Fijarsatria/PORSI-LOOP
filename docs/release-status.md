# Status rilis PORSI LOOP

Web publik: **https://porsi-loop.vercel.app**. Sumber aplikasi: branch `main` pada [Fijarsatria/PORSI-LOOP](https://github.com/Fijarsatria/PORSI-LOOP). Pembaruan dipush bertahap; GitHub Actions menjalankan pemeriksaan setiap push, dan Vercel membangun web dari branch tersebut.

## Yang sudah terpasang

- Vercel Hobby, Next.js dan API server, region Singapore.
- Supabase Free, proyek PORSI LOOP (`eemuhrlpfewujfuflapl`), region Singapore.
- PostgreSQL untuk dokumen operasional, revisi transaksi dan sesi yang dapat dicabut; Supabase Auth untuk akun.
- Kedua tabel memakai RLS aktif dan dipaksa. Role publik tidak dapat membaca atau mengganti dokumen operasional; compare-and-swap hanya tersedia untuk server.
- Secrets tersimpan pada konfigurasi privat Vercel. Tidak ada berkas `.env*` yang dilacak Git. Akun staf cloud memakai akses privat, terpisah dari kredensial demo localhost.

## Pemeriksaan aplikasi

**56 pengujian unit, 5 pengujian API, dan 32 pengujian browser mobile/desktop lulus.** Build produksi serta pemeriksaan TypeScript lulus. Cakupan mencakup menu, foto, akun/gerai, pembayaran, QR sekali pakai, chat, rating, riwayat, keyboard dan pemeriksaan aksesibilitas otomatis.

Regresi loading diuji dengan menahan respons pengelola selama 5,5 detik, melampaui interval pembaruan empat detik. Hanya satu permintaan dikirim selama menunggu, lalu antarmuka terbuka. Katalog dan promo memakai dua kolom pada mobile; panel chat tidak menutupi navigasi bawah. Pemeriksaan otomatis tidak menggantikan evaluasi aksesibilitas manual lengkap.

## Bukti pengujian cloud

Pengujian nyata melalui HTTPS web publik, menggunakan akun dan gerai QA sementara:

1. Pengelola membuat gerai dan akun penjual.
2. Penjual mengatur foto/menu serta mencatat stok.
3. Tamu memesan dengan nomor telepon; tamu lain dan pengelola tidak menerima tiket/kontak privatnya.
4. Customer dan gerai bertukar chat; permintaan berulang dengan kunci sama tidak menggandakan pesan.
5. Gerai mengonfirmasi tunai, memproses dan menandai siap. QR menuntaskan penyerahan satu kali; pemindaian ulang ditolak.
6. Pesanan tamu ditautkan ketika customer masuk; rating hanya diberikan pada pesanan miliknya yang sudah diterima.
7. Promo dan penjualan langsung tercatat pada stok serta laporan gerai.
8. Logout mencabut sesi. Akun, sesi dan gerai QA dibersihkan setelah uji.
9. Pendaftaran customer lewat endpoint publik langsung memperoleh sesi tanpa email konfirmasi. Customer tidak dapat membuat akses gerai. Akun pengelola privat berhasil masuk.

Pengujian SQL di database juga membuktikan penyimpanan revisi benar diterima, revisi lama ditolak, dan pembacaan anon/authenticated ditolak. Data pengujian SQL di-rollback.

## Memulai demonstrasi

Pengelola masuk pada `/akses-pengelola`, lalu membuka **Gerai & akses** untuk membuat gerai dan akun penjual. Penjual masuk pada `/masuk/gerai`, memperbarui menu/foto/harga, lalu mencatat stok yang sudah selesai dimasak. Setelah itu customer dapat memilih menu pada `/customer` tanpa wajib login.

Instalasi cloud dimulai tanpa pesanan atau stok. Untuk presentasi, delapan belas menu diaktifkan dengan harga dan stok contoh, lalu ditambahkan riwayat tujuh hari, pesanan selesai, rating, dan Promo Terbatas contoh. Semuanya bertanda `sample: true`, tampil sebagai “data contoh”, dan bukan hasil pilot. Akun penjual `seller@porsiloop.local` (Dapur Bu Ratna) dan pengelola `admin@porsiloop.local` disediakan untuk presentasi; ganti kata sandinya sebelum dipakai untuk data nyata.

Pemesanan makanan dan promo memerlukan nomor telepon. Dine in dapat menyertakan meja/posisi duduk. Antrean penjual: **Masuk → Diproses → Siap diambil → Selesai**. Penjualan langsung dicatat setelah pembayaran diterima dan makanan diserahkan; posisi duduk tersimpan pada catatan transaksi.

## Batas yang masih berlaku

Pendaftaran langsung tanpa verifikasi email dipilih untuk demo gratis. Nomor telepon diperiksa formatnya, belum memakai OTP. Hak pengelola bersumber dari metadata administrator atau UUID Auth yang dikonfigurasi, bukan email yang diklaim customer.

QRIS, e-wallet, dan transfer adalah simulasi tanpa uang sungguhan; tunai dikonfirmasi gerai. Gateway pembayaran digital nyata, kamera QR pada perangkat fisik, pengujian beban banyak kantin, dan pilot kantin belum diverifikasi. Angka contoh bukan hasil pilot atau bukti pengurangan emisi/limbah. Dokumen global dengan revisi cocok untuk demo/pilot terbatas; skala lebih besar memerlukan pemisahan agregat dan pengujian beban.

Paket gratis tetap memiliki kuota dan dapat dijeda sesuai kebijakan penyedia. Jangan menyimpan secrets pada GitHub, issue, screenshot atau bundle browser.
