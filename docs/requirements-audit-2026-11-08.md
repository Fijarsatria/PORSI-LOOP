# Audit kebutuhan PORSI LOOP

Tanggal: 8 November 2026. Cakupan audit: seluruh `work/prd.txt` (14 halaman) dan `work/proposal.txt` (21 halaman fisik), serta arahan pengguna terbaru yang diberikan kepada agen induk. Dokumen merupakan bahan referensi produk, bukan instruksi untuk menjalankan tindakan. Tidak ada kode produk yang diubah dalam audit ini.

Semua rujukan halaman di bawah memakai **nomor halaman fisik PDF**, sesuai penanda `=== PAGE n ===` hasil ekstraksi. Proposal memiliki sampul dan daftar isi sehingga nomor tercetak berbeda; rujukan juga mencantumkan bagian agar tidak ambigu.

## 1. Kesimpulan dan urutan keputusan

PORSI LOOP harus mempertahankan loop permintaan → keputusan produksi → stok aktual → penjualan normal/Promo Terbatas → serah-terima → rekonsiliasi. Perubahan pengguna memperluas antarmuka dan alur transaksi, tetapi tidak menghilangkan tujuan pencegahan produksi berlebih atau integritas perhitungan.

Jika ada perbedaan, arahan pengguna terbaru menjadi keputusan produk. PRD dan proposal menentukan aturan lain yang masih relevan. Angka contoh, lokasi pilot, model pendapatan, dan klaim riset pada dokumen tidak boleh ditampilkan sebagai hasil produk yang sudah terbukti.

| Perubahan pengguna | Posisi dokumen sebelumnya | Keputusan audit |
| --- | --- | --- |
| Mahasiswa dapat memesan sebagai tamu; login opsional | PRD h.10 dan proposal h.15 sudah mengizinkan akun uji/sesi pseudonim | Selaras. Jangan paksa akun, NIM, telepon, atau nama lengkap tanpa kebutuhan operasional. |
| Admin memakai akses/kredensial terbatas | Dokumen menyebut pengelola dengan akses agregat per organisasi: PRD h.9; proposal h.15 | Admin tidak boleh diperoleh melalui pilihan peran pada pendaftaran publik. Gunakan akun berizin yang diprovisikan. |
| Penjual wajib mempunyai akun | PRD h.9 dan proposal h.15 mengharuskan isolasi data gerai | Semua panel dan tindakan penjual memerlukan akun beserta keanggotaan gerai yang diverifikasi server. |
| Banyak gerai dan menu untuk pengujian | MVP awal satu gerai/satu menu: PRD h.3; proposal h.3, h.6 | Batas lama diganti. Sediakan data contoh bervariasi dan uji isolasi dua gerai sungguhan dalam model data. |
| Istilah `Rescue` diganti `Promo Terbatas` | PRD h.6, h.8 dan proposal h.8 menjelaskan stok surplus aktual | Ganti semua istilah yang dilihat pengguna. Aturan surplus, kelayakan, stok, dan waktu tetap berlaku. |
| Pilihan akhir `Dine in` dan `Pick up`; jadwal menggantikan pre-order | Dokumen berfokus pada pre-order dan slot: PRD h.7; proposal h.8–9 | `Dine in`/`Pick up` adalah cara pemenuhan. Pada `Pick up`, pengguna memilih segera atau jadwal yang tersedia. Jangan tampilkan `Pre-order` sebagai jalur terpisah. |
| Banyak metode pembayaran lalu QR pengambilan | Gateway pembayaran dahulu di luar lingkup: PRD h.4; proposal h.14 | Batas lama diganti oleh arahan pengguna. Status pembayaran harus dipisahkan dari status pemenuhan. |
| Pemindai penjual memeriksa lunas, siap, gerai benar, sekali pakai | Dokumen memiliki pickup code, atomisitas, idempotensi: PRD h.7, h.9–10; proposal h.15 | Perkuat validasi menjadi penukaran QR atomik di server. Tampilan QR saja bukan bukti lunas. |
| Modal perkembangan pesanan beranimasi halus; notifikasi dua sisi | Status real-time: PRD h.7; proposal h.7–8 | Tambahkan perkembangan jelas dan notifikasi penjual/mahasiswa, dengan perilaku aksesibel dan pemulihan koneksi. |
| Insight produksi 50 = 40 normal + 8 promo + 2 dibuang | Persamaan lebih luas: PRD h.8; proposal h.9 dan h.19 | Jadikan contoh utama, tetap dukung konsumsi internal dan stok akhir agar rekonsiliasi umum tidak rusak. |

