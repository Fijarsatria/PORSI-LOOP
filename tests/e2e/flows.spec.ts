import { test, expect, type Page } from '@playwright/test';

async function reset(page: Page) {
  const auth = await page.request.post('/api/auth', { data: { role: 'admin', demo: true }, headers: { Origin: 'http://127.0.0.1:3100' } });
  expect(auth.ok()).toBeTruthy();
  const result = await page.request.post('/api/actions', { data: { type: 'reset_demo' }, headers: { Origin: 'http://127.0.0.1:3100' } });
  expect(result.ok()).toBeTruthy();
  await page.context().clearCookies();
}

async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
}

test.beforeEach(async ({ page }) => { await reset(page); });

test('landing and role-specific login remain usable at mobile and desktop sizes', async ({ page }, info) => {
  await page.goto('/');
  await expect(page.locator('h1')).toBeVisible();
  await noOverflow(page);
  await page.screenshot({ path: info.outputPath('landing.png'), fullPage: true });
  await page.goto('/masuk');
  await expect(page.getByRole('button', { name: 'Mahasiswa', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Pemilik gerai', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /Masuk sebagai pengelola/ })).toHaveCount(0);
  await noOverflow(page);
  await page.screenshot({ path: info.outputPath('login.png'), fullPage: true });
});

test('student can order, inspect a ticket, and dismiss the dialog using Escape', async ({ page }, info) => {
  await page.goto('/masuk');
  await page.getByRole('button', { name: 'Masuk sebagai mahasiswa' }).click();
  await expect(page).toHaveURL(/\/mahasiswa$/);
  await page.getByRole('button', { name: 'Pilih porsi' }).click();
  const checkout = page.getByRole('dialog', { name: 'Rencanakan makan siangmu' });
  await expect(checkout).toBeVisible();
  await checkout.getByRole('button', { name: 'Konfirmasi pesanan' }).click();
  await expect(checkout).not.toBeVisible();
  await page.goto('/mahasiswa?tab=orders');
  await page.getByRole('button', { name: 'Lihat tiket' }).click();
  await expect(page.getByRole('dialog', { name: 'Tiket pengambilan' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Tiket pengambilan' })).not.toBeVisible();
  await noOverflow(page);
  await page.screenshot({ path: info.outputPath('student-orders.png'), fullPage: true });
});

test('lost action responses reuse the same idempotency key on retry', async ({ page }) => {
  await page.goto('/masuk');
  await page.getByRole('button', { name: 'Masuk sebagai mahasiswa' }).click();
  await expect(page).toHaveURL(/\/mahasiswa$/);
  await page.getByRole('button', { name: 'Pilih porsi' }).click();
  const keys: string[] = [];
  await page.route('**/api/actions', async route => {
    keys.push(route.request().postDataJSON().idempotencyKey);
    if (keys.length === 1) { await route.fetch(); await route.abort('failed'); }
    else await route.continue();
  });
  const button = page.getByRole('button', { name: 'Konfirmasi pesanan' });
  await button.click();
  await expect(button).toBeEnabled();
  await button.click();
  await expect(page.getByRole('dialog', { name: 'Rencanakan makan siangmu' })).not.toBeVisible();
  expect(keys).toHaveLength(2);
  expect(keys[0]).toBe(keys[1]);
  const response = await page.request.get('/api/state');
  expect((await response.json()).orders).toHaveLength(1);
});

test('seller and manager open distinct workspaces with reduced motion', async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/masuk?peran=gerai');
  await page.getByRole('button', { name: 'Masuk sebagai pemilik gerai' }).click();
  await expect(page).toHaveURL(/\/gerai$/);
  await expect(page.locator('main h1')).toBeVisible();
  await noOverflow(page);
  await page.screenshot({ path: info.outputPath('seller.png'), fullPage: true });
  await page.goto('/gerai?tab=planning');
  await expect(page.getByRole('button', { name: /Terima saran/ })).toBeVisible();
  await noOverflow(page);
  await page.goto('/akses-pengelola');
  await page.getByRole('button', { name: 'Masuk sebagai pengelola' }).click();
  await expect(page).toHaveURL(/\/pengelola$/);
  await expect(page.locator('main h1')).toHaveText('Kantin yang terus belajar.');
  await page.goto('/pengelola?tab=ledger');
  await expect(page.getByRole('heading', { name: 'Pergerakan stok fisik' })).toBeVisible();
  await noOverflow(page);
  await page.screenshot({ path: info.outputPath('manager-ledger.png'), fullPage: true });
});
