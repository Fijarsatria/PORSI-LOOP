# Penyedia platform dan pengelola kantin

PORSI LOOP adalah layanan yang disediakan kepada pengelola kantin. Penyedia platform dan pengelola kantin mempunyai tanggung jawab yang berbeda.

| Pihak | Tanggung jawab | Akses pada aplikasi |
| --- | --- | --- |
| Penyedia platform (tim PORSI LOOP) | Menyediakan layanan, pemasangan, pemeliharaan, dan pemberian akun untuk pelanggan pengelola kantin | Akses infrastruktur dan provisioning layanan; belum ada panel SaaS internal terpisah di aplikasi |
| Pengelola kantin (pelanggan) | Mengawasi seluruh gerai di kantinnya: pesanan, penjualan, penerimaan, produksi, promo, dan sisa | Akun `admin` melalui `/akses-pengelola`; dashboard `/pengelola` |
| Pemilik gerai | Mengubah menu/harga/ketersediaan, mencatat produksi, menangani pembayaran tunai, memperbarui pesanan, dan memvalidasi QR milik gerainya | Akun `seller` melalui `/masuk?peran=gerai`; dashboard `/gerai` |
| Mahasiswa/pembeli | Memilih menu, membayar, mengikuti status, dan mengambil makanan | `/mahasiswa` tanpa wajib login; akun opsional |

Akun pengelola kantin adalah akun operasional pelanggan. Akun tersebut bukan identitas penyedia platform atau kunci infrastruktur. Pilihan peran pada formulir tidak memberikan kewenangan baru; akun diverifikasi server. Layanan saat ini memodelkan satu kantin dengan banyak gerai. Pengelolaan beberapa organisasi/pelanggan dalam satu instalasi dan panel internal penyedia platform memerlukan cakupan tersendiri.

## Laporan pengelola kantin

Menu **Penjualan & pemasukan** tersedia pada `/pengelola?tab=finance`. Pengelola melihat seluruh gerai atau memilih satu gerai. Laporan dihitung server; pembeli tidak menerima data keuangan, dan penjual hanya menerima data gerainya sendiri.

- **Penjualan selesai:** nilai makanan normal, Promo Terbatas, dan pembeli langsung yang benar-benar telah diserahkan.
- **Pembayaran diterima:** pembayaran yang terverifikasi, termasuk uang yang kemudian dikembalikan atau sedang menunggu pengembalian, ditambah penjualan langsung tercatat.
- **Refund selesai:** uang yang sudah dikonfirmasi dikembalikan. Demo memakai simulasi pengembalian.
- **Penerimaan setelah refund:** pembayaran diterima dikurangi refund selesai. Angka ini belum dikurangi biaya bahan, operasional, atau biaya transaksi; bukan laba bersih.
- **Refund tertunda:** uang masih termasuk penerimaan sampai penjual mengonfirmasi pengembalian nyata.
- **Menunggu pembayaran:** nilai pesanan aktif belum lunas; reservasi kedaluwarsa tidak dihitung sebagai piutang aktif.

Laporan memakai **sesi terkini tiap menu**, dengan tanggal sesi ditampilkan. Penerimaan historis yang belum pernah dicatat tidak direkonstruksi memakai harga menu saat ini. Riwayat operasional tetap tersedia di laporan sesi dan jejak pencatatan.

Metode pembayaran pembeli langsung belum dicatat terpisah, sehingga nilainya ditampilkan sebagai **Pembeli langsung**; tidak diasumsikan seluruhnya tunai. Pendapatan layanan/langganan penyedia platform tidak dimasukkan ke penjualan makanan gerai.

## Akun demo pengembangan

- Akun gerai dan pengelola disediakan secara terpisah untuk lingkungan pengembangan; detail login tidak dipublikasikan di dokumentasi.

Akun ini hanya untuk demo lokal. Hosting demo produksi wajib mengatur kredensial staf sendiri, sedangkan mode Supabase memakai akun Auth nyata. Tidak ada akun penyedia platform publik yang membagikan akses infrastruktur.

## Kembali ke beranda

Logo dan tautan kembali ke beranda menargetkan `/#top`. Tautan ke bagian landing, seperti `/#cara-kerja`, tetap menuju bagian itu. Posisi gulir halaman sebelumnya tidak menentukan posisi saat pengguna meminta kembali ke beranda.
