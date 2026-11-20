import { expect, test } from '@playwright/test';
import { boot, openA, rows, changeA } from './fixtures/navigation.js';
import { chooseLookup, hasPhoneChoices } from './fixtures/capture-choices.js';

const primaryMaps = 'https://www.google.com/maps?q=30.0,31.2';
const secondaryMaps = 'https://www.google.com/maps?q=30.1,31.3';
const restaurant = {
  id: 'branch-fixture', name: 'Fig and Thyme', location: 'Maadi', cuisine: 'Egyptian',
  maps: primaryMaps, playlists: [], visited: [], ratings: [], dishes: [], photos: []
};

async function bootLocal(page, seed = [restaurant]) {
  await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  await page.addInitScript(seed => {
    if (!localStorage.getItem('plate-log-data-v1')) {
      localStorage.setItem('plate-log-data-v1', JSON.stringify(seed));
    }
  }, seed);
  await page.goto('/');
}

test('add, recover, and save area-only and Maps-only locations with accessible controls', async ({ page }) => {
  await bootLocal(page);
  const addRestaurant = page.getByRole('button', { name: 'Add restaurant', exact: true });
  await addRestaurant.click();
  await page.locator('#nameInput').fill('Olive Room');
  const addLocation = page.getByRole('button', { name: 'Add location', exact: true });
  await addLocation.click();
  const second = page.getByRole('region', { name: 'Location 2', exact: true });
  const area = second.locator('[data-location-input]');
  await expect(hasPhoneChoices(page) ? second.getByRole('button', { name: 'Choose area' }) : area).toBeFocused();
  await chooseLookup(page, area, 'Garden City', { create: true });
  await chooseLookup(page, page.locator('#locationSelect'), 'Maadi');
  await addLocation.click();
  await page.getByRole('region', { name: 'Location 3' }).getByRole('textbox').fill(secondaryMaps);
  await page.locator('#closeRestaurantModal').click();
  await addRestaurant.click();
  await expect(area).toHaveValue('Garden City');
  await expect(page.getByRole('region', { name: 'Location 3' }).getByRole('textbox')).toHaveValue(secondaryMaps);
  await page.getByRole('button', { name: 'Save restaurant', exact: true }).click();
  await expect(page.locator('#restaurantSuccess')).toBeVisible();
  await page.reload();
  await page.getByRole('searchbox', { name: 'Search restaurants' }).fill('Garden City');
  await expect(page.locator('.restaurant-row')).toHaveCount(1);
  await page.locator('.restaurant-row').click();
  await page.locator('.restaurant-location-chooser summary').click();
  await expect(page.locator('.restaurant-location-list li')).toHaveCount(3);
  await expect(page.getByRole('link', { name: 'Open in Maps, Location 3' })).toHaveAttribute('href', secondaryMaps);
  await expect(page.locator('.restaurant-location-list').getByText('Garden City')).toBeVisible();
});

test('Add Maps link jumps straight to a URL field and saves several links without areas', async ({ page }) => {
  await bootLocal(page);
  await page.getByRole('button', { name: 'Add restaurant', exact: true }).click();
  await page.locator('#nameInput').fill('The Olive House');
  await page.locator('#mapsInput').fill(primaryMaps);
  const addLink = page.getByRole('button', { name: 'Add Maps link', exact: true });
  await addLink.click();
  const extraLink = page.getByRole('region', { name: 'Location 2', exact: true }).getByRole('textbox', { name: /Google Maps link/ });
  await expect(extraLink).toBeFocused();
  await extraLink.fill(secondaryMaps);
  await page.getByRole('button', { name: 'Save restaurant', exact: true }).click();
  await expect(page.locator('#restaurantSuccess')).toBeVisible();
  await page.reload();
  await page.locator('.restaurant-row').filter({ hasText: 'The Olive House' }).click();
  await page.getByText('2 Maps links', { exact: true }).click();
  await expect(page.getByRole('link', { name: 'Open in Maps, Maps link 1' })).toHaveAttribute('href', primaryMaps);
  await expect(page.getByRole('link', { name: 'Open in Maps, Maps link 2' })).toHaveAttribute('href', secondaryMaps);
});

