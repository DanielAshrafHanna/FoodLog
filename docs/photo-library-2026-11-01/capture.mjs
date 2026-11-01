// Disposable local-only capture of the photo library. Never points at production.
// Usage: node docs/photo-library-2026-11-01/capture.mjs <folder> [light|dark ...]
import { chromium, devices } from '@playwright/test';
import { readFile, mkdir } from 'node:fs/promises';

const folder = process.argv[2] ?? 'docs/photo-library-2026-11-01/shots';
const themes = process.argv.slice(3).length ? process.argv.slice(3) : ['light', 'dark'];
const photograph = await readFile(new URL('../../tests/fixtures/photography/salad-anna-pelzer.jpg', import.meta.url));
const photo = 'http://127.0.0.1:4173/fixture-salad.jpg';
const thumb = `${photo}?small=1`;
const credit = 'Anna Pelzer · preview photo';
const records = [{
  id: 'photo-table', name: 'The Garden Table', location: 'Maadi', cuisine: 'Vegetarian', price: '$$', maps: 'https://maps.example.com/garden',
  playlists: ['Weekend'], visited: ['Friend'], updatedAt: 4, notes: 'Shaded courtyard seating and a short seasonal menu.',
  photos: [{ id: 'room-preview', photo, thumb, contributorName: credit }, { id: 'room-two', photo, thumb, contributorName: credit }],
  ratings: [{ email: 'you', name: 'You', rating: 4.5, notes: 'A calm setting for lunch.' }, { email: 'friend', name: 'Friend', rating: 4, notes: '' }],
  dishes: [
    { id: 'photo-dish', name: 'Garden salad bowl', photos: [{ id: 'food-one', photo, thumb, contributorName: credit }, { id: 'food-two', photo, contributorName: credit }], ratings: [{ email: 'you', name: 'You', rating: 4.5, notes: 'Crisp vegetables, bright dressing, and plenty of texture.' }], likedBy: ['Friend'] },
    { id: 'plain-dish', name: 'Soup of the day', photos: [], ratings: [], likedBy: [] }
  ]
}, {
  id: 'photo-long', name: 'The Long Named Dining Room and Weekend Kitchen', location: 'New Cairo', cuisine: 'Modern international', price: '$$$',
  playlists: ['Dinner with friends', 'Special occasions'], visited: [], updatedAt: 3, photos: [{ id: 'second-preview', photo, contributorName: credit }], ratings: [], dishes: []
}, { id: 'photo-none', name: 'Next Kitchen', location: 'Zamalek', cuisine: 'Italian', playlists: [], visited: [], updatedAt: 2, photos: [], ratings: [], dishes: [] },
{ id: 'photo-four', name: 'Corner Bakery', location: 'Maadi', cuisine: 'Bakery', price: '$', playlists: ['Weekend'], visited: ['Friend'], updatedAt: 1, photos: [{ id: 'b-1', photo, contributorName: credit }], ratings: [{ email: 'friend', name: 'Friend', rating: 3.5, notes: 'Good coffee.' }], dishes: [] }];

const browser = await chromium.launch();
await mkdir(folder, { recursive: true });
const shots = [];
async function run(theme, profile) {
  const context = await browser.newContext({ ...(profile === 'phone' ? devices['Pixel 7'] : { viewport: { width: 1440, height: 960 } }), serviceWorkers: 'block' });
  const page = await context.newPage();
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.hostname !== '127.0.0.1') return route.abort();
    if (url.pathname === '/fixture-salad.jpg') return route.fulfill({ contentType: 'image/jpeg', body: photograph });
    if (url.pathname === '/config.js') return route.fulfill({ contentType: 'text/javascript', body: 'window.PLATE_LOG_CONFIG={};' });
    return route.continue();
  });
  await page.addInitScript(({ records, theme }) => {
    if (sessionStorage.getItem('capture-seeded')) return;
    localStorage.clear(); sessionStorage.setItem('capture-seeded', '1');
    localStorage.setItem('plate-log-data-v1', JSON.stringify(records));
    localStorage.setItem('plate-log-theme', theme);
    localStorage.setItem('foodlog-detail-swipe-hint-seen-v1', '1');
  }, { records, theme });
  await page.goto('http://127.0.0.1:4173/');
  await page.locator('.restaurant-row[data-id]').first().waitFor();
  const settle = () => page.evaluate(async () => { await document.fonts.ready; await Promise.all(document.getAnimations().map(a => a.finished.catch(() => {}))); await new Promise(r => setTimeout(r, 250)); });
  const shot = async (name) => { await settle(); const path = `${folder}/${profile}-${theme}-${name}.png`; await page.screenshot({ path }); shots.push(path); };
  await page.locator('.restaurant-row[data-id=photo-table]').click();
  await page.waitForTimeout(400);
  await shot('01-detail-hero');
  await page.locator('#detailPanel .detail-section-nav [data-section=photos]').click();
  await shot('02-photo-preview');
  await page.locator('#detailPanel .hero-photos-button').click();
  await shot('03-library-all');
  await page.locator('#photoLibrary [data-library-filter=dish]').click();
  await shot('04-library-dishes');
  await page.locator('#photoLibrary [data-library-filter=all]').click();
  await page.locator('#photoLibrary [data-action=library-photo][data-library-key^="place:"]').first().click();
  await shot('05-viewer-place');
  await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  await page.locator('#photoLibrary [data-action=library-photo][data-library-key^="dish:"]').first().click();
  await shot('06-viewer-dish');
  await context.close();
}
for (const theme of themes) for (const profile of ['desktop', 'phone']) await run(theme, profile);
await browser.close();
console.log(shots.join('\n'));
