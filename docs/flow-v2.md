# Alur kantin PORSI LOOP

## Mahasiswa

`/mahasiswa` langsung membuka katalog tanpa login. Sesi tamu memakai identitas acak di server dan cookie HttpOnly; browser lain tidak bisa melihat tiketnya. Akun mahasiswa tetap opsional. Pesanan tamu tetap tersedia saat kembali dari akun staf melalui browser yang sama.

Pilih gerai/menu → nama panggilan, porsi, jumlah, catatan → Dine in atau Pick up → segera atau slot pengambilan → metode pembayaran → pantau status → tunjukkan QR ke gerai.

Checkout saat ini berisi satu menu. Pesanan berbeda gerai menghasilkan pembayaran dan tiket terpisah. Pembayaran QRIS, E-wallet, dan transfer pada **mode demo** adalah simulasi tanpa memindahkan uang. Tunai memerlukan konfirmasi penjual. Pada **mode Supabase**, metode daring ditolak sampai gateway nyata terintegrasi; tombol simulasi tidak dapat melunasi transaksi nyata.

Status pembayaran dipisahkan dari pemenuhan. Pesanan baru menunggu pembayaran, kemudian terkonfirmasi, disiapkan, siap diambil, dan selesai setelah QR diverifikasi. QR lunas dapat ditampilkan saat persiapan, tetapi belum dapat ditukar sebelum status siap. Reservasi belum dibayar memiliki batas waktu dan otomatis melepas kapasitas saat kedaluwarsa. Batas pembatalan diperiksa server.

## Penjual

Masuk lewat `/masuk?peran=gerai`. Email dan kata sandi wajib; kepemilikan gerai ditentukan server. Pilih menu untuk produksi, perencanaan, Promo Terbatas, serta rekonsiliasi. Antrean pesanan tetap mencakup seluruh menu milik gerai.

Pesanan baru muncul pada antrean, disertai pemberitahuan di halaman. Penjual mengonfirmasi pembayaran tunai jika perlu, memilih **Mulai siapkan**, lalu **Tandai siap**. **Scan QR** menggunakan kamera; jika kamera tidak tersedia, token yang tercantum pada tiket bisa dimasukkan manual dengan pemeriksaan yang sama.

Server memeriksa pemilik gerai, pembayaran lunas, status siap, waktu, dan token belum dipakai. Status, pengurangan stok, serta buku stok disimpan dalam satu transaksi. QR yang sama tidak bisa mengurangi stok dua kali. Porsi yang baru dipesan atau dibayar belum dihitung sebagai makanan tersalurkan.

## Produksi dan Promo Terbatas

Per menu, target persiapan tetap `P + W + buffer`. W berasal dari histori walk-in yang lengkap atau baseline manual yang diberi label. Rekomendasi tidak otomatis membuat stok. Produksi aktual wajib dicatat setelah makanan selesai dimasak.

Promo Terbatas hanya menggunakan surplus stok fisik yang belum dialokasikan dan telah diperiksa penjual. Reservasi promo menahan kuota. Porsi dan penerimaan promo baru bertambah sesudah penyerahan terverifikasi.

Rekonsiliasi umum:

`produksi = Pick up/Dine in terambil + walk-in + Promo Terbatas terambil + internal + dibuang + stok akhir`.

Contoh 50 produksi = 40 penjualan normal + 8 Promo Terbatas + 2 dibuang ditampilkan sebagai ilustrasi; data operasional berjalan memakai catatan aktual. Tidak ada klaim pengurangan kg, emisi, atau biaya tanpa pengukuran/baseline.

## Pengelola

Masuk dengan kredensial khusus melalui `/akses-pengelola`. Pengelola melihat agregat gerai, trafik pesanan, produksi, porsi tersalurkan, promo, sisa, dan kualitas rekonsiliasi. Snapshot admin tidak memuat daftar tiket atau identitas pembeli. Akun admin tidak tersedia dari pendaftaran publik.

## Notifikasi dan gerakan

Halaman memeriksa perubahan setiap empat detik, saat kembali fokus, dan setelah tindakan berhasil. Pemberitahuan deduplikasi tersedia di halaman; notifikasi perangkat bersifat opsional dan tergantung izin serta dukungan browser. Tidak ada push saat browser benar-benar ditutup. Animasi dialog, progres, dan navigasi menghormati pilihan reduced motion.

## Penyimpanan dan batas cloud

SQLite demo menyediakan enam gerai dan delapan belas menu. Setiap menu mempunyai stok, slot, rencana, riwayat, dan rekonsiliasi tersendiri. Snapshot dan mutasi difilter berdasarkan kepemilikan gerai.

Adapter Supabase menyimpan dokumen multi-menu dengan revisi dan compare-and-swap atomik pada server. Ini menjaga konsistensi; beban besar kelak memerlukan pemecahan tabel dan transaksi per agregat untuk mengurangi kontensi dokumen global. Instalasi nyata baru dimulai kosong, tanpa transaksi dan produksi contoh.

Proyek **PORSI LOOP** dibuat pada 8 November 2026 di organisasi **LutfiZg's Org**, wilayah **ap-southeast-1**, ID **wcodhmpstpdmjpqbwoeo**. Skema `porsi_state`, `porsi_sessions`, dan RPC telah dipasang. Pengujian SQL mengonfirmasi RLS aktif dan dipaksa pada kedua tabel, serta `anon`/`authenticated` tidak dapat membaca/mengganti dokumen atau memanggil RPC.

Kunci publik telah tersedia; kunci rahasia server tidak disediakan oleh plugin. Pengambilan melalui Chrome diblokir karena alat tidak dapat memastikan URL aktif. `.env.local` lokal tetap memakai mode demo sampai kunci server diisi. Kunci tersebut tidak boleh masuk Git, chat, atau variabel `NEXT_PUBLIC_`. Akun staf cloud perlu diprovisikan melalui Supabase Auth dengan `app_metadata.role`, dan `app_metadata.outletId` untuk penjual. Koneksi runtime cloud, akun staf nyata, dan gateway pembayaran belum terverifikasi.
