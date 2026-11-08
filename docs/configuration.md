# Konfigurasi aplikasi

Buat `.env.local` hanya pada perangkat pengembangan, atau isi variabel di pengaturan secrets hosting. Seluruh `.env*` diabaikan Git. Jangan menaruh kunci asli pada dokumentasi, issue, screenshot, atau variabel `NEXT_PUBLIC_`.

| Variabel                                      | Kegunaan                                                                                                             |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `PORSI_OWNER_USER_ID`                         | UUID akun Supabase Auth pengelola pertama yang dibuat administrator; jangan mengikat hak pengelola ke alamat email   |
| `PORSI_MODE`                                  | `demo` (bawaan) atau `supabase`                                                                                      |
| `APP_ORIGIN`                                  | Origin situs, misalnya `http://localhost:3000` saat lokal; HTTPS di produksi                                         |
| `PORSI_DATA_DIR`                              | Direktori SQLite persisten untuk demo                                                                                |
| `PORSI_SAMPLE_DATA`                           | `off` memulai demo dari fixture polos tanpa riwayat contoh; dipakai server pengujian                                 |
| `DEMO_ADMIN_EMAIL`, `DEMO_ADMIN_PASSWORD`     | Akun pengelola pada hosting demo                                                                                     |
| `DEMO_SELLER_EMAIL`, `DEMO_SELLER_PASSWORD`   | Akun penjual pada hosting demo                                                                                       |
| `DEMO_STUDENT_EMAIL`, `DEMO_STUDENT_PASSWORD` | Akun customer contoh opsional pada demo                                                                              |
| `SUPABASE_URL`                                | URL proyek Supabase tujuan                                                                                           |
| `SUPABASE_PUBLISHABLE_KEY`                    | Kunci publishable proyek                                                                                             |
| `SUPABASE_SECRET_KEY`                         | Secret key server privat; jangan pernah dikirim ke browser. Variabel lama `SUPABASE_SERVICE_ROLE_KEY` tetap didukung |
| `SESSION_SECRET`                              | Secret acak kriptografis minimal 32 karakter untuk mengenkripsi sesi                                                 |

Untuk pengembangan demo, konfigurasi tambahan tidak diperlukan. Untuk cloud, isi lima variabel Supabase/session/origin serta `PORSI_MODE=supabase`, lalu jalankan `npm run check:config`. Pemeriksaan ini tidak menguji koneksi database; gunakan juga [verifikasi database](../supabase/README.md).

`PORSI_COOKIE_INSECURE=true` hanya untuk pengujian build produksi melalui HTTP loopback; jangan dipakai pada hosting publik. Kredensial demo pengembangan tercantum di README dan bukan kredensial Supabase.
