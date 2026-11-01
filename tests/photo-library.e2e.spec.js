import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const photograph = await readFile(new URL('./fixtures/photography/salad-anna-pelzer.jpg', import.meta.url));
const photo = 'http://127.0.0.1:4173/fixture-salad.jpg';
const credit = 'Anna Pelzer · preview photo';
const records = [{
  id: 'photo-table', name: 'The Garden Table', location: 'Maadi', cuisine: 'Vegetarian', price: '$$', playlists: [], visited: [], updatedAt: 2,
  photos: [
    { id: 'room-main', photo, contributorName: credit, createdAt: 3, isCover: true },
    { id: 'room-menu', photo, contributorName: credit, createdAt: 4 }
  ],
  ratings: [],
  dishes: [
    { id: 'photo-dish', name: 'Garden salad bowl', photos: [{ id: 'food-one', photo, contributorName: credit, createdAt: 2 }, { id: 'food-two', photo, contributorName: credit, createdAt: 1 }], ratings: [], likedBy: [] },
    { id: 'plain-dish', name: 'Soup of the day', photos: [], ratings: [], likedBy: [] }
  ]
}, { id: 'photo-none', name: 'Next Kitchen', playlists: [], visited: [], updatedAt: 1, photos: [], ratings: [], dishes: [] }];

async function boot(page, { data = records, theme = 'light' } = {}) {
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.hostname !== '127.0.0.1') return route.abort();
    if (url.pathname === '/fixture-salad.jpg') return route.fulfill({ contentType: 'image/jpeg', body: photograph });
    if (url.pathname === '/config.js') return route.fulfill({ contentType: 'text/javascript', body: 'window.PLATE_LOG_CONFIG={};' });
    return route.continue();
  });
  await page.addInitScript(({ records, theme }) => {
    if (sessionStorage.getItem('library-seeded')) return;
    localStorage.clear();
    sessionStorage.setItem('library-seeded', '1');
    localStorage.setItem('plate-log-data-v1', JSON.stringify(records));
    localStorage.setItem('plate-log-theme', theme);
    localStorage.setItem('foodlog-detail-swipe-hint-seen-v1', '1');
  }, { records: data, theme });
  await page.goto('/');
  await page.locator('.restaurant-row[data-id=photo-table]').click();
  await expect(page.locator('#detailPanel .detail-hero')).toBeVisible();
}

const stored = page => page.evaluate(() => JSON.parse(localStorage.getItem('plate-log-data-v1')).find(entry => entry.id === 'photo-table'));

test('one library shows place and dish photos with filters, labels and focus return', async ({ page }) => {
  await boot(page);
  const detail = page.locator('#detailPanel');
  await expect(detail.locator('.detail-section-nav [data-section=photos]')).toHaveText('Photos (4)');
  await expect(detail.locator('.photo-mosaic .library-tile')).toHaveCount(4);
  await expect(detail.locator('.photo-mosaic .library-tile-dish')).toHaveCount(2);

  const heroButton = detail.getByRole('button', { name: 'See all 4 photos' });
  await heroButton.click();
  const library = page.locator('#photoLibrary');
  await expect(library).toBeVisible();
  await expect(library.locator('#photoLibraryPlace')).toHaveText('The Garden Table');
  await expect(library.locator('[data-library-filter=all]')).toHaveAttribute('aria-pressed', 'true');
  await expect(library.locator('[data-library-count=all]')).toHaveText('4');
  await expect(library.locator('[data-library-count=place]')).toHaveText('2');
  await expect(library.locator('[data-library-count=dish]')).toHaveText('2');
  const keys = await library.locator('.library-tile').evaluateAll(tiles => tiles.map(tile => tile.dataset.libraryKey));
  expect(keys).toEqual(['place:room-menu', 'place:room-main', 'dish:photo-dish:food-one', 'dish:photo-dish:food-two']);
  await expect(library.locator('.library-tile.is-main .library-tile-badge')).toHaveText('Main photo');

  await library.locator('[data-library-filter=dish]').click();
  await expect(library.locator('.photo-library-group h3')).toHaveText(['Garden salad bowl 2']);
  await expect(library.locator('.library-tile-dish')).toHaveCount(0);
  await library.locator('[data-library-filter=place]').click();
  await expect(library.locator('.library-tile')).toHaveCount(2);

  await page.addScriptTag({ content: await readFile('node_modules/axe-core/axe.min.js', 'utf8') });
  const violations = await page.evaluate(async () => (await axe.run(document.querySelector('#photoLibrary'), { runOnly: { type: 'rule', values: ['color-contrast', 'button-name', 'aria-valid-attr-value', 'label'] } })).violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })));
  expect(violations).toEqual([]);

  await page.keyboard.press('Escape');
  await expect(library).toBeHidden();
  await expect(heroButton).toBeFocused();
});

