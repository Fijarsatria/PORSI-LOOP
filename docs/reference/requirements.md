# Cakupan produk dan batas implementasi

Acuan terkini adalah permintaan pengguna 8 November 2026, PRD14 halaman, dan proposal21 halaman. Pengguna memperluas MVP satu gerai menjadi kantin dengan banyak gerai; istilah dan kewajiban login mengikuti arahan terbaru. Baca [audit per halaman](../riwayat/requirements-audit-2026-11-08.md) dan [alur terkini](flow-v2.md).

| Kebutuhan | Implementasi | Batas |
| --- | --- | --- |
| Mahasiswa tanpa login wajib | Sesi tamu acak server; katalog langsung; akun opsional | Tiket tamu terikat browser; belum ada pemulihan lintas perangkat |
| Penjual dan pengelola | Kredensial wajib; outletId tepercaya untuk penjual; agregat admin tanpa tiket pribadi | Akun cloud harus diprovisikan melalui Auth |
| Banyak gerai/menu | Demo6 gerai18 menu; stok/slot/rekonsiliasi per menu | Cloud baru18 menu nonaktif tanpa transaksi/produksi contoh |
| Dine in/Pick up | Pengambilan segera atau slot terjadwal, cutoff dan kuota server | Tidak ada pengantaran atau pemesanan meja |
| Promo Terbatas | Surplus aktual, pemeriksaan penjual, expiry, reservasi atomik | Bukan produksi khusus diskon; timer bukan jaminan kelayakan |
| Pembayaran | Simulator QRIS/E-wallet/transfer; tunai dikonfirmasi penjual | Gateway nyata belum terintegrasi; simulasi berlaku di semua mode |
| QR pengambilan | Token kriptografis hanya pemilik tiket; scanner kamera dan input token, paid+ready+gerai+expiry+sekali pakai | Kamera fisik memerlukan perangkat, HTTPS, dan izin browser |
| Progres/notifikasi | Status beranimasi; polling4 detik; notifikasi halaman dan perangkat opsional | Bukan push saat browser ditutup |
| Refund | Demo simulasi; live cash menunggu konfirmasi uang dikembalikan | Tidak ada klaim transfer/refund otomatis |
| Perencanaan | Permintaan terkonfirmasi + histori walk-in terpisah/baseline manual + buffer; override beralasan | Aturan transparan, bukan klaim model ML atau optimasi |
| Stok dan insight | Aktual: produksi, normal terambil, promo terambil, waste/internal/stok akhir; contoh50=40+8+2 | Tidak menghitung pesanan belum terambil sebagai porsi terlayani |
| Rekonsiliasi | Selisih ditandai belum lengkap; histori lengkap menjadi pembanding; ledger lintas sesi | Stok akhir tidak otomatis menjadi produksi baru |
| Integritas | SQLite transaksi termasuk polling; compare-and-swap cloud; idempotensi; isolasi gerai | Dokumen global cloud dapat mengalami kontensi pada skala besar |
| Aksesibilitas | Dialog/fokus/Escape, reduced motion, kontras, layout390px dan desktop | Evaluasi pengguna dan kamera perangkat nyata tetap diperlukan |

Proyek Supabase dan skema telah dibuat serta pembatasan tabel/RPC diuji. Koneksi runtime masih membutuhkan kunci rahasia server yang tidak tersedia melalui plugin; browser menolak pengambilan karena URL aktif tidak dapat dipastikan. Data demo tetap terpisah dari fakta pilot. Tidak ada klaim CO2, kg terhindar, manfaat bersih, atau kemitraan kampus yang dibuat tanpa bukti.