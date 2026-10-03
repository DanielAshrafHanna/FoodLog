import { expect, test } from '@playwright/test';

const fixture = [{ id: 'ux-place', name: 'Fixture Kitchen', location: 'Maadi', cuisine: 'Chinese', price: '$$', playlists: [], visited: [], photos: [], ratings: [
  { email: 'you', name: 'You', rating: 4, notes: 'Saved restaurant review', updatedAt: 100 },
  { email: 'friend@example.com', name: 'Friend', rating: 3, notes: 'Friend restaurant review', updatedAt: 101 }
], dishes: [{ id: 'ux-dish', name: 'Crispy noodles', likedBy: [], ratings: [
  { email: 'you', name: 'You', rating: 5, notes: 'Saved dish review', updatedAt: 100 },
  { email: 'friend@example.com', name: 'Friend', rating: 4, notes: 'Friend dish review', updatedAt: 101 }
], photos: [] }] }];

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(data => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('plate-log-data-v1', JSON.stringify(data)); }, fixture);
  await page.reload();
});
async function detail(page) { await page.getByRole('button', { name: 'Fixture Kitchen, Visited', exact: true }).click(); }

test('restaurant review draft survives Close, Escape and reload; stale draft cannot overwrite', async ({ page }) => {
  await detail(page);
  await page.locator('.restaurant-rating-shortcut').getByText('Edit your review').click();
  let form = page.locator('#restaurantRatingModal');
  await form.getByLabel('Your review').fill('Keep my unsaved restaurant draft');
  await form.getByRole('button', { name: 'Close', exact: true }).click();
  await page.locator('.restaurant-rating-shortcut').getByText('Edit your review').click();
  await expect(form.getByLabel('Your review')).toHaveValue('Keep my unsaved restaurant draft');
  await form.press('Escape');
  await page.reload();
  await page.locator('.restaurant-rating-shortcut').getByText('Edit your review').click();
  await expect(form.getByLabel('Your review')).toHaveValue('Keep my unsaved restaurant draft');
  await form.getByRole('button', { name: 'Save my review' }).click();
  await expect(page.locator('.rating-row--mine')).toContainText('Keep my unsaved restaurant draft');
  const draftCount = await page.evaluate(() => Object.keys(sessionStorage).filter(key => key.startsWith('foodlog-restaurant-review-draft')).length);
  expect(draftCount).toBe(0);
  await page.locator('.restaurant-rating-shortcut').getByText('Edit your review').click();
  await form.getByLabel('Your review').fill('Older draft');
  await form.press('Escape');
  await page.evaluate(() => {
    const data = JSON.parse(localStorage.getItem('plate-log-data-v1'));
    const mine = data[0].ratings.find(entry => entry.email === 'you');
    mine.notes = 'Newer review from another session'; mine.updatedAt += 1000;
    localStorage.setItem('plate-log-data-v1', JSON.stringify(data));
  });
  await page.reload();
  await page.locator('.restaurant-rating-shortcut').getByText('Edit your review').click();
  await form.getByRole('button', { name: 'Save my review' }).click();
  await expect(form.getByText('The saved review changed', { exact: true })).toBeVisible();
  await form.getByRole('button', { name: 'Discard draft' }).click();
  await expect(form.getByLabel('Your review')).toHaveValue('Newer review from another session');
});

test('review action buttons and right-click respect authorship; Trash Undo restores prose and stars', async ({ page }) => {
  await detail(page);
  const mine = page.locator('.rating-row--mine');
  await expect(mine.getByRole('button', { name: 'Actions for your review' })).toBeVisible();
  await expect(page.locator('.rating-row').filter({ hasText: 'Friend restaurant review' }).locator('button')).toHaveCount(0);
  await mine.click({ button: 'right' });
  const actions = page.locator('#reviewActionSheet');
  await expect(actions).toBeVisible();
  await actions.getByRole('button', { name: 'Edit review', exact: true }).click();
  await expect(page.locator('#restaurantRatingModal').getByLabel('Your review')).toHaveValue('Saved restaurant review');
  await page.getByRole('button', { name: 'Close restaurant review' }).click();
  await mine.getByRole('button', { name: 'Actions for your review' }).click();
  await actions.getByRole('button', { name: 'Cancel' }).click();
  await expect(mine.getByRole('button', { name: 'Actions for your review' })).toBeFocused();
  await mine.getByRole('button', { name: 'Actions for your review' }).click();
  await actions.getByRole('button', { name: 'Move review to Trash' }).click();
  await expect(mine).toHaveCount(0);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(mine).toContainText('Saved restaurant review');
  await expect(mine).toContainText('4');
  await page.getByRole('button', { name: '2 reviews for Crispy noodles', exact: true }).click();
  const sheet = page.locator('#dishReviewsSheet');
  await expect(sheet.locator('.dish-rating-row').filter({ hasText: 'Friend dish review' }).locator('button')).toHaveCount(0);
  await sheet.getByRole('button', { name: 'Actions for your review' }).click();
  await actions.getByRole('button', { name: 'Move review to Trash' }).click();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await page.getByRole('button', { name: '2 reviews for Crispy noodles', exact: true }).click();
  await expect(sheet.locator('.dish-rating-row--mine')).toContainText('Saved dish review');
});

