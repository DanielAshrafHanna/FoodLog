import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const fixture = [{
  id: 'playlist-place', name: 'Fixture Table', location: 'Maadi', cuisine: 'Egyptian',
  playlists: ['Date night'], visited: [], ratings: [], photos: [], dishes: [], updatedAt: 1
}];
const dialog = page => page.getByRole('dialog', { name: 'New playlist', exact: true });
const chip = (page, name) => page.locator('#playlistSwitcher button').filter({ has: page.locator('.playlist-chip-label', { hasText: new RegExp(`^${name}$`) }) });

test.beforeEach(async ({ page }) => {
  await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  await page.goto('/');
  await page.evaluate(data => {
    localStorage.clear(); sessionStorage.clear();
    localStorage.setItem('plate-log-data-v1', JSON.stringify(data));
  }, fixture);
  await page.reload();
});

async function create(page, name) {
  await page.getByRole('button', { name: 'Create playlist', exact: true }).click();
  await dialog(page).getByLabel('Playlist name', { exact: true }).fill(name);
  await dialog(page).getByLabel('Playlist name', { exact: true }).press('Enter');
  await expect(dialog(page)).toBeHidden();
}

test('creates an empty playlist, selects it, persists it and gives the next restaurant its membership', async ({ page }) => {
  await page.getByRole('searchbox', { name: 'Search restaurants' }).fill('Fixture');
  await create(page, '  Weekend   brunch  ');
  await expect(chip(page, 'Weekend brunch')).toHaveAttribute('aria-pressed', 'true');
  await expect(chip(page, 'Weekend brunch')).toBeFocused();
  await expect(page.locator('#restaurantList')).toContainText('No places in this playlist yet.');
  await expect(page.locator('#detailPanel')).not.toContainText('Fixture Table');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('plate-log-data-v1')))).toEqual(fixture);
  await expect(page.getByRole('searchbox', { name: 'Search restaurants' })).toHaveValue('Fixture');
  await page.reload();
  await expect(chip(page, 'Weekend brunch')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#restaurantList').getByRole('button', { name: 'Add restaurant', exact: true }).click();
  await expect(page.locator('#playlistInput')).toHaveValue('Weekend brunch');
  await page.locator('#restaurantModal').getByLabel('Restaurant name or Maps link (required)', { exact: true }).fill('Fixture Brunch Table');
  await page.locator('#restaurantModal').getByRole('button', { name: 'Save restaurant', exact: true }).click();
  await page.locator('#restaurantModal').getByRole('button', { name: 'Done', exact: true }).click();
  await expect(page.locator('.restaurant-row')).toContainText('Fixture Brunch Table');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('plate-log-data-v1')));
  expect(saved.find(place => place.id === 'playlist-place')).toEqual(fixture[0]);
  expect(saved.find(place => place.name === 'Fixture Brunch Table').playlists).toEqual(['Weekend brunch']);
});

test('validates empty, reserved and equivalent names without creating duplicates, and Escape restores focus', async ({ page }) => {
  const opener = page.getByRole('button', { name: 'Create playlist', exact: true });
  await opener.click();
  const input = dialog(page).getByLabel('Playlist name', { exact: true });
  await expect(input).toBeFocused();
  await expect(dialog(page).getByRole('textbox')).toHaveCount(1);
  for (const [name, message] of [['   ', 'Enter a playlist name.'], ['All places', 'used by the playlist filters'], ['ＤＡＴＥ   NIGHT', 'already exists']]) {
    await input.fill(name);
    await dialog(page).getByRole('button', { name: 'Create playlist', exact: true }).click();
    await expect(dialog(page).getByRole('status')).toContainText(message);
    await expect(input).toHaveValue(name);
    await expect(input).toHaveAttribute('aria-invalid', 'true');
  }
  await page.keyboard.press('Escape');
  await expect(dialog(page)).toBeHidden();
  await expect(opener).toBeFocused();
  expect(await page.evaluate(() => localStorage.getItem('foodlog-playlists-v1'))).toBeNull();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('plate-log-data-v1')))).toEqual(fixture);
});

