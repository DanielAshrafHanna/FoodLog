import { test, expect } from '@playwright/test';

test('selects playlists and exposes collection summary without a sidebar', async ({ page }, testInfo) => {
  await page.goto('/');
  const select = page.getByRole('combobox', { name: 'Filter by playlist' });
  await expect(select).toBeVisible();
  await select.selectOption('Date night');
  await expect(page.locator('.restaurant-row')).toHaveCount(2);
  await expect(page.locator('#playlistManageButton')).toBeVisible();
  await select.selectOption('all');
  await expect(page.locator('.restaurant-row')).toHaveCount(3);
  await page.locator('.journal-summary summary').click();
  await expect(page.locator('#dishCount')).toBeVisible();
  await page.locator('.journal-summary summary').click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await page.locator('.journal-summary').evaluate(el => el.getBoundingClientRect().height)).toBeLessThan(100);
  await page.screenshot({ path: testInfo.outputPath('places.png') });
});