## 2. Aturan bisnis proposal yang wajib dipertahankan

### Permintaan dan produksi

1. Saran produksi adalah bantuan keputusan. Penjual bisa menerima atau mengubahnya; simpan saran awal, keputusan akhir, alasan perubahan, dan waktu. Saran tidak pernah otomatis menambah stok. Sumber: PRD h.6–8; proposal h.8.
2. Rumus target adalah `T = P + W + b`, dengan permintaan terkonfirmasi `P`, estimasi permintaan spontan/walk-in `W`, dan buffer eksplisit `b`. Jangan menjumlahkan pesanan terkonfirmasi dengan seluruh histori penjualan, karena konsumen yang sama dapat berpindah kanal. Sumber: PRD h.7; proposal h.8–9 dan Lampiran A h.18–19.
3. `W` hanya memakai histori kanal walk-in yang terpisah atau baseline manual yang diberi label. Saat histori kurang, tampilkan `Data terbatas` dan sumber baseline, rentang perkiraan, serta alasan saran. Jangan menyebut angka tersebut hasil AI terlatih. Sumber: PRD h.7; proposal h.9, h.18.
4. Pertimbangkan stok siap jual `S`, kapasitas `C`, kuota slot, dan batas waktu. Tolak komitmen tambahan bila kapasitas/slot sudah tidak cukup; jangan hanya memperingatkan sesudah pesanan diterima. Sumber: PRD h.7; proposal h.9, h.18–19.
5. Stok fisik bertambah hanya setelah produksi selesai dikonfirmasi. Catat penjualan pembeli langsung dengan tindakan cepat dan kanal terpisah. Sumber: PRD h.8; proposal h.8, h.14.
6. Mode produksi mengikuti gerai: persiapan awal, batch lanjutan, atau make-to-order. Jangan memaksa gerai make-to-order mempunyai rencana produksi massal. Sumber: PRD h.2; proposal h.5–6.

### Promo Terbatas

1. Penawaran berasal dari stok aktual yang tersisa dan telah diperiksa penjual. Bukan produksi tambahan khusus diskon. Tetap perhatikan kemungkinan penjualan normal berkurang akibat promo. Sumber: PRD h.6, h.8; proposal h.8, h.10, h.17.
2. Wajib ada harga normal dan promo, jumlah tersedia, komposisi/alergen yang diketahui, catatan kondisi, serta batas pengambilan. Jangan membuat badge `aman` berdasarkan waktu hitung mundur. Sumber: PRD h.8, h.11; proposal h.8, h.10.
3. Reservasi menahan jumlah tersedia secara atomik, tetapi tidak dihitung sebagai makanan terlayani sampai serah-terima terverifikasi. Pesanan dibayar namun belum diambil juga belum menjadi porsi tersalurkan. Sumber: PRD h.6, h.8; proposal h.8–9.
4. Kedaluwarsa dan pembatalan menggunakan waktu server. Melepaskan reservasi tidak memperpanjang masa layak makanan. Jangan otomatis menerbitkan ulang stok yang masa kelayakannya sudah lewat. Sumber: PRD h.7–11; proposal h.10, h.15.
5. Makanan sisa piring, berindikasi rusak/terkontaminasi, atau dengan riwayat penanganan tidak diketahui tidak boleh ditawarkan. Aplikasi membantu pencatatan; penjual tetap memeriksa kelayakan. Sumber: PRD h.11; proposal h.10.

### Pemenuhan dan buku stok

