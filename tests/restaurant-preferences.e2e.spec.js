import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const bands = [
  { value: '$', name: 'Quick bite', range: '0–450' },
  { value: '$$', name: 'Casual', range: '450–1,200' },
  { value: '$$$', name: 'Treat', range: '1,200–2,000' },
  { value: '$$$$', name: 'Splurge', range: '2,000+' }
];
const fixture = bands.map((band, index) => ({
  id: `price-place-${index}`, name: `${band.name} Kitchen`, price: band.value,
  location: 'Maadi', cuisine: 'Egyptian', playlists: [], maps: '', notes: '',
  visited: index === 2 ? ['Taylor, Jr.', 'Earlier friend'] : [],
  ratings: [], photos: [], dishes: [], updatedAt: 4 - index
}));

test.beforeEach(async ({ page }) => {
  await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  await page.goto('/');
  await page.evaluate(data => {
    localStorage.clear(); sessionStorage.clear();
    localStorage.setItem('plate-log-data-v1', JSON.stringify(data));
  }, fixture);
  await page.goto('/');
  await expect(page.locator('.restaurant-row')).toHaveCount(4);
});

async function openNew(page, name) {
  await page.getByRole('button', { name: 'Add restaurant', exact: true }).click();
  const form = page.locator('#restaurantModal');
  await form.getByLabel('Restaurant name', { exact: true }).fill(name);
  await form.getByRole('button', { name: /More details/ }).click();
  return form;
}

for (const band of bands) {
  test(`saves ${band.name} with its existing storage code and filters by that range`, async ({ page }) => {
    const form = await openNew(page, `New ${band.name} Table`);
    await form.locator('.price-segments').getByText(band.name, { exact: true }).click();
    await expect(form.getByRole('radio', { name: `${band.name} ${band.range}`, exact: true })).toBeChecked();
    await form.getByRole('button', { name: 'Save restaurant', exact: true }).click();
    await form.getByRole('button', { name: 'Done', exact: true }).click();
    const saved = await page.evaluate(name => JSON.parse(localStorage.getItem('plate-log-data-v1')).find(place => place.name === name), `New ${band.name} Table`);
    expect(saved.price).toBe(band.value);
    expect(saved.visited).toEqual([]);
    await expect(page.locator('.restaurant-row').filter({ hasText: saved.name }).locator('.price')).toHaveText(`${band.name} · ${band.range} EGP`);
    await page.getByRole('button', { name: 'Open filters', exact: true }).click();
    const filter = page.getByRole('combobox', { name: 'Price (EGP per person)', exact: true });
    await expect(filter.locator(`option[value="${band.value}"]`)).toHaveText(`${band.name} · ${band.range} EGP`);
    await filter.selectOption(band.value);
    await page.locator('#applyFiltersButton').click();
    await expect(page.locator('.restaurant-row')).toHaveCount(2);
    await expect(page.getByRole('button', { name: `Remove price filter ${band.name} · ${band.range} EGP`, exact: true })).toBeVisible();
    await page.reload();
    await expect(page.locator('.restaurant-row')).toHaveCount(2);
  });
}

test('editing preserves earlier visit names verbatim and removes all typed-person controls', async ({ page }) => {
  await page.getByRole('button', { name: 'Treat Kitchen, Visited', exact: true }).click();
  await page.locator('#detailPanel').getByRole('button', { name: 'More', exact: true }).click();
  await page.getByRole('dialog', { name: 'Place actions', exact: true }).getByRole('button', { name: 'Edit restaurant details', exact: true }).click();
  const form = page.locator('#restaurantModal');
  await form.getByRole('button', { name: /More details/ }).click();
  await expect(form.getByRole('textbox', { name: 'Add a person' })).toHaveCount(0);
  await expect(form.getByText('Visited by', { exact: false })).toHaveCount(0);
  await expect(form.getByRole('radio', { name: 'Treat 1,200–2,000', exact: true })).toBeChecked();
  await form.locator('.price-segments').getByText('Splurge', { exact: true }).click();
  await form.getByLabel('Restaurant description (shared · optional)').fill('Updated description');
  await form.getByRole('button', { name: 'Save restaurant', exact: true }).click();
  const data = await page.evaluate(() => JSON.parse(localStorage.getItem('plate-log-data-v1')));
  const saved = data.find(place => place.id === 'price-place-2');
  expect(saved.visited).toEqual(['Taylor, Jr.', 'Earlier friend']);
  expect(saved.price).toBe('$$$$');
  expect(saved.notes).toBe('Updated description');
  expect(data.filter(place => place.id !== saved.id)).toEqual(fixture.filter(place => place.id !== saved.id));
  await expect(page.locator('#detailPanel .price')).toHaveText('Splurge · 2,000+ EGP');
  await expect(page.locator('#detailPanel')).toContainText('Taylor, Jr.');
});

