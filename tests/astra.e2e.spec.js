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
  await expect(detail.locator('.restaurant-rating-heading').getByRole('button', { name: 'Add your rating', exact: true })).toBeVisible();
  await expect(detail.locator('.detail-actions [data-action="write-restaurant-rating"]')).toHaveCount(0);
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

async function prepareMissingRestaurantDetails(page) {
  await page.evaluate(() => {
    const data = JSON.parse(localStorage.getItem('plate-log-data-v1'));
    data[0].location = '';
    data[0].cuisine = '';
    localStorage.setItem('plate-log-data-v1', JSON.stringify(data));
  });
  await page.reload();
  if (await page.locator('.restaurant-row').first().isVisible()) await page.locator('.restaurant-row').first().click();
}

test('quickly adds missing location and cuisine without opening the restaurant editor', async ({page}) => {
  await prepareMissingRestaurantDetails(page);
  const before = await page.evaluate(() => JSON.parse(localStorage.getItem('plate-log-data-v1'))[0]);
  await page.getByRole('button', {name:'+ Add location',exact:true}).click();
  const dialog = page.locator('#quickMetadataModal');
  await expect(dialog).toBeVisible();
  await expect(page.locator('#restaurantModal')).toBeHidden();
  await expect(dialog.getByLabel('Location',{exact:true})).toBeFocused();
  await expect(dialog.locator('#quickMetadataOptions option[value="Zamalek"]')).toHaveCount(1);
  await dialog.getByRole('button',{name:'Save location',exact:true}).click();
  await expect(dialog.getByRole('alert')).toContainText('Enter a location');
  await dialog.getByLabel('Location',{exact:true}).fill('  Zamalek  ');
  await dialog.getByLabel('Location',{exact:true}).press('Enter');
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('button',{name:'+ Add location',exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'+ Add cuisine',exact:true}).click();
  await expect(dialog.locator('#quickMetadataOptions option[value="Italian"]')).toHaveCount(1);
  await dialog.getByLabel('Cuisine',{exact:true}).fill('Contemporary Egyptian');
  await dialog.getByRole('button',{name:'Save cuisine',exact:true}).click();
  await expect(dialog).toBeHidden();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('plate-log-data-v1'))[0]);
  expect(saved).toMatchObject({...before, location:'Zamalek', cuisine:'Contemporary Egyptian', updatedAt:saved.updatedAt});
  await page.reload();
  await expect(page.locator('#detailPanel .eyebrow').first()).toHaveText('Contemporary Egyptian');
});

test('quick metadata cancel and failed save preserve the restaurant and allow retry', async ({page}) => {
  await page.route('**/app.js*', async route => {
    const response = await route.fetch();
    const source = await response.text();
    const start = 'async function saveQuickRestaurantField(restaurant, field, value) {';
    expect(source).toContain(start);
    await route.fulfill({response,body:source.replace(start, `${start}
      window.__quickSaveAttempts = (window.__quickSaveAttempts || 0) + 1;
      if (window.__quickSaveAttempts === 1) { await new Promise(resolve => setTimeout(resolve, 100)); throw new Error('Temporary save failure. Try again.'); }
    `)});
  });
  await prepareMissingRestaurantDetails(page);
  await page.getByRole('button',{name:'+ Add location',exact:true}).click();
  const dialog = page.locator('#quickMetadataModal');
  await dialog.getByLabel('Location',{exact:true}).fill('Cancelled area');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button',{name:'+ Add location',exact:true})).toBeFocused();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('plate-log-data-v1'))[0].location)).toBe('');
  await page.getByRole('button',{name:'+ Add location',exact:true}).click();
  await dialog.getByLabel('Location',{exact:true}).fill('Garden City');
  await dialog.locator('form').evaluate(form => { form.requestSubmit(); form.requestSubmit(); });
  await expect(dialog.locator('.form-status')).toContainText('Temporary save failure');
  expect(await page.evaluate(() => window.__quickSaveAttempts)).toBe(1);
  await expect(dialog.getByLabel('Location',{exact:true})).toHaveValue('Garden City');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('plate-log-data-v1'))[0].location)).toBe('');
  await dialog.getByRole('button',{name:'Save location',exact:true}).click();
  await expect(dialog).toBeHidden();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('plate-log-data-v1'))[0].location)).toBe('Garden City');
});
