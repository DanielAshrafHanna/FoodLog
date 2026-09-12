import { test, expect } from '@playwright/test';

test('playlist pills filter Places without a collection summary', async ({ page }, testInfo) => {
  await page.goto('/');
  await expect(page.locator('.journal-summary')).toHaveCount(0);
  const playlist = page.locator('[data-playlist="Date night"]');
  await playlist.focus();
  await page.keyboard.press('Enter');
  await expect(playlist).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.restaurant-row')).toHaveCount(2);
  await expect(page.locator('#playlistManageButton')).toBeVisible();
  await page.locator('[data-playlist="all"]').click();
  await expect(page.locator('.restaurant-row')).toHaveCount(3);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('places-light.png') });
  await page.evaluate(() => document.documentElement.classList.add('dark-theme'));
  await page.screenshot({ animations: 'disabled', path: testInfo.outputPath('places-dark.png') });
});
