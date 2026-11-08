# Skenario pengujian demo

Gunakan npm ci dan npm run dev, lalu http://localhost:3000. Seluruh transaksi pada mode demo adalah simulasi.

1. Buka /customer tanpa login. Cari menu/filter gerai, pilih menu dari Dapur Bu Ratna, lalu nama panggilan, porsi, Dine in/Pick up, serta jadwal. Pilih QRIS, lanjut pembayaran, dan gunakan tombol simulasi pembayaran berhasil.
2. Tiket menampilkan status dan QR pengambilan. Simpan halaman customer tetap terbuka.
3. Masuk pada /masuk?peran=gerai sebagai seller@porsiloop.local dengan kata sandi PorsiSeller2026!. Buka Pesanan. Hanya pesanan gerai ini yang tersedia. Sesi kerja terpisah dari sesi belanja; penjual dapat membuka /customer tanpa keluar akun kerja.
4. Pilih Mulai siapkan, kemudian Tandai siap. Periksa status dan notifikasi customer ikut berubah.
5. Pilih Scan QR di tengah navigasi bawah dan pindai tiket customer. Jika tidak ada kamera, salin token dari tiket customer ke input Token QR pengambilan. Verifikasi & serahkan setelah makanan diserahkan. Status selesai dan stok berkurang sekali. Token yang sama ditolak pada percobaan berikutnya.
6. Ulangi dengan Bayar di gerai. Penjual wajib memilih Tunai diterima sebelum dapat menyiapkan pesanan dan QR mahasiswa tersedia.
7. Ulangi di Promo Terbatas. Kuota ditahan saat pesan; metrik tersalurkan baru bertambah setelah verifikasi penyerahan.
8. Pada tab Menu, pilih Tambah menu, lalu catat produksi melalui tombol Stok di kartu makanan. Edit harga atau ketersediaan dari kartu tersebut. Rencana tersedia pada tab tersendiri; penjualan langsung dapat dicatat dari Ringkasan. Gunakan Catat sisa hari ini untuk rekonsiliasi. Bandingkan produksi, normal terambil, promo terambil, waste, internal, dan stok akhir. Contoh 50=40+8+2 ditandai ilustrasi, terpisah dari data sesi.
9. Buka /akses-pengelola, masuk admin@porsiloop.local / PorsiAdmin2026!. Bandingkan grafik gerai, pesanan, serta Penjualan & pemasukan. Admin tidak memperoleh tiket pribadi pembeli. Pada Gerai & akses, buat gerai dan akun penjual baru atau beri akses tambahan ke gerai yang sudah ada.
10. Setelah pesanan diserahkan, buka /daftar dari browser customer yang sama. Daftarkan akun; pesanan tamu akan ikut tersimpan. Berikan rating pada pesanan selesai. Pesanan yang belum diserahkan atau milik orang lain tidak dapat diberi rating.

Akun contoh hanya default pengembangan. Server produksi demo memerlukan DEMO_* yang ditetapkan sendiri. Mode Supabase memerlukan akun nyata dengan metadata peran/outlet yang ditetapkan administrator. Gateway pembayaran sungguhan belum terintegrasi.

Hasil dan batas pemeriksaan tercatat pada [verifikasi kelanjutan](verification-2026-11-08.md).