1. Pesanan memiliki status yang jelas, pembatalan terbatas sesuai kebijakan, jendela pemenuhan, dan no-show. Pesanan tidak diambil bukan porsi terlayani. Sumber: PRD h.7; proposal h.4, h.8–9.
2. Jika porsi dari pesanan no-show kemudian dijual normal atau promo, catat pada kanal serah-terima sebenarnya sekali saja. Jangan menghitung pemesanan pertama sebagai penjualan fisik yang selesai. Sumber: proposal Lampiran A h.19.
3. Semua perubahan stok memiliki event, tipe, referensi transaksi, pelaku, dan waktu. Retri tidak boleh menggandakan event. Koreksi melalui event penyesuaian dengan alasan, bukan menghapus jejak awal. Sumber: PRD h.10; proposal h.14–15.
4. Persamaan lengkap sesi adalah `P_prod = O + W_sold + R + K + D + S_end`, yaitu produksi = pesanan normal terambil + penjualan langsung + promo terambil + konsumsi internal + dibuang + stok akhir. Sumber: PRD h.8; proposal h.9, h.19.
5. Selisih atau input belum lengkap membuat sesi `incomplete`. Simpan sesi tersebut sebagai temuan kualitas data; kecualikan dari rata-rata/baseline pembanding. Jangan memalsukan angka buangan untuk menutup selisih. Sumber: PRD h.8; proposal h.8, h.17, h.19.

### Dampak dan bisnis

1. Pisahkan outcome operasional, estimasi ekonomi, dan indikator lingkungan. Jangan menjumlahkan produksi yang diperkirakan terhindar dengan promo terambil menjadi satu klaim `makanan terselamatkan`. Sumber: PRD h.8–9; proposal h.9–10, h.19.
2. `Waste intensity = berat makanan siap konsumsi yang benar-benar dibuang (kg) / porsi benar-benar terlayani × 100`. Berat tidak bisa diturunkan secara pasti hanya dari jumlah porsi. Bila berat belum ada, tampilkan jumlah porsi dibuang dan `Berat belum dicatat`. Sumber: PRD h.3, h.9; proposal h.12, h.19.
3. Klaim pengurangan limbah memerlukan baseline yang sebanding dan metode timbang konsisten. Tidak ada klaim pengurangan CO₂ tanpa faktor emisi dan metode yang dapat dirujuk. Sumber: PRD h.2–3, h.9; proposal h.9–10, h.19.
4. Manfaat ekonomi = biaya variabel yang benar-benar terhindar + penerimaan promo − biaya tambahan − perubahan penjualan normal. Pisahkan aktual, estimasi, dan simulasi. Bahan yang sudah dibeli lalu tetap rusak bukan biaya terhindar. Sumber: PRD h.3, h.9; proposal h.11–13, h.19.
5. Model pendapatan adalah langganan, bukan komisi promo. Rp79.000/gerai/bulan dan Rp1.500.000/lokasi/bulan adalah hipotesis harga; pilot gratis bukan bukti komersialisasi. Sumber: PRD h.5, h.14; proposal h.10–12.
6. Universitas Telkom adalah calon lokasi pilot, bukan mitra resmi yang sudah dikonfirmasi. Data demo, testimoni, hasil pilot, dan statistik nasional harus jelas asalnya. Sumber: PRD h.1–2, h.10; proposal h.3–5, h.11, h.16–17.

## 3. Kesenjangan dan default implementasi yang disarankan

Bagian ini merupakan rekomendasi audit untuk hal yang tidak ditentukan rinci oleh dokumen, bukan fakta tentang fitur yang sudah tersedia.

