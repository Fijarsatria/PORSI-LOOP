# Berkontribusi

1. Gunakan Node.js 24 LTS dan pasang dependensi dengan `npm ci`.
2. Buat branch dengan nama deskriptif, misalnya `feat/menu-photo` atau `fix/mobile-navigation`.
3. Pertahankan istilah dan alur customer, penjual serta pengelola. Perubahan stok/pembayaran harus melalui mesin transaksi server.
4. Sertakan pengujian untuk perilaku bisnis atau regresi yang berubah. Gunakan data uji dan basis data sementara.
5. Jalankan pemeriksaan yang relevan sebagaimana tercantum di README. Untuk perubahan antarmuka, periksa mobile terlebih dahulu, lalu desktop, keyboard dan reduced motion.
6. Gunakan commit bertahap yang menjelaskan perubahan. Pull request menjelaskan masalah, hasil akhir, dan pemeriksaannya.

Secrets, data transaksi lokal, keluaran pengujian dan dependensi tidak masuk Git. Jangan menggunakan data pilot nyata untuk fixture publik. [Indeks dokumentasi](docs/README.md) berisi kontrak dan batas implementasi.
