import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.reload();
});

test('finds alternate names and requires explicit creation even for short unmatched text', async ({ page }) => {
  await page.getByRole('button', { name: 'Add place', exact: true }).click();
  const dialog = page.locator('#restaurantModal');
  const location = dialog.locator('#locationSelect');
  await dialog.locator('#nameInput').fill('Lookup Fixture');
  await location.fill('مدينة نصر');
  await expect(dialog.getByRole('option', { name: /Madenet Nasr Also known as/ })).toBeVisible();
  await expect(dialog.locator('[data-lookup-create]')).toHaveCount(0);
  await location.press('Enter');
  await expect(location).toHaveValue('Madenet Nasr');
  await dialog.locator('#cuisineSelect').fill('BB');
  await expect(dialog.locator('#cuisineOptions .lookup-empty')).toContainText('No existing cuisines');
  await expect(dialog.locator('#cuisineSelect')).not.toHaveAttribute('aria-activedescendant', /.+/);
  await dialog.getByRole('button', { name: 'Save restaurant', exact: true }).click();
  await expect(dialog.locator('#restaurantErrorSummary')).toContainText('confirm that “BB”');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Keep searching', exact: true }).click();
  await expect(dialog.locator('#cuisineSelect')).toBeFocused();
  await dialog.getByRole('option', { name: /Add “BB” New cuisine/ }).click();
  await dialog.getByRole('button', { name: 'Create new cuisine', exact: true }).click();
  await expect(dialog.locator('#cuisineMatchStatus')).toContainText('New cuisine confirmed');
  await dialog.getByRole('button', { name: 'Save restaurant', exact: true }).click();
  await expect(dialog.getByText('What would you like to do next?')).toBeVisible();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('plate-log-data-v1')).find(row => row.name === 'Lookup Fixture'));
  expect(saved).toMatchObject({ location: 'Madenet Nasr', cuisine: 'BB' });
  expect(saved.locationId).toBeTruthy();
});

test('does not accept creation with Enter and keeps confirmation in a restored draft', async ({ page }) => {
  await page.getByRole('button', { name: 'Add place', exact: true }).click();
  const dialog = page.locator('#restaurantModal');
  await dialog.locator('#nameInput').fill('New Area Fixture');
  const input = dialog.locator('#locationSelect');
  await input.fill('Garden Square · Test City');
  await input.press('Enter');
  await expect(dialog.getByRole('button', { name: 'Create new location', exact: true })).toHaveCount(0);
  await expect(dialog.locator('#restaurantSuccess')).toBeHidden();
  await dialog.getByRole('option', { name: /Add “Garden Square · Test City” New location/ }).click();
  await expect(dialog.getByRole('button', { name: 'Create new location', exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Create new location', exact: true }).click();
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('button', { name: 'Add place', exact: true }).click();
  await expect(dialog.locator('#locationMatchStatus')).toContainText('New location confirmed');
  await input.fill('Garden Square · Another City');
  await dialog.getByRole('button', { name: 'Save restaurant', exact: true }).click();
  await expect(dialog.locator('#restaurantErrorSummary')).toContainText('confirm that');
});

test('one filter includes normalized historical spellings and an 80-option list stays searchable', async ({ page }) => {
  await page.evaluate(() => {
    const rows = Array.from({ length: 80 }, (_, i) => ({ id: `area-${i}`, name: `Place ${i}`, location: `Area ${i}`, cuisine: 'Chinese', dishes: [], ratings: [], photos: [], visited: [] }));
    rows.push({ ...rows[0], id: 'maadi-one', name: 'First Maadi', location: 'Maadi' });
    rows.push({ ...rows[0], id: 'maadi-two', name: 'Second Maadi', location: ' MAADI ' });
    localStorage.setItem('plate-log-data-v1', JSON.stringify(rows));
  });
  await page.reload();
  await page.getByRole('button', { name: 'Open filters', exact: true }).click();
  await page.locator('#locationFilter').selectOption('Maadi');
  await page.getByRole('button', { name: /Show 2 places/ }).click();
  await expect(page.locator('.restaurant-row')).toHaveCount(2);
  await page.getByRole('button', { name: 'Add place', exact: true }).click();
  const dialog = page.locator('#restaurantModal');
  await dialog.locator('#locationSelect').fill('Area 79');
  await expect(dialog.getByRole('option', { name: 'Area 79 Existing', exact: true })).toBeVisible();
  await dialog.locator('#locationSelect').press('Escape');
  await expect(dialog).toBeVisible();
});

test('cached registry aliases share the preferred name and stable ID in filters and saves', async ({ page }) => {
  await page.evaluate(() => {
    const entry = { id: 'stable-nasr-id', kind: 'location', name: 'Nasr City', context: 'Cairo', aliases: ['Madenet Nasr', 'مدينة نصر'] };
    localStorage.setItem('foodlog-lookup-catalog-v1', JSON.stringify([entry]));
  });
  await page.reload();
  await page.getByRole('button', { name: 'Open filters', exact: true }).click();
  await page.locator('#locationFilter').selectOption('Nasr City');
  await page.getByRole('button', { name: /Show 1 place/ }).click();
  await expect(page.locator('.restaurant-row')).toHaveCount(1);
  await page.getByRole('button', { name: 'Add place', exact: true }).click();
  const dialog = page.locator('#restaurantModal');
  await dialog.locator('#nameInput').fill('Stable ID Fixture');
  await dialog.locator('#locationSelect').fill('مدينة نصر');
  await dialog.locator('#locationSelect').press('Enter');
  await expect(dialog.locator('#locationSelect')).toHaveValue('Nasr City');
  await dialog.getByRole('button', { name: 'Save restaurant', exact: true }).click();
  await expect(dialog.getByText('What would you like to do next?')).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('plate-log-data-v1')).find(row => row.name === 'Stable ID Fixture').locationId)).toBe('stable-nasr-id');
});