test('Undo does not replace a newer local review', async ({ page }) => {
  await detail(page);
  await page.getByRole('button', { name: 'Actions for your review' }).click();
  await page.getByRole('button', { name: 'Move review to Trash', exact: true }).click();
  await page.getByRole('button', { name: 'Add your review', exact: true }).click();
  const form = page.locator('#restaurantRatingModal');
  await form.getByRole('slider').press('End');
  await form.getByLabel('Your review').fill('New version');
  // Move the active toast's Undo into a separate reference; dispatch it after a new save.
  await page.evaluate(() => { window.uxUndoButton = document.querySelector('.toast-undo'); });
  await form.getByRole('button', { name: 'Save my review' }).click();
  await page.evaluate(() => window.uxUndoButton.click());
  await expect(page.locator('#toast')).toContainText('newer version was kept');
  await expect(page.locator('.rating-row--mine')).toContainText('New version');
});

test('live filters name their results; empty search recovers locally and matching dishes are explained', async ({ page }) => {
  await page.getByRole('button', { name: 'Open filters' }).click();
  await expect(page.locator('#applyFiltersButton')).toHaveText('Show 1 place');
  await page.getByRole('combobox', { name: 'Price', exact: true }).selectOption('$$$$');
  await expect(page.locator('#applyFiltersButton')).toHaveText('Show 0 places');
  await page.getByRole('button', { name: 'Close filters' }).click();
  await page.getByRole('searchbox').fill('not-a-match');
  const empty = page.locator('#restaurantList .empty-state');
  await empty.getByRole('button', { name: 'Clear search', exact: true }).click();
  await expect(page.locator('#priceFilter')).toHaveValue('$$$$');
  await empty.getByRole('button', { name: 'Reset filters', exact: true }).click();
  await page.getByRole('searchbox').fill('noodles');
  await expect(page.locator('.matched-dish-hint')).toHaveText('Matching dishes: Crispy noodles');
  await page.getByRole('searchbox').fill('Fixture');
  await expect(page.locator('.matched-dish-hint')).toHaveCount(0);
});

test('direct bookmarks, section links and sticky name stay reachable', async ({ page }, info) => {
  await detail(page);
  await page.locator('.detail-name-row').getByRole('button', { name: 'Add to Bookmarks', exact: true }).click();
  await expect(page.locator('.detail-bookmark-action')).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('navigation', { name: 'Place sections' }).getByRole('button', { name: 'Dishes (1)', exact: true }).click();
  await expect(page.locator('.detail-dishes-heading')).toBeFocused();
  if (info.project.name === 'mobile-chromium') await expect(page.locator('.detail-nav-name')).toHaveText('Fixture Kitchen');
});


test('a dish search opens its matching card and mobile history reopens safely', async ({ page }, info) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.getByRole('searchbox').fill('noodles');
  await detail(page);
  await expect(page.locator('.dish-card[data-dish-id="ux-dish"]')).toBeInViewport();
  if (info.project.name === 'mobile-chromium') {
    await expect.poll(() => page.locator('#detailPanel').evaluate(el => el.getAnimations().length)).toBe(0);
    await page.goBack();
    await expect.poll(() => page.locator('#listLayout').evaluate(el => !el.classList.contains('mobile-detail-open') && !document.documentElement.classList.contains('is-detail-swipe-settling'))).toBe(true);
    await expect(page.getByRole('button', { name: 'Open account menu', exact: true })).toBeVisible();
    await page.goForward();
    await expect(page.getByRole('button', { name: 'Back to places', exact: true })).toBeVisible();
  }
  expect(errors).toEqual([]);
});
