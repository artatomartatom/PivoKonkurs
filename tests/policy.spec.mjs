import { test, expect } from '@playwright/test';

test.use({ reducedMotion: 'reduce' });
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('rgp_cookie_ok', '1'));
});
const ids = ['general', 'purposes', 'grounds', 'data', 'processing', 'cookie', 'rights', 'contacts'];
const titles = ['Общие положения', 'Цели обработки персональных данных', 'Правовые основания обработки', 'Объём и категории обрабатываемых данных', 'Порядок и условия обработки', 'Использование файлов cookie', 'Права субъектов персональных данных', 'Контактная информация'];

test('политика: восемь разделов PDF, полный текст, честный проект и локальные ресурсы', async ({ page }) => {
  const errors = [], missing = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('response', r => { if (r.status() >= 400 && r.url().startsWith('http://127.0.0.1:3000')) missing.push(r.url()); });
  await page.goto('/policy.html');
  await expect(page).toHaveTitle(/^Политика обработки персональных данных/);
  await expect(page.locator('h1')).toHaveText('Политика обработки персональных данных');
  await expect(page.locator('.policy-chapter h2')).toHaveText(titles.map((t, i) => `${i + 1}. ${t}`));
  await expect(page.locator('.policy-toc a')).toHaveText(titles.map((t, i) => `${i + 1}. ${t}`));
  await expect(page.locator('.policy-draft')).toContainText('не является утверждённой политикой');
  await expect(page.locator('#general')).toContainText('подтвердить и внести полное наименование оператора');
  await expect(page.locator('#data')).toContainText('не отправляет их на сервер');
  await expect(page.locator('#cookie')).toContainText('rgp_deadline_closed_v1');
  await expect(page.locator('#grounds')).toContainText('оформляется отдельно');
  await expect(page.locator('#processing')).toContainText('не подтверждены');
  await expect(page.locator('#rights')).toContainText('Роскомнадзор');
  await expect(page.locator('#contacts')).toContainText('Дата вступления в силу не установлена');
  for (const chapter of await page.locator('.policy-chapter').all()) {
    expect((await chapter.innerText()).length).toBeGreaterThan(500);
  }
  expect(await page.locator('a[href^="#"]').evaluateAll(links => links.filter(l => !document.getElementById(l.hash.slice(1))).map(l => l.hash))).toEqual([]);
  for (const image of await page.locator('img').all()) await image.evaluate(i => { i.loading = 'eager'; });
  await page.waitForFunction(() => [...document.images].every(i => i.complete));
  expect(await page.locator('img').evaluateAll(images => images.filter(i => !i.naturalWidth).map(i => i.src))).toEqual([]);
  expect(errors).toEqual([]); expect(missing).toEqual([]);
});

test('политика: оглавление ведёт ко всем восьми пунктам и передаёт фокус', async ({ page }) => {
  await page.goto('/policy.html');
  for (const id of ids) {
    await page.locator(`.policy-toc a[href="#${id}"]`).click();
    await expect(page).toHaveURL(new RegExp('#' + id + '$'));
    await expect(page.locator('#' + id)).toBeFocused();
    await expect(page.locator('#title-' + id)).toBeInViewport();
    const rect = await page.locator('#' + id).boundingBox();
    const header = await page.locator('#siteHeader').boundingBox();
    expect(rect.y).toBeGreaterThanOrEqual(header.height);
  }
});

test('политика: реальный PDF проекта открывается и скачивается', async ({ page, request }) => {
  await page.goto('/policy.html');
  const response = await request.get('/assets/docs/personal-data-policy-draft.pdf');
  expect(response.ok()).toBeTruthy();
  expect(response.headers()['content-type']).toBe('application/pdf');
  expect((await response.body()).subarray(0, 5).toString()).toBe('%PDF-');
  await expect(page.getByRole('link', { name: 'Открыть проект PDF ↗' })).toHaveAttribute('target', '_blank');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('link', { name: 'Скачать проект PDF ↓' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('personal-data-policy-draft.pdf');
});

for (const width of [360, 390, 768, 1024, 1440]) {
  test(`политика: адаптивность ${width}px, оглавление и длинный текст`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/policy.html');
    await page.evaluate(() => document.fonts.ready);
    const crumbs = await page.locator('.crumbs').boundingBox();
    const header = await page.locator('#siteHeader').boundingBox();
    expect(crumbs.y).toBeGreaterThanOrEqual(header.y + header.height);
    for (const id of ids) {
      await page.locator('#' + id).scrollIntoViewIfNeeded();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    }
    await expect(page.locator('.policy-download')).toBeVisible();
  });
}

test('политика: ссылки согласия и подвала, короткий маршрут и якорь cookie', async ({ page }) => {
  await page.goto('/registration.html');
  await expect(page.locator('a[href="policy.html"]').first()).toHaveAttribute('target', '_blank');
  await page.goto('/legal.html');
  await page.locator('.footer__nav').getByRole('link', { name: 'Политика обработки персональных данных' }).click();
  await expect(page).toHaveURL(/policy\.html$/);
  await page.goto('/policy#cookie');
  await expect(page.locator('#cookie')).toBeFocused();
  await expect(page.locator('#title-cookie')).toBeInViewport();
  const tg = new URL(await page.locator('[data-share-telegram]').getAttribute('href'));
  expect(tg.searchParams.get('url')).toBe('http://127.0.0.1:3000/policy');
});

test('политика: весь текст, оглавление и PDF доступны без JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:3000/policy.html');
  await expect(page.locator('.policy-chapter')).toHaveCount(8);
  await page.locator('.policy-toc a[href="#cookie"]').click();
  await expect(page).toHaveURL(/#cookie$/);
  await expect(page.locator('#title-cookie')).toBeInViewport();
  await expect(page.getByRole('link', { name: 'Скачать проект PDF ↓' })).toHaveAttribute('download', '');
  await context.close();
});
