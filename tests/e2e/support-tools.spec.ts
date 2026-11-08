import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const headers = { Origin: 'http://127.0.0.1:3100' };
let adminCookie = '';
test.beforeEach(async ({ page }) => {
  if (!adminCookie) {
    const res = await page.request.post('/api/auth', {
      headers,
      data: {
        role: 'admin',
        demo: true,
        email: 'admin@porsiloop.local',
        password: 'PorsiAdmin2026!',
      },
    });
    adminCookie = res.headers()['set-cookie'].split(';')[0];
  }
  expect(
    (
      await page.request.post('/api/actions', {
        headers: { ...headers, Cookie: adminCookie },
        data: { type: 'reset_demo' },
      })
    ).ok(),
  ).toBeTruthy();
  await page.context().clearCookies();
});
test('photos, manual sales, daily history, clear planning and inline promotions work', async ({
  page,
}, info) => {
  await page.goto('/masuk/gerai');
  await expect(
    page.getByRole('heading', { name: /Kelola dapur/ }),
  ).toBeVisible();
  await page.getByLabel('Alamat email').fill('seller@porsiloop.local');
  await page.getByLabel('Kata sandi', { exact: true }).fill('PorsiSeller2026!');
  await page.getByRole('button', { name: 'Masuk', exact: true }).click();
  await expect(page.locator('.role-seller')).toBeVisible();
  await page
    .getByRole('button', { name: /Penjualan langsung Catat pembelian/ })
    .click();
  const manual = page.getByRole('dialog', { name: 'Catat penjualan langsung' });
  await manual.getByLabel('Harga per porsi (Rp)').fill('17500');
  await manual
    .getByLabel('Nomor meja / posisi duduk (opsional)')
    .fill('Meja 7');
  await manual
    .getByRole('button', { name: 'Catat penjualan', exact: true })
    .click();
  await expect(manual).not.toBeVisible();
  await expect(page.locator('.sales-history')).toContainText('Rp');
  const dates = page.getByLabel('Tanggal penjualan');
  await dates.selectOption({ index: 1 });
  await expect(page.locator('.sales-history')).toContainText(
    'Riwayat mengikuti',
  );
  await page.goto('/gerai?tab=menu');
  await page
    .locator('.seller-menu-card')
    .first()
    .getByRole('button', { name: 'Edit', exact: true })
    .click();
  const edit = page.getByRole('dialog', { name: 'Edit menu' });
  const { PNG } = require('pngjs');
  const png = new PNG({ width: 10, height: 10 });
  png.data.fill(255);
  await edit.locator('input[type=file]').setInputFiles({
    name: 'menu.png',
    mimeType: 'image/png',
    buffer: PNG.sync.write(png),
  });
  await expect(edit.getByAltText('Pratinjau foto menu')).toHaveAttribute(
    'src',
    /^data:image\/webp/,
  );
  await edit.getByRole('button', { name: 'Simpan menu', exact: true }).click();
  await expect(edit).not.toBeVisible();
  await expect(page.locator('.seller-menu-card img').first()).toHaveAttribute(
    'src',
    /^data:image\/webp/,
  );
  await page.getByRole('button', { name: 'Atur Promo Terbatas' }).click();
  const promo = page.getByRole('dialog', {
    name: 'Promo Terbatas',
    exact: true,
  });
  const beforePromos = await promo.locator('.promo-live').count();
  await promo
    .getByLabel('Informasi untuk customer')
    .fill('Dimasak hari ini, disimpan tertutup, sambal terpisah.');
  await promo.getByRole('checkbox').check();
  await promo.getByRole('button', { name: 'Terbitkan promo' }).click();
  await expect(promo.locator('.promo-live')).toHaveCount(beforePromos + 1);
  await page.screenshot({ path: info.outputPath('simple-promo.png') });
  await promo
    .getByRole('button', { name: 'Hentikan', exact: true })
    .last()
    .click();
  await expect(promo.locator('.promo-live')).toHaveCount(beforePromos);
  await promo.getByRole('button', { name: 'Tutup dialog' }).click();
  await page.goto('/gerai?tab=planning');
  await expect(page.locator('main')).not.toContainText(/baseline/i);
  await page
    .getByRole('button', { name: 'Keluar dari akun', exact: true })
    .first()
    .click();
  await expect(
    page.getByRole('link', { name: /Masuk sebagai pemilik gerai/ }),
  ).toBeVisible();
});
test('guest and seller exchange order messages in a panel clear of navigation', async ({
  page,
}, info) => {
  await page.goto('/customer');
  await page.getByTestId('menu-order-button').first().click();
  const checkout = page.getByRole('dialog', { name: 'Pilihanmu, porsi pasmu' });
  await checkout.getByLabel('Nama pemesan').fill('Pembeli chat');
  await checkout
    .getByLabel('Nomor telepon', { exact: true })
    .fill('081234567890');
  await checkout
    .getByRole('button', { name: 'Bayar di gerai', exact: true })
    .click();
  await checkout.getByRole('button', { name: 'Buat pesanan' }).click();
  await page
    .getByRole('dialog', { name: 'Status pesananmu' })
    .getByRole('button', { name: 'Tutup dialog' })
    .click();
  await page.getByRole('button', { name: 'Buka chat pesanan' }).click();
  let chat = page.getByRole('dialog', { name: 'Chat pesanan' });
  await expect(chat.locator('.chat-thread').first()).toHaveCSS(
    'border-radius',
    '20px',
  );
  await expect(chat).toHaveCSS('opacity', '1');
  await page.screenshot({ path: info.outputPath('chat-list-refined.png') });
  await chat.locator('.chat-list>button').first().click();
  await chat
    .getByLabel('Pesan untuk gerai')
    .fill('Tolong sambalnya dipisah ya.');
  await chat.getByRole('button', { name: 'Kirim pesan' }).click();
  await expect(chat.locator('.chat-bubble')).toContainText([
    'Tolong sambalnya dipisah ya.',
  ]);
  const axe = await new AxeBuilder({ page })
    .include('.order-chat')
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();
  expect(axe.violations).toEqual([]);
  if ((page.viewportSize()?.width ?? 1440) < 1000) {
    const panel = await chat.boundingBox();
    const nav = await page
      .getByRole('navigation', { name: 'Navigasi seluler' })
      .boundingBox();
    expect(panel!.y + panel!.height).toBeLessThan(nav!.y);
  }
  await page.screenshot({ path: info.outputPath('customer-order-chat.png') });
  await page.goto('/masuk/gerai');
  await page.getByLabel('Alamat email').fill('seller@porsiloop.local');
  await page.getByLabel('Kata sandi', { exact: true }).fill('PorsiSeller2026!');
  await page.getByRole('button', { name: 'Masuk', exact: true }).click();
  await page.getByRole('button', { name: 'Buka chat pesanan' }).click();
  chat = page.getByRole('dialog', { name: 'Chat pesanan' });
  await chat
    .locator('.chat-list>button')
    .filter({ hasText: 'Tolong sambalnya dipisah ya.' })
    .click();
  await chat
    .getByLabel('Pesan untuk customer')
    .fill('Baik, sambal kami pisahkan.');
  await chat.getByRole('button', { name: 'Kirim pesan' }).click();
  await expect(chat.locator('.chat-bubble')).toHaveCount(2);
  await page.goto('/customer');
  await page.getByRole('button', { name: 'Buka chat pesanan' }).click();
  chat = page.getByRole('dialog', { name: 'Chat pesanan' });
  await chat.locator('.chat-list>button').first().click();
  await expect(chat).toContainText('Baik, sambal kami pisahkan.');
  await page.keyboard.press('Escape');
  await expect(chat).not.toBeVisible();
  await page.goto('/');
  if ((page.viewportSize()?.width ?? 1440) < 1000) {
    await page.getByRole('button', { name: 'Buka menu', exact: true }).click();
    await expect(
      page.getByRole('link', { name: 'Akses pengelola kantin' }),
    ).toBeVisible();
  }
  await page.goto('/masuk');
  await expect(page.locator('.auth-role-switch')).toHaveCount(0);
  await expect(
    page.getByRole('heading', { name: 'Mau makan apa hari ini?' }),
  ).toBeVisible();
});
