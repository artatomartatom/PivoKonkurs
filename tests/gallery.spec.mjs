import { test, expect } from '@playwright/test';

test.use({ reducedMotion: 'reduce' });
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('rgp_cookie_ok', '1'));
});

test('галерея: все 92 фото сразу, 184 существующих файла, без скрытых кадров и пагинации', async ({ page, request }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('/gallery.html');
  await expect(page).toHaveTitle(/^Галерея —/);
  await expect(page.locator('h1')).toHaveText('Галерея');
  await expect(page.locator('.gallery-total, .gallery-shot__number')).toHaveCount(0);
  await expect(page.locator('main')).not.toContainText(/92 (фотографии|кадра)/);
  await expect(page.locator('[data-photo-counter]')).not.toContainText('/');
  await expect(page.locator('[data-photo]')).toHaveCount(92);
  await expect(page.locator('.gallery__more, [data-gallery-open], [data-lightbox]')).toHaveCount(0);
  expect(await page.locator('[data-photo]').evaluateAll(links => links.every((link, index) => {
    const style = getComputedStyle(link);
    return link.dataset.photo === String(index + 1) && style.display !== 'none' && style.visibility === 'visible' && Number(style.opacity) === 1 && link.getBoundingClientRect().height > 0;
  }))).toBeTruthy();
  for (let i = 1; i <= 92; i++) {
    for (const suffix of ['.jpg', '-big.jpg']) {
      const response = await request.get(`/assets/img/gallery/${i}${suffix}`);
      expect(response.ok()).toBeTruthy();
      expect(response.headers()['content-type']).toContain('image/jpeg');
    }
  }
  await page.locator('[data-photo] img').evaluateAll(images => images.forEach(i => { i.loading = 'eager'; }));
  await page.waitForFunction(() => [...document.querySelectorAll('[data-photo] img')].every(i => i.complete && i.naturalWidth));
  await expect(page.locator('.nav a[aria-current="page"]')).toHaveText('Галерея');
  await expect(page.locator('.footer__nav a[aria-current="page"]')).toHaveText('Галерея');
  expect(errors).toEqual([]);
});

test('галерея: любой кадр, оригинал, полный цикл стрелками, Escape и возврат фокуса', async ({ page }) => {
  await page.goto('/gallery.html');
  const opener = page.locator('#photo-44');
  await opener.click();
  const dialog = page.getByRole('dialog', { name: 'Просмотр фотогалереи' });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('[data-photo-counter]')).toHaveText('Фото 44');
  await expect(dialog.locator('[data-photo-image]')).toHaveAttribute('src', /44-big\.jpg$/);
  await expect(dialog.getByRole('link', { name: 'Открыть оригинал ↗' })).toHaveAttribute('href', /44-big\.jpg$/);
  await expect(dialog.getByRole('button', { name: 'Закрыть просмотр' })).toBeFocused();
  for (let i = 1; i <= 92; i++) {
    await page.keyboard.press('ArrowRight');
    await expect(dialog.locator('[data-photo-counter]')).toHaveText(`Фото ${(43 + i) % 92 + 1}`);
  }
  await page.keyboard.press('ArrowLeft');
  await expect(dialog.locator('[data-photo-counter]')).toHaveText('Фото 43');
  await dialog.getByRole('button', { name: 'Следующее фото' }).click();
  await dialog.getByRole('button', { name: 'Предыдущее фото' }).click();
  await expect(dialog.locator('[data-photo-counter]')).toHaveText('Фото 43');
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => !!document.activeElement.closest('[data-photo-viewer]'))).toBeTruthy();
  }
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('');
});

