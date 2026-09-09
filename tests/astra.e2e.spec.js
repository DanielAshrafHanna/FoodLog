import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('plate-log-data-v1', JSON.stringify([
      {
        id: 'recap-table',
        name: 'Recap Table',
        location: 'Maadi',
        cuisine: 'Egyptian',
        price: '$$',
        maps: 'https://maps.example.com/recap-table',
        visited: ['Friend'],
        playlists: [],
        photos: [],
        updatedAt: 2,
        ratings: [{ email: 'friend@example.com', name: 'Friend', rating: 4 }],
        dishes: [{
          id: 'recap-dish',
          name: 'Roasted aubergine',
          photo: '',
          likedBy: [],
          ratings: [{ email: 'friend@example.com', name: 'Friend', rating: 4, notes: 'Smoky and soft.' }]
        }]
      },
      {
        id: 'unvisited-table',
        name: 'Tomorrow Table',
        location: 'Zamalek',
        cuisine: 'Italian',
        price: '$$',
        visited: [],
        playlists: [],
        photos: [],
        ratings: [],
        dishes: [],
        updatedAt: 1
      }
    ]));
  });
  await page.reload();
});

test('uses one global Add place entry and removes the visit recap', async ({ page }) => {
  await expect(page.locator('#logVisitButton')).toHaveCount(0);
  await expect(page.locator('#visitRecapModal')).toHaveCount(0);
  await expect(page.getByText('Review a meal', { exact: true })).toHaveCount(0);

  const addPlace = page.getByRole('button', { name: 'Add place', exact: true });
  await expect(addPlace).toHaveCount(1);
  await expect(addPlace).toBeVisible();
  await addPlace.click();
  await expect(page.locator('#restaurantModal')).toBeVisible();
});

test('keeps rating and dish actions on the restaurant instead of a recap', async ({ page }) => {
  await page.locator('.restaurant-row').first().click();
  const detail = page.locator('#detailPanel');
  const maps = detail.getByRole('link', { name: 'Open in Maps', exact: true });
  await expect(maps).toBeVisible();
  await expect(maps).toHaveClass(/primary-action/);
  await expect(detail.getByRole('button', { name: 'Add your rating', exact: true })).toBeVisible();
  await expect(detail.getByRole('button', { name: 'Add dish', exact: true })).toBeVisible();

  await detail.getByRole('button', { name: 'More', exact: true }).click();
  const actions = page.getByRole('dialog', { name: 'Place actions' });
  await expect(actions.getByRole('button', { name: 'Review this visit' })).toHaveCount(0);
  await expect(actions.getByRole('button', { name: 'Share place' })).toBeVisible();
});

test('opens the existing guided dish form directly from its restaurant', async ({ page }) => {
  await page.locator('.restaurant-row').first().click();
  await page.locator('#detailPanel').getByRole('button', { name: 'Add dish', exact: true }).click();

  const dialog = page.locator('#dishModal');
  await expect(dialog).toBeVisible();
  await expect(page.locator('#dishModalEyebrow')).toHaveText('Recap Table');
  await expect(dialog.locator('#photoPreview')).toBeHidden();
  await dialog.getByLabel('Dish name').fill('Test plate');
  await dialog.getByRole('button', { name: 'Your take', exact: true }).click();
  await dialog.getByRole('textbox', { name: 'Add a person', exact: true }).fill('Audit friend');
  await dialog.getByRole('textbox', { name: 'Add a person', exact: true }).press('Enter');
  const person = dialog.getByRole('button', { name: 'Audit friend', exact: true });
  await expect(person).toHaveAttribute('aria-pressed', 'true');
});
