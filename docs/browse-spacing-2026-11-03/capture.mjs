// Run npm start first, then: node docs/browse-controls-2026-11-03/capture.mjs
// Invented local records only; all external requests are blocked.
import { chromium } from '@playwright/test';
import { fileURLToPath } from 'node:url';
const baseURL = process.env.BROWSE_PREVIEW_URL || 'http://127.0.0.1:4184';
const browser = await chromium.launch();
const data = Array.from({ length: 12 }, (_, i) => ({
  id: `fixture-${i}`, name: ['Juniper Table', 'Nori Kitchen', 'Copper Oven'][i % 3] + (i > 2 ? ` ${i}` : ''),
  location: i % 2 ? 'Mohandsein' : 'Maadi', cuisine: i % 2 ? 'Korean' : 'Italian', price: '$$',
  playlists: i % 2 ? ['Asian'] : ['Weekend'], visited: i % 3 ? ['Fixture author'] : [],
  ratings: [], photos: [], dishes: [], updatedAt: 100 - i
}));
try {
  for (const width of [320, 390, 1440]) for (const theme of ['light', 'dark']) for (const filtered of [false, true]) {
    
    const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
    await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
    await page.goto(baseURL);
    await page.evaluate(({ data, theme }) => {
      localStorage.clear(); sessionStorage.clear();
      localStorage.setItem('plate-log-data-v1', JSON.stringify(data));
      localStorage.setItem('plate-log-theme', theme);
    }, { data, theme });
    await page.goto(baseURL + (filtered ? '/?location=Mohandsein&cuisine=Italian' : '/'));
    await page.locator('.restaurant-loading-row').waitFor({ state: 'detached' });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ animations: 'disabled', path: fileURLToPath(new URL(`./${process.env.CAPTURE_PHASE || "before"}-${width}-${theme}-${filtered ? 'filtered' : 'rest'}.png`, import.meta.url)) });
    await page.close();
  }
} finally { await browser.close(); }
