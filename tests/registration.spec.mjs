import { test, expect } from '@playwright/test';

test.use({ reducedMotion: 'reduce' });
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('rgp_cookie_ok', '1'));
});

async function fillValid(page) {
  await page.locator('#entry-company').fill('Тестовая пивоварня');
  await page.locator('#entry-inn').fill('7707083893');
  await page.locator('#entry-name').fill('Иванов Иван Иванович');
  await page.locator('#entry-phone').fill('89991234567');
  await page.locator('#entry-email').fill('test@example.test');
  await page.locator('#sample-1-name').fill('Тестовый лагер');
  await page.locator('#sample-1-category').selectOption('1');
  await page.locator('#sample-1-filtration').selectOption('filtered');
  await page.locator('#sample-1-alcohol').fill('4.3');
  await page.locator('#entry-privacy').check();
  await page.locator('#entry-rules').check();
}

test('регистрация: блоки PDF, три шага, сборы и десять документов', async ({ page }) => {
  const errors = [];
  const missing = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => {
    if (response.status() >= 400 && response.url().startsWith('http://127.0.0.1:3000')) missing.push(response.url());
  });
  await page.goto('/registration.html');
  await expect(page).toHaveTitle(/Регистрация/);
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('h1')).toHaveText('Регистрация');
  await expect(page.locator('#participation .step')).toHaveCount(3);
  await expect(page.locator('#fee tbody tr')).toHaveCount(3);
  await expect(page.locator('#fee tr.is-current')).toContainText('25 000');
  await expect(page.locator('.registration-document')).toHaveCount(10);
  await expect(page.locator('.docs__col').first().locator('.registration-document')).toHaveCount(3);
  await expect(page.locator('.docs__col').last().locator('.registration-document')).toHaveCount(7);
  await expect(page.locator('[data-sample]')).toHaveCount(1);
  await expect(page.locator('#entry-privacy')).not.toBeChecked();
  await expect(page.locator('#entry-rules')).not.toBeChecked();
  await expect(page.locator('.nav a[aria-current="page"]')).toHaveText('Регистрация');
  await expect(page.locator('.footer__nav a[aria-current="page"]')).toHaveText('Регистрация');
  await expect(page.locator('#demo-notice')).toContainText('Данные никуда не отправляются');
  expect(await page.locator('a[href^="#"]').evaluateAll(links => links.filter(link => !document.getElementById(link.hash.slice(1))).map(link => link.hash))).toEqual([]);
  expect(errors).toEqual([]);
  expect(missing).toEqual([]);
});

test('регистрация: все стили в списке, включая безалкогольное пиво', async ({ page }) => {
  await page.goto('/registration.html');
  const category = page.locator('#sample-1-category');
  await expect(category.locator('option')).toHaveCount(54);
  await expect(category.locator('optgroup')).toHaveCount(15);
  const values = await category.locator('option').evaluateAll(options => options.filter(option => option.value).map(option => Number(option.value)));
  expect(values).toEqual(Array.from({ length: 53 }, (_, i) => i + 1));
  await expect(category.locator('option[value="11"]')).toContainText('Безалкогольное');
  await expect(page.locator('.registration-fieldset__note')).toContainText('50+ стилей пива');
});

test('регистрация: добавление, удаление, уникальные поля и расчёт без текущей скидки', async ({ page }) => {
  await page.goto('/registration.html');
  const add = page.locator('[data-add-sample]');
  await expect(page.locator('[data-remove-sample]')).toBeDisabled();
  await page.locator('#sample-1-name').fill('Первый образец');
  await add.click();
  await expect(page.locator('#sample-2-name')).toBeFocused();
  await page.locator('#sample-2-name').fill('Второй образец');
  await add.click();
  await expect(page.locator('[data-sample-count]')).toHaveText('3');
  await expect(page.locator('[data-sample-total]')).toHaveText('75 000 ₽');
  await page.locator('[data-sample-key="2"] [data-remove-sample]').click();
  await expect(page.locator('[data-sample]')).toHaveCount(2);
  await expect(page.locator('[data-sample-number]')).toHaveText(['1', '2']);
  await expect(page.locator('#sample-1-name')).toHaveValue('Первый образец');
  await expect(page.locator('[data-sample-total]')).toHaveText('50 000 ₽');
  await add.click();
  await expect(page.locator('#sample-4-name')).toBeFocused();
  expect(await page.locator('#entryForm [id]').evaluateAll(elements => new Set(elements.map(element => element.id)).size === elements.length)).toBeTruthy();
  await page.locator('[data-sample-key="4"] [data-remove-sample]').click();
  await page.locator('[data-sample-key="3"] [data-remove-sample]').click();
  await expect(page.locator('[data-remove-sample]')).toBeDisabled();
  await expect(page.locator('[data-sample-total]')).toHaveText('25 000 ₽');
});

test('регистрация: обязательные поля, фокус и ошибки', async ({ page }) => {
  await page.goto('/registration.html');
  await page.locator('[data-submit-registration]').click();
  await expect(page.locator('[data-form-errors]')).toBeVisible();
  await expect(page.locator('#entry-company')).toBeFocused();
  await expect(page.locator('#entry-company')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('[data-registration-success]')).toBeHidden();
  await expect(page.locator('#error-privacy')).toContainText('Необходимо подтвердить согласие');
  await page.locator('#entry-company').fill('Компания');
  await expect(page.locator('#entry-company')).not.toHaveAttribute('aria-invalid', 'true');
  await page.locator('[data-errors-list] a[href="#entry-email"]').click();
  await expect(page.locator('#entry-email')).toBeFocused();
});

