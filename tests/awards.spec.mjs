import { test, expect } from '@playwright/test';

test.use({ reducedMotion: 'reduce' });
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('rgp_cookie_ok', '1'));
});

test('награды: четыре высшие награды, категории и материалы из PDF, локальные ресурсы', async ({ page }) => {
  const errors = [], missing = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('response', r => { if (r.status() >= 400 && r.url().startsWith('http://127.0.0.1:3000')) missing.push(r.url()); });
  await page.goto('/awards.html');
  await expect(page).toHaveTitle(/^Награды —/);
  await expect(page.locator('h1')).toHaveText('Награды');
  await expect(page.locator('.award h3')).toHaveText(['Двойное золотое', 'Золотой стандарт', 'Выбор потребителя', 'Пивовар года']);
  await expect(page.locator('.award').nth(0)).toContainText('среди всех категорий');
  await expect(page.locator('.award').nth(1)).toContainText('не менее трёх золотых медалей');
  await expect(page.locator('.award').nth(2)).toContainText('жюри этапа «Выбор потребителя»');
  await expect(page.locator('.award').nth(3)).toContainText('главного пивовара или технолога');
  await expect(page.locator('.acc__item')).toHaveCount(15);
  await expect(page.locator('.acc__list li')).toHaveCount(53);
  await expect(page.locator('.acc__n')).toHaveText(Array.from({ length: 53 }, (_, i) => String(i + 1)));
  await expect(page.locator('#categories .eyebrow')).toContainText('50+');
  await expect(page.locator('.docs__col').nth(0).locator('.doc')).toHaveCount(3);
  await expect(page.locator('.docs__col').nth(1).locator('.doc')).toHaveCount(7);
  await expect(page.locator('.nav a[aria-current="page"]')).toHaveText('Награды');
  await expect(page.locator('.footer__nav a[aria-current="page"]')).toHaveText('Награды');
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /Золотой стандарт/);
  for (const image of await page.locator('img').all()) await image.evaluate(i => { i.loading = 'eager'; });
  await page.waitForFunction(() => [...document.images].every(i => i.complete));
  expect(await page.locator('img').evaluateAll(images => images.filter(i => !i.naturalWidth).map(i => i.src))).toEqual([]);
  expect(await page.locator('a[href^="#"]').evaluateAll(links => links.filter(l => !document.getElementById(l.hash.slice(1))).map(l => l.hash))).toEqual([]);
  expect(errors).toEqual([]); expect(missing).toEqual([]);
});

test('награды: все категории раскрываются и синхронизируют доступность с клавиатуры', async ({ page }) => {
  await page.goto('/awards.html');
  for (const item of await page.locator('.acc__item').all()) {
    const button = item.locator('.acc__head');
    const body = item.locator('.acc__body');
    if (await button.getAttribute('aria-expanded') === 'true') await button.click();
    await expect(body).toHaveAttribute('inert', '');
    await button.focus(); await page.keyboard.press('Enter');
    await expect(button).toHaveAttribute('aria-expanded', 'true');
    await expect(body).toHaveAttribute('aria-hidden', 'false');
    await expect(body).not.toHaveAttribute('inert');
    await expect(body.locator('li').first()).toBeVisible();
    await page.keyboard.press('Space');
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    await expect(body).toHaveAttribute('aria-hidden', 'true');
    await expect(body).toHaveAttribute('inert', '');
  }
});

test('награды: десять документов и ZIP честно недоступны, Escape и возврат фокуса', async ({ page }) => {
  const downloads = [];
  page.on('download', d => downloads.push(d.suggestedFilename()));
  await page.goto('/awards.html');
  await expect(page.getByRole('button', { name: 'Скачать все · ZIP' })).toBeDisabled();
  await expect(page.locator('.awards-docs-notice')).toContainText('Файлы пока не опубликованы');
  for (const button of await page.locator('[data-awards-material]').all()) {
    const title = await button.getAttribute('data-awards-material');
    await button.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading')).toHaveText(title);
    await expect(dialog).toContainText('Файл пока не опубликован');
    await expect(dialog.locator('a[href^="mailto:"]')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden(); await expect(button).toBeFocused();
  }
  expect(downloads).toEqual([]);
});

for (const width of [360, 390, 768, 1024, 1440]) {
  test(`награды: адаптивность ${width}px, карточки и диалог`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/awards.html');
    await page.evaluate(() => document.fonts.ready);
    const crumbs = await page.locator('.crumbs').boundingBox();
    const header = await page.locator('#siteHeader').boundingBox();
    expect(crumbs.y).toBeGreaterThanOrEqual(header.y + header.height);
    for (const element of await page.locator('.award, #categories, #materials').all()) {
      await element.scrollIntoViewIfNeeded(); await expect(element).toBeVisible();
      expect(await element.evaluate(e => Number(getComputedStyle(e).opacity))).toBe(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    }
    await page.locator('[data-awards-material]').first().click();
    await expect(page.getByRole('dialog')).toBeInViewport();
    await page.getByRole('button', { name: 'Закрыть', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
  });
}

test('награды: мобильное меню, внутренние якоря, регистрация и публикация страницы', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/index.html');
  await page.getByRole('button', { name: 'Меню', exact: true }).click();
  await page.locator('#mainNav').getByRole('link', { name: 'Награды', exact: true }).click();
  await expect(page).toHaveURL(/awards\.html$/);
  await page.locator('.awards-nav').getByRole('link', { name: 'Награды по категориям' }).click();
  await expect(page).toHaveURL(/#categories$/);
  await expect(page.locator('#categories')).toBeFocused();
  const rect = await page.locator('#categories').boundingBox();
  const header = await page.locator('#siteHeader').boundingBox();
  expect(rect.y).toBeGreaterThanOrEqual(header.height);
  const tg = new URL(await page.locator('[data-share-telegram]').getAttribute('href'));
  expect(tg.searchParams.get('url')).toBe('http://127.0.0.1:3000/awards.html');
  expect(tg.searchParams.get('text')).toContain('Награды');
  await page.locator('#registration-form .btn').click();
  await expect(page).toHaveURL(/registration\.html#registration-form$/);
  await expect(page.locator('#registration-form')).toBeFocused();
  await page.goto('/awards#materials');
  await expect(page.locator('#materials')).toBeFocused();
  await expect(page.locator('#materials-title')).toBeInViewport();
});
