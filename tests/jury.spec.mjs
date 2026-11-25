import { test, expect } from '@playwright/test';

test.use({ reducedMotion: 'reduce' });

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('rgp_cookie_ok', '1'));
});

test('жюри: пять профилей, полные биографии и доступные ресурсы', async ({ page }) => {
  const errors = [];
  const missing = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => {
    if (response.status() >= 400 && response.url().startsWith('http://127.0.0.1:3000')) missing.push(response.url());
  });
  await page.goto('/jury.html');
  await expect(page).toHaveTitle(/Экспертное жюри/);
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('h1')).toHaveText('Экспертное жюри');
  await expect(page.locator('.jury-qualifications li')).toHaveCount(6);
  await expect(page.locator('.jury-directory__item')).toHaveCount(5);
  await expect(page.locator('.expert-profile')).toHaveCount(5);
  await expect(page.locator('.expert-portrait__image > img')).toHaveCount(5);
  await expect(page.locator('.expert-timeline > div')).toHaveCount(36);
  await expect(page.locator('#member-aleshin')).toContainText('«За отличную службу в МВД»');
  await expect(page.locator('#member-danilovtseva')).toContainText('Кандидат технических наук (1980)');
  await expect(page.locator('#member-rudnev')).toContainText('«Российский государственный университет правосудия»');
  await expect(page.locator('#member-ermolaeva')).toContainText('Ing-PAED IGIP');
  await expect(page.locator('#member-mordovin')).toContainText('Кандидат экономических наук');
  await expect(page.locator('.nav a[aria-current="page"]')).toHaveText('Экспертное жюри');
  await expect(page.locator('.footer__nav a[aria-current="page"]')).toHaveText('Экспертное жюри');
  for (const image of await page.locator('img').all()) await image.evaluate(img => { img.loading = 'eager'; });
  await page.waitForFunction(() => [...document.images].every(image => image.complete));
  expect(await page.locator('img').evaluateAll(images => images.filter(image => !image.naturalWidth).map(image => image.src))).toEqual([]);
  expect(await page.locator('a[href^="#"]').evaluateAll(links => links.filter(link => !document.getElementById(link.hash.slice(1))).map(link => link.hash))).toEqual([]);
  expect(errors).toEqual([]);
  expect(missing).toEqual([]);
});

test('жюри: переходы ко всем профилям, URL и фокус для клавиатуры', async ({ page }) => {
  await page.goto('/jury.html');
  for (const id of ['aleshin', 'danilovtseva', 'rudnev', 'ermolaeva', 'mordovin']) {
    const link = page.locator(`.jury-directory a[href="#member-${id}"]`);
    await link.focus();
    await link.press('Enter');
    const target = page.locator('#member-' + id);
    await expect(page).toHaveURL(new RegExp('#member-' + id + '$'));
    await expect(target).toBeFocused();
    await expect(target.locator('h2')).toBeInViewport();
    await target.getByRole('link', { name: '↑ К составу жюри' }).click();
    await expect(page).toHaveURL(/#jury-list$/);
    await expect(page.locator('#jury-list')).toBeFocused();
  }
});

test('жюри: пустая позиция и заглушка профиля не выводятся', async ({ page }) => {
  await page.goto('/jury.html');
  await expect(page.locator('a[href="#member-consumer-choice"]')).toHaveCount(0);
  await expect(page.locator('#member-consumer-choice')).toHaveCount(0);
  await expect(page.getByText('Имя будет опубликовано', { exact: false })).toHaveCount(0);
  await expect(page.locator('.expert-portrait__number')).toHaveText([
    '01 / 05', '02 / 05', '03 / 05', '04 / 05', '05 / 05',
  ]);
});

for (const width of [360, 390, 768, 1024, 1440]) {
  test(`жюри: адаптивность ${width}px и видимость хлебных крошек`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/jury.html');
    await page.evaluate(() => document.fonts.ready);
    const crumbs = await page.locator('.crumbs').boundingBox();
    const header = await page.locator('#siteHeader').boundingBox();
    expect(crumbs.y).toBeGreaterThanOrEqual(header.y + header.height);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    for (const profile of await page.locator('.expert-profile').all()) {
      await profile.scrollIntoViewIfNeeded();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    }
  });
}

test('жюри: переход из мобильного меню и ссылки на биографии с главной', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/about.html');
  await page.getByRole('button', { name: 'Меню', exact: true }).click();
  await page.locator('#mainNav').getByRole('link', { name: 'Экспертное жюри', exact: true }).click();
  await expect(page).toHaveURL(/jury\.html$/);
  await expect(page.locator('.nav a[aria-current="page"]')).toHaveText('Экспертное жюри');
  await page.goto('/');
  await expect(page.locator('#jury h3 a')).toHaveCount(5);
  await page.locator('#jury h3 a').filter({ hasText: 'Мордовин' }).click();
  await expect(page).toHaveURL(/jury\.html#member-mordovin$/);
  await expect(page.locator('#member-mordovin')).toBeFocused();
});

test('жюри: короткий маршрут, ссылки регистрации и публикации страницы', async ({ page }) => {
  await page.goto('/jury');
  await expect(page.locator('h1')).toHaveText('Экспертное жюри');
  await expect(page.locator('#registration-form .btn')).toHaveAttribute('href', 'registration.html#registration-form');
  const telegram = new URL(await page.locator('[data-share-telegram]').getAttribute('href'));
  expect(telegram.searchParams.get('url')).toBe('http://127.0.0.1:3000/jury');
  expect(telegram.searchParams.get('text')).toContain('Экспертное жюри');
  await expect(page.locator('.jury-head__facts')).toContainText('50+ стилей пива');
});