for (const theme of ['light', 'dark']) test(`${theme} creation controls support keyboard and readable contrast at 320px`, async ({ page }) => {
  await page.evaluate(theme => localStorage.setItem('plate-log-theme', theme), theme);
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Add place', exact: true }).click();
  const dialog = page.locator('#restaurantModal');
  const location = dialog.locator('#locationSelect');
  await location.fill('A missing area · Fixture City');
  await location.press('ArrowDown');
  await location.press('Enter');
  const create = dialog.getByRole('button', { name: 'Create new location', exact: true });
  await expect(create).toBeFocused();
  const box = await create.boundingBox();
  expect(box.width).toBeGreaterThanOrEqual(44);
  expect(box.height).toBeGreaterThanOrEqual(44);
  await expect.poll(() => page.evaluate(() => document.getAnimations().filter(a => a.playState === 'running').length)).toBe(0);
  await page.addScriptTag({ content: await readFile('node_modules/axe-core/axe.min.js', 'utf8') });
  const violations = await page.evaluate(async () => (await window.axe.run(document.querySelector('#restaurantModal'), { runOnly: { type: 'rule', values: ['color-contrast'] } })).violations);
  expect(violations).toEqual([]);
  expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  await create.press('Enter');
  await expect(dialog.locator('#locationMatchStatus')).toContainText('New location confirmed');
});


test('clears either selection in one action without leaving capture or reopening the menu', async ({ page }) => {
  await page.getByRole('button', { name: 'Add place', exact: true }).click();
  const dialog = page.locator('#restaurantModal');
  await dialog.locator('#nameInput').fill('Keep my restaurant draft');
  for (const [kind, value] of [['location', 'Maadi'], ['cuisine', 'Chinese']]) {
    const input = dialog.locator(`#${kind}Select`);
    await input.fill(value);
    await input.press('Enter');
    const clear = dialog.getByRole('button', { name: `Clear ${kind}`, exact: true });
    await expect(clear).toHaveText('Clear');
    const box = await clear.boundingBox();
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
    await clear.click();
    await expect(input).toHaveValue('');
    await expect(input).toBeFocused();
    await expect(input).toHaveAttribute('aria-expanded', 'false');
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('#nameInput')).toHaveValue('Keep my restaurant draft');
    await input.fill(value);
    await input.press('Enter');
    await clear.press('Enter');
    await expect(input).toHaveValue('');
    await expect(dialog).toBeVisible();
  }
});

test('Escape dismisses the location menu and an outside tap keeps Add restaurant open', async ({ page }) => {
  await page.getByRole('button', { name: 'Add place', exact: true }).click();
  const dialog = page.locator('#restaurantModal');
  const input = dialog.locator('#locationSelect');
  await input.fill('Maadi');
  await dialog.locator('#nameInput').click();
  await expect(input).toHaveAttribute('aria-expanded', 'false');
  await expect(dialog).toBeVisible();
  await input.click();
  await input.press('Escape');
  await expect(input).toHaveAttribute('aria-expanded', 'false');
  await expect(dialog).toBeVisible();
});
