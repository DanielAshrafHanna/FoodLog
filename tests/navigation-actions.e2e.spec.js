import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const places = Array.from({ length: 24 }, (_, i) => ({
  id: `nav-place-${i}`, name: `Table ${String(i + 1).padStart(2, '0')}`,
  location: 'Maadi', cuisine: 'Egyptian', visited: [], playlists: [],
  photos: [], ratings: [], dishes: [], updatedAt: 24 - i
}));

test.beforeEach(async ({ page }) => {
  await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  await page.goto('/');
  await page.evaluate(data => {
    localStorage.clear(); sessionStorage.clear();
    localStorage.setItem('plate-log-data-v1', JSON.stringify(data));
  }, places);
  await page.goto("/");
});

test('phone creation stays direct, clears overlays and typing, and preserves drafts and return focus', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const add = page.getByRole('button', { name: 'Add restaurant', exact: true });
  await expect(add).toBeVisible();
  await expect(page.getByRole('button', { name: 'Places', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'List', exact: true })).toHaveCount(0);
  await add.click();
  await expect(page.getByRole('dialog', { name: 'Add restaurant', exact: true })).toBeVisible();
  await expect(page.locator('#dockAddButton')).toBeHidden();
  await page.locator('#nameInput').fill('Draft restaurant');
  await page.locator('#closeRestaurantModal').click();
  await expect(add).toBeVisible(); await expect(add).toBeFocused();
  await add.click(); await expect(page.locator('#nameInput')).toHaveValue('Draft restaurant');
  await page.locator('#closeRestaurantModal').click();
  await page.locator('#searchInput').focus(); await expect(page.locator('#dockAddButton')).toBeHidden();
  await page.locator('#searchInput').blur(); await expect(add).toBeVisible();
  await page.getByRole('button', { name: 'Open account menu', exact: true }).click();
  await expect(page.locator('#dockAddButton')).toBeHidden();
  await page.keyboard.press('Escape'); await expect(add).toBeVisible();
});

test('phone return preserves filters, list position, focus and records while keeping the final row clear', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('#searchInput').fill('Table'); await page.locator('#searchInput').blur();
  const before = await page.evaluate(() => localStorage.getItem('plate-log-data-v1'));
  const last = page.locator('.restaurant-row').last(); await last.scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect(page.locator('#dockAddButton')).toBeVisible();
  const rowBox = await last.boundingBox(); const addBox = await page.locator('#dockAddButton').boundingBox();
  expect(rowBox.y + rowBox.height).toBeLessThanOrEqual(addBox.y);
  const scrollBefore = await page.evaluate(() => window.scrollY);
  await last.click(); await expect(page.locator('body')).toHaveClass(/mobile-detail-view/);
  await expect(page.locator('#dockAddButton')).toBeHidden();
  await page.getByRole('button', { name: 'Back to places', exact: true }).click();
  await expect(last).toBeFocused(); await expect(page.locator('#dockAddButton')).toBeVisible();
  await expect(page.locator('#searchInput')).toHaveValue('Table');
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeCloseTo(scrollBefore, 0);
  expect(await page.evaluate(() => localStorage.getItem('plate-log-data-v1'))).toBe(before);
});

test('Map preference remains usable across phone and desktop sizes and deep links', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByRole('button', { name: 'Map', exact: true }).click();
  await expect(page.locator('#mapPanel')).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('#mapPanel')).toBeHidden(); await expect(page.locator('#listLayout')).toBeVisible();
  await expect(page.locator('.restaurant-row')).toHaveCount(24);
  await expect(page.getByRole('button', { name: 'Add restaurant', exact: true })).toBeVisible();
  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(page.locator('#mapPanel')).toBeVisible();
  await page.getByRole('button', { name: 'List', exact: true }).click();
  await expect(page.locator('#listLayout')).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?view=map&place=nav-place-3');
  await expect(page.locator('#detailPanel')).toBeVisible();
  await page.getByRole('button', { name: 'Back to places', exact: true }).click();
  await expect(page.locator('#listLayout')).toBeVisible(); await expect(page.locator('#mapPanel')).toBeHidden();
});

test('compact creation action fits 320px in both themes with readable contrast', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await expect(page.locator('#dockAddButton')).toBeVisible();
  const axe = await readFile('node_modules/axe-core/axe.min.js', 'utf8'); await page.addScriptTag({ content: axe });
  for (const dark of [false, true]) {
    await page.evaluate(dark => document.documentElement.classList.toggle('dark-theme', dark), dark);
    const box = await page.locator('#dockAddButton').boundingBox();
    expect(box.height).toBeGreaterThanOrEqual(48); expect(box.x).toBeGreaterThanOrEqual(16);
    expect(box.x + box.width).toBeLessThanOrEqual(304); expect(box.y + box.height).toBeLessThanOrEqual(724);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    const failures = await page.evaluate(async () => (await axe.run(document.querySelector('#dockAddButton'))).violations.filter(v => ['serious', 'critical'].includes(v.impact)).map(v => v.id));
    expect(failures).toEqual([]);
  }
});
