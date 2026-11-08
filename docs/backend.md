# Backend dan aturan transaksi

Lihat [alur terkini](flow-v2.md) untuk keputusan produk dan batas cloud.

## Model dan penyimpanan

Setiap menu memiliki kitchen state: stok, produksi, slot, pesanan, Promo Terbatas, riwayat, dan rekonsiliasi. Menu terikat outletId. SQLite demo menyimpan satu dokumen marketplace berisi enam gerai dan delapan belas menu; transaksi memakai BEGIN IMMEDIATE dan WAL. Adapter Supabase memakai JSONB terversi dan RPC porsi_compare_and_swap dengan retry terbatas. Tidak ada cache klien yang menentukan harga atau ketersediaan.

Supabase menyimpan porsi_state dan porsi_sessions sebagai tabel privat: RLS aktif dan dipaksa; anon/authenticated tidak diberi akses. Hanya server service_role dapat membaca dokumen dan menjalankan RPC SECURITY INVOKER. Isolasi per-menu/per-gerai dijalankan mesin domain sebelum snapshot atau mutasi. Untuk beban besar, pecah dokumen global menjadi tabel/RPC per agregat agar kontensi tidak meningkat.

## API dan identitas

- GET /api/state: membuat/membaca sesi tamu jika tidak ada sesi akun; mengembalikan snapshot privat sesuai peran.
- POST /api/auth: role, email, password wajib. demo:true hanya di mode demo dan tetap memerlukan kredensial. Produksi demo tidak mempunyai kata sandi bawaan.
- DELETE /api/auth: mencabut sesi akun dan kembali ke identitas tamu browser yang terpisah.
- POST /api/actions: tipe aksi, parameter, dan idempotencyKey; membutuhkan Origin situs yang sama dan sesi server.

Cookie sesi HttpOnly, SameSite=Lax, Secure pada HTTPS produksi. Sesi tamu memakai identitas acak, bukan ID bersama. Supabase mengenkripsi dan mengautentikasi identitas tamu menggunakan SESSION_SECRET. Akun cloud diverifikasi dengan Supabase Auth dan sesi server yang dapat dicabut. Peran dan outletId penjual hanya diambil dari app_metadata administrator; user_metadata atau pilihan peran klien tidak memberikan akses.

Snapshot pembeli hanya memuat tiket miliknya. Penjual hanya menerima pesanan/kitchen milik gerainya; token QR pembeli tidak diberikan kepada staf. Admin menerima agregat gerai dan trafik anonim, tanpa daftar pesanan/identitas pembeli. Harga pokok, perencanaan, riwayat operasional, dan rekonsiliasi tidak diberikan kepada pengunjung.

## Pemesanan dan pembayaran

preorder menerima menuId, portion, quantity, slotId ('asap' atau slot terbuka), fulfillment ('dine_in'/'pick_up'), customer, note, dan paymentMethod. Nama aksi internal lama dipertahankan untuk kompatibilitas, sedangkan UI menyebut Pick up/Dine in.

claim_rescue menerima batchId dan detail pembeli. Hanya kuota Promo Terbatas aktif, layak menurut konfirmasi penjual, belum kedaluwarsa, dan tersedia secara fisik yang dapat ditahan.

Status awal pending_payment, dengan waktu habis server. Reservasi menahan kapasitas; belum menurunkan stok fisik. pay_order adalah simulasi pada semua mode, tanpa uang yang berpindah, dan hanya untuk pemilik tiket; tidak dapat melunasi tunai. verify_cash_payment hanya penjual gerai pemilik setelah uang diterima. Gateway pembayaran nyata belum terintegrasi, sehingga QRIS, e-wallet, dan transfer tetap simulasi pada mode Supabase. Token acak kriptografis dibuat setelah lunas, bukan oleh browser.

prepare_order dan ready_order menerima orderId atau claimId. Pembayaran harus lunas; gerai harus benar; stok harus cukup. scan_pickup menerima token saja. Server memeriksa token, gerai, lunas, siap, waktu, dan belum diserahkan, lalu menulis status picked_up dan pergerakan stok atomik. Aksi pickup lama tetap memerlukan pemeriksaan yang sama sehingga bukan jalan pintas lewat ID/kode.

Batal sebelum diproses/cutoff melepaskan reservasi. Pembayaran digital simulasi yang dibatalkan langsung tercatat refunded; pada demo, tunai juga langsung tercatat. Pada cloud, pembayaran tunai yang dibatalkan menjadi refund_pending; confirm_cash_refund hanya tersedia untuk penjual setelah uang benar-benar dikembalikan. Sesi tidak boleh direkonsiliasi dengan pengembalian tunai tertunda.

## Produksi dan perhitungan

Rencana = permintaan terkonfirmasi + estimasi walk-in + buffer, dibatasi kapasitas dan stok siap. Estimasi walk-in hanya histori berlabel walk-in dengan rekonsiliasi lengkap, atau baseline manual yang dinyatakan. Menerima rencana/override tidak mengubah stok.

Produksi selesai menambah stok. Walk-in, serah-terima normal, Promo Terbatas, konsumsi internal, dan waste mengurangi stok sesuai kanalnya. Reservasi belum terambil, no-show, dan pembayaran bukan porsi tersalurkan. Buku stok menyimpan tipe, referensi, pelaku, waktu, dan sesi; pengulangan idempotent tidak menulis pergerakan kedua.

Rekonsiliasi: produksi = pesanan normal terambil + walk-in + promo terambil + internal + dibuang + stok akhir. Selisih ditandai belum lengkap dan tidak menjadi baseline. Berat waste harus berasal dari penimbangan; porsi positif tidak boleh disajikan sebagai nol kg. Aplikasi tidak membuat klaim emisi atau biaya terhindar tanpa metode/baseline.

## Data contoh dan ringkasan kantin

`lib/server/sample-data.ts` menyediakan riwayat sintetis agar demonstrasi tidak kosong: tujuh hari sesi tertutup, pesanan dan klaim Promo Terbatas yang sudah diambil beserta rating, serta beberapa penjualan hari ini untuk setiap gerai. Setiap tiket bertanda `sample: true` sehingga antarmuka menampilkan “data contoh” dan rekamannya dapat dibedakan dari aktivitas nyata. Produksi dinaikkan tepat sebesar yang dikonsumsi penjualan contoh, jadi stok bebas, kapasitas, dan rekonsiliasi tidak berubah. Hanya hari-hari terbaru yang memuat tiket individual agar dokumen operasional tetap kecil.

Database demo dan tindakan `reset_demo` memakai data ini. `PORSI_SAMPLE_DATA=off` memulai dari fixture polos; server pengujian mengaturnya agar ekspektasi tetap stabil. Instalasi cloud yang baru tetap kosong; data contoh ditambahkan secara eksplisit untuk presentasi.

`snapshot.community` adalah ringkasan anonim tujuh hari untuk semua peran: porsi dilayani, bagian Promo Terbatas, penghematan pembeli, rating, menu paling disukai, dan jumlah promo yang sedang terbuka. Tidak ada nama, telepon, tiket, atau baris per customer. Hari yang sudah ditutup dihitung dari riwayat sesi; hari berjalan dihitung dari tiket dan penjualan langsung.