test('галерея: свайпы, замыкание 92 → 1 и отсутствие листания при вертикальном жесте', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/gallery.html');
  await page.locator('#photo-92').click();
  const stage = page.locator('[data-photo-stage]');
  async function swipe(x, y) {
    await stage.evaluate((element, { x, y }) => {
      const start = new Touch({ identifier: 1, target: element, clientX: 200, clientY: 400 });
      const end = new Touch({ identifier: 1, target: element, clientX: x, clientY: y });
      element.dispatchEvent(new TouchEvent('touchstart', { touches: [start], bubbles: true }));
      element.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [end], bubbles: true }));
    }, { x, y });
  }
  await swipe(100, 405);
  await expect(page.locator('[data-photo-counter]')).toHaveText('Фото 1');
  await swipe(300, 405);
  await expect(page.locator('[data-photo-counter]')).toHaveText('Фото 92');
  await swipe(205, 600);
  await expect(page.locator('[data-photo-counter]')).toHaveText('Фото 92');
  await page.getByRole('button', { name: 'Закрыть просмотр' }).click();
  await expect(page.locator('#photo-92')).toBeFocused();
});

test('галерея: ошибка загрузки не блокирует переключение', async ({ page }) => {
  await page.route('**/gallery/2-big.jpg', route => route.abort());
  await page.goto('/gallery.html');
  await page.locator('#photo-2').click();
  await expect(page.locator('[data-photo-notice]')).toBeVisible();
  await page.getByRole('button', { name: 'Следующее фото' }).click();
  await expect(page.locator('[data-photo-counter]')).toHaveText('Фото 3');
  await expect(page.locator('[data-photo-notice]')).toBeHidden();
  await page.waitForFunction(() => document.querySelector('[data-photo-image]').naturalWidth > 0);
});

for (const width of [360, 390, 768, 1024, 1440]) {
  test(`галерея: адаптивность ${width}px, начало/середина/конец и крупный просмотр`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/gallery.html');
    await page.evaluate(() => document.fonts.ready);
    const crumbs = await page.locator('.crumbs').boundingBox();
    const header = await page.locator('#siteHeader').boundingBox();
    expect(crumbs.y).toBeGreaterThanOrEqual(header.y + header.height);
    for (const number of [1, 44, 92]) {
      await page.locator('#photo-' + number).scrollIntoViewIfNeeded();
      await expect(page.locator('#photo-' + number)).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    }
    await page.locator('#photo-92').click();
    await expect(page.getByRole('dialog')).toBeInViewport();
    for (const selector of ['.photo-viewer__close', '[data-photo-prev]', '[data-photo-next]', '[data-photo-original]']) {
      await expect(page.locator(selector)).toBeInViewport();
    }
    await page.keyboard.press('Escape');
    await page.locator('.gallery-end a').click();
    await expect(page.locator('#gallery-all')).toBeFocused();
  });
}

test('галерея: меню, оба перехода с главной, короткий маршрут и регистрация', async ({ page }) => {
  await page.goto('/index.html');
  await page.getByRole('link', { name: 'Вся галерея', exact: true }).click();
  await expect(page).toHaveURL(/gallery\.html$/);
  await page.goto('/index.html');
  await page.getByRole('link', { name: 'Смотреть всю галерею', exact: true }).click();
  await expect(page).toHaveURL(/gallery\.html$/);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/awards.html');
  await page.getByRole('button', { name: 'Меню', exact: true }).click();
  await page.locator('#mainNav').getByRole('link', { name: 'Галерея', exact: true }).click();
  await expect(page).toHaveURL(/gallery\.html$/);
  await page.locator('#registration-form .btn').click();
  await expect(page).toHaveURL(/registration\.html#registration-form$/);
  await page.goto('/gallery#photo-92');
  await expect(page.locator('#photo-92')).toBeFocused();
  await expect(page.locator('#photo-92')).toBeInViewport();
});

test('галерея: без JavaScript все фотографии доступны и ведут на большие изображения', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:3000/gallery.html');
  await expect(page.locator('[data-photo]')).toHaveCount(92);
  await page.locator('#photo-92').click();
  await expect(page).toHaveURL(/92-big\.jpg$/);
  await context.close();
});