test('the viewer offers place and dish actions and View dish lands on the dish', async ({ page }) => {
  await boot(page);
  await page.locator('#detailPanel .hero-photos-button').click();
  const library = page.locator('#photoLibrary');
  const viewer = page.locator('#sharedGallery');
  await library.locator('[data-library-key="place:room-menu"]').click();
  await expect(viewer).toBeVisible();
  await expect(viewer.getByRole('button', { name: 'Set as main photo', exact: true })).toBeVisible();
  await expect(viewer.getByRole('button', { name: 'Make it a dish', exact: true })).toBeVisible();
  await expect(viewer.getByRole('button', { name: 'Move to Trash', exact: true })).toBeVisible();
  await viewer.getByRole('button', { name: 'Next photo' }).click();
  await viewer.getByRole('button', { name: 'Next photo' }).click();
  await expect(viewer.locator('[data-gallery-caption]')).toContainText('3 of 4 · Garden salad bowl · Photo by Anna Pelzer');
  await expect(viewer.getByRole('button', { name: /main photo/i })).toBeHidden();
  await expect(viewer.getByRole('button', { name: 'Make it a dish', exact: true })).toBeHidden();
  await expect(viewer.locator('[data-gallery-navigation]').getByRole('button', { name: 'View dish', exact: true })).toBeVisible();
  await expect(viewer.locator('[data-gallery-actions]').getByRole('button', { name: 'View dish', exact: true })).toHaveCount(0);
  await viewer.getByRole('button', { name: 'View dish', exact: true }).click();
  await expect(viewer).toBeHidden();
  await expect(library).toBeHidden();
  await expect(page.locator('#detailPanel .dish-card[data-dish-id=photo-dish]')).toBeInViewport();
  await expect.poll(() => page.evaluate(() => Boolean(document.activeElement?.closest('.dish-card[data-dish-id="photo-dish"]')))).toBe(true);
});

test('Make it a dish moves an ordinary place photo only after the dish photo is stored', async ({ page }) => {
  await boot(page);
  await page.locator('#detailPanel .hero-photos-button').click();
  await page.locator('#photoLibrary [data-library-key="place:room-menu"]').click();
  await page.locator('#sharedGallery').getByRole('button', { name: 'Make it a dish', exact: true }).click();
  const dishModal = page.locator('#dishModal');
  await expect(dishModal).toBeVisible();
  await expect(page.locator('#photoLibrary')).toBeHidden();
  await expect(page.locator('#dishDraftStatus')).toContainText('When the dish saves, the photo moves here from the place photos.');
  await expect(page.locator('#photoPreview img')).toHaveCount(1);
  await page.locator('#dishNameInput').fill('Courtyard mezze');
  await page.locator('#saveDishButton').click();
  await expect.poll(async () => {
    const restaurant = await stored(page);
    const dish = restaurant.dishes.find(entry => entry.name === 'Courtyard mezze');
    return { dishPhotos: dish?.photos?.length ?? 0, menuTrashed: Boolean(restaurant.photos.find(entry => entry.id === 'room-menu')?.deletedAt) };
  }, { timeout: 15000 }).toEqual({ dishPhotos: 1, menuTrashed: true });
  const restaurant = await stored(page);
  expect(restaurant.photos.find(entry => entry.id === 'room-main').deletedAt).toBeFalsy();
  await expect(page.locator('#detailPanel .detail-section-nav [data-section=photos]')).toHaveText('Photos (4)');
});

