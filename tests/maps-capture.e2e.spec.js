import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const mapsUrl = 'https://www.google.com/maps/place/Cafe+Roma/@30.1,31.2,15z';
test.beforeEach(async ({ page }) => {
  await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear(); sessionStorage.clear();
    localStorage.setItem('plate-log-data-v1', JSON.stringify([{id:'maps-seed', name:'Maps Fixture', location:'Maadi', cuisine:'Egyptian', playlists:[], visited:[], ratings:[], photos:[], dishes:[]} ]));
  });
  await page.reload();
  await page.getByRole('button', {name: 'Add restaurant', exact: true}).click();
});

test('Maps is immediately discoverable and a restaurant can still save without it', async ({ page }) => {
  const maps = page.getByRole('textbox', {name: 'Google Maps link (optional)', exact: true});
  await expect(maps).toBeVisible();
  await expect(page.locator('#restaurantMoreDetails > button')).toHaveAttribute('aria-expanded', 'false');
  await page.getByRole('button', {name: 'Check link', exact: true}).click();
  await expect(maps).toBeFocused();
  await expect(page.locator('#mapsResolveStatus')).toHaveText('Paste a Google Maps link first.');
  await page.getByLabel('Restaurant name', {exact: true}).fill('Palm Terrace');
  await page.getByRole('button', {name: 'Save restaurant', exact: true}).click();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('plate-log-data-v1')).find(r => r.name === 'Palm Terrace'));
  expect(saved.maps).toBe('');
});

test('checking previews details, applying fills an empty name and a saved URL survives reload', async ({page}) => {
  await page.locator('#mapsInput').fill(mapsUrl);
  await page.getByRole('button', {name: 'Check link', exact: true}).click();
  await expect(page.locator('#mapsResolvePreview')).toContainText('Cafe Roma');
  await expect(page.locator('#nameInput')).toHaveValue('');
  await page.getByRole('button', {name: 'Apply details', exact: true}).click();
  await expect(page.locator('#nameInput')).toHaveValue('Cafe Roma');
  await page.getByRole('button', {name: 'Save restaurant', exact: true}).click();
  await page.reload();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('plate-log-data-v1')).find(r => r.name === 'Cafe Roma').maps)).toBe(mapsUrl);
});

test('existing answers and URL drafts remain intact; editing a URL clears an outdated preview', async ({page}) => {
  await page.locator('#nameInput').fill('My chosen name');
  await page.locator('#locationSelect').fill('Maadi');
  await page.getByRole('option', {name: /^Maadi/}).click();
  await page.locator('#mapsInput').fill(mapsUrl);
  await page.getByRole('button', {name: 'Check link', exact: true}).click();
  await page.getByRole('button', {name: 'Apply details', exact: true}).click();
  await expect(page.locator('#nameInput')).toHaveValue('My chosen name');
  await expect(page.locator('#locationSelect')).toHaveValue('Maadi');
  await page.getByRole('button', {name: 'Check link', exact: true}).click();
  await page.locator('#mapsInput').fill('https://maps.app.goo.gl/new-draft');
  await expect(page.locator('#mapsResolvePreview')).toBeHidden();
  await page.locator('#closeRestaurantModal').click();
  await page.reload();
  await page.getByRole('button', {name: 'Add restaurant', exact: true}).click();
  await expect(page.locator('#mapsInput')).toBeVisible();
  await expect(page.locator('#mapsInput')).toHaveValue('https://maps.app.goo.gl/new-draft');
});

