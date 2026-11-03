import { test, expect } from '@playwright/test';
import { boot as bootRemote, changeA, rows } from './fixtures/navigation.js';

// Invented device-only collection; every external request is blocked.
const fixture = Array.from({ length: 12 }, (_, i) => ({
  id: `browse-fixture-${i}`, name: `Fixture Table ${i + 1}`,
  location: i % 2 ? 'Mohandsein' : 'Maadi', cuisine: i % 2 ? 'Korean' : 'Italian',
  playlists: i % 2 ? ['Asian'] : ['Weekend'], visited: i % 3 ? ['Fixture author'] : [],
  ratings: [], photos: [], dishes: [], updatedAt: 100 - i
}));

async function boot(page) {
  await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  await page.goto('/');
  await page.evaluate(data => {
    localStorage.clear(); sessionStorage.clear();
    localStorage.setItem('plate-log-data-v1', JSON.stringify(data));
  }, fixture);
  await page.reload();
  await expect(page.locator('.restaurant-row')).toHaveCount(12);
}

for (const theme of ['light', 'dark']) {
  test(`browse controls retain readable actions and a compact, stable filter strip in ${theme}`, async ({ page }, testInfo) => {
    await boot(page);
    await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
    const widths = testInfo.project.name.includes('mobile') ? [320, 390] : [1024, 1440];
    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate(theme => {
        document.documentElement.classList.toggle('dark-theme', theme === 'dark');
        document.body.classList.toggle('dark-theme', theme === 'dark');
      }, theme);
      const header = page.locator('.list-header');
      const before = await header.boundingBox();
      const listBefore = await page.locator('#restaurantList').boundingBox();
      const cardBefore = await page.locator('.restaurant-row').first().boundingBox();
      const countBefore = await page.locator('.list-count').boundingBox();
      expect((await page.locator('.filter-summary').boundingBox()).height).toBe(44);
      await expect(page.locator('.list-count')).toHaveCount(1);
      await expect(page.locator('.list-count')).toHaveText('12 places');
      const title = await header.getByRole('heading').boundingBox();
      const bookmarks = await page.getByRole('button', { name: 'Show bookmarked places', exact: true }).boundingBox();
      expect(title.x + title.width).toBeLessThanOrEqual(bookmarks.x);
      for (const button of await page.locator('#visitFilter button').all()) {
        const box = await button.boundingBox();
        expect(box.height).toBeGreaterThanOrEqual(44);
        expect(box.x).toBeGreaterThanOrEqual(before.x);
        expect(box.x + box.width).toBeLessThanOrEqual(before.x + before.width + 1);
      }
      await page.getByLabel('Search restaurants').fill('A long filter name used to check horizontal overflow and removal');
      await expect(page.getByRole('button', { name: /Remove search A long filter/ })).toBeVisible();
      await page.locator('#visitFilter [data-visit="been"]').click();
      const geometry = await page.locator('#appliedFilters').evaluate(el => ({
        scroll: el.parentElement.scrollWidth, viewportWidth: el.parentElement.clientWidth,
        page: document.documentElement.scrollWidth, viewport: innerWidth
      }));
      // Long filters scroll inside the shared strip, never widening the page.
      expect(geometry.viewportWidth).toBeGreaterThan(0);
      expect(geometry.scroll).toBeGreaterThanOrEqual(geometry.viewportWidth);
      expect((await page.locator('#restaurantList').boundingBox()).y).toBe(listBefore.y);
      const countAfter = await page.locator('.list-count').boundingBox();
      expect(countAfter.x).toBe(countBefore.x);
      expect(countAfter.y).toBe(countBefore.y);
      expect(geometry.page).toBeLessThanOrEqual(geometry.viewport);
      expect((await header.boundingBox()).height).toBe(before.height);
      const recovery = page.getByRole('button', { name: /Clear search and filters to show all 12 places/ });
      const recoveryBox = await recovery.boundingBox();
      expect(recoveryBox.height).toBeGreaterThanOrEqual(44);
      const violations = await page.evaluate(async () => (await window.axe.run(document.querySelector('.list-header'), {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] }
      })).violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) })));
      expect(violations).toEqual([]);
      await recovery.focus(); await page.keyboard.press('Enter');
      await expect(page.locator('.restaurant-row')).toHaveCount(12);
      expect((await header.boundingBox()).height).toBe(before.height);
      expect((await page.locator('.restaurant-row').first().boundingBox()).y).toBe(cardBefore.y);
      await expect(page.locator('#playlistShowAllButton')).toBeDisabled();
    }
  });
}

test('playlist and Bookmarks remain independent, and Show all retains the chosen collection', async ({ page }) => {
  await boot(page);
  await page.locator('[data-playlist="Asian"]').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.restaurant-row')).toHaveCount(6);
  await expect(page.locator('#playlistManageButton')).toBeVisible();
  await page.getByLabel('Search restaurants').fill('No matching fixture');
  await expect(page.locator('#playlistFilterHint')).toHaveText('0 of 6 places');
  await page.getByRole('button', { name: 'Clear search and filters to show all 6 places in Asian' }).click();
  await expect(page.locator('[data-playlist="Asian"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.restaurant-row')).toHaveCount(6);
  await page.getByRole('button', { name: 'Show bookmarked places', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Show bookmarked places', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Remove Bookmarks filter', exact: true }).click();
  await expect(page.locator('.restaurant-row')).toHaveCount(6);
  await expect(page.locator('[data-playlist="Asian"]')).toHaveAttribute('aria-pressed', 'true');
});


test('pending order, recovery and removable filters share the strip without moving results', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  const fixture = [...rows, { ...rows[1], id: 'place-C', cuisine: 'Italian', dishes: [] }];
  await bootRemote(page, '/?cuisine=Egyptian', { count: 2, fixture });
  const before = await page.locator('#restaurantList').boundingBox();
  const count = await page.locator('.list-count').boundingBox();
  await changeA(page, { updated_at: '2026-11-03T12:00:00Z' });
  const update = page.locator('#applyBrowseOrder');
  await expect(update).toBeEnabled();
  const recovery = page.locator('#playlistShowAllButton');
  await expect(recovery).toBeEnabled();
  expect((await page.locator('#restaurantList').boundingBox()).y).toBe(before.y);
  expect((await page.locator('.list-count').boundingBox()).x).toBe(count.x);
  expect((await page.locator('.list-count').boundingBox()).y).toBe(count.y);
  await recovery.focus();
  for (const action of [recovery, update, page.getByRole('button', { name: 'Remove cuisine filter Egyptian', exact: true })]) {
    await expect(action).toBeFocused();
    expect((await action.boundingBox()).height).toBeGreaterThanOrEqual(44);
    await expect.poll(async () => {
      const box = await action.boundingBox();
      const clip = await page.locator('.browse-results').boundingBox();
      return box.x >= clip.x - 1 && box.x + box.width <= clip.x + clip.width + 1;
    }).toBe(true);
    if (action === recovery || action === update) await page.keyboard.press('Tab');
  }
  await update.focus(); await page.keyboard.press('Enter');
  await expect(update).toBeDisabled();
  await expect(page.locator('.restaurant-row').first()).toHaveAttribute('data-id', 'place-A');
  await page.getByRole('button', { name: 'Remove cuisine filter Egyptian', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#appliedFilters button')).toHaveCount(0);
  await expect(recovery).toBeDisabled();
  expect((await page.locator('#restaurantList').boundingBox()).y).toBe(before.y);
});
