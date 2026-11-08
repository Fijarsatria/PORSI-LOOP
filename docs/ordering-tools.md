# Alat operasional dan chat pesanan

## Foto menu

Penjual membuka **Menu → Edit → Ganti foto**, memilih PNG/JPEG/WebP maksimal 10 MB, memeriksa pratinjau, lalu menyimpan. Browser mengubah foto menjadi WebP dengan sisi terpanjang 480 piksel dan menghapus metadata sumber. Gambar hasil maksimal 90.000 karakter disimpan bersama menu dalam penyimpanan aplikasi. Foto ditampilkan pada katalog, checkout, pesanan dan promo customer. SVG bawaan instalasi tetap dapat dipakai; unggahan SVG dan tautan gambar eksternal ditolak.

## Penjualan langsung dan riwayat

Dari Ringkasan, pilih **Catat penjualan langsung**, menu, jumlah, dan harga per porsi. Gunakan setelah pembayaran diterima dan makanan diserahkan. Stok bebas berkurang dan nilai transaksi masuk laporan; stok yang dicadangkan untuk pesanan/promo tetap dilindungi.

**Penjualan per hari** menyediakan tanggal yang benar-benar tercatat. Normal, promo, dan nilai penjualan yang sudah diserahkan dipisahkan. Riwayat lama yang belum menyimpan rupiah menampilkan “Belum dicatat”. Rekonsiliasi baru menyimpan nilai aktual agar tidak dihitung ulang memakai harga menu yang mungkin sudah berubah.

## Rencana dan promo

Rencana memperkirakan jumlah porsi dari pesanan terjadwal, perkiraan pembeli langsung, cadangan, stok dan kapasitas. Menerima saran tidak menambah stok. Produksi baru dicatat setelah selesai dimasak. Perkiraan pribadi digunakan ketika riwayat penjualan langsung belum cukup; ini bukan klaim prediksi otomatis yang teruji.

Promo dapat diterbitkan dari satu formulir: porsi, harga, durasi, informasi makanan, dan pemeriksaan kelayakan. Penawaran aktif terlihat beserta stok serta batas pengambilan. Hentikan penawaran untuk melepas kuota; pembatalan reservasi tetap mengikuti aturan pengembalian dana yang berlaku. Penawaran baru dapat dibuat untuk harga/durasi berikutnya.

## Akses dan pemuatan

- Customer: `/masuk`, pendaftaran `/daftar`.
- Penjual: `/masuk/gerai`; tautan lama `/masuk?peran=gerai` tetap didukung.
- Pengelola: `/akses-pengelola`.

Menu tiga garis di landing menyediakan pintasan ketiganya, termasuk pengelola. Tombol keluar terlihat di bagian atas ruang akun; sesi kerja dan belanja tetap terpisah. Tampilan pemuatan bergerak mengikuti proses pengambilan data/login, dengan tips yang bisa diganti dan dukungan reduced motion, tanpa sengaja menambah waktu tunggu.

## Chat

Customer, termasuk tamu, dapat menghubungi penjual setelah membuat pesanan. Ikon chat membuka daftar percakapan per tiket, kemudian isi percakapan. Panel berada di antara navigasi atas dan bawah pada mobile; keyboard Escape menutupnya. Pembaruan mengikuti sinkronisasi aplikasi setiap empat detik ketika halaman aktif. Badge menandai pesan dari lawan bicara yang belum dibuka pada sesi tampilan tersebut.

Server memeriksa kepemilikan tiket customer dan kepemilikan gerai penjual pada setiap pengiriman. Pengelola dan gerai lain tidak dapat membaca atau mengirim pesan pada tiket tersebut. Pesan disimpan bersama tiket, termasuk sesudah sesi diarsipkan. Batas 1.000 karakter per pesan dan 300 pesan per tiket; pengiriman ulang dengan kunci yang sama tidak menggandakan pesan. Pembayaran dan verifikasi QR tetap dilakukan melalui alur pesanan. Tidak ada lampiran chat atau notifikasi pesan ke luar aplikasi.

## Batas verifikasi

Pemeriksaan memakai mode demo lokal. Gateway pembayaran nyata, provisioning/runtime Supabase cloud, dan kamera perangkat fisik belum diverifikasi pada pembaruan ini. Data contoh bukan hasil penjualan atau pilot kantin nyata.

## Pemeriksaan pembaruan

- 53 pengujian unit lulus, termasuk privasi chat, kepemilikan gerai, pengiriman pesan idempoten, validasi foto dan nilai penjualan pada rekonsiliasi harian.
- 5 pengujian API produksi lulus.
- 28 pengujian browser Chromium mobile/desktop lulus. Cakupan tambahan: unggah dan simpan foto, penjualan langsung beserta harga, pilihan tanggal riwayat, penerbitan/penghentian promo, kata-kata rencana, logout, serta percakapan dua arah tamu dan penjual.
- Panel chat lulus pemeriksaan axe WCAG 2 A/AA yang diotomatisasi. Posisi panel mobile diperiksa agar tetap di atas navigasi bawah. Ini bukan audit aksesibilitas manual lengkap.
- Build produksi dan TypeScript lulus. Pilihan durasi promo memakai empat kolom agar tidak tersisa satu tombol pada baris terpisah di ponsel.
