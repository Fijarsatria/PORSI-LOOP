# Skenario pengujian demo

Gunakan npm ci dan npm run dev, lalu http://localhost:3000. Seluruh transaksi pada mode demo adalah simulasi.

1. Buka /mahasiswa tanpa login. Cari menu/filter gerai, pilih menu dari Dapur Bu Ratna, lalu nama panggilan, porsi, Dine in/Pick up, serta jadwal. Pilih QRIS, lanjut pembayaran, dan gunakan tombol simulasi pembayaran berhasil.
2. Tiket menampilkan status dan QR pengambilan. Simpan browser mahasiswa tetap terbuka.
3. Buka browser/profil lain, masuk pada /masuk?peran=gerai sebagai seller@porsiloop.local dengan kata sandi PorsiSeller2026!. Buka Pesanan & ambil. Hanya pesanan gerai ini yang tersedia.
4. Pilih Mulai siapkan, kemudian Tandai siap. Periksa status dan notifikasi mahasiswa ikut berubah.
5. Pilih Scan QR dan pindai tiket mahasiswa. Jika tidak ada kamera, salin token dari tiket mahasiswa ke input Token QR pengambilan. Verifikasi & serahkan setelah makanan diserahkan. Status selesai dan stok berkurang sekali. Token yang sama ditolak pada percobaan berikutnya.
6. Ulangi dengan Bayar di gerai. Penjual wajib memilih Tunai diterima sebelum dapat menyiapkan pesanan dan QR mahasiswa tersedia.
7. Ulangi di Promo Terbatas. Kuota ditahan saat pesan; metrik tersalurkan baru bertambah setelah verifikasi penyerahan.
8. Pada gerai, pilih menu untuk perencanaan/produksi/walk-in/promo/rekonsiliasi. Bandingkan produksi, normal terambil, promo terambil, waste, internal, dan stok akhir. Contoh 50=40+8+2 ditandai ilustrasi, terpisah dari data sesi.
9. Buka /akses-pengelola, masuk admin@porsiloop.local / PorsiAdmin2026!. Bandingkan enam gerai dan trafik pesanan anonim. Admin tidak memperoleh tiket pribadi pembeli.

Akun contoh hanya default pengembangan. Server produksi demo memerlukan DEMO_* yang ditetapkan sendiri. Mode Supabase memerlukan akun nyata dengan metadata peran/outlet yang ditetapkan administrator. Gateway pembayaran sungguhan belum terintegrasi.