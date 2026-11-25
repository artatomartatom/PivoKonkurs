import { test, expect } from '@playwright/test';

test.use({ reducedMotion: 'reduce' });
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('rgp_cookie_ok', '1'));
});

const years = [2026, 2025, 2024, 2023, 2021, 2020, 2019, 2018, 2017];

test('победители: годы строго по PDF, только протоколы и видео без таблиц и фильтров', async ({ page }) => {
  const errors = [];
  const missing = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => {
    if (response.status() >= 400 && response.url().startsWith('http://127.0.0.1:3000')) missing.push(response.url());
  });
  await page.goto('/winners.html');
  await expect(page).toHaveTitle(/Победители/);
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('h1')).toHaveText('Победители');
  await expect(page.locator('.winners-season')).toHaveCount(9);
  await expect(page.locator('.winners-season__year h3')).toHaveText(years.map(String));
  await expect(page.locator('.winners-protocol h4')).toHaveText(years.map(year => 'Протокол итогов конкурса ' + year));
  await expect(page.locator('.winners-video')).toHaveCount(4);
  await expect(page.locator('#season-2026 .winners-season__story p')).toHaveCount(2);
  await expect(page.locator('#season-2025 .winners-season__story p')).toHaveCount(4);
  await expect(page.locator('#season-2026')).toContainText('26 марта 2026 года');
  await expect(page.locator('#season-2025')).toContainText('«Понтон Hall»');
  await expect(page.locator('#season-2022, #season-2027')).toHaveCount(0);
  await expect(page.locator('.winners-archive table, .winners-archive input, .winners-archive select')).toHaveCount(0);
  await expect(page.locator('.nav a[aria-current="page"]')).toHaveText('Победители');
  await expect(page.locator('.footer__nav a[aria-current="page"]')).toHaveText('Победители');
  for (const image of await page.locator('img').all()) await image.evaluate(img => { img.loading = 'eager'; });
  await page.waitForFunction(() => [...document.images].every(image => image.complete));
  expect(await page.locator('img').evaluateAll(images => images.filter(image => !image.naturalWidth).map(image => image.src))).toEqual([]);
  expect(await page.locator('a[href^="#"]').evaluateAll(links => links.filter(link => !document.getElementById(link.hash.slice(1))).map(link => link.hash))).toEqual([]);
  expect(errors).toEqual([]);
  expect(missing).toEqual([]);
});

test('победители: протокол каждого сезона открывает корректное состояние, скачивание отключено', async ({ page }) => {
  const downloads = [];
  page.on('download', download => downloads.push(download.suggestedFilename()));
  await page.goto('/winners.html');
  for (const year of years) {
    const row = page.locator('#season-' + year);
    const button = row.getByRole('button', { name: 'Открыть', exact: true });
    await expect(row.getByRole('button', { name: 'Скачать протокол ' + year + ' — файл пока не опубликован' })).toBeDisabled();
    await button.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading')).toHaveText('Протокол итогов конкурса ' + year);
    await expect(dialog).toContainText('Файл протокола пока не опубликован');
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(button).toBeFocused();
  }
  expect(downloads).toEqual([]);
});

test('победители: все четыре видеоблока без фиктивного плеера', async ({ page }) => {
  await page.goto('/winners.html');
  for (const title of ['Видео с награждения 2026', 'Ночь победителей 2026', 'Видео с награждения 2025', 'Ночь победителей 2025']) {
    const button = page.getByRole('button', { name: 'Открыть видео: ' + title, exact: true });
    await button.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading')).toHaveText(title);
    await expect(dialog).toContainText('Видео пока не опубликовано');
    await expect(dialog).toContainText('иллюстрация из фотоархива');
    await expect(dialog.locator('video, iframe')).toHaveCount(0);
    await dialog.getByRole('button', { name: 'Закрыть' }).click();
    await expect(dialog).toBeHidden();
    await expect(button).toBeFocused();
  }
});

for (const width of [360, 390, 768, 1024, 1440]) {
  test(`победители: адаптивность ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/winners.html');
    await page.evaluate(() => document.fonts.ready);
    const crumbs = await page.locator('.crumbs').boundingBox();
    const header = await page.locator('#siteHeader').boundingBox();
    expect(crumbs.y).toBeGreaterThanOrEqual(header.y + header.height);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    for (const season of await page.locator('.winners-season').all()) {
      await season.scrollIntoViewIfNeeded();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    }
    await page.locator('#season-2017 [data-material-kind="protocol"]').click();
    await expect(page.getByRole('dialog')).toBeInViewport();
    await page.keyboard.press('Escape');
  });
}

test('победители: мобильное меню и CTA регистрации', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/about.html');
  await page.getByRole('button', { name: 'Меню', exact: true }).click();
  await page.locator('#mainNav').getByRole('link', { name: 'Победители', exact: true }).click();
  await expect(page).toHaveURL(/winners\.html$/);
  await page.locator('#registration-form .btn').click();
  await expect(page).toHaveURL(/registration\.html#registration-form$/);
  await expect(page.locator('#registration-form')).toBeFocused();
});

test('победители: короткий маршрут, прямые якоря и ссылки публикации', async ({ page }) => {
  await page.goto('/winners#season-2025');
  await expect(page.locator('#season-2025')).toBeFocused();
  await expect(page.locator('#year-2025')).toBeInViewport();
  const telegram = new URL(await page.locator('[data-share-telegram]').getAttribute('href'));
  expect(telegram.searchParams.get('url')).toBe('http://127.0.0.1:3000/winners');
  expect(telegram.searchParams.get('text')).toContain('Победители');
  await expect(page.locator('.seo__facts')).toContainText('50+ стилей пива');
});