test('short link resolution is independent and the first location can be removed', async ({ page }) => {
  await bootLocal(page, [{ ...restaurant, additionalLocations: [{ location: 'Zamalek', maps: secondaryMaps }] }]);
  await page.route('**/api/maps/resolve', route => route.fulfill({
    json: { source: 'google-short-link', placeName: 'Heliopolis Fixture', finalUrl: 'https://www.google.com/maps?q=30.2,31.4' }
  }));
  await page.locator('.restaurant-row').click();
  await page.getByRole('button', { name: 'More', exact: true }).click();
  await page.getByRole('button', { name: /^Edit restaurant/ }).filter({ visible: true }).last().click();
  const addLocation = page.getByRole('button', { name: 'Add location', exact: true });
  await addLocation.click();
  const third = page.getByRole('region', { name: 'Location 3' });
  await third.getByRole('textbox').fill('https://maps.app.goo.gl/branch-fixture');
  await expect(third.getByRole('status').last()).toHaveText('Maps listing: Heliopolis Fixture');
  await expect(page.locator('#mapsInput')).toHaveValue(primaryMaps);
  await page.getByRole('button', { name: 'Remove first location' }).click();
  await expect(page.locator('#locationSelect')).toHaveValue('Zamalek');
  const remaining = page.getByRole('region', { name: 'Location 2', exact: true });
  await expect(remaining.locator('summary')).toHaveText('Maps link 2', { useInnerText: true });
  await page.getByRole('button', { name: 'Remove location 2', exact: true }).click();
  await expect(addLocation).toBeFocused();
  await page.getByRole('button', { name: 'Save restaurant', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Open in Maps', exact: true })).toHaveAttribute('href', secondaryMaps);
  await expect(page.locator('.restaurant-location-chooser')).toHaveCount(0);
});

test('save opens a collapsed branch and explains an invalid link beside its field', async ({ page }) => {
  await bootLocal(page);
  await page.getByRole('button', { name: 'Add restaurant', exact: true }).click();
  await page.locator('#nameInput').fill('Olive Room');
  await page.getByRole('button', { name: 'Add Maps link', exact: true }).click();
  const branch = page.getByRole('region', { name: 'Location 2', exact: true });
  const url = branch.getByRole('textbox', { name: /Google Maps link/ });
  await url.fill('incomplete link');
  await branch.locator('summary').click();
  await expect(url).toBeHidden();

  const save = page.getByRole('button', { name: 'Save restaurant', exact: true });
  await save.click();
  await expect(url).toBeFocused();
  await expect(url).toHaveAttribute('aria-describedby', /\brestaurantErrorSummary\b/);
  await expect(branch.getByRole('alert')).toContainText('https://');
  await expect(page.locator('#nameInput')).toHaveValue('Olive Room');
  await url.fill(secondaryMaps);
  await expect(url).not.toHaveAttribute('aria-invalid', 'true');
  await expect(url).not.toHaveAttribute('aria-describedby', /\brestaurantErrorSummary\b/);
  await save.click();
  await expect(page.locator('#restaurantSuccess')).toBeVisible();
});

test('shared branches are read and update the detail, search, and location filter', async ({ page }) => {
  const firstBranch = { location: 'Zamalek', maps: secondaryMaps };
  await boot(page, '/', { fixture: [{ ...rows[0], additional_locations: [firstBranch, { location: 'Garden City', maps: secondaryMaps }] }, rows[1]] });
  await openA(page);
  await page.locator('.restaurant-location-chooser summary').click();
  const gardenCity = page.getByRole('link', { name: 'Open in Maps, Garden City' });
  await expect(gardenCity).toHaveAttribute('href', secondaryMaps);
  await gardenCity.focus();
  await changeA(page, { restaurant_ratings: [{ rater_email: 'fixture@example.test', rater_name: 'Fixture', rating: 4 }] });
  await expect(page.getByRole('button', { name: 'Read restaurant ratings and reviews' })).toContainText('4');
  await expect(gardenCity).toBeFocused();
  await changeA(page, { additional_locations: [firstBranch, { location: 'Heliopolis', maps: secondaryMaps }] });
  await expect(page.getByRole('link', { name: 'Open in Maps, Heliopolis' })).toBeFocused();
  await expect(page.locator('#locationFilter option', { hasText: 'Heliopolis' })).toHaveCount(1);
  if ((await page.viewportSize()).width <= 980) {
    await page.getByRole('button', { name: 'Back to places' }).click();
    await expect(page).not.toHaveURL(/[?&]place=/);
    await expect(page.locator('body')).not.toHaveClass(/mobile-detail-view/);
  }
  await page.locator('#searchInput').fill('Heliopolis');
  await expect(page.locator('.restaurant-row')).toHaveCount(1);
  await expect(page.locator('.restaurant-row')).toHaveAttribute('data-id', 'place-A');
});

test('desktop map shows both pins and the selected area narrows them', async ({ page }) => {
  test.skip((await page.viewportSize()).width <= 980, 'Map is a desktop view.');
  await page.addInitScript(() => {
    const activePins = [];
    window.testPins = activePins;
    const map = {
      setView() { return this; }, fitBounds() {}, invalidateSize() {},
      removeLayer(marker) { activePins.splice(activePins.indexOf(marker), 1); }
    };
    window.L = {
      map: () => map,
      tileLayer: () => ({ addTo() {} }),
      latLngBounds: () => ({ pad() {} }),
      marker: (coords) => ({
        coords,
        addTo() { activePins.push(this); return this; },
        setLatLng(next) { this.coords = next; },
        on() {},
        bindPopup() {}
      })
    };
  });
  await bootLocal(page, [{ ...restaurant, additionalLocations: [{ location: 'Zamalek', maps: secondaryMaps }] }]);
  await page.getByRole('button', { name: 'Map', exact: true }).click();
  await expect(page.locator('#mapHint')).toHaveText('2 of 2 locations on map');
  await expect.poll(() => page.evaluate(() => window.testPins.map(pin => pin.coords))).toEqual([[30, 31.2], [30.1, 31.3]]);
  await page.getByRole('button', { name: 'Open filters' }).click();
  await page.locator('#locationFilter').selectOption('Zamalek');
  await expect.poll(() => page.evaluate(() => window.testPins.map(pin => pin.coords))).toEqual([[30.1, 31.3]]);
});