test('storage failure keeps the name retryable and never advertises an unsaved playlist', async ({ page }) => {
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    window.__allowPlaylistStorage = false;
    Storage.prototype.setItem = function (key, value) {
      if (key === 'foodlog-playlists-v1' && !window.__allowPlaylistStorage) throw new DOMException('Fixture quota', 'QuotaExceededError');
      return original.call(this, key, value);
    };
  });
  await page.getByRole('button', { name: 'Create playlist', exact: true }).click();
  await dialog(page).getByLabel('Playlist name', { exact: true }).fill('Saved later');
  await dialog(page).getByRole('button', { name: 'Create playlist', exact: true }).click();
  await expect(dialog(page).getByRole('status')).toContainText('could not save');
  await expect(chip(page, 'Saved later')).toHaveCount(0);
  await expect(dialog(page).getByLabel('Playlist name', { exact: true })).toHaveValue('Saved later');
  await page.evaluate(() => { window.__allowPlaylistStorage = true; });
  await dialog(page).getByRole('button', { name: 'Create playlist', exact: true }).click();
  await expect(chip(page, 'Saved later')).toHaveAttribute('aria-pressed', 'true');
});

test('empty playlists can be renamed, trashed and restored without losing other playlists or places', async ({ page }) => {
  await create(page, 'Keep empty');
  await create(page, 'Rename empty');
  await page.getByRole('button', { name: 'Rename or delete playlist', exact: true }).click();
  await page.locator('#playlistManageModal').getByLabel('Name', { exact: true }).fill('Friday plans');
  await page.locator('#playlistManageModal').getByRole('button', { name: 'Save name', exact: true }).click();
  await page.reload();
  await expect(chip(page, 'Rename empty')).toHaveCount(0);
  await expect(chip(page, 'Friday plans')).toHaveAttribute('aria-pressed', 'true');
  page.on('dialog', value => value.accept());
  await page.getByRole('button', { name: 'Rename or delete playlist', exact: true }).click();
  await page.locator('#playlistManageModal').getByRole('button', { name: 'Move playlist to Trash', exact: true }).click();
  await expect(chip(page, 'Friday plans')).toHaveCount(0);
  await expect(chip(page, 'Keep empty')).toBeVisible();
  await page.getByRole('button', { name: 'Create playlist', exact: true }).click();
  await dialog(page).getByLabel('Playlist name', { exact: true }).fill('friday plans');
  await dialog(page).getByRole('button', { name: 'Create playlist', exact: true }).click();
  await expect(dialog(page).getByRole('status')).toContainText('in Trash');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Open account menu', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Open Trash', exact: true }).click();
  await page.locator('#trashList').getByRole('button', { name: 'Restore', exact: true }).click();
  await page.reload();
  await expect(chip(page, 'Friday plans')).toBeVisible();
  await expect(chip(page, 'Keep empty')).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('plate-log-data-v1')))).toEqual(fixture);
});

