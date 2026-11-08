@echo off
setlocal
cd /d "%~dp0.."
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js belum tersedia. Pasang Node.js 24 LTS, lalu buka ulang file ini.
  pause
  exit /b 1
)
node -e "const [major,minor]=process.versions.node.split('.').map(Number);if(major<22 || (major===22 && minor<13))process.exit(1)"
if errorlevel 1 (
  echo Gunakan Node.js minimal 22.13. Disarankan Node.js 24 LTS.
  pause
  exit /b 1
)
if not exist "node_modules\next\package.json" (
  echo Menyiapkan dependensi untuk pemakaian pertama...
  call npm ci
  if errorlevel 1 (
    echo Pemasangan belum berhasil. Periksa koneksi internet dan coba lagi.
    pause
    exit /b 1
  )
)
echo.
echo PORSI LOOP - server lokal
echo Buka http://localhost:3000/customer setelah server siap.
echo Mode bawaan adalah demo dengan data lokal yang tersimpan.
echo Tutup dengan Ctrl+C. Jika port 3000 sudah dipakai, ikuti alamat yang ditampilkan Next.js.
echo.
call npm run dev
if errorlevel 1 pause
endlocal
