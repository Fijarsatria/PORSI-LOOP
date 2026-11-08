import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import jsQR from 'jsqr';

const origin = 'http://127.0.0.1:3100';
const headers = { Origin: origin };
let adminCookie = '';
async function login(page: Page, role: 'seller' | 'admin') {
  await page.goto(role === 'admin' ? '/akses-pengelola' : '/masuk?peran=gerai');
  await page.getByLabel('Alamat email').fill(`${role}@porsiloop.local`);
  await page
    .getByLabel('Kata sandi', { exact: true })
    .fill(role === 'admin' ? 'PorsiAdmin2026!' : 'PorsiSeller2026!');
  await page.getByRole('button', { name: 'Masuk', exact: true }).click();
  await expect(page).toHaveURL(role === 'admin' ? /\/pengelola$/ : /\/gerai$/);
}
async function noOverflow(page: Page) {
  const size = await page.evaluate(() => ({
    width: innerWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(size.content).toBeLessThanOrEqual(size.width);
}
test.beforeEach(async ({ page }) => {
  if (adminCookie) {
    expect(
      (
        await page.request.post('/api/actions', {
          headers: { ...headers, Cookie: adminCookie },
          data: { type: 'reset_demo' },
        })
      ).ok(),
    ).toBeTruthy();
    await page.context().clearCookies();
    return;
  }
  const auth = await page.request.post('/api/auth', {
    headers,
    data: {
      role: 'admin',
      demo: true,
      email: 'admin@porsiloop.local',
      password: 'PorsiAdmin2026!',
    },
  });
  expect(auth.ok()).toBeTruthy();
  adminCookie = auth.headers()['set-cookie'].split(';')[0];
  expect(
    (
      await page.request.post('/api/actions', {
        headers,
        data: { type: 'reset_demo' },
      })
    ).ok(),
  ).toBeTruthy();
  await page.context().clearCookies();
});

test('guest catalogue, search, optional login and restricted staff access reflow', async ({
  page,
}, info) => {
  await page.goto('/customer');
  await expect(page.getByTestId('menu-card')).toHaveCount(18);
  const state = await (await page.request.get('/api/state')).json();
  expect(state.user.isGuest).toBe(true);
  expect(state.outlets).toHaveLength(6);
  await noOverflow(page);
  await page.screenshot({
    path: info.outputPath('student-marketplace.png'),
    fullPage: true,
  });
  await page.screenshot({
    path: info.outputPath('student-marketplace-viewport.png'),
  });
  await page.getByLabel('Cari menu atau gerai').fill('rendang');
  await expect(page.getByTestId('menu-card')).toHaveCount(1);
  await expect(page.getByTestId('menu-card')).toContainText('Nasi rendang');
  await page.getByRole('button', { name: 'Hapus pencarian' }).click();
  await page
    .getByRole('button', { name: 'Dapur Bu Ratna', exact: true })
    .click();
  await expect(page.getByTestId('menu-card')).toHaveCount(3);
  const anonymous = await page.request.post('/api/auth', {
    headers,
    data: { role: 'admin', demo: true },
  });
  expect(anonymous.status()).toBe(401);
  await page.goto('/gerai');
  await expect(
    page.getByRole('heading', { name: /peran berbeda/ }),
  ).toBeVisible();
  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/customer');
    await expect(page.getByTestId('menu-card')).toHaveCount(18);
    await noOverflow(page);
    await page.goto('/masuk');
    await expect(
      page.getByRole('link', { name: 'Langsung pilih menu' }),
    ).toBeVisible();
    await noOverflow(page);
  }
});

test('guest payment, real QR, seller preparation, notifications and one-time handover', async ({
  page,
  browser,
}, info) => {
  await page.goto('/customer');
  await page.getByTestId('menu-order-button').first().click();
  const checkout = page.getByRole('dialog', { name: 'Pilihanmu, porsi pasmu' });
  await expect(checkout).toBeVisible();
  await checkout.getByLabel('Nama pemesan').fill('Ayu Uji');
  await checkout.getByRole('button', { name: /^Pick up/ }).click();
  await checkout.getByRole('button', { name: 'Lanjut pembayaran' }).click();
  await page
    .getByRole('button', { name: 'Simulasikan pembayaran berhasil' })
    .click();
  const ticket = page.getByRole('dialog', { name: 'Status pesananmu' });
  await expect(ticket).toBeVisible();
  const snapshot = await (await page.request.get('/api/state')).json();
  const order = snapshot.orders.find(
    (item: { customer: string }) => item.customer === 'Ayu Uji',
  );
  expect(order.paymentStatus).toBe('paid');
  expect(order.pickupToken.length).toBeGreaterThanOrEqual(40);
  const qr = ticket.locator('img[src^="data:image/png"]');
  await expect(qr).toBeVisible();
  const encoded = await qr.getAttribute('src');
  const { PNG } = require('pngjs');
  const png = PNG.sync.read(Buffer.from(encoded!.split(',')[1], 'base64'));
  expect(
    jsQR(new Uint8ClampedArray(png.data), png.width, png.height)?.data,
  ).toBe(order.pickupToken);
  await page.screenshot({
    path: info.outputPath('paid-ticket.png'),
    fullPage: true,
  });
  const sellerContext = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  const seller = await sellerContext.newPage();
  await login(seller, 'seller');
  await seller.goto('/gerai?tab=orders');
  const row = seller
    .locator('.seller-order-card')
    .filter({ hasText: order.code });
  await row.getByRole('button', { name: 'Mulai siapkan' }).click();
  await expect(
    ticket.getByRole('heading', { name: 'Sedang disiapkan di dapur' }),
  ).toBeVisible({ timeout: 10000 });
  await seller.getByRole('button', { name: /^Diproses/ }).click();
  await row.getByRole('button', { name: 'Tandai siap' }).click();
  await expect(
    ticket.getByRole('heading', { name: 'Pesananmu sudah siap!' }),
  ).toBeVisible({ timeout: 10000 });
  await seller.goto('/gerai?tab=scan');
  await seller.getByRole('button', { name: 'Scan QR', exact: true }).click();
  const scanner = seller.getByRole('dialog', {
    name: 'Verifikasi pengambilan',
  });
  await scanner.getByLabel('Token QR pengambilan').fill(order.pickupToken);
  await scanner.getByRole('button', { name: 'Verifikasi & serahkan' }).click();
  await expect(scanner).not.toBeVisible();
  await expect(ticket).toContainText(
    /Sudah diambil|Selamat menikmati|Pesanan selesai/,
    { timeout: 10000 },
  );
  const duplicate = await seller.request.post('/api/actions', {
    headers,
    data: { type: 'scan_pickup', token: order.pickupToken },
  });
  expect(duplicate.ok()).toBe(false);
  await seller.screenshot({
    path: info.outputPath('seller-orders.png'),
    fullPage: true,
  });
  await sellerContext.close();
});

test('dialog error, keyboard focus, accessibility and reduced motion remain usable', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/customer');
  const trigger = page.getByTestId('menu-order-button').first();
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Pilihanmu, porsi pasmu' });
  await dialog.getByLabel('Nama pemesan').fill('Uji Error');
  const accessibility = await new AxeBuilder({ page })
    .include('dialog[open]')
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();
  expect(accessibility.violations).toEqual([]);
  await page.route('**/api/actions', (route) =>
    route.fulfill({
      status: 409,
      contentType: 'application/json',
      body: JSON.stringify({
        error: 'Kuota baru saja habis. Pilih menu lain.',
      }),
    }),
  );
  await dialog.getByRole('button', { name: 'Lanjut pembayaran' }).click();
  await expect(dialog.getByRole('alert')).toContainText(
    'Kuota baru saja habis',
  );
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
});

test('seller menu planning and administrator outlet traffic remain separate', async ({
  page,
}, info) => {
  await login(page, 'seller');
  await page.goto('/gerai?tab=planning');
  await expect(
    page.getByRole('button', { name: /Terima saran/ }),
  ).toBeVisible();
  await noOverflow(page);
  await page.screenshot({
    path: info.outputPath('seller-planning.png'),
    fullPage: true,
  });
  await login(page, 'admin');
  await expect(page.locator('main h1')).toBeVisible();
  const state = await (await page.request.get('/api/state')).json();
  expect(state.orders).toEqual([]);
  expect(state.outlets).toHaveLength(6);
  await noOverflow(page);
  await page.screenshot({
    path: info.outputPath('admin-overview.png'),
    fullPage: true,
  });
  await page.goto('/pengelola?tab=ledger');
  await expect(
    page.getByRole('heading', { name: 'Pergerakan stok fisik' }),
  ).toBeVisible();
  await noOverflow(page);
});

test('scheduled Pick up remains orderable after immediate cooked stock is exhausted', async ({
  page,
}) => {
  expect(
    (
      await page.request.post('/api/auth', {
        headers,
        data: {
          role: 'seller',
          demo: true,
          email: 'seller@porsiloop.local',
          password: 'PorsiSeller2026!',
        },
      })
    ).ok(),
  ).toBeTruthy();
  const sellerState = await (await page.request.get('/api/state')).json();
  const remaining = sellerState.menus.find(
    (menu: { id: string }) => menu.id === 'menu-ayam',
  ).availableStock;
  expect(remaining).toBeGreaterThan(0);
  expect(
    (
      await page.request.post('/api/actions', {
        headers,
        data: {
          type: 'record_walkin',
          menuId: 'menu-ayam',
          quantity: remaining,
        },
      })
    ).ok(),
  ).toBeTruthy();
  await page.request.delete('/api/auth', { headers });
  await page.goto('/customer');
  const card = page.getByTestId('menu-card').filter({
    has: page.getByRole('heading', { name: 'Nasi ayam rempah', exact: true }),
  });
  await expect(
    card.getByRole('button', { name: 'Pesan', exact: true }),
  ).toBeEnabled();
  await card.getByRole('button', { name: 'Pesan', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Pilihanmu, porsi pasmu' });
  await expect(dialog.getByRole('button', { name: /^Dine in/ })).toBeDisabled();
  await expect(dialog.getByLabel('Waktu ambil')).toHaveValue(/^slot-/);
  await dialog.getByLabel('Nama pemesan').fill('Uji Jadwal');
  await dialog.getByRole('button', { name: 'Lanjut pembayaran' }).click();
  await expect(
    page.getByRole('dialog', { name: 'Selesaikan pembayaran' }),
  ).toBeVisible();
  const state = await (await page.request.get('/api/state')).json();
  expect(state.orders[0].slotId).toMatch(/^slot-/);
  expect(state.orders[0].fulfillment).toBe('pick_up');
});

test('Promo Terbatas cash waits for seller verification before issuing the buyer QR', async ({
  page,
  browser,
}) => {
  await page.goto('/customer?tab=rescue');
  await page
    .getByRole('button', { name: /^Pesan promo/ })
    .first()
    .click();
  const checkout = page.getByRole('dialog', { name: 'Pesan Promo Terbatas' });
  await checkout.getByLabel('Nama pemesan').fill('Uji Promo Tunai');
  await checkout
    .getByRole('button', { name: 'Bayar di gerai', exact: true })
    .click();
  await checkout.getByRole('button', { name: 'Buat pesanan' }).click();
  const ticket = page.getByRole('dialog', { name: 'Status pesananmu' });
  await expect(ticket).toContainText('Menunggu verifikasi pembayaran');
  await expect(ticket.getByTestId('pickup-qr')).toHaveCount(0);
  const state = await (await page.request.get('/api/state')).json();
  const claim = state.claims[0];
  expect(claim.paymentStatus).toBe('pending');
  expect(claim.pickupToken).toBeUndefined();
  const staff = await browser.newContext();
  expect(
    (
      await staff.request.post(`${origin}/api/auth`, {
        headers,
        data: {
          role: 'seller',
          demo: true,
          email: 'seller@porsiloop.local',
          password: 'PorsiSeller2026!',
        },
      })
    ).ok(),
  ).toBeTruthy();
  expect(
    (
      await staff.request.post(`${origin}/api/actions`, {
        headers,
        data: { type: 'verify_cash_payment', claimId: claim.id },
      })
    ).ok(),
  ).toBeTruthy();
  await expect(ticket.getByTestId('pickup-qr')).toBeVisible({ timeout: 10000 });
  const paid = await (await page.request.get('/api/state')).json();
  const token = paid.claims[0].pickupToken;
  for (const type of ['prepare_order', 'ready_order'])
    expect(
      (
        await staff.request.post(`${origin}/api/actions`, {
          headers,
          data: { type, claimId: claim.id },
        })
      ).ok(),
    ).toBeTruthy();
  expect(
    (
      await staff.request.post(`${origin}/api/actions`, {
        headers,
        data: { type: 'scan_pickup', token },
      })
    ).ok(),
  ).toBeTruthy();
  await expect(
    ticket.getByRole('heading', { name: 'Selamat menikmati!' }),
  ).toBeVisible({ timeout: 10000 });
  await staff.close();
});

test('scroll returns after checkout switches to a ticket and navigation returns home', async ({
  page,
}) => {
  await page.goto('/customer');
  await page.getByTestId('menu-order-button').first().click();
  const checkout = page.getByRole('dialog', { name: 'Pilihanmu, porsi pasmu' });
  await checkout.getByLabel('Nama pemesan').fill('Uji Gulir');
  await checkout.getByRole('button', { name: 'Lanjut pembayaran' }).click();
  const ticket = page.getByRole('dialog', { name: 'Selesaikan pembayaran' });
  await expect(ticket).toBeVisible();
  await expect(page.locator('dialog[open]')).toHaveCount(1);
  await ticket
    .getByRole('button', { name: 'Batalkan pesanan', exact: true })
    .click();
  const cancellation = page.getByRole('dialog', {
    name: 'Batalkan pesanan ini?',
  });
  await expect(cancellation).toBeVisible();
  await expect(page.locator('dialog[open]')).toHaveCount(2);
  await page.keyboard.press('Escape');
  await expect(page.locator('dialog[open]')).toHaveCount(1);
  await expect(ticket).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => getComputedStyle(document.body).overflow))
    .toBe('hidden');
  await page.keyboard.press('Escape');
  await expect(page.locator('dialog[open]')).toHaveCount(0);
  await expect
    .poll(() => page.evaluate(() => getComputedStyle(document.body).overflow))
    .not.toBe('hidden');
  await page.getByRole('link', { name: 'PORSI LOOP, beranda' }).first().click();
  await expect(page).toHaveURL(/\/#top$/);
  await expect(page.locator('main h1')).toBeVisible();
  await page.locator('main h1').scrollIntoViewIfNeeded();
  await page.locator('main h1').hover();
  const before = await page.evaluate(() => scrollY);
  await page.mouse.wheel(0, 600);
  await expect
    .poll(() => page.evaluate(() => scrollY))
    .toBeGreaterThan(before + 100);
});

test('home links return to the top from student, seller, manager and landing sections', async ({
  page,
}) => {
  const home = () =>
    page
      .getByRole('link', { name: 'PORSI LOOP, beranda' })
      .filter({ visible: true })
      .first();
  const checkHome = async () => {
    await expect(home()).toHaveAttribute('href', '/#top');
    await home().click();
    await expect(page).toHaveURL(/\/#top$/);
    await expect.poll(() => page.evaluate(() => scrollY)).toBeLessThan(2);
  };
  await page.goto('/#cara-kerja');
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(100);
  await checkHome();
  await page.goto('/customer');
  await page.getByTestId('menu-card').last().scrollIntoViewIfNeeded();
  await checkHome();
  await login(page, 'seller');
  await page.goto('/gerai?tab=planning');
  await page
    .getByRole('button', { name: /Terima saran/ })
    .scrollIntoViewIfNeeded();
  await checkHome();
  await login(page, 'admin');
  await checkHome();
});

test('canteen manager monitors sales and receipts across outlets with a private financial report', async ({
  page,
}, info) => {
  await login(page, 'admin');
  await page.goto('/pengelola?tab=finance');
  await expect(
    page.getByRole('heading', {
      name: 'Penjualan & pemasukan kantin',
      exact: true,
    }),
  ).toBeVisible();
  const state = await (await page.request.get('/api/state')).json();
  expect(state.orders).toEqual([]);
  expect(state.finance.outlets).toHaveLength(6);
  const money = (amount: number) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(amount);
  await expect(page.getByTestId('finance-net-payments')).toHaveText(
    money(state.finance.netPayments),
  );
  await expect(page.getByTestId('finance-gross-sales')).toHaveText(
    money(state.finance.grossSales),
  );
  await expect(page.getByTestId('finance-outlet-row')).toHaveCount(6);
  await noOverflow(page);
  await page.screenshot({
    path: info.outputPath('manager-finance.png'),
    fullPage: true,
  });
  await page
    .getByLabel('Gerai yang ditampilkan')
    .selectOption('outlet-bu-ratna');
  await expect(page.getByTestId('finance-outlet-row')).toHaveCount(1);
  const outlet = state.finance.outlets.find(
    (row: { outletId: string }) => row.outletId === 'outlet-bu-ratna',
  );
  await expect(page.getByTestId('finance-net-payments')).toHaveText(
    money(outlet.netPayments),
  );
  await noOverflow(page);
});

test('seller credentials allow editing menu information, price and availability', async ({
  page,
}) => {
  await login(page, 'seller');
  await page.goto('/gerai?tab=menu');
  const sellerCard = page
    .locator('.seller-menu-card')
    .filter({ hasText: 'Nasi ayam rempah' });
  await sellerCard.getByRole('button', { name: 'Edit', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Edit menu' });
  await dialog
    .getByLabel('Nama makanan', { exact: true })
    .fill('Nasi ayam rempah uji');
  await dialog.getByLabel('Harga porsi reguler', { exact: true }).fill('19000');
  await dialog
    .getByRole('button', { name: 'Simpan menu', exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
  await page
    .locator('.seller-menu-card')
    .filter({ hasText: 'Nasi ayam rempah uji' })
    .getByRole('button', { name: 'Sembunyikan menu' })
    .click();
  const state = await (await page.request.get('/api/state')).json();
  const menu = state.menus.find(
    (item: { id: string }) => item.id === 'menu-ayam',
  );
  expect(menu.name).toBe('Nasi ayam rempah uji');
  expect(menu.prices.regular).toBe(19000);
  expect(menu.active).toBe(false);
  await page.request.delete('/api/auth', { headers });
  await page.goto('/customer');
  const card = page
    .getByTestId('menu-card')
    .filter({ hasText: 'Nasi ayam rempah uji' });
  await expect(
    card.getByRole('button', { name: 'Pesan', exact: true }),
  ).toBeDisabled();
});