test('Visited records the current person without requiring a rating, dish or typed name', async ({ page }) => {
  const form = await openNew(page, 'Visited Without Review');
  await form.getByRole('radio', { name: 'Visited', exact: true }).check();
  await form.getByRole('button', { name: 'Save restaurant', exact: true }).click();
  await form.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Visited Without Review, Visited', exact: true })).toBeVisible();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('plate-log-data-v1')).find(place => place.name === 'Visited Without Review'));
  expect(saved.visited).toEqual(['You']);
  expect(saved.ratings).toEqual([]);
  expect(saved.dishes).toEqual([]);
});

test('earlier restaurant drafts retain visit names and price through close and reload', async ({ page }) => {
  await page.evaluate(() => sessionStorage.setItem('foodlog-restaurant-capture-draft-v1', JSON.stringify({
    name: 'Earlier Draft Table', price: '$$$', visited: ['Taylor, Jr.', 'Earlier friend'], intent: 'want'
  })));
  await page.getByRole('button', { name: 'Add restaurant', exact: true }).click();
  await page.locator('#closeRestaurantModal').click();
  await page.reload();
  await page.getByRole('button', { name: 'Add restaurant', exact: true }).click();
  const form = page.locator('#restaurantModal');
  await form.getByRole('button', { name: /More details/ }).click();
  await expect(form.getByRole('radio', { name: 'Treat 1,200–2,000', exact: true })).toBeChecked();
  await form.getByRole('button', { name: 'Save restaurant', exact: true }).click();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('plate-log-data-v1')).find(place => place.name === 'Earlier Draft Table'));
  expect(saved.visited).toEqual(['Taylor, Jr.', 'Earlier friend']);
  expect(saved.price).toBe('$$$');
});

test('price choices stay readable, keyboard operable and accessible at 320px in both themes', async ({ page }, info) => {
  await page.setViewportSize({ width: 320, height: 740 });
  const form = await openNew(page, 'Narrow Table');
  await page.addScriptTag({ content: await readFile('node_modules/axe-core/axe.min.js', 'utf8') });
  const radio = form.getByRole('radio', { name: 'Casual 450–1,200', exact: true });
  await radio.focus();
  await radio.press('ArrowRight');
  await expect(form.getByRole('radio', { name: 'Treat 1,200–2,000', exact: true })).toBeChecked();
  for (const theme of ['light', 'dark']) {
    await page.evaluate(dark => {
      document.documentElement.classList.toggle('dark-theme', dark);
      document.body.classList.toggle('dark-theme', dark);
    }, theme === 'dark');
    await page.evaluate(async () => {
      await Promise.all(document.getAnimations().map(animation => animation.finished.catch(() => {})));
    });
    const metrics = await form.locator('.price-segments').evaluate(grid => ({
      columns: getComputedStyle(grid).gridTemplateColumns.split(' ').length,
      overflow: grid.scrollWidth > grid.clientWidth,
      choices: [...grid.querySelectorAll('label > span')].map(span => ({
        height: span.getBoundingClientRect().height,
        fits: [...span.children].every(text => text.scrollWidth <= text.clientWidth)
      }))
    }));
    expect(metrics.columns).toBe(2);
    expect(metrics.overflow).toBe(false);
    expect(metrics.choices.every(choice => choice.height >= 44 && choice.fits)).toBe(true);
    const violations = await page.evaluate(async () => (await window.axe.run(document.querySelector('#restaurantModal'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })).violations);
    expect(violations).toEqual([]);
    await page.screenshot({ path: `test-results/restaurant-prices-${info.project.name}-${theme}.png` });
  }
});
