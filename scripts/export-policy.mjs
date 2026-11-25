// Start `npm run dev` first. Regenerate the draft PDF after editing policy.html.
import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const browser = await chromium.launch(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
  ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH, args: ['--no-sandbox'] }
  : {});
try {
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${process.env.PORT || 3000}/policy.html`);
  await page.evaluate(() => document.fonts.ready);
  await mkdir(new URL('../assets/docs/', import.meta.url), { recursive: true });
  await page.pdf({
    path: new URL('../assets/docs/personal-data-policy-draft.pdf', import.meta.url).pathname,
    format: 'A4', printBackground: true, preferCSSPageSize: true,
  });
  console.log('Создан PDF проекта: assets/docs/personal-data-policy-draft.pdf');
} finally {
  await browser.close();
}
