# PORSI LOOP — rencana implementasi

## Cakupan

Satu gerai kampus, satu menu utama, tiga peran, dan satu siklus yang bisa dijalankan: menu → pre-order → rencana produksi → produksi aktual → walk-in → rescue → validasi pengambilan → rekonsiliasi.

Sumber kebutuhan: proposal CR YOUTH 2026 dan PRD Trinity LFA yang diberikan pengguna. Angka operasional merupakan simulasi, bukan hasil pilot. Pembayaran dilakukan di gerai; integrasi payment gateway berada di luar MVP.

## Arah visual

Identitas: kantin kampus yang segar, ramah, dan teratur. Liquid glass dipakai untuk navigasi, kontrol mengambang dan lembar pemesanan; informasi utama tetap berada di permukaan yang terbaca.

Token warna: Ink #173D35, Leaf #315D43, Lime #D5ED9A, Mist #F5F7F2, Peach #F3C8AA, White #FFFFFF. Display: Plus Jakarta Sans, body: DM Sans, angka: tabular. Font disimpan lokal agar tidak bergantung pada Google saat runtime.

Signature: piring makan sebagai pusat loop interaktif di hero; pilihan porsi dan slot memperbarui pratinjau tiket pengambilan. Navigasi kaca menghubungkan pengalaman publik dengan aplikasi tanpa mengaburkan isi.

```text
Mobile                    Desktop
[logo       menu/masuk]    [logo    navigasi           masuk]
[label + judul]           [judul + aksi | piring + tiket]
[piring + tiket]          [alur ringkas di bawah hero]
[aksi utama]              [masalah → alur → demo → sumber]
[alur → demo → sumber]
```

Hasil pencarian design system awal menyarankan gaya restoran merah dengan serif. Pilihan itu diubah: produk ini alat perencanaan kantin, sehingga palet hijau, sans yang bersih, dan piring interaktif lebih sesuai daripada bahasa visual restoran premium. Panduan Liquid Glass terverifikasi cocok untuk kontrol/navigasi; aksesibilitas tetap diutamakan.

## Tahap commit

1. Inisialisasi dan rencana kebutuhan.
2. Fondasi Next.js, identitas visual, landing, login.
3. Mesin transaksi, sesi peran, penyimpanan dan alur mahasiswa.
4. Operasional gerai dan laporan pengelola.
5. Pengujian alur, responsivitas, aksesibilitas dan dokumentasi.

## Aturan data

- T = P + W + b; baseline walk-in terpisah dari pre-order, asumsi dijelaskan.
- Rekomendasi tidak menambah stok. Produksi aktual menambah stok.
- Pesanan/reservasi menahan kuota; hanya serah terima yang mengurangi stok fisik.
- Rescue hanya dihitung setelah kode divalidasi penjual.
- Kondisi pangan dinilai gerai; penghitung waktu bukan jaminan keamanan.
- Metrik lingkungan memakai berat terukur per 100 porsi tersaji; tidak menghitung klaim CO₂.
- Login publik hanya mahasiswa dan gerai. Pengelola memakai rute terpisah.

## Validasi

TypeScript, build produksi, uji aturan stok/slot/transaksi, akses peran, alur pesanan sampai pengambilan dan rekonsiliasi. Review visual layar 375px dan desktop; dukungan keyboard serta reduced motion.
