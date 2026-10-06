import { expandRestaurantExtras, editCaptureLookup } from './quick-capture.helpers.js';
import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear(); sessionStorage.clear();
    localStorage.setItem('plate-log-data-v1', JSON.stringify(Array.from({length: 60}, (_, i) => ({
      id: `scroll-${i}`, name: `Scroll Table ${i}`, location: `Area ${i}`, cuisine: `Cuisine ${i}`,
      playlists: [], visited: [], ratings: [], photos: [], dishes: []
    }))));
    localStorage.setItem('foodlog-playlists-v1', JSON.stringify(Array.from({length: 60}, (_, i) => `Playlist ${i}`)));
  });
  await page.reload();
  await page.getByRole('button', {name: 'Add restaurant', exact: true}).click();
  await page.locator('#nameInput').fill('Scroll draft');
  await expandRestaurantExtras(page);
  await page.evaluate(async () => { await Promise.all(document.getAnimations().map(a => a.finished.catch(() => {}))); });
});

for (const kind of ['playlists', 'locations', 'cuisines']) {
  test(`${kind} scroll internally and hand off at both edges without closing the form`, async ({page}) => {
    const parent = page.locator('#restaurantEditorBody');
    const list = kind === 'playlists' ? page.locator('#playlistPicker .playlist-choice-list') : page.locator(kind === 'locations' ? '#locationOptions' : '#cuisineOptions');
    const target = kind === 'playlists' ? list : page.locator(kind === 'locations' ? '#locationSelect' : '#cuisineSelect');
    if (kind !== 'playlists') await editCaptureLookup(page, kind === 'locations' ? 'location' : 'cuisine');
    await target.evaluate(el => el.scrollIntoView({block: 'center', behavior: 'instant'}));
    if (kind !== 'playlists') await target.click();
    await expect(list).toBeVisible();
    await expect.poll(() => list.evaluate(el => el.scrollHeight - el.clientHeight)).toBeGreaterThan(100);
    const box = await list.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    const before = await parent.evaluate(el => el.scrollTop);
    await list.evaluate(el => { el.scrollTop = 0; });
    await page.mouse.wheel(0, 100);
    await expect.poll(() => list.evaluate(el => el.scrollTop)).toBeGreaterThan(0);
    expect(await parent.evaluate(el => el.scrollTop)).toBe(before);
    await list.evaluate(el => { el.scrollTop = el.scrollHeight; });
    await page.mouse.wheel(0, 150);
    await expect.poll(() => parent.evaluate(el => el.scrollTop)).toBeGreaterThan(before);
    // Reposition after the parent moves; the lookup popup follows its input.
    const moved = await list.boundingBox();
    await page.mouse.move(moved.x + moved.width / 2, moved.y + moved.height / 2);
    await list.evaluate(el => { el.scrollTop = 0; });
    const after = await parent.evaluate(el => el.scrollTop);
    await page.mouse.wheel(0, -100);
    await expect.poll(() => parent.evaluate(el => el.scrollTop)).toBeLessThan(after);
    await expect(page.locator('#restaurantModal')).toBeVisible();
    await expect(page.locator('#nameInput')).toHaveValue('Scroll draft');
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
  });
}

for (const kind of ['playlists', 'locations', 'cuisines']) {
  test(`${kind} hand off native touch swipes at the bottom and top`, async ({page}, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile-chromium', 'Touch input contract.');
    const parent = page.locator('#restaurantEditorBody');
    const list = kind === 'playlists' ? page.locator('#playlistPicker .playlist-choice-list') : page.locator(kind === 'locations' ? '#locationOptions' : '#cuisineOptions');
    const target = kind === 'playlists' ? list : page.locator(kind === 'locations' ? '#locationSelect' : '#cuisineSelect');
    if (kind !== 'playlists') await editCaptureLookup(page, kind === 'locations' ? 'location' : 'cuisine');
    await target.evaluate(el => el.scrollIntoView({block: 'center', behavior: 'instant'}));
    if (kind !== 'playlists') await target.click();
    await page.evaluate(async () => { await Promise.all(document.getAnimations().map(a => a.finished.catch(() => {}))); });
    const session = await page.context().newCDPSession(page);
    async function swipe(delta) {
      const box = await list.boundingBox();
      const x = box.x + box.width / 2;
      const y = box.y + box.height / 2 + delta / 2;
      await session.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: [{x, y}]});
      for (let step = 1; step <= 8; step++) {
        await session.send('Input.dispatchTouchEvent', {type: 'touchMove', touchPoints: [{x, y: y - delta * step / 8}]});
        await page.waitForTimeout(20);
      }
      await page.waitForTimeout(100);
      await session.send('Input.dispatchTouchEvent', {type: 'touchEnd', touchPoints: []});
    }
    await list.evaluate(el => { el.scrollTop = el.scrollHeight; });
    const before = await parent.evaluate(el => el.scrollTop);
    await swipe(80);
    await expect.poll(() => parent.evaluate(el => el.scrollTop)).toBeGreaterThan(before);
    await list.evaluate(el => { el.scrollTop = 0; });
    const after = await parent.evaluate(el => el.scrollTop);
    await swipe(-60);
    await expect.poll(() => parent.evaluate(el => el.scrollTop)).toBeLessThan(after);
    await session.detach();
    await expect(page.locator('#restaurantModal')).toBeVisible();
    await expect(page.locator('#nameInput')).toHaveValue('Scroll draft');
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
  });
}

test('desktop restaurant list hands off to the page at its bottom', async ({page}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Desktop nested panel contract.');
  await page.locator('#closeRestaurantModal').click();
  // Give the surrounding page room to scroll without depending on footer copy.
  await page.evaluate(() => {
    const spacer = document.createElement('div'); spacer.style.height = '600px';
    document.querySelector('main').append(spacer);
  });
  const list = page.locator('#restaurantList');
  await list.scrollIntoViewIfNeeded();
  await list.evaluate(el => { el.scrollTop = el.scrollHeight; });
  const box = await list.boundingBox();
  await page.mouse.move(box.x + box.width / 2, Math.min(box.y + box.height / 2, 600));
  const before = await page.evaluate(() => window.scrollY);
  await page.mouse.wheel(0, 150);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(before);
});
