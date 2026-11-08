import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const origin = 'http://127.0.0.1:3100';
const headers = { Origin: origin };
let adminCookie = '';
async function login(
  page: Page,
  role: 'seller' | 'admin',
  email = `${role}@porsiloop.local`,
  password = role === 'admin' ? 'PorsiAdmin2026!' : 'PorsiSeller2026!',
) {
  await page.goto(role === 'admin' ? '/akses-pengelola' : '/masuk?peran=gerai');
  await page.getByLabel('Alamat email').fill(email);
  await page.getByLabel('Kata sandi', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Masuk', exact: true }).click();
  await expect(page).toHaveURL(role === 'admin' ? /\/pengelola$/ : /\/gerai$/);
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
test('manager creates a seller, seller adds food, shops without logout, then customer registers and rates a delivered order', async ({
  page,
}, info) => {
  test.setTimeout(120000);
  const suffix = Date.now() + info.project.name;
  const sellerEmail = `owner-${suffix}@example.test`;
  const customerEmail = `buyer-${suffix}@example.test`;
  await login(page, 'admin');
  await page.goto('/pengelola?tab=outlets');
  await page.getByRole('button', { name: 'Tambah gerai', exact: true }).click();
  const outlet = page.getByRole('dialog', {
    name: 'Tambah gerai & akun penjual',
  });
  await outlet
    .getByLabel('Nama gerai', { exact: true })
    .fill('Dapur Uji ' + suffix);
  await outlet.getByLabel('Lokasi gerai').fill('Kantin Asrama · A7');
  await outlet.getByLabel('Nama penjual').fill('Penjual uji');
  await outlet.getByLabel('Email akun penjual').fill(sellerEmail);
  await outlet
    .getByLabel('Kata sandi awal', { exact: true })
    .fill('SellerTest123!');
  await outlet
    .getByRole('button', { name: 'Buat gerai & akun', exact: true })
    .click();
  await expect(outlet).not.toBeVisible();
  await login(page, 'seller', sellerEmail, 'SellerTest123!');
  await page.goto('/gerai?tab=menu');
  await page.getByRole('button', { name: 'Tambah menu', exact: true }).click();
  const menu = page.getByRole('dialog', { name: 'Tambah menu', exact: true });
  await menu.getByLabel('Nama makanan').fill('Ayam uji ' + suffix);
  await menu
    .getByLabel('Deskripsi singkat')
    .fill('Nasi ayam matang, sayur dan sambal terpisah.');
  await menu.getByRole('button', { name: 'Simpan menu', exact: true }).click();
  await expect(menu).not.toBeVisible();
  const card = page
    .locator('.seller-menu-card')
    .filter({ hasText: 'Ayam uji ' + suffix });
  await expect(card).toContainText('0 porsi tersedia');
  await card.getByRole('button', { name: 'Stok', exact: true }).click();
  const stock = page.getByRole('dialog', { name: 'Tambah stok siap jual' });
  await stock.getByLabel('Porsi yang selesai dimasak').fill('3');
  await stock.getByRole('button', { name: 'Tambah stok', exact: true }).click();
  await expect(stock).not.toBeVisible();
  await expect(card).toContainText('3 porsi tersedia');
  await card.getByRole('button', { name: 'Edit', exact: true }).click();
  const edit = page.getByRole('dialog', { name: 'Edit menu' });
  await edit.getByLabel('Harga porsi reguler').fill('20000');
  await edit.getByRole('button', { name: 'Simpan menu' }).click();
  await expect(edit).not.toBeVisible();
  await page.goto('/customer');
  await page.getByLabel('Cari menu atau gerai').fill('Ayam uji ' + suffix);
  await page.getByTestId('menu-order-button').click();
  const checkout = page.getByRole('dialog', { name: 'Pilihanmu, porsi pasmu' });
  await checkout.getByLabel('Nama pemesan').fill('Customer uji');
  await checkout.getByLabel('Nomor telepon', {exact:true}).fill('081234567890');
  await checkout
    .getByRole('button', { name: 'Bayar di gerai', exact: true })
    .click();
  await checkout.getByRole('button', { name: 'Buat pesanan' }).click();
  await expect(
    page.getByRole('dialog', { name: 'Status pesananmu' }),
  ).toBeVisible();
  const customerState = await (
    await page.request.get('/api/state?space=customer')
  ).json();
  const order = customerState.orders[0];
  expect(customerState.user.isGuest).toBe(true);
  await page.goto('/gerai?tab=orders');
  await expect(page.locator('.app-layout.role-seller')).toBeVisible();
  const queued = page
    .locator('.seller-order-card')
    .filter({ hasText: order.code });
  await queued.getByRole('button', { name: 'Konfirmasi tunai' }).click();
  await queued.getByRole('button', { name: 'Mulai siapkan' }).click();
  await page.getByRole('button', { name: /^Diproses/ }).click();
  await queued.getByRole('button', { name: 'Tandai siap' }).click();
  await expect(queued).not.toBeVisible();
  await page.getByRole('button',{name:/^Siap diambil/}).click();
  await expect(queued).toBeVisible();
  await expect(queued).toContainText('Siap diambil');
  const ready = await (
    await page.request.get('/api/state?space=customer')
  ).json();
  const token = ready.orders.find(
    (o: { id: string }) => o.id === order.id,
  ).pickupToken;
  await page.goto('/gerai?tab=scan');
  await page.getByRole('button', { name: 'Scan QR', exact: true }).click();
  const scan = page.getByRole('dialog', { name: 'Verifikasi pengambilan' });
  await scan.getByLabel('Token QR pengambilan').fill(token);
  await scan.getByRole('button', { name: 'Verifikasi & serahkan' }).click();
  await expect(scan).not.toBeVisible();
  await page.goto('/customer?tab=orders');
  const received = page
    .getByTestId('order-card')
    .filter({ hasText: order.code });
  await expect(received).toContainText('Sudah diambil');
  await received
    .getByRole('button', { name: 'Beri rating', exact: true })
    .click();
  await page
    .getByRole('link', { name: 'Buat akun customer', exact: true })
    .click();
  await expect(page).toHaveURL(/\/daftar$/);
  await page.getByLabel('Nama panggilan').fill('Customer uji');
  await page.getByLabel('Alamat email').fill(customerEmail);
  await page.getByLabel('Kata sandi', { exact: true }).fill('CustomerTest123!');
  await page.getByRole('button', { name: 'Buat akun', exact: true }).click();
  await expect(page).toHaveURL(/\/customer$/);
  await page.goto('/customer?tab=orders');
  await page
    .getByTestId('order-card')
    .filter({ hasText: order.code })
    .getByRole('button', { name: 'Beri rating', exact: true })
    .click();
  const rating = page.getByRole('dialog', { name: 'Bagaimana makanannya?' });
  await rating.getByRole('button', { name: '4 bintang', exact: true }).click();
  await rating
    .getByLabel('Ceritakan singkat (opsional)')
    .fill('Rasa dan porsinya pas.');
  await rating
    .getByRole('button', { name: 'Simpan rating', exact: true })
    .click();
  await expect(rating).not.toBeVisible();
  await expect(
    page.getByTestId('order-card').filter({ hasText: order.code }),
  ).toContainText('4/5');
  const profile = await (
    await page.request.get('/api/state?space=customer')
  ).json();
  expect(profile.user.isGuest).toBe(false);
  const work = await (await page.request.get('/api/state?space=work')).json();
  expect(work.user.role).toBe('seller');
  await page.request.delete('/api/auth', {
    headers: { ...headers, 'X-Porsi-Space': 'customer' },
  });
  const stillWorking = await (
    await page.request.get('/api/state?space=work')
  ).json();
  expect(stillWorking.user.role).toBe('seller');
  await page.screenshot({
    path: info.outputPath('customer-rating.png'),
    fullPage: true,
  });
});

test('seller scan is the central mobile action; controls and new dashboards are accessible', async ({
  page,
}, info) => {
  await login(page, 'seller');
  await page.goto('/gerai?tab=menu');
  if ((page.viewportSize()?.width ?? 1440) < 1000) {
    const links = page
      .getByRole('navigation', { name: 'Navigasi seluler' })
      .getByRole('link');
    await expect(links.nth(2)).toHaveText('Scan QR');
    await expect(links.nth(2)).toHaveClass(/nav-scan/);
  } else
    await expect(
      page
        .getByRole('navigation', { name: 'Navigasi ruang kerja' })
        .getByRole('link', { name: 'Scan QR', exact: true }),
    ).toBeVisible();
  for (const route of [
    '/gerai',
    '/gerai?tab=menu',
    '/gerai?tab=orders',
    '/gerai?tab=planning',
    '/gerai?tab=scan',
  ]) {
    await page.goto(route);
    await expect(page.locator('main h1').first()).toBeVisible();
    const widths = await page.evaluate(() => [
      innerWidth,
      document.documentElement.scrollWidth,
    ]);
    expect(widths[1]).toBeLessThanOrEqual(widths[0]);
  }
  const axeSeller = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();
  expect(axeSeller.violations).toEqual([]);
  if ((page.viewportSize()?.width ?? 1440) < 1000) {
    const scanButton = await page
      .locator('.seller-scan-page')
      .getByRole('button', { name: 'Scan QR', exact: true })
      .boundingBox();
    const bottomNav = await page
      .getByRole('navigation', { name: 'Navigasi seluler' })
      .boundingBox();
    expect(scanButton).not.toBeNull();
    expect(bottomNav).not.toBeNull();
    expect(scanButton!.y + scanButton!.height).toBeLessThan(bottomNav!.y - 16);
  }
  await page.screenshot({
    path: info.outputPath('seller-central-scan.png'),
    fullPage: true,
  });
  await page.goto('/gerai?tab=planning');
  const picker = page.getByRole('button', { name: /Pilih menu/ });
  await picker.focus();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('listbox')).not.toBeVisible();
  await login(page, 'admin');
  const axeAdmin = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();
  expect(axeAdmin.violations).toEqual([]);
  await page.screenshot({
    path: info.outputPath('manager-infographic.png'),
    fullPage: true,
  });
  await page.goto('/masuk');
  await page.getByLabel('Kata sandi', { exact: true }).fill('PasswordSample!');
  await page
    .getByRole('button', { name: 'Tampilkan kata sandi', exact: true })
    .click();
  await expect(page.getByLabel('Kata sandi', { exact: true })).toHaveAttribute(
    'type',
    'text',
  );
  await page
    .getByRole('button', { name: 'Sembunyikan kata sandi', exact: true })
    .click();
  await expect(page.getByLabel('Kata sandi', { exact: true })).toHaveAttribute(
    'type',
    'password',
  );
});
