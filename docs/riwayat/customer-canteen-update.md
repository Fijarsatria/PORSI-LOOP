# Customer, gerai, dan pengelola — kelanjutan 8 November 2026

## Integrasi kolaborator

PR #1 dari `feat/guest-multi-outlet-flow`, commit terakhir `31cc8f5`, digabungkan ke `main` sebagai `505ccbf`. Perubahan lokal sebelum integrasi disimpan pada branch cadangan lokal `backup/local-before-luthfi-20261108`; tidak ditimpa ke versi kolaborator yang lebih baru.

Branch tersebut mencakup pemesanan tamu, 6 gerai/18 menu sintetis, Dine in/Pick up, pembayaran demo/tunai, progres pesanan, token QR sekali pakai, dan laporan keuangan. Penyederhanaan dari prompt lanjutan belum di-push pada branch itu dan dilanjutkan pada `main`.

## Alur customer

- `/customer` adalah alamat katalog utama; `/mahasiswa` dipertahankan sebagai alamat kompatibilitas.
- Pemesanan tetap dapat dilakukan sebagai tamu. Pendaftaran `/daftar` opsional, dengan nama panggilan, email, dan kata sandi minimal 8 karakter.
- Sesi belanja, sesi kerja, dan identitas tamu memakai cookie HttpOnly terpisah. Penjual dapat berbelanja di browser yang sama tanpa keluar dari ruang gerai.
- Masuk/mendaftar sebagai customer menautkan hanya pesanan dari identitas tamu yang terverifikasi pada browser tersebut. Pesanan browser lain tidak diambil alih.
- Rating 1–5 bintang hanya dapat disimpan pemilik pesanan yang sudah diserahkan dan sudah masuk. Rating per pesanan dapat diperbarui tanpa menambah jumlah ulasan ganda. Katalog menampilkan ringkasan rating hanya jika memang ada rating.

## Penjual

Navigasi: **Ringkasan, Pesanan, Scan QR, Menu, Rencana**. Scan QR berada di tengah navigasi mobile dan diberi sorotan khusus. Kamera memerlukan izin; token manual tetap memakai validasi pembayaran, gerai, kesiapan dan penggunaan sekali.

Antrean menggunakan tiga kelompok: Masuk, Diproses, Selesai. Penjual mengonfirmasi tunai bila diperlukan, mulai menyiapkan, menandai siap, kemudian memindai QR saat menyerahkan. Pemindahan status tidak mengurangi stok sampai serah terima.

Menu berbentuk kartu dengan Edit, Stok, serta tombol tampil/sembunyikan. Menu baru dimulai dengan stok fisik nol. Tambah stok mencatat produksi matang; tidak menciptakan stok dari rekomendasi. Penjualan langsung tersedia melalui formulir singkat di Ringkasan.

Tutup sesi tidak menjadi tab utama. Pencatatan sisa dan Promo Terbatas tersedia di Menu, per makanan. Rekonsiliasi, penimbangan dan jejak stok tetap dipertahankan untuk tujuan pencegahan surplus dalam proposal.

## Pengelola kantin

Pengelola adalah pelanggan operasional penyedia platform. Ringkasan menggunakan angka utama, diagram distribusi porsi, batang layanan per gerai, dan informasi antrean. Penjualan diterima, pembayaran, refund, dan hasil distribusi tetap dibedakan.

**Gerai & akses** membuat gerai beserta akun penjual awal atau memberi akun tambahan untuk gerai yang sudah ada. Pendaftaran publik tidak dapat membuat akun staf. Penjual tidak dapat menambahkan gerai atau mengelola menu gerai lain.

SQLite menyimpan akun dengan hash scrypt dan salt unik; hash/kata sandi tidak masuk snapshot. Supabase memakai Auth dan `app_metadata` untuk otorisasi. API pembuatan akses cloud berjalan hanya pada server; transaksi bisnis tetap memakai compare-and-swap. Provisioning cloud baru, konfirmasi email, dan pengiriman email perlu diuji pada proyek tujuan dengan konfigurasi yang lengkap.

## Batas layanan

Data awal dan pembayaran daring mode demo adalah simulasi. Gateway pembayaran nyata, kamera perangkat fisik, dan runtime Supabase belum diverifikasi pada sesi kelanjutan ini. Mode cloud menolak pembayaran daring simulasi. Tidak ada klaim dampak lapangan, pengurangan emisi, atau keamanan makanan berdasarkan timer.