| Kesenjangan | Default yang disarankan | Alasan/pijakan |
| --- | --- | --- |
| Kepemilikan pesanan tamu | Sesi tamu acak yang dikelola server; akses pesanan hanya untuk sesi pemilik. Kode pengambilan tidak dipakai untuk membuka seluruh histori pesanan. Login dapat menautkan pesanan sesi itu setelah verifikasi. | Privasi dan akses milik sendiri: PRD h.9–10; proposal h.15. |
| Peran admin dan penjual | Pendaftaran publik tidak menerima klaim `admin`. Akun penjual tetap membutuhkan keanggotaan gerai yang disahkan. Admin dibatasi organisasi. Jangan simpan kata sandi di kode atau menampilkan kredensial admin umum. | Isolasi tenant: PRD h.9; proposal h.15. |
| Penjual baru belum memiliki gerai | Izinkan pembuatan akun dan pengajuan gerai; status `Menunggu verifikasi` sebelum mengelola penjualan nyata. Untuk demo, sediakan akun uji dengan gerai contoh yang telah disahkan. | Mencegah peningkatan peran melalui isian klien sambil menjaga alur uji mudah. |
| Makna cara makan dan kanal permintaan | Simpan cara pemenuhan (`dine_in`/`pickup`), waktu (`segera`/slot), kategori harga (`normal`/`promo`), dan kanal permintaan terpisah. Ganti label pre-order menjadi `Pick up terjadwal`, tetapi pertahankan identitas permintaan terkonfirmasi dalam perhitungan. | Mengganti kata tidak boleh menghapus pemisahan P/W: PRD h.7; proposal h.9. |
| Pesanan digital segera vs walk-in | Dokumentasikan definisi estimator: `P` adalah komitmen jadwal yang dikonfirmasi sebelum keputusan produksi; permintaan spontan yang sudah dipenuhi menjadi histori kanal spontan. Jangan memetakan semua pesanan digital menjadi `P` hanya karena dibuat lewat web. | Mencegah histori walk-in dan komitmen aktif dihitung ganda. |
| Dine in dan serah-terima | Dine in memiliki status disiapkan → siap disajikan → disajikan. QR/kode boleh memvalidasi penyerahan yang sama di gerai, dengan label yang sesuai. Jangan mewajibkan nomor meja jika gerai tidak menggunakannya. | Dokumen belum menentukan dine in; porsi terlayani tetap membutuhkan kejadian penyerahan. |
| Banyak metode pembayaran | Mulai dengan QRIS, dompet digital, dan transfer/virtual account dalam mode uji bila provider nyata belum tersedia. Tandai `Simulasi pembayaran` dengan jelas; jangan menyatakan uang sungguhan telah diterima. Integrasi nyata menggunakan konfirmasi server/provider. | Pembayaran merupakan perluasan kebutuhan pengguna; dokumen lama memang mengecualikannya. |
| Status lunas | `pending`, `paid`, `failed`, `expired`, `refunded` terpisah dari status order. Klien tidak boleh mengirim harga final atau status `paid` yang langsung dipercaya. Tetapkan nominal/snapshot harga di server dan cocokkan konfirmasi provider. | Mahasiswa tidak boleh mengubah harga/kuota: PRD h.13; proposal h.17. |
| Kapan QR ditampilkan | Setelah pembayaran terverifikasi berhasil. QR boleh terlihat saat makanan masih disiapkan, dengan teks belum bisa ditukar; penukaran hanya berhasil saat siap. Kode tidak mengandung data pribadi atau rahasia pembayaran. | User meminta pembayaran lalu QR serta validasi lunas dan siap. |
| QR valid sekali | Muatan acak/tidak dapat ditebak terkait order; server memeriksa autentikasi penjual, gerai, paid, ready, belum ditukar, belum kedaluwarsa, dan status order bukan batal/no-show. Tulis penukaran, status akhir, dan event stok dalam satu transaksi. Retri yang sama mengembalikan hasil awal tanpa efek baru. | PRD h.7, h.9–10; proposal h.15, h.17. |
| Kamera tidak tersedia | Tetap sediakan input kode manual yang melewati validasi server identik. Jangan membuat kode manual sebagai jalan pintas status pembayaran/gerai. | Pickup code sudah menjadi kebutuhan awal, PRD h.7. |
| Batas bayar dan stok | Tahan stok/slot sementara saat pembayaran pending; default demo dapat 10 menit dengan label jelas dan konfigurasi gerai. Kedaluwarsa otomatis melepas alokasi, tanpa menambah produksi. Persetujuan pembayaran terlambat perlu transaksi pemeriksaan stok atau refund, bukan oversell. | Detail durasi belum ditetapkan; prinsip expiry/atomisitas: PRD h.8–10. |
| Batas pembatalan dan no-show | Tampilkan kebijakan sebelum bayar. Default pembatalan mandiri hanya sebelum diproses atau cutoff yang tertera; pembatalan setelah lunas menciptakan status refund yang jelas. No-show tidak menghapus catatan pembayaran. Jangan otomatis mengklaim refund berhasil tanpa konfirmasi. | Dokumen mensyaratkan kebijakan terbatas namun tidak mengatur refund, PRD h.7. |
| Keranjang lintas gerai | Default satu gerai per pesanan/QR/pembayaran. Saat pindah gerai, minta pengguna menyelesaikan atau mengganti keranjang dengan pemberitahuan yang jelas. | Membuat pemeriksaan gerai pada QR dan rekonsiliasi tidak ambigu. |
| Notifikasi | Pesanan baru yang sudah dikonfirmasi masuk ke antrean penjual gerai terkait; perubahan status sampai ke pemilik pesanan, termasuk tamu. Simpan event belum dibaca, deduplikasi, dan sinkronisasi saat reconnect. Izin notifikasi browser opsional, bukan syarat memesan. | Transparansi status: PRD h.7; proposal h.7–8. |
| Modal perkembangan | Modal menampilkan nomor, gerai, mode, jadwal, status pembayaran, tahapan order, ringkasan, QR bila tersedia, dan tindakan sesuai status. Fokus dikelola, Escape menutup, latar tidak dapat dioperasikan, animasi mengikuti reduced-motion. Tutup modal tidak membatalkan order. | Memenuhi pengalaman yang diminta tanpa mengorbankan aksesibilitas. |
| Durasi animasi | Transisi sekitar 180–260 ms untuk membuka/menutup dan perubahan status; hindari animasi berulang yang menghambat QR atau tombol. Mode reduced-motion menghilangkan gerakan besar. | Default presentasi yang aman, bukan aturan dari proposal. |
| Status stok ketika dipesan | Pisahkan stok fisik, stok dialokasikan, dan stok tersedia. Reservasi mengurangi yang dapat dijual; serah-terima mengurangi stok fisik sekali. Pembayaran bukan pengurangan fisik kedua. | Dokumen membedakan reservasi dan penyaluran: PRD h.6, h.8. |
| Sisa awal sesi/batch | Jika mendukung stok awal terbawa, persamaan menjadi `S_start + produksi tambahan = seluruh keluaran + S_end`. Jika tidak, batasi demo pada sesi tanpa carry-over dan tampilkan batasannya. | Rumus dokumen mengasumsikan stok awal nol; variabel S dalam perencanaan memerlukan definisi yang konsisten. |
| Banyak menu dan bahan bersama | Rekonsiliasi per menu/batch/sesi dengan satuan porsi integer; total lintas menu hanyalah agregasi. Jangan menganggap satu porsi menu A dapat mengganti menu B. | Ekspansi dari satu menu memerlukan dimensi stok eksplisit. |
| Data contoh | Minimum yang disarankan 8 gerai dan 40 menu, dengan kategori, variasi harga, alergen, stok nol/rendah, gerai tutup, slot penuh, promo aktif/kedaluwarsa, serta dua akun penjual berbeda. Semua identitas/angka diberi label data contoh. | Target baru pengguna mengganti batas satu gerai, sekaligus mendukung edge cases PRD h.13. |