test('Make it a dish keeps the main place photo in place', async ({ page }) => {
  await boot(page);
  await page.locator('#detailPanel .hero-photos-button').click();
  await page.locator('#photoLibrary [data-library-key="place:room-main"]').click();
  await page.locator('#sharedGallery').getByRole('button', { name: 'Make it a dish', exact: true }).click();
  await expect(page.locator('#dishDraftStatus')).toContainText('It also stays the main photo of the place.');
  await page.locator('#dishNameInput').fill('House bread');
  await page.locator('#saveDishButton').click();
  await expect.poll(async () => (await stored(page)).dishes.find(entry => entry.name === 'House bread')?.photos?.length ?? 0, { timeout: 15000 }).toBe(1);
  await page.waitForTimeout(500);
  const restaurant = await stored(page);
  expect(restaurant.photos.find(entry => entry.id === 'room-main')).toMatchObject({ isCover: true });
  expect(restaurant.photos.find(entry => entry.id === 'room-main').deletedAt).toBeFalsy();
});

test('an empty restaurant keeps Add photos and hides the library entry points', async ({ page }) => {
  await boot(page);
  if (test.info().project.name === 'mobile-chromium') await page.getByRole('button', { name: 'Back to places' }).click();
  await page.locator('.restaurant-row[data-id=photo-none]').click();
  const detail = page.locator('#detailPanel');
  await expect(detail.locator('h2')).toHaveText('Next Kitchen');
  await expect(detail.locator('.hero-photos-button')).toHaveCount(0);
  await expect(detail.locator('[data-action=open-photo-library]')).toHaveCount(0);
  await expect(detail.locator('#restaurantPhotoInput')).toHaveCount(1);
  await expect(detail.locator('.photo-mosaic .empty-state')).toHaveText('No photos yet.');
});

