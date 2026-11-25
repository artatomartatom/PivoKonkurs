import { test, expect } from '@playwright/test';

test.use({ reducedMotion: 'reduce' });
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('rgp_cookie_ok', '1'));
});
const questions = [
  'Кто может участвовать в конкурсе?',
  'До какого числа принимаются заявки?',
  'Сколько образцов нужно отправить?',
  'Есть ли регистрационный сбор?',
  'Когда будут объявлены итоги?',
  'Можно ли использовать медаль на этикетке?',
];

test('FAQ: структура PDF, шесть вопросов, десять документов и локальные ресурсы', async ({ page }) => {
  const errors = [], missing = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('response', r => { if (r.status() >= 400 && r.url().startsWith('http://127.0.0.1:3000')) missing.push(r.url()); });
  await page.goto('/faq.html');
  await expect(page).toHaveTitle(/^Вопрос-ответ/);
  await expect(page.locator('h1')).toHaveText('Информация для участников');
  await expect(page.locator('.faq-item summary')).toHaveText(questions);
  await expect(page.locator('.faq-item[open]')).toHaveCount(1);
  await expect(page.locator('#question-participation')).toHaveAttribute('open', '');
  await expect(page.locator('#question-participation .faq-answer')).toHaveText('Производители пива и пивоваренной продукции — от крупных заводов до крафтовых пивоварен.');
  await expect(page.locator('#question-deadline')).toContainText('31 декабря 2026 года');
  await expect(page.locator('#question-samples')).toContainText('необходимо уточнить');
  await expect(page.locator('#question-label')).toContainText('необходимо согласовать');
  await expect(page.locator('.docs__col').nth(0).locator('.doc')).toHaveCount(3);
  await expect(page.locator('.docs__col').nth(1).locator('.doc')).toHaveCount(7);
  await expect(page.locator('#materials-title')).toHaveText('Конкурсная документация');
  await expect(page.locator('.footer__nav a[aria-current="page"]')).toHaveText('Вопрос-ответ');
  expect(await page.locator('a[href^="#"]').evaluateAll(links => links.filter(l => !document.getElementById(l.hash.slice(1))).map(l => l.hash))).toEqual([]);
  for (const image of await page.locator('img').all()) await image.evaluate(i => { i.loading = 'eager'; });
  await page.waitForFunction(() => [...document.images].every(i => i.complete));
  expect(await page.locator('img').evaluateAll(images => images.filter(i => !i.naturalWidth).map(i => i.src))).toEqual([]);
  expect(errors).toEqual([]); expect(missing).toEqual([]);
});

test('FAQ: каждый ответ раскрывается мышью и с клавиатуры', async ({ page }) => {
  await page.goto('/faq.html');
  for (const item of await page.locator('.faq-item').all()) {
    const summary = item.locator('summary');
    if (await item.getAttribute('open') !== null) await summary.click();
    await expect(item.locator('.faq-answer')).toBeHidden();
    await summary.focus(); await page.keyboard.press('Enter');
    await expect(item.locator('.faq-answer')).toBeVisible();
    await page.keyboard.press('Space');
    await expect(item.locator('.faq-answer')).toBeHidden();
    await summary.click();
    await expect(item.locator('.faq-answer')).toBeVisible();
  }
});

test('FAQ: все документы без фиктивных загрузок, диалог, Escape и возврат фокуса', async ({ page }) => {
  const downloads = [];
  page.on('download', d => downloads.push(d.suggestedFilename()));
  await page.goto('/faq.html');
  await expect(page.getByRole('button', { name: 'Скачать все · ZIP' })).toBeDisabled();
  for (const button of await page.locator('[data-faq-material]').all()) {
    const title = await button.getAttribute('data-faq-material');
    await button.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading')).toHaveText(title);
    await expect(dialog).toContainText('Файл пока не опубликован');
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden(); await expect(button).toBeFocused();
  }
  expect(downloads).toEqual([]);
});

for (const width of [360, 390, 768, 1024, 1440]) {
  test(`FAQ: адаптивность ${width}px, все ответы и диалог`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/faq.html');
    await page.evaluate(() => document.fonts.ready);
    const crumbs = await page.locator('.crumbs').boundingBox();
    const header = await page.locator('#siteHeader').boundingBox();
    expect(crumbs.y).toBeGreaterThanOrEqual(header.y + header.height);
    await page.locator('.faq-item').evaluateAll(items => items.forEach(i => { i.open = true; }));
    for (const element of await page.locator('.faq-item, #materials').all()) {
      await element.scrollIntoViewIfNeeded();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    }
    await page.locator('[data-faq-material]').first().click();
    await expect(page.getByRole('dialog')).toBeInViewport();
    await page.getByRole('button', { name: 'Закрыть', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
  });
}

test('FAQ: ссылки из подвала, якоря, короткий маршрут, контакты и регистрация', async ({ page }) => {
  await page.goto('/gallery.html');
  await page.locator('.footer__nav').getByRole('link', { name: 'Вопрос-ответ', exact: true }).click();
  await expect(page).toHaveURL(/faq\.html$/);
  await page.locator('.faq-nav').getByRole('link', { name: 'Конкурсная документация' }).click();
  await expect(page.locator('#materials')).toBeFocused();
  const rect = await page.locator('#materials').boundingBox();
  const header = await page.locator('#siteHeader').boundingBox();
  expect(rect.y).toBeGreaterThanOrEqual(header.height);
  await page.locator('#registration-form .btn').click();
  await expect(page).toHaveURL(/registration\.html#registration-form$/);
  await page.goto('/faq#question-samples');
  await expect(page.locator('#question-samples')).toBeFocused();
  await expect(page.locator('#question-samples')).toHaveAttribute('open', '');
  await page.locator('#question-samples .faq-answer a[href="#doc-delivery"]').click();
  await expect(page.locator('#doc-delivery')).toBeFocused();
  const tg = new URL(await page.locator('[data-share-telegram]').getAttribute('href'));
  expect(tg.searchParams.get('url')).toBe('http://127.0.0.1:3000/faq');
  expect(tg.searchParams.get('text')).toContain('Вопрос-ответ');
  await page.getByRole('link', { name: 'Задать вопрос', exact: true }).click();
  await expect(page).toHaveURL(/index\.html#contacts$/);
  await page.locator('.footer__nav').getByRole('link', { name: 'Конкурсная документация' }).click();
  await expect(page).toHaveURL(/faq\.html#materials$/);
  await expect(page.locator('#materials')).toBeFocused();
});

test('FAQ: ответы доступны без JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:3000/faq.html');
  await expect(page.locator('.faq-item')).toHaveCount(6);
  await page.locator('#question-deadline summary').click();
  await expect(page.locator('#question-deadline .faq-answer')).toBeVisible();
  await context.close();
});