test('creation fits 320px, has accessible light/dark states, and the plus stays outside the scrolling rail', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  // Enter the list explicitly; a desktop detail URL correctly opens phone detail.
  await page.goto('/');
  await page.addScriptTag({ content: await readFile('node_modules/axe-core/axe.min.js', 'utf8') });
  for (const dark of [false, true]) {
    await page.evaluate(dark => {
      document.documentElement.classList.toggle('dark-theme', dark);
      document.body.classList.toggle('dark-theme', dark);
    }, dark);
    const opener = page.getByRole('button', { name: 'Create playlist', exact: true });
    const box = await opener.boundingBox();
    expect(box.width).toBeGreaterThanOrEqual(44); expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.x + box.width).toBeLessThanOrEqual(320);
    const scroll = await page.locator('.playlist-bar-scroll').boundingBox();
    expect(scroll.y).toBeGreaterThanOrEqual(box.y + box.height);
    await opener.click();
    await page.evaluate(async () => Promise.all(document.getAnimations().map(animation => animation.finished.catch(() => {}))));
    const modalBox = await dialog(page).boundingBox();
    expect(modalBox.x).toBeGreaterThanOrEqual(0); expect(modalBox.x + modalBox.width).toBeLessThanOrEqual(320);
    await expect(dialog(page).getByRole('button', { name: 'Cancel', exact: true })).toHaveCount(0);
    const createBox = await dialog(page).getByRole('button', { name: 'Create playlist', exact: true }).boundingBox();
    const footerBox=await dialog(page).locator('.playlist-create-actions').boundingBox();
    expect(createBox.width).toBeCloseTo(footerBox.width, 0);
    expect(createBox.height).toBeGreaterThanOrEqual(48);
    expect(await dialog(page).evaluate(element => element.scrollWidth > element.clientWidth)).toBe(false);
    const violations = await page.evaluate(async () => (await window.axe.run(document.querySelector('#playlistCreateModal'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })).violations);
    expect(violations).toEqual([]);
    await page.keyboard.press('Tab'); await expect(dialog(page).getByRole('button', { name: 'Create playlist', exact: true })).toBeFocused();
    await page.keyboard.press('Shift+Tab'); await expect(dialog(page).getByLabel('Playlist name', { exact: true })).toBeFocused();
    await page.keyboard.press('Escape'); await expect(opener).toBeFocused();
  }
});

async function cloud(page, { approved = true, guest = false } = {}) {
  const rows = fixture.map(row => ({ ...row, updated_at: '2026-10-04T12:00:00Z', restaurant_ratings: [], restaurant_photos: [] }));
  await page.route('**/config.js*', route => route.fulfill({ contentType: 'text/javascript', body: "window.PLATE_LOG_CONFIG={supabaseUrl:'https://fixture.supabase.co',supabasePublishableKey:'fixture'}" }));
  await page.route('**/vendor/supabase-2.110.8.js', route => route.fulfill({ contentType: 'text/javascript', body: `
    window.__playlistCatalog=JSON.parse(sessionStorage.getItem('fixture-playlist-catalog')||'[{"name":"Date night","deleted_at":null}]');
    window.__playlistInserts=[]; window.__playlistInsertError=false;
    const session=${guest ? 'null' : JSON.stringify({ user: { id: 'fixture-editor', email: 'editor@example.com', user_metadata: { approved: true, role: 'admin' } } })};
    class Query {
      constructor(table){this.table=table;this.activeOnly=false;}
      select(){return this;}eq(){return this;}in(){return this;}not(){return this;}limit(){return this;}order(){return this;}abortSignal(){return this;}upsert(){return this;}
      is(key,value){if(key==='deleted_at'&&value===null)this.activeOnly=true;return this;}
      insert(value){this.value=value;return this;}
      maybeSingle(){return Promise.resolve({data:this.table==='approved_users'&&${approved}&&session?{email:'editor@example.com'}:null,error:null});}
      async result(){
        if(this.table==='playlists'&&this.value){window.__playlistInserts.push(this.value);await new Promise(resolve=>setTimeout(resolve,180));if(window.__playlistInsertError)return {data:null,error:{message:'Fixture connection failed'}};window.__playlistCatalog.push({...this.value,deleted_at:null});sessionStorage.setItem('fixture-playlist-catalog',JSON.stringify(window.__playlistCatalog));return {data:null,error:null};}
        return {data:this.table==='restaurants'?${JSON.stringify(rows)}:this.table==='playlists'?window.__playlistCatalog.filter(row=>!this.activeOnly||!row.deleted_at):[],error:null};
      }
      then(resolve,reject){return this.result().then(resolve,reject);}
    }
    const channel={on(){return this;},subscribe(){return this;}};
    window.supabase={createClient:()=>({from:table=>new Query(table),rpc:async()=>({data:[],error:null}),channel:()=>channel,removeChannel(){},auth:{getSession:async()=>({data:{session},error:null}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}})};
  ` }));
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.goto('/');
  await expect(page.locator('.restaurant-row')).toContainText('Fixture Table');
}

