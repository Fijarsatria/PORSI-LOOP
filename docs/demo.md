# Skenario demo PORSI LOOP

Semua angka dalam panduan ini adalah simulasi. Buka tiga profil browser/incognito agar mahasiswa, gerai, dan pengelola memiliki cookie masing-masing. Peran pada tab satu profil browser berbagi sesi login.

## Persiapan

Jalankan `npm ci`, `npm run build`, lalu `npm start`. Gunakan HTTPS jika aplikasi di-host. Untuk pengujian lokal HTTP dengan mode produksi saja, set `PORSI_COOKIE_INSECURE=true` pada lingkungan proses. `npm run dev` tidak memerlukan flag tersebut.

Masuk pengelola melalui `/akses-pengelola`. Profil pengelola menyediakan reset simulasi; lakukan sebelum presentasi jika jam demo sudah melewati cutoff. Reset menghapus seluruh transaksi simulasi instalasi ini. Data nyata tidak menyediakan reset atau kontrol jam.

## Siklus presentasi

1. **Mahasiswa** — masuk melalui `/masuk`, pilih porsi reguler, slot pertama, dan satu porsi. Konfirmasi. Di Pesananmu, buka tiket dan simpan kode `PL-…`. Klaim satu rescue pada tab Rescue lalu simpan kode `RS-…`. Reservasi belum menaikkan angka rescue tersalurkan.
2. **Gerai** — masuk melalui `/masuk?peran=gerai`. Pada Rencana, jelaskan pre-order, histori walk-in terpisah, buffer, kapasitas, dan alasan rekomendasi. Terima saran atau sesuaikan dengan alasan. Konfirmasikan tambahan produksi **18 porsi** agar produksi awal 32 menjadi 50. Menerima saran saja tidak menambah stok.
3. **Pengelola** — pada Jejak pencatatan, majukan **30 menit sebanyak tiga kali** hingga slot pertama dimulai sekitar 11.30 WIB. Sebelum itu, validasi pickup pre-order ditolak karena slot belum dimulai.
4. **Gerai** — validasi kode `PL-…` dan `RS-…`. Catat **10 porsi walk-in**. Tutup penawaran rescue awal dengan alasan yang jelas untuk melepas sisa kuota. Stok fisik sekarang **38 porsi**, dari 50 − 1 pre-order − 1 rescue − 10 walk-in.
5. **Pengelola** — majukan **180 menit** agar pre-order fixture yang tidak diambil menjadi no-show. No-show tidak dihitung sebagai layanan atau rescue.
6. **Gerai** — pada Tutup sesi, isi internal **1**, makanan dibuang **2**, berat hasil timbang simulasi **0,40 kg**. Isi stok akhir **34** untuk menunjukkan selisih satu porsi; status belum lengkap dan histori tetap disimpan. Koreksi stok akhir menjadi **35**. Persamaan: `50 = 1 + 10 + 1 + 1 + 2 + 35`.
7. **Pengelola** — periksa histori, ledger numerik, dan laporan. Waste intensity simulasi `0,40 / 12 × 100 = 3,33 kg per 100 porsi terlayani`. Penerimaan rescue **Rp10.000 bruto**; bukan manfaat bersih atau bukti pengurangan waste.
8. **Gerai** — buka sesi berikutnya dengan jadwal besok. Produksi dimulai nol, pengaturan menu tetap, hasil sesi lama tersimpan. Mahasiswa masih dapat membaca tiket lamanya.

## Pemeriksaan cepat

- Login publik menawarkan mahasiswa/gerai; pengelola berada pada alamat terpisah.
- Pembatalan sebelum cutoff melepas kuota; sesudah cutoff ditolak.
- Pickup kode yang sama dua kali ditolak; retry dengan idempotency key sama tidak menggandakan stok.
- Klaim rescue habis/kedaluwarsa ditolak; tidak ada pickup rekaan.
- Mahasiswa tidak bisa mencatat produksi, dan pengelola hanya menerima agregat pesanan.
- Buka tampilan 390px dan 1440px; periksa navigasi, dialog, tabel gulir, keterbacaan, keyboard, dan reduced motion.
