import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }, testInfo) => {
  if (!testInfo.title.startsWith('cookie')) {
    await page.addInitScript(() => localStorage.setItem('rgp_cookie_ok', '1'));
  }
});

test('структура PDF, все локальные ресурсы и 53 стиля', async ({ page }) => {
  const errors = [];
  const missing = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => {
    if (response.status() >= 400 && response.url().startsWith('http://127.0.0.1:3000')) missing.push(response.url());
  });
  await page.goto('/about.html');
  await expect(page).toHaveTitle(/О конкурсе/);
  await expect(page.locator('h1')).toHaveText('О конкурсе');
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('.about-intro__copy > p:not(.eyebrow)')).toHaveCount(5);
  await expect(page.locator('.about-org')).toHaveCount(3);
  await expect(page.locator('.about-media-card')).toHaveCount(3);
  await expect(page.locator('.award')).toHaveCount(4);
  await expect(page.locator('.acc__item')).toHaveCount(15);
  await expect(page.locator('.acc__list li')).toHaveCount(53);
  await expect(page.locator('.about-goal')).toHaveCount(4);
  await expect(page.locator('.about-task-list li')).toHaveCount(4);
  await expect(page.locator('.nav a[aria-current="page"]')).toHaveText('О конкурсе');
  // Trigger every lazy-loaded image, including the lower part of the page.
  for (const image of await page.locator('img').all()) {
    await image.evaluate(img => { img.loading = 'eager'; });
  }
  await page.waitForFunction(() => [...document.images].every(image => image.complete));
  expect(await page.locator('img').evaluateAll(images => images.filter(image => !image.naturalWidth).map(image => image.src))).toEqual([]);
  expect(errors).toEqual([]);
  expect(missing).toEqual([]);
  // No orphaned local anchors in the newly added page.
  expect(await page.locator('a[href^="#"]').evaluateAll(links => links.filter(link => !document.getElementById(link.hash.slice(1))).map(link => link.hash))).toEqual([]);
});

test('категории открываются мышью и клавиатурой', async ({ page }) => {
  await page.goto('/about.html');
  const button = page.locator('[data-acc="g2"] .acc__head');
  await expect(button).toHaveAttribute('aria-expanded', 'false');
  await button.click();
  await expect(button).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('[data-acc="g2"] .acc__list')).toBeVisible();
  await button.press('Enter');
  await expect(button).toHaveAttribute('aria-expanded', 'false');
});

test('окно материала, Escape, возврат фокуса и отсутствие фиктивного скачивания', async ({ page }) => {
  await page.goto('/about.html');
  const open = page.locator('.about-media-card').first().getByRole('button', { name: 'Открыть ↗', exact: true });
  await open.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('heading')).toHaveText('Презентация конкурса');
  await expect(dialog).toContainText('Материал пока не опубликован');
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(open).toBeFocused();
  await expect(page.locator('.about-media-card').first().getByRole('button', { name: 'Скачать ↓' })).toBeDisabled();
  await page.locator('[data-about-material="Видео с дегустации"]').click();
  await expect(dialog.getByRole('heading')).toHaveText('Видео с дегустации');
  await dialog.getByRole('button', { name: 'Закрыть' }).click();
  await expect(dialog).not.toBeVisible();
});

for (const width of [360, 390, 768, 1024, 1440]) {
  test(`адаптивная вёрстка ${width}px без горизонтального переполнения`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/about.html');
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    const header = await page.locator('#siteHeader').boundingBox();
    const crumbs = await page.locator('.crumbs').boundingBox();
    expect(crumbs.y).toBeGreaterThanOrEqual(header.y + header.height);
    await page.locator('#categories').scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  });
}

test('мобильное меню и переход из главной', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Меню', exact: true }).click();
  await page.locator('#mainNav').getByRole('link', { name: 'О конкурсе', exact: true }).click();
  await expect(page).toHaveURL(/about\.html$/);
  const burger = page.getByRole('button', { name: 'Меню', exact: true });
  await burger.click();
  await expect(burger).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#mainNav')).toBeVisible();
  await burger.click();
  await expect(burger).toHaveAttribute('aria-expanded', 'false');
});

test('cookie принимается, /about ведёт на ту же страницу', async ({ page }) => {
  await page.goto('/about');
  await page.evaluate(() => localStorage.removeItem('rgp_cookie_ok'));
  await page.reload();
  const cookie = page.locator('[data-cookie]');
  await expect(cookie).toBeVisible();
  await cookie.getByRole('button', { name: 'Принять' }).click();
  await expect(cookie).toBeHidden();
  await page.reload();
  expect(await page.evaluate(() => localStorage.getItem('rgp_cookie_ok'))).toBe('1');
  await expect(page.locator('h1')).toHaveText('О конкурсе');
});

test('на всех страницах используется формулировка «50+ стилей», нумерация сохранена', async ({ page }) => {
  const { readdir, readFile } = await import('node:fs/promises');
  const files = (await readdir(new URL('../', import.meta.url))).filter(file => file.endsWith('.html'));
  for (const file of files) {
    const html = await readFile(new URL('../' + file, import.meta.url), 'utf8');
    expect(html, file).not.toMatch(/53(?:<\/b>)?\s+стил(?:я|ям|ей)(?![а-я])/u);
  }
  await page.goto('/about.html');
  await expect(page.locator('.about-head__facts')).toContainText('50+ стилей пива');
  await expect(page.locator('.seo__facts')).toContainText('50+ стилей пива');
  await expect(page.locator('.acc__list li')).toHaveCount(53);
  await expect(page.locator('[data-acc="g15"] .acc__range')).toHaveText('48–53');
});
