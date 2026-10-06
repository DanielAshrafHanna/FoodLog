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

test('Maps is discoverable without a Check button and a restaurant can save without it', async ({ page }) => {
  await expect(page.getByRole('textbox', {name: 'Google Maps link (optional)', exact: true})).toBeVisible();
  await expect(page.getByRole('button', {name: 'Check link', exact: true})).toHaveCount(0);
  await expect(page.locator('#retryMapsButton')).toBeHidden();
  await expect(page.locator('#restaurantMoreDetails > button')).toHaveAttribute('aria-expanded', 'false');
  await page.getByLabel('Restaurant name', {exact: true}).fill('Palm Terrace');
  await page.getByRole('button', {name: 'Save restaurant', exact: true}).click();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('plate-log-data-v1')).find(r => r.name === 'Palm Terrace'));
  expect(saved.maps).toBe('');
});

test('automatic preview needs explicit Apply and a saved URL survives reload', async ({page}) => {
  await page.locator('#mapsInput').fill(mapsUrl);
  await expect(page.locator('#mapsResolvePreview')).toContainText('Cafe Roma');
  await expect(page.locator('#nameInput')).toHaveValue('');
  await page.getByRole('button', {name: 'Apply details', exact: true}).click();
  await expect(page.locator('#nameInput')).toHaveValue('Cafe Roma');
  await page.getByRole('button', {name: 'Save restaurant', exact: true}).click();
  await page.reload();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('plate-log-data-v1')).find(r => r.name === 'Cafe Roma').maps)).toBe(mapsUrl);
});

test('existing answers and URL drafts remain intact; editing clears an outdated preview', async ({page}) => {
  await page.locator('#nameInput').fill('My chosen name');
  await page.locator('#locationSelect').fill('Maadi');
  await page.getByRole('option', {name: /^Maadi/}).click();
  await page.locator('#mapsInput').fill(mapsUrl);
  await expect(page.locator('#mapsResolvePreview')).toBeVisible();
  await page.getByRole('button', {name: 'Apply details', exact: true}).click();
  await expect(page.locator('#nameInput')).toHaveValue('My chosen name');
  await expect(page.locator('#locationSelect')).toHaveValue('Maadi');
  await page.locator('#mapsInput').fill('https://maps.app.goo.gl/new-draft');
  await expect(page.locator('#mapsResolvePreview')).toBeHidden();
  await page.locator('#closeRestaurantModal').click();
  await page.reload();
  await page.getByRole('button', {name: 'Add restaurant', exact: true}).click();
  await expect(page.locator('#mapsInput')).toHaveValue('https://maps.app.goo.gl/new-draft');
});

test('failed short links offer Retry, retain the URL, and do not block saving', async ({page}) => {
  let attempts = 0;
  await page.route('**/api/maps/resolve', route => {
    attempts++;
    return route.fulfill({status: 503, contentType: 'application/json', body: JSON.stringify({error: 'Could not check this link. Try again.'})});
  });
  const short = 'https://maps.app.goo.gl/offline-fixture';
  await page.locator('#mapsInput').fill(short);
  await expect(page.locator('#mapsResolveStatus')).toContainText('Try again');
  await expect(page.locator('#mapsInput')).toHaveValue(short);
  await page.getByRole('button', {name: 'Retry link', exact: true}).click();
  await expect.poll(() => attempts).toBe(2);
  await expect(page.getByRole('button', {name: 'Retry link', exact: true})).toBeVisible();
  await page.locator('#nameInput').fill('Offline Maps Fixture');
  await page.getByRole('button', {name: 'Save restaurant', exact: true}).click();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('plate-log-data-v1')).find(r => r.name === 'Offline Maps Fixture').maps)).toBe(short);
});

test('typing replaces scheduled checks, while blur does not repeat a completed check', async ({page}) => {
  const requested = [];
  await page.route('**/api/maps/resolve', route => {
    requested.push(route.request().postDataJSON().url);
    return route.fulfill({contentType:'application/json',body:JSON.stringify({finalUrl:mapsUrl,placeName:'Cafe Roma'})});
  });
  await page.locator('#mapsInput').fill('https://maps.app.goo.gl/first');
  await page.locator('#mapsInput').fill('https://maps.app.goo.gl/second');
  await expect(page.locator('#mapsResolvePreview')).toBeVisible();
  expect(requested).toEqual(['https://maps.app.goo.gl/second']);
  await page.locator('#nameInput').fill('Chosen name');
  await page.waitForTimeout(650);
  expect(requested).toHaveLength(1);
});

test('a delayed check cannot overwrite a newer link or show old details', async ({page}) => {
  let release;
  const ready = new Promise(resolve => { release = resolve; });
  await page.route('**/api/maps/resolve', async route => {
    await ready;
    await route.fulfill({contentType:'application/json',body:JSON.stringify({finalUrl:mapsUrl,placeName:'Old link name'})}).catch(() => {});
  });
  await page.locator('#mapsInput').fill('https://maps.app.goo.gl/delayed-fixture');
  await expect(page.locator('#mapsResolveStatus')).toContainText('Checking');
  const newer = 'https://www.google.com/maps/place/New+Table/@30.2,31.3,15z';
  await page.locator('#mapsInput').fill(newer);
  await expect(page.locator('#mapsResolvePreview')).toContainText('New Table');
  release();
  await page.waitForTimeout(100);
  await expect(page.locator('#mapsInput')).toHaveValue(newer);
  await expect(page.locator('#mapsResolvePreview')).not.toContainText('Old link name');
  await expect(page.locator('#nameInput')).toHaveValue('');
});