## 4. Insight produksi yang benar

Contoh utama pengguna harus tampil sebagai **data simulasi**: `50 diproduksi = 40 terjual normal + 8 Promo Terbatas diambil + 2 dibuang`.

Interpretasi yang konsisten:

- `40 normal` mencakup semua penjualan normal yang benar-benar diserahkan, baik dine in, pick up segera, pick up terjadwal, maupun transaksi pembeli langsung yang dicatat penjual. Subkanal tetap disimpan agar perencanaan tidak menghitung ganda.
- `8 promo` adalah porsi harga Promo Terbatas yang sudah diserahkan, bukan delapan pemesanan/reservasi saja.
- `2 dibuang` merupakan catatan akhir sesi eksplisit. Jangan menghitung `produksi − penjualan` otomatis sebagai waste karena masih mungkin ada stok akhir atau konsumsi internal.
- Hasil: 48 porsi terlayani; 96% porsi produksi disalurkan lewat penjualan; 4% dibuang. Ini rasio porsi untuk sesi contoh, bukan pengurangan waste terhadap baseline atau ukuran kg.
- Dalam contoh ini `K = 0` dan `S_end = 0`, sehingga persamaan lengkap tetap seimbang. Tampilkan keduanya pada rekonsiliasi walau ringkasan utama cukup tiga keluaran.
- Angka tidak seimbang harus menampilkan selisih dan status belum lengkap. Dashboard tidak boleh diam-diam memaksa persentase menjadi 100%.