test('approved cloud creation writes only the catalog and persists an empty selected playlist across reload', async ({ page }) => {
  await cloud(page);
  await create(page, 'Cloud brunch');
  expect(await page.evaluate(() => window.__playlistInserts)).toEqual([{ name: 'Cloud brunch' }]);
  const before = await page.evaluate(() => JSON.parse(localStorage.getItem('plate-log-cloud-cache-v1')));
  await page.reload();
  await expect(chip(page, 'Cloud brunch')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#restaurantList')).toContainText('No places in this playlist yet.');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('plate-log-cloud-cache-v1')))).toEqual(before);
});

test('cloud failure, offline and double submission stay retryable, and pending Escape cannot lose the save', async ({ page, context }) => {
  await cloud(page);
  await page.evaluate(() => { window.__playlistInsertError = true; });
  await page.getByRole('button', { name: 'Create playlist', exact: true }).click();
  await dialog(page).getByLabel('Playlist name', { exact: true }).fill('Retry brunch');
  await page.evaluate(() => {
    const form = document.querySelector('#playlistCreateForm');
    form.requestSubmit(); form.requestSubmit();
  });
  await expect(dialog(page).getByRole('button', { name: 'Close new playlist', exact: true })).toBeDisabled();
  await page.keyboard.press('Escape');
  await expect(dialog(page)).toBeVisible();
  await expect(dialog(page).getByRole('status')).toContainText('Could not create');
  await expect(dialog(page).getByLabel('Playlist name', { exact: true })).not.toHaveAttribute('aria-invalid', 'true');
  expect(await page.evaluate(() => window.__playlistInserts)).toHaveLength(1);
  await expect(chip(page, 'Retry brunch')).toHaveCount(0);
  await expect(dialog(page).getByLabel('Playlist name', { exact: true })).toHaveValue('Retry brunch');
  await page.evaluate(() => { window.__playlistInsertError = false; });
  await dialog(page).getByRole('button', { name: 'Create playlist', exact: true }).click();
  await expect(chip(page, 'Retry brunch')).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Create playlist', exact: true }).click();
  await dialog(page).getByLabel('Playlist name', { exact: true }).fill('Offline plans');
  await context.setOffline(true);
  await dialog(page).getByRole('button', { name: 'Create playlist', exact: true }).click();
  await expect(dialog(page).getByRole('status')).toContainText('Reconnect');
  expect(await page.evaluate(() => window.__playlistInserts)).toHaveLength(2);
  await expect(dialog(page).getByLabel('Playlist name', { exact: true })).toHaveValue('Offline plans');
  await context.setOffline(false);
});

test('fresh cloud duplicates and Trash names are checked before insertion', async ({ page }) => {
  await cloud(page);
  await page.evaluate(() => { window.__playlistCatalog.push({ name: 'Recent plans', deleted_at: null }, { name: 'Earlier plans', deleted_at: '2026-10-04T12:00:00Z' }); });
  await page.getByRole('button', { name: 'Create playlist', exact: true }).click();
  for (const [name, message] of [[' recent   PLANS ', 'already exists'], ['earlier plans', 'in Trash']]) {
    await dialog(page).getByLabel('Playlist name', { exact: true }).fill(name);
    await dialog(page).getByRole('button', { name: 'Create playlist', exact: true }).click();
    await expect(dialog(page).getByRole('status')).toContainText(message);
  }
  expect(await page.evaluate(() => window.__playlistInserts)).toEqual([]);
});

for (const guest of [false, true]) {
  test(`${guest ? 'guests' : 'unapproved accounts with forged metadata'} cannot create playlists`, async ({ page }) => {
    await cloud(page, { approved: false, guest });
    await expect(page.locator('#createPlaylistButton')).toBeHidden();
    await page.evaluate(() => document.querySelector('#createPlaylistButton').click());
    await expect(dialog(page)).toBeHidden();
    expect(await page.evaluate(() => window.__playlistInserts)).toEqual([]);
  });
}