test('closing cancels a scheduled check and partial or unrelated URLs are not sent', async ({page}) => {
  const requests = [];
  await page.route('**/api/maps/resolve', route => {
    requests.push(route.request().postDataJSON());
    return route.fulfill({status:503,body:'{}'});
  });
  await page.locator('#mapsInput').fill('https://maps.app.goo.gl/close-fixture');
  // Close via Escape before the debounce fires, without blurring onto a button.
  await page.locator('#mapsInput').press('Escape');
  await expect(page.locator('#restaurantModal')).toBeHidden();
  await page.waitForTimeout(650);
  expect(requests).toEqual([]);
  await page.getByRole('button', {name:'Add restaurant',exact:true}).click();
  await page.locator('#mapsInput').fill('https://example.com/place');
  await page.locator('#mapsInput').press('Tab');
  await page.waitForTimeout(650);
  expect(requests).toEqual([]);
  await expect(page.locator('#mapsResolvePreview')).toBeHidden();
});

test('clearing a Maps link removes its preview and retry state', async ({page}) => {
  await page.locator('#mapsInput').fill(mapsUrl);
  await expect(page.locator('#mapsResolvePreview')).toBeVisible();
  await page.locator('#mapsInput').fill('');
  await expect(page.locator('#mapsResolvePreview')).toBeHidden();
  await expect(page.locator('#mapsResolveStatus')).toBeEmpty();
  await expect(page.locator('#retryMapsButton')).toBeHidden();
});

test('lookup menus remain above Save and validation does not dismiss the form', async ({page}) => {
  await page.locator('#nameInput').fill('Terrace Kitchen');
  await page.locator('#cuisineSelect').fill('Unmatched cuisine fixture');
  await expect(page.locator('#cuisineOptions')).toBeVisible();
  await page.evaluate(async () => Promise.all(document.getAnimations().map(a => a.finished.catch(() => {}))));
  const options = await page.locator('#cuisineOptions').boundingBox();
  const footer = await page.locator('#restaurantModalActions').boundingBox();
  expect(options.y + options.height).toBeLessThanOrEqual(footer.y + 1);
  await page.getByRole('button', {name:'Save restaurant',exact:true}).click();
  await expect(page.locator('#restaurantErrorSummary')).toContainText('confirm');
  await expect(page.locator('#restaurantModal')).toBeVisible();
});

test('a late automatic preview keeps an open lookup menu anchored to its field', async ({page}) => {
  let release;
  const ready = new Promise(resolve => { release = resolve; });
  await page.route('**/api/maps/resolve', async route => {
    await ready;
    await route.fulfill({contentType:'application/json',body:JSON.stringify({finalUrl:mapsUrl,placeName:'Cafe Roma'})});
  });
  await page.locator('#mapsInput').fill('https://maps.app.goo.gl/lookup-fixture');
  await expect(page.locator('#mapsResolveStatus')).toContainText('Checking');
  await page.locator('#locationSelect').click();
  await expect(page.locator('#locationOptions')).toBeVisible();
  release();
  await expect(page.locator('#mapsResolvePreview')).toBeVisible();
  await expect.poll(async () => {
    const input = await page.locator('#locationSelect').boundingBox();
    const list = await page.locator('#locationOptions').boundingBox();
    const upward = await page.locator('#locationOptions').getAttribute('data-origin') === 'bottom-left';
    return Math.abs(upward ? list.y + list.height + 6 - input.y : list.y - input.y - input.height - 6);
  }).toBeLessThanOrEqual(1);
});

test('full-width Maps input fits themes and breakpoints, with a keyboard-accessible preview', async ({page}) => {
  await page.addScriptTag({content:await readFile('node_modules/axe-core/axe.min.js','utf8')});
  for (const theme of ['light','dark']) for (const width of [320,390,515,1280]) {
    await page.setViewportSize({width,height:844});
    await page.evaluate(theme => { document.documentElement.classList.toggle('dark-theme',theme === 'dark'); },theme);
    await page.evaluate(async () => { await document.fonts.ready; await Promise.all(document.getAnimations().map(a=>a.finished.catch(()=>{}))); });
    const card = page.locator('.maps-capture-card');
    await card.scrollIntoViewIfNeeded();
    expect(await card.evaluate(el=>el.scrollWidth <= el.clientWidth)).toBe(true);
    const input = await page.locator('#mapsInput').boundingBox();
    const row = await page.locator('.maps-input-row').boundingBox();
    expect(input.width).toBeGreaterThanOrEqual(row.width - 2);
    expect(input.height).toBeGreaterThanOrEqual(44);
    const violations = await page.evaluate(async () => (await axe.run('.maps-capture-card',{runOnly:{type:'rule',values:['color-contrast','label','button-name']}})).violations);
    expect(violations).toEqual([]);
  }
  await page.locator('#mapsInput').fill(mapsUrl);
  await expect(page.locator('#mapsResolvePreview')).toBeVisible();
  await page.locator('#mapsInput').press('Tab');
  await expect(page.getByRole('button',{name:'Apply details',exact:true})).toBeFocused();
  await page.getByRole('button',{name:'Apply details',exact:true}).press('Enter');
  await expect(page.locator('#nameInput')).toHaveValue('Cafe Roma');
});