## 5. Kriteria penerimaan untuk perombakan

1. **Tamu:** pengguna tanpa akun dapat menemukan gerai/menu, memilih Dine in atau Pick up, memilih jadwal bila perlu, membayar dalam metode yang ditawarkan, melihat perkembangan, lalu memperoleh QR. Sesi tamu lain tidak bisa membuka pesanan tersebut.
2. **Akun:** login mahasiswa opsional; akun penjual wajib; URL panel penjual/admin menolak akses yang tidak berwenang. Mengubah role/outlet dalam permintaan klien tidak memberi hak baru.
3. **Terminologi:** semua antarmuka, tombol, status, notifikasi, formulir, dan teks kosong memakai Promo Terbatas serta Dine in/Pick up secara konsisten. Tidak ada jalur publik bernama Rescue atau Pre-order yang bertentangan dengan keputusan terbaru.
4. **Katalog:** banyak gerai dan menu dapat dicari/difilter; keadaan tutup, habis, promo kedaluwarsa, dan slot penuh memiliki perilaku nyata. Keranjang tidak mencampurkan gerai tanpa model pesanan terpisah.
5. **Pembayaran:** tiap metode memiliki pending/sukses/gagal/kedaluwarsa yang jelas; menekan tombol ulang tidak menciptakan order atau pembayaran ganda; mode uji mudah dikenali. Harga final ditentukan server.
6. **Pemenuhan:** penjual menerima notifikasi order gerainya, dapat memperbarui proses, dan mahasiswa melihat pembaruan yang sama. Refresh atau menutup modal tidak kehilangan pesanan.
7. **QR:** uji sukses lunas+siap+gerai benar; uji penolakan belum lunas, belum siap, gerai salah, batal, kedaluwarsa, QR palsu, dan sudah dipakai. Dua penukaran bersamaan menghasilkan satu penyerahan/event stok.
8. **Stok:** dua pembeli berebut porsi/slot terakhir hanya menghasilkan satu alokasi. Retri dengan identitas tindakan sama tidak menggandakan stok/pesanan. Pembatalan/kedaluwarsa memulihkan alokasi tepat satu kali.
9. **Perencanaan:** P nol, data W kurang, kapasitas tercapai, dan override penjual berjalan; tidak ada penghitungan P + histori total. Saran belum menambah stok sebelum konfirmasi produksi.
10. **Rekonsiliasi:** contoh 50=40+8+2 menghasilkan sesi lengkap; contoh selisih tidak lengkap; order no-show tidak termasuk terlayani; penjualan kembali porsi no-show dihitung satu kali pada kanal akhir.
11. **Dampak:** outcome, ekonomi, dan lingkungan dipisahkan. Tidak ada klaim kg/CO₂, hasil pilot, kemitraan resmi, atau pengurangan limbah yang dibuat dari angka simulasi tanpa dasar.
12. **Pengalaman:** modal perkembangan dapat dibuka/ditutup dengan keyboard, fokus kembali ke pemicu, QR dapat dibaca tanpa animasi mengganggu, tata letak bekerja di ponsel, dan preferensi reduced-motion dihormati.

## 6. Batas yang harus dinyatakan saat menyerahkan hasil

Dokumen lama bukan bukti adanya pembayaran produksi, pengiriman push, penyimpanan lintas perangkat, autentikasi terpasang, ataupun RLS aktif. Klaim penyelesaian harus mengikuti implementasi dan hasil pemeriksaan yang nyata. Jika hanya mode demo yang tersedia, katakan dengan jelas bagian pembayaran, data, notifikasi, pemindaian, dan penyimpanan mana yang masih simulasi. Perombakan visual saja belum memenuhi permintaan alur transaksi end-to-end.

Untuk pilot lapangan, proposal juga mensyaratkan validasi masalah, persetujuan lokasi, SOP pangan, kebijakan pembatalan/no-show, dan mekanisme keluhan. Hal-hal tersebut adalah prasyarat pelaksanaan pilot, bukan alasan untuk menghentikan pembangunan dan pengujian demo yang telah diminta pengguna. Sumber: PRD h.2, h.11, h.13–14; proposal h.5–6, h.10–12, h.19.
