# Alur kantin dengan banyak gerai

Permintaan pengguna pada 8 November 2026 memperluas PRD satu gerai menjadi satu kantin dengan banyak gerai. Instruksi pengguna menjadi acuan ketika berbeda dari batas MVP dalam PDF.

## Pengalaman pembeli

Link atau QR kantin membuka katalog mahasiswa tanpa wajib login. Sesi tamu acak dan cookie HttpOnly mengikat pesanan ke browser pembeli. Nama panggilan cukup; tidak perlu NIM atau nomor telepon. Akun mahasiswa bersifat opsional. Katalog contoh menyediakan enam gerai dan delapan belas menu. Satu checkout memesan satu menu dari satu gerai sehingga pembayaran, antrean, stok, dan pengambilan tidak ambigu.

Pilih Dine in atau Pick up. Pick up bisa segera atau dijadwalkan pada slot terbuka. Istilah Pre-order pada pengalaman pengguna diganti Pick up, dan Rescue diganti Promo Terbatas. Nama internal historis boleh tetap untuk kompatibilitas.

Status pesanan: menunggu pembayaran → terkonfirmasi → diproses → siap → selesai. Pemesanan menahan kapasitas; pembayaran tidak menurunkan stok fisik. QR pengambilan tersedia setelah lunas, memuat token acak, dan hanya dapat dipakai sekali pada gerai pemilik pesanan setelah siap. Reservasi belum dibayar kedaluwarsa dan melepaskan kuota. Pembayaran demo dijelaskan sebagai simulasi; pembayaran daring nyata memerlukan gateway dan webhook terverifikasi. Tunai harus dikonfirmasi penjual.

## Pengalaman penjual

Penjual wajib masuk dengan kredensial dan terikat ke gerai dari sumber terpercaya di server. Penjual melihat pesanan baru, mengonfirmasi tunai, memproses, menandai siap, lalu memindai QR pembeli dengan kamera atau memasukkan token bila kamera tidak tersedia. UI memperbarui status berkala dan memberi pemberitahuan saat ada pesanan baru atau perubahan status.

Produksi dan persediaan dilacak per menu. Rencana tetap P + W + buffer; W hanya histori walk-in lengkap atau baseline manual. Keputusan rencana tidak membuat stok. Promo Terbatas hanya stok aktual yang tersisa dan telah diperiksa penjual. Porsi baru dihitung tersalurkan setelah serah terima.

Insight menampilkan produksi, penjualan normal, Promo Terbatas terambil, internal, dibuang, dan stok akhir. Contoh yang diminta pengguna 50 = 40 normal + 8 promo + 2 dibuang harus dapat dibaca dari histori simulasi berlabel. Data sesi berjalan tetap dibedakan dari histori. Sesi tidak seimbang tidak menjadi baseline yang valid.

## Pengalaman pengelola

Akses admin terpisah dan wajib kredensial. Tidak ada tombol yang memberikan peran admin tanpa verifikasi server. Admin melihat agregat seluruh gerai, trafik pesanan, produksi, penjualan, promo, waste, kualitas rekonsiliasi, serta jejak stok. Data identitas dan tiket pembeli tidak dikirim ke dashboard admin.

## Keputusan implementasi

Pertahankan Next.js, TypeScript, SQLite demo, dan adapter Supabase yang sudah ada. Gunakan mesin stok yang sama per menu, transaksi SQLite dan compare-and-swap Supabase. Tidak membuat proyek Supabase berbiaya. Koneksi saat audit tidak menyediakan proyek. Jangan mengklaim integrasi cloud atau pembayaran nyata telah berjalan sebelum benar-benar diuji. Pertahankan palet hijau/krem/oranye dan komponen aksesibel yang sudah ada; animasi menjelaskan status dan navigasi serta menghormati reduced motion.
