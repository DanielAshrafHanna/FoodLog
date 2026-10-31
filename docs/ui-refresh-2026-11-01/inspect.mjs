// Disposable local-only layout probe. Never points at production.
import { chromium, devices } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const photograph = await readFile(new URL('../../tests/fixtures/photography/salad-anna-pelzer.jpg', import.meta.url));
const photo = 'http://127.0.0.1:4173/fixture-salad.jpg';
const credit = 'Anna Pelzer · preview photo';
const records = [{
  id: 'photo-table', name: 'The Garden Table', location: 'Maadi', cuisine: 'Vegetarian', price: '$$', maps: 'https://maps.example.com/garden',
  playlists: ['Weekend'], visited: ['Friend'], updatedAt: 4, notes: 'Shaded courtyard seating.',
  photos: [{ id: 'room-preview', photo, contributorName: credit }],
  ratings: [{ email: 'you', name: 'You', rating: 4.5, notes: 'A calm setting for lunch.' }, { email: 'friend', name: 'Friend', rating: 4, notes: '' }],
  dishes: [{ id: 'photo-dish', name: 'Garden salad bowl', photos: [{ id: 'food-one', photo, contributorName: credit }], ratings: [{ email: 'you', name: 'You', rating: 4.5, notes: 'Crisp.' }], likedBy: [] }]
}, { id: 'photo-none', name: 'Next Kitchen', location: 'Zamalek', cuisine: 'Italian', playlists: ['Dinner with friends'], visited: [], updatedAt: 2, photos: [], ratings: [], dishes: [] }];

const probes = process.argv.slice(2);
const browser = await chromium.launch();
for (const profile of ['phone', 'desktop']) {
  const context = await browser.newContext({ ...(profile === 'phone' ? devices['Pixel 7'] : { viewport: { width: 1440, height: 960 } }), serviceWorkers: 'block' });
  const page = await context.newPage();
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.hostname !== '127.0.0.1') return route.abort();
    if (url.pathname === '/fixture-salad.jpg') return route.fulfill({ contentType: 'image/jpeg', body: photograph });
    if (url.pathname === '/config.js') return route.fulfill({ contentType: 'text/javascript', body: 'window.PLATE_LOG_CONFIG={};' });
    return route.continue();
  });
  await page.addInitScript(records => {
    if (sessionStorage.getItem('probe-seeded')) return;
    localStorage.clear(); sessionStorage.setItem('probe-seeded', '1');
    localStorage.setItem('plate-log-data-v1', JSON.stringify(records));
    localStorage.setItem('foodlog-detail-swipe-hint-seen-v1', '1');
  }, records);
  await page.goto('http://127.0.0.1:4173/');
  await page.locator('.restaurant-row[data-id]').first().waitFor();
  const dump = async label => {
    const out = await page.evaluate(selectors => selectors.map(sel => {
      const el = document.querySelector(sel);
      if (!el) return `${sel}: missing`;
      const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
      return `${sel}: x=${r.x.toFixed(0)} y=${r.y.toFixed(0)} w=${r.width.toFixed(0)} h=${r.height.toFixed(0)} pad=${cs.padding} margin=${cs.margin} bg=${cs.backgroundColor} border=${cs.borderTopWidth} ${cs.borderTopColor} radius=${cs.borderRadius} shadow=${cs.boxShadow} font=${cs.fontSize}/${cs.fontWeight} color=${cs.color} gap=${cs.gap}`;
    }), probes);
    console.log(`\n## ${profile} ${label}\n${out.join('\n')}`);
  };
  await dump('browse');
  await page.locator('.restaurant-row[data-id=photo-table]').click();
  await page.waitForTimeout(500);
  await dump('detail');
  await context.close();
}
await browser.close();