test('short-link errors keep the URL, enable retry, and do not block a manual save', async ({page}) => {
  let attempts = 0;
  await page.route('**/api/maps/resolve', route => {
    attempts++;
    return route.fulfill({status: 503, contentType: 'application/json', body: JSON.stringify({error: 'Could not check this link. Try again.'})});
  });
  const short = 'https://maps.app.goo.gl/offline-fixture';
  await page.locator('#mapsInput').fill(short);
  await page.getByRole('button', {name: 'Check link', exact: true}).click();
  await expect(page.locator('#mapsResolveStatus')).toContainText('Try again');
  await expect(page.locator('#mapsInput')).toHaveValue(short);
  await page.getByRole('button', {name: 'Check link', exact: true}).click();
  await expect(page.getByRole('button', {name: 'Check link', exact: true})).toBeEnabled();
  expect(attempts).toBe(2);
  await page.locator('#nameInput').fill('Offline Maps Fixture');
  await page.getByRole('button', {name: 'Save restaurant', exact: true}).click();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('plate-log-data-v1')).find(r => r.name === 'Offline Maps Fixture').maps)).toBe(short);
});

test('a delayed link check cannot replace a newer URL or show old details', async ({page}) => {
  let release;
  const responseReady = new Promise(resolve => { release = resolve; });
  await page.route('**/api/maps/resolve', async route => {
    await responseReady;
    await route.fulfill({contentType: 'application/json', body: JSON.stringify({finalUrl: mapsUrl, placeName: 'Old link name'})});
  });
  await page.locator('#mapsInput').fill('https://maps.app.goo.gl/delayed-fixture');
  const received = page.waitForResponse('**/api/maps/resolve');
  await page.getByRole('button', {name: 'Check link', exact: true}).click();
  await expect(page.getByRole('button', {name: 'Checking…', exact: true})).toBeDisabled();
  await page.locator('#mapsInput').fill('https://maps.app.goo.gl/newer-fixture');
  release(); await received;
  await expect(page.locator('#mapsInput')).toHaveValue('https://maps.app.goo.gl/newer-fixture');
  await expect(page.locator('#mapsResolvePreview')).toBeHidden();
  await expect(page.locator('#nameInput')).toHaveValue('');
});

test('the taller form keeps lookup menus above Save and allows validation without dismissing them first', async ({page}) => {
  await page.locator('#nameInput').fill('Terrace Kitchen');
  await page.locator('#cuisineSelect').fill('Unmatched cuisine fixture');
  await expect(page.locator('#cuisineOptions')).toBeVisible();
  await page.evaluate(async () => Promise.all(document.getAnimations().map(a => a.finished.catch(() => {}))));
  const options = await page.locator('#cuisineOptions').boundingBox();
  const footer = await page.locator('#restaurantModalActions').boundingBox();
  expect(options.y + options.height).toBeLessThanOrEqual(footer.y + 1);
  await page.getByRole('button', {name: 'Save restaurant', exact: true}).click();
  await expect(page.locator('#restaurantErrorSummary')).toContainText('confirm');
  await expect(page.locator('#restaurantModal')).toBeVisible();
});

test('Maps controls fit phone and desktop widths with readable themes and keyboard access', async ({page}) => {
  await page.addScriptTag({content: await readFile('node_modules/axe-core/axe.min.js', 'utf8')});
  for (const theme of ['light', 'dark']) for (const width of [320, 390, 515, 1280]) {
    await page.setViewportSize({width, height: 844});
    await page.evaluate(theme => { document.documentElement.classList.toggle('dark-theme', theme === 'dark'); }, theme);
    await page.evaluate(async () => { await document.fonts.ready; await Promise.all(document.getAnimations().map(a => a.finished.catch(() => {}))); });
    const card = page.locator('.maps-capture-card');
    await card.scrollIntoViewIfNeeded();
    expect(await card.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    const input = await page.locator('#mapsInput').boundingBox();
    const button = await page.locator('#resolveMapsButton').boundingBox();
    expect(button.x).toBeGreaterThanOrEqual(input.x + input.width + 7);
    expect(button.height).toBeGreaterThanOrEqual(44);
    expect(input.height).toBeGreaterThanOrEqual(44);
    const violations = await page.evaluate(async () => (await axe.run('.maps-capture-card', {runOnly: {type: 'rule', values: ['color-contrast', 'label', 'button-name']}})).violations);
    expect(violations).toEqual([]);
  }
  await page.locator('#mapsInput').focus();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', {name: 'Check link', exact: true})).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#mapsInput')).toBeFocused();
});
