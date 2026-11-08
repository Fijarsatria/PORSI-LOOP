const mode = process.env.PORSI_MODE ?? 'demo';
const errors = [];
if (Number(process.versions.node.split('.')[0]) < 22 || (Number(process.versions.node.split('.')[0]) === 22 && Number(process.versions.node.split('.')[1]) < 13)) errors.push('Gunakan Node.js 22.13 atau lebih baru.');
if (!['demo', 'supabase'].includes(mode)) errors.push('PORSI_MODE harus demo atau supabase.');
if (mode === 'supabase') {
  for (const key of ['SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'SESSION_SECRET', 'APP_ORIGIN']) {
    if (!process.env[key]) errors.push(`${key} belum diisi.`);
  }
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length < 32) errors.push('SESSION_SECRET minimal 32 karakter acak.');
  for (const key of ['SUPABASE_URL', 'APP_ORIGIN']) {
    if (!process.env[key]) continue;
    try {
      const url = new URL(process.env[key]);
      if (!['http:', 'https:'].includes(url.protocol)) errors.push(`${key} harus URL HTTP(S).`);
      if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') errors.push(`${key} harus HTTPS di produksi.`);
    } catch { errors.push(`${key} bukan URL yang valid.`); }
  }
  if (process.env.NODE_ENV === 'production' && process.env.PORSI_COOKIE_INSECURE === 'true') errors.push('Nonaktifkan PORSI_COOKIE_INSECURE pada layanan nyata.');
}
if (errors.length) {
  console.error(errors.map(error => `- ${error}`).join('\n'));
  process.exitCode = 1;
} else console.log(`Konfigurasi ${mode} valid secara lokal. Koneksi cloud tetap perlu diverifikasi terhadap proyek tujuan.`);
