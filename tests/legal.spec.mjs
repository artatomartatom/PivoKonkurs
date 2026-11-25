import { test, expect } from '@playwright/test';

test.use({ reducedMotion: 'reduce' });
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('rgp_cookie_ok', '1'));
});
const names = ['Политика обработки персональных данных', 'Политика использования cookie', 'Пользовательское соглашение'];

test('правовые документы: три позиции PDF, общая оболочка и ресурсы', async ({ page }) => {
  const errors = [], missing = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('response', r => { if (r.status() >= 400 && r.url().startsWith('http://127.0.0.1:3000')) missing.push(r.url()); });
  await page.goto('/legal.html');
  await expect(page).toHaveTitle(/^Правовые документы/);
  await expect(page.locator('h1')).toHaveText('Правовые документы');
  await expect(page.locator('.page-head__lead')).toHaveText('Документы, регулирующие работу сайта.');
  await expect(page.locator('.legal-document h2')).toHaveText(names);
  await expect(page.locator('.legal-document')).toHaveCount(3);
  await expect(page.locator('.legal-document__text p')).toHaveText(names.map(() => 'PDF · Файл пока не опубликован'));
  await expect(page.locator('.legal-list')).not.toContainText(/\d+\s*КБ/);
  await expect(page.locator('.cta')).toHaveCount(0);
  await expect(page.locator('.footer__nav a[aria-current="page"]')).toHaveText('Правовые документы');
  await expect(page.locator('.seo__facts')).toContainText('50+ стилей пива');
  for (const image of await page.locator('img').all()) await image.evaluate(i => { i.loading = 'eager'; });
  await page.waitForFunction(() => [...document.images].every(i => i.complete));
  expect(await page.locator('img').evaluateAll(images => images.filter(i => !i.naturalWidth).map(i => i.src))).toEqual([]);
  expect(await page.locator('a[href^="#"]').evaluateAll(links => links.filter(l => !document.getElementById(l.hash.slice(1))).map(l => l.hash))).toEqual([]);
  expect(errors).toEqual([]); expect(missing).toEqual([]);
});

test('правовые документы: все состояния открытия, disabled-скачивание, Escape и возврат фокуса', async ({ page }) => {
  const downloads = [];
  page.on('download', d => downloads.push(d.suggestedFilename()));
  await page.goto('/legal.html');
  await expect(page.locator('.legal-notice')).toContainText('PDF-файлы пока не опубликованы');
  for (const name of names) {
    const opener = page.getByRole('button', { name: 'Открыть: ' + name, exact: true });
    await expect(page.getByRole('button', { name: 'Скачать: ' + name + ' — файл пока не опубликован', exact: true })).toBeDisabled();
    await opener.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading')).toHaveText(name);
    await expect(dialog).toContainText('Файл пока не опубликован');
    await expect(dialog.locator('a[href^="mailto:"]')).toBeVisible();
    await expect(dialog.locator('a[href^="tel:"]')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden(); await expect(opener).toBeFocused();
    await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe('');
  }
  expect(downloads).toEqual([]);
});

for (const width of [360, 390, 768, 1024, 1440]) {
  test(`правовые документы: адаптивность ${width}px, строки и диалог`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/legal.html');
    await page.evaluate(() => document.fonts.ready);
    const crumbs = await page.locator('.crumbs').boundingBox();
    const header = await page.locator('#siteHeader').boundingBox();
    expect(crumbs.y).toBeGreaterThanOrEqual(header.y + header.height);
    for (const element of await page.locator('.legal-document').all()) {
      await element.scrollIntoViewIfNeeded();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    }
    await page.locator('[data-legal-material]').first().click();
    await expect(page.getByRole('dialog')).toBeInViewport();
    await page.getByRole('button', { name: 'Закрыть', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
  });
}

test('правовые документы: переход из подвала, короткий маршрут, якорь и публикация', async ({ page }) => {
  await page.goto('/faq.html');
  await page.locator('.footer__nav').getByRole('link', { name: 'Правовые документы', exact: true }).click();
  await expect(page).toHaveURL(/legal\.html$/);
  await page.goto('/legal#cookie');
  await expect(page.locator('#cookie')).toBeFocused();
  await expect(page.locator('#cookie')).toBeInViewport();
  const tg = new URL(await page.locator('[data-share-telegram]').getAttribute('href'));
  expect(tg.searchParams.get('url')).toBe('http://127.0.0.1:3000/legal');
  expect(tg.searchParams.get('text')).toContain('Правовые документы');
  await page.locator('.crumbs').getByRole('link', { name: 'Главная' }).click();
  await expect(page).toHaveURL(/index\.html$/);
});

test('правовые документы: отсутствие файлов видно без JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:3000/legal.html');
  await expect(page.locator('.legal-document')).toHaveCount(3);
  await expect(page.locator('.legal-notice')).toBeVisible();
  await expect(page.locator('.legal-document__actions button:disabled')).toHaveCount(3);
  await context.close();
});