for (const theme of ['light', 'dark']) test(`${theme} photo viewer connects the correct dish ratings without losing gallery controls`, async ({ page }) => {
  const data = structuredClone(records), dish = data[0].dishes[0];
  const prose = 'Fresh greens, crisp chickpeas and a bright dressing. '.repeat(30);
  dish.ratings = [
    {email:'you',name:'Jamie',rating:5,notes:prose},
    {email:'sam@example.com',name:'Sam',rating:4,notes:'A dish worth ordering again.'},
    {email:'removed@example.com',name:'Removed reviewer',rating:1,notes:'Old review',deletedAt:1}
  ];
  data[0].dishes.push(
    {id:'score-dish',name:'Tomato soup',photos:[{id:'soup-photo',photo,contributorName:credit}],ratings:[{email:'sam@example.com',name:'Sam',rating:3,notes:''}]},
    {id:'unrated-dish',name:'House bread',photos:[{id:'bread-photo',photo,contributorName:credit}],ratings:[]}
  );
  await boot(page, { data, theme });
  await page.locator('#detailPanel .hero-photos-button').click();
  const library=page.locator('#photoLibrary'), viewer=page.locator('#sharedGallery'), context=viewer.locator('[data-gallery-context]');
  await library.locator('[data-library-filter=dish]').click();
  const tile=library.locator('[data-library-key="dish:photo-dish:food-one"]');
  await tile.click();
  await expect(context.getByRole('heading',{name:'Garden salad bowl'})).toBeVisible();
  await expect(context.locator('.gallery-dish-score')).toHaveText('4.5 / 52 ratings');
  await expect(context.locator('.gallery-review-preview')).toContainText('Jamie');
  await expect(viewer.locator('[data-gallery-caption]')).toContainText('Photo by Anna Pelzer');
  await expect(context).not.toContainText('Anna Pelzer');
  await expect(context).not.toContainText('Removed reviewer');
  await viewer.getByText('Read all reviews (2)',{exact:true}).click();
  await expect(context.locator('.gallery-reviews-list .gallery-review')).toHaveCount(2);
  await expect(viewer.getByRole('button',{name:'View dish',exact:true})).toBeInViewport();
  await expect(viewer.getByRole('button',{name:'Move to Trash',exact:true})).toBeInViewport();
  await context.focus();await page.keyboard.press('ArrowRight');
  await expect(viewer.locator('[data-gallery-caption]')).toContainText('1 of 4');
  await expect(context.locator('.gallery-reviews-list .gallery-review-prose').first()).toHaveText(prose.trim());
  // Reading scroll belongs to the footer; it must not consume photo gestures or trap Close.
  await viewer.getByRole('button',{name:'Zoom in',exact:true}).click();
  await expect(viewer.locator('[data-gallery-zoom]')).toHaveAttribute('aria-pressed','true');
  await viewer.getByRole('button',{name:'Next photo',exact:true}).click();
  await expect(viewer.locator('[data-gallery-zoom]')).toHaveAttribute('aria-pressed','false');
  await expect(context.locator('details')).not.toHaveAttribute('open','');
  await viewer.getByRole('button',{name:'Next photo',exact:true}).click();
  await expect(context.getByRole('heading',{name:'Tomato soup'})).toBeVisible();
  await expect(context.locator('.gallery-dish-score')).toHaveText('3 / 51 rating');
  await expect(context.locator('.gallery-review-prose,details')).toHaveCount(0);
  await viewer.getByRole('button',{name:'Next photo',exact:true}).click();
  await expect(context).toBeHidden();
  await viewer.getByRole('button',{name:'Previous photo',exact:true}).click();
  await page.addScriptTag({content:await readFile('node_modules/axe-core/axe.min.js','utf8')});
  expect(await page.evaluate(async()=>(await axe.run(document.querySelector('#sharedGallery'),{runOnly:{type:'rule',values:['color-contrast','button-name','aria-valid-attr-value','label']}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})))).toEqual([]);
  for(const size of [{width:320,height:740},{width:844,height:390},{width:1024,height:900},{width:1440,height:1000}]){
    await page.setViewportSize(size);
    expect(await viewer.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
    expect((await viewer.locator('.gallery-viewport').boundingBox()).height).toBeGreaterThan(100);
    await expect(viewer.getByRole('button',{name:'Close',exact:true})).toBeInViewport();
    for(const button of await viewer.locator('[data-gallery-actions] button:visible, [data-gallery-navigation] button:visible').all()){
      const box=await button.boundingBox();expect(box.width).toBeGreaterThanOrEqual(44);expect(box.height).toBeGreaterThanOrEqual(44);expect(box.height).toBeLessThanOrEqual(56);
    }
  }
  await page.keyboard.press('Escape');await expect(viewer).toBeHidden();await expect(tile).toBeFocused();
  // All-photo navigation must clear the dish review when the current image is a place photo.
  await library.locator('[data-library-filter=all]').click();
  await library.locator('[data-library-key="dish:photo-dish:food-one"]').click();
  await viewer.getByRole('button',{name:'Previous photo',exact:true}).click();
  await expect(context).toBeHidden();
  await expect(viewer.locator('[data-gallery-cover]')).toBeVisible();
  await expect(viewer.locator('[data-gallery-cover]')).toHaveAttribute('aria-label','Main photo');
  await page.keyboard.press('Escape');await library.getByRole('button',{name:'Close photos'}).click();
  // The same read-only context is also present when opening from the dish itself.
  await page.locator('#detailPanel .dish-card[data-dish-id="photo-dish"] .dish-gallery-cover').first().click();
  await expect(context.locator('.gallery-review-preview')).toContainText('Jamie');
  await expect(viewer.locator('.shared-gallery-image')).toHaveAttribute('src',photo);
});