test('регистрация: проверка ИНН, e-mail, телефона и десятичного алкоголя', async ({ page }) => {
  await page.goto('/registration.html');
  await fillValid(page);
  await expect(page.locator('#entry-phone')).toHaveValue('+7 (999) 123-45-67');
  await page.locator('#entry-inn').fill('12345');
  await page.locator('#entry-email').fill('bad-email');
  await page.locator('#entry-phone').fill('7999');
  await page.locator('#sample-1-alcohol').fill('4,3');
  await page.locator('[data-submit-registration]').click();
  await expect(page.locator('#error-inn')).toContainText('10 или 12 цифр');
  await expect(page.locator('#error-email')).toContainText('корректный e-mail');
  await expect(page.locator('#error-phone')).toContainText('номер полностью');
  await expect(page.locator('#error-sample-1-alcohol')).toContainText('через точку');
  await page.locator('#sample-1-alcohol').fill('101');
  await expect(page.locator('#sample-1-alcohol')).toHaveAttribute('aria-invalid', 'true');
  await page.locator('#sample-1-alcohol').fill('0');
  await expect(page.locator('#error-sample-1-alcohol')).toBeHidden();
});

test('регистрация: новая строка тоже обязательна, после удаления её ошибки исчезают', async ({ page }) => {
  await page.goto('/registration.html');
  await fillValid(page);
  await page.locator('[data-add-sample]').click();
  await page.locator('[data-submit-registration]').click();
  await expect(page.locator('#sample-2-name')).toBeFocused();
  await expect(page.locator('[data-registration-success]')).toBeHidden();
  await page.locator('[data-sample-key="2"] [data-remove-sample]').click();
  await expect(page.locator('[data-form-errors]')).toBeHidden();
});

test('регистрация: честный демоэкран, нет POST и сохранения персональных данных', async ({ page }) => {
  const posts = [];
  page.on('request', request => { if (request.method() === 'POST') posts.push(request.url()); });
  await page.goto('/registration.html');
  await fillValid(page);
  await page.locator('[data-submit-registration]').click();
  const success = page.locator('[data-registration-success]');
  await expect(success).toBeVisible();
  await expect(success).toBeFocused();
  await expect(success).toContainText('Данные никуда не отправлены, счёт на e-mail не выставлен');
  await expect(page.locator('#entryForm')).toBeHidden();
  expect(posts).toEqual([]);
  expect(await page.evaluate(() => JSON.stringify(localStorage) + JSON.stringify(sessionStorage))).not.toContain('Тестовая пивоварня');
  await page.locator('[data-edit-registration]').click();
  await expect(page.locator('#entry-company')).toBeFocused();
  await expect(page.locator('#entry-company')).toHaveValue('Тестовая пивоварня');
  await expect(success).toBeHidden();
});

test('регистрация: документы не выдают несуществующие скачивания, диалог и Escape', async ({ page }) => {
  await page.goto('/registration.html');
  await expect(page.getByRole('button', { name: 'Скачать все · ZIP' })).toBeDisabled();
  const button = page.locator('#doc-regulation button');
  await button.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('heading')).toHaveText('Положение о конкурсе');
  await expect(dialog).toContainText('Файл пока не опубликован');
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(button).toBeFocused();
});

for (const width of [360, 390, 768, 1024, 1440]) {
  test(`регистрация: адаптивность и поля ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/registration.html');
    await page.evaluate(() => document.fonts.ready);
    const crumbs = await page.locator('.crumbs').boundingBox();
    const header = await page.locator('#siteHeader').boundingBox();
    expect(crumbs.y).toBeGreaterThanOrEqual(header.y + header.height);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    await page.locator('[data-add-sample]').click();
    await expect(page.locator('#sample-2-name')).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    if (width <= 720) expect(await page.locator('#entry-company').evaluate(input => parseFloat(getComputedStyle(input).fontSize))).toBeGreaterThanOrEqual(16);
  });
}

test('регистрация: переходы с главной и короткий маршрут', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Меню', exact: true }).click();
  await page.locator('#mainNav').getByRole('link', { name: 'Регистрация', exact: true }).click();
  await expect(page).toHaveURL(/registration\.html$/);
  await page.goto('/registration');
  await page.locator('.registration-head').getByRole('link', { name: 'Заполнить анкету' }).click();
  await expect(page).toHaveURL(/#registration-form$/);
  await expect(page.locator('#registration-form')).toBeFocused();
  await expect(page.locator('#form-title')).toBeInViewport();
  await page.goto('/about.html');
  await page.locator('#registration-form .btn').click();
  await expect(page).toHaveURL(/registration\.html#registration-form$/);
  await expect(page.locator('#registration-form')).toBeFocused();
  await expect(page.locator('#form-title')).toBeInViewport();
});

test('регистрация: без JavaScript отправка заблокирована и не раскрывает данные в URL', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  const posts = [];
  page.on('request', request => { if (request.method() === 'POST') posts.push(request.url()); });
  await page.goto('http://127.0.0.1:3000/registration.html');
  await expect(page.locator('[data-submit-registration]')).toBeDisabled();
  expect(await page.locator('noscript').textContent()).toContain('включите JavaScript');
  await page.locator('#entry-company').fill('Компания без JS');
  await page.locator('#entry-company').press('Enter');
  await expect(page).toHaveURL(/registration\.html$/);
  expect(posts).toEqual([]);
  await context.close();
});
