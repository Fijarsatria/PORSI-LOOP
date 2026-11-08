# Cakupan produk dan batas MVP

Sumber kebutuhan: proposal Trinity LFA dan PRD PORSI LOOP. Implementasi ini berfokus pada satu gerai dan satu menu per sesi.

| Kebutuhan        | Implementasi                                                                             | Batas yang tetap perlu diperhatikan                                              |
| ---------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Tiga peran       | Mahasiswa, gerai, pengelola dengan akses server yang berbeda                             | Akses pengelola terpisah dari login publik                                       |
| Pre-order        | Porsi, kuota slot dan sesi, cutoff, pembatalan, pickup code                              | Pembayaran di gerai; belum ada payment gateway                                   |
| Perencanaan      | Pre-order + histori walk-in terpisah/baseline manual + buffer; override dengan alasan    | Aturan transparan, bukan model ML atau jaminan akurasi                           |
| Stok & rescue    | Produksi aktual, walk-in, cadangan, expiry, pemeriksaan gerai, pickup dan ledger numerik | Timer bukan jaminan keamanan pangan; SOP lapangan tetap diperlukan               |
| Penutupan sesi   | Persamaan stok, status belum lengkap/lengkap, histori, sesi berikutnya                   | Stok akhir tidak otomatis dipindahkan menjadi produksi baru                      |
| Jejak audit      | Ledger tetap tersimpan lintas sesi dan dapat dipilih dari panel pengelola                | Reservasi tidak dihitung sebagai pickup                                          |
| Dampak           | Outcome operasional, penerimaan rescue, berat limbah dan waste intensity terpisah        | Manfaat bersih memerlukan baseline serta biaya; pengurangan emisi tidak dikarang |
| Ketahanan proses | Transaksi atomik lokal, compare-and-swap cloud, idempotensi dan session revocation       | Adapter Supabase tetap memerlukan pengujian pada proyek tim                      |
| UX               | Feedback klik, transisi halaman/tab/dialog, error dalam form, fokus dan reduced motion   | Tes otomatis membantu; evaluasi usability lapangan tetap diperlukan              |

## Demo yang dapat dibuka

Demo privat yang ditautkan pada README memakai data sintetis dan penyimpanan server persisten. Pemilihan mahasiswa/gerai/pengelola di dalam demo adalah simulasi peran, bukan penerbitan hak akses produksi. Situs privat memerlukan akun pemilik yang memiliki akses.

## Sebelum layanan nyata

- Akun Supabase terhubung belum menampilkan proyek tim; skema cloud belum dipasang atau diuji terhadap proyek nyata.
- Backend MVP saat ini menyimpan satu dokumen transaksi terversi untuk satu gerai. Model relasional organisasi/gerai dan kebijakan RLS lintas gerai pada PRD belum menjadi implementasi multi-tenant penuh. Jangan memakai satu dokumen ini sebagai bukti keamanan multi-gerai.
- Klaim pengurangan waste, manfaat ekonomi bersih, dan keberhasilan pilot membutuhkan baseline, biaya, metode timbang, serta hasil lapangan yang sebanding.

## Kebersihan repositori

Git menyimpan sumber aplikasi, tes, lockfile, skema dan panduan penggunaan. Database, secrets, build output, file generate/editor, catatan kerja sementara, dan aset duplikat tidak disimpan sebagai sumber aktif. File yang sebelumnya terlanjur di-commit dihapus dari versi terbaru tanpa menulis ulang riwayat kolaborator.
