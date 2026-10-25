import { test, expect } from '@playwright/test';
import { readFile, mkdir } from 'node:fs/promises';

// Disposable local records only. All external requests are blocked.
const fixture = [{
  id: 'ux-table', name: 'The Garden Table', location: 'Maadi', cuisine: 'Italian',
  price: '$$', maps: 'https://www.google.com/maps?q=Garden+Table', playlists: ['Weekend'], photos: [], visited: [], updatedAt: 2,
  ratings: [], dishes: [{ id: 'ux-dish', name: 'Roasted vegetables', photos: [], likedBy: [], ratings: [] }]
}, {
  id: 'ux-next', name: 'Tomorrow Kitchen', location: 'Zamalek', cuisine: 'Egyptian',
  price: '', playlists: [], photos: [], visited: [], updatedAt: 1, ratings: [], dishes: []
}];

async function boot(page, theme = 'light') {
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.hostname !== '127.0.0.1') return route.abort();
    if (url.pathname === '/config.js') return route.fulfill({contentType:'text/javascript', body:'window.PLATE_LOG_CONFIG={};'});
    return route.continue();
  });
  await page.addInitScript(({fixture, theme}) => {
    localStorage.clear(); sessionStorage.clear();
    localStorage.setItem('plate-log-data-v1', JSON.stringify(fixture));
    localStorage.setItem('plate-log-theme', theme);
  }, {fixture, theme});
  await page.goto('/');
  await expect(page.locator('.restaurant-row')).toHaveCount(2);
}

test('advanced filters are discoverable, preserve active settings, and reset safely', async ({page}) => {
  await boot(page);
  await page.getByRole('button', {name:'Open filters', exact:true}).click();
  await expect(page.locator('#locationFilter')).toBeVisible();
  await expect(page.locator('#ratingFilter')).toBeHidden();
  const disclosure = page.locator('#filterRefinements > summary');
  await disclosure.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#ratingFilter')).toBeVisible();
  await page.locator('#ratingFilter').selectOption('4');
  await page.getByLabel('Sort by').selectOption('name');
  await expect(disclosure).toContainText('4+ · A-Z');
  await page.locator('#applyFiltersButton').click();
  await expect(page.locator('#restaurantList')).toContainText('No places match');
  await page.getByRole('button', {name:'Open filters', exact:true}).click();
  await expect(page.locator('#filterRefinements')).toHaveAttribute('open', '');
  await expect(page.locator('#ratingFilter')).toHaveValue('4');
  await page.locator('#clearFiltersButton').click();
  await expect(page.locator('#ratingFilter')).toHaveValue('0');
  await expect(page.getByLabel('Sort by')).toHaveValue('recent');
  await expect(page.locator('#applyFiltersButton')).toHaveText('Show 2 places');
  await page.locator('#applyFiltersButton').click();
  await expect(page.locator('.restaurant-row')).toHaveCount(2);
  await page.locator('.restaurant-row[data-id="ux-next"]').click();
  await expect(page.locator('#detailPanel .primary-action')).toHaveCount(1);
  await expect(page.locator('#detailPanel').getByRole('button',{name:'Add dish',exact:true})).toHaveClass(/primary-action/);
});

for (const theme of ['light', 'dark']) test(`${theme} hierarchy remains legible and usable`, async ({page}, info) => {
  await boot(page, theme);
  const mobile = info.project.name === 'mobile-chromium';
  const folder = 'docs/ux-design3-2026-10-25/screenshots';
  await mkdir(folder, {recursive:true});
  const capture = async name => {
    await expect.poll(() => page.evaluate(() => document.getAnimations().filter(a => a.playState === 'running').length)).toBe(0);
    await page.screenshot({path:`${folder}/${name}-${theme}-${mobile ? 'mobile' : 'desktop'}.png`});
  };
  const check = async () => {
    await page.addScriptTag({content:await readFile('node_modules/axe-core/axe.min.js','utf8')});
    const failures = await page.evaluate(async () => (await axe.run(document, {
      runOnly: {type:'rule',values:['color-contrast','button-name','label','aria-valid-attr-value']}
    })).violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)})));
    expect(failures).toEqual([]);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  };
  await capture('06-browse-after');
  await check();
  await page.getByRole('button', {name:'Open filters', exact:true}).click();
  await capture('07-filters-after');
  await check();
  await page.getByRole('button', {name:'Close filters', exact:true}).click();
  await page.locator('.restaurant-row[data-id="ux-table"]').click();
  const detail = page.locator('#detailPanel');
  await expect(detail.getByRole('button',{name:'More',exact:true})).toBeVisible();
  await expect(detail.locator('[data-section="photos"]')).toHaveCount(0);
  await expect(detail.locator('#restaurantPhotoInput')).toHaveCount(1);
  await expect(detail.locator('.primary-action')).toHaveCount(1);
  await expect(detail.getByRole('link',{name:'Open in Maps',exact:true})).toHaveClass(/primary-action/);
  await expect(detail.locator('.dish-contribution-actions').getByRole('button',{name:'Add review',exact:true})).toBeVisible();
  await expect(detail.locator('.dish-contribution-actions').getByRole('button',{name:'Add photos',exact:true})).toBeVisible();
  await capture('08-detail-after');
  await check();
  await detail.getByRole('button',{name:'More',exact:true}).click();
  await expect(page.locator('#placeActionSheet')).toBeVisible();
  await expect(page.locator('#placeActionSheet').getByRole('button',{name:'Edit restaurant details',exact:true})).toBeVisible();
});
