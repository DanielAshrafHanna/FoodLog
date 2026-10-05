import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
const fixture = [{id:'form-place',name:'Fixture Table',location:'Maadi',cuisine:'Egyptian',price:'$$',playlists:['Date night','Dinner, Drinks'],visited:[],ratings:[],photos:[],dishes:[],notes:'Shared facts',updatedAt:1}];
test.beforeEach(async ({page}) => {
  await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  await page.goto('/');
  await page.evaluate(data => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('plate-log-data-v1',JSON.stringify(data)); localStorage.setItem('foodlog-playlists-v1',JSON.stringify(['Weekend brunch','Date night','Dinner, Drinks'])); },fixture);
  await page.reload();
});
async function open(page,name='Fresh Table') {
  await page.getByRole('button',{name:'Add restaurant',exact:true}).click();
  const form=page.locator('#restaurantModal');
  await form.getByLabel('Restaurant name',{exact:true}).fill(name);
  return form;
}
async function more(form) {
  const toggle=form.getByRole('button',{name:/More details/});
  if(await toggle.getAttribute('aria-expanded')==='false') await toggle.click();
}
async function saved(page,name) {return page.evaluate(name => JSON.parse(localStorage.getItem('plate-log-data-v1')).find(r=>r.name===name),name);}

test('Not visited has no review controls, while Visited reveals opinions without opening More details',async ({page})=>{
  const form=await open(page);
  await expect(form.getByRole('slider',{name:'Your rating',exact:true})).toBeHidden();
  await more(form);
  await expect(form.getByLabel('Your review (optional)')).toBeHidden();
  await expect(form.getByLabel('Restaurant description (shared · optional)')).toBeVisible();
  await expect(form.getByRole('button',{name:/Plan it|Remember the visit/})).toHaveCount(0);
  await form.getByRole('button',{name:/More details/}).click();
  await form.getByRole('radio',{name:'Visited',exact:true}).check();
  await expect(form.getByRole('slider',{name:'Your rating',exact:true})).toBeVisible();
  await expect(form.getByLabel('Your review (optional)')).toBeVisible();
  await expect(form.locator('#restaurantMoreDetailsPanel')).toHaveJSProperty('inert',true);
  await expect(form.getByRole('button',{name:/More details/})).toHaveAttribute('aria-expanded','false');
});

test('switching status holds review answers through reload and prevents saving them as Not visited',async ({page})=>{
  let form=await open(page,'Held Review Table');
  await form.getByRole('radio',{name:'Visited',exact:true}).check();
  await form.getByRole('slider',{name:'Your rating',exact:true}).press('End');
  await form.getByLabel('Your review (optional)').fill('Personal experience');
  await form.getByRole('radio',{name:'Not visited',exact:true}).check();
  await expect(form.locator('#restaurantHeldReview')).toBeVisible();
  await form.getByRole('button',{name:'Save restaurant',exact:true}).click();
  await expect(form.locator('#restaurantErrorSummary')).toContainText('Select Visited');
  expect(await saved(page,'Held Review Table')).toBeUndefined();
  await form.locator('#closeRestaurantModal').click();
  await page.reload();
  await page.getByRole('button',{name:'Add restaurant',exact:true}).click();
  form=page.locator('#restaurantModal');
  await expect(form.getByRole('radio',{name:'Not visited',exact:true})).toBeChecked();
  await expect(form.locator('#restaurantHeldReview')).toBeVisible();
  await form.getByRole('radio',{name:'Visited',exact:true}).check();
  await expect(form.getByLabel('Your review (optional)')).toHaveValue('Personal experience');
  await expect(form.locator('#ratingReadout')).toHaveText('5 / 5');
  await more(form);
  await form.getByLabel('Restaurant description (shared · optional)').fill('Useful shared facts');
  await form.getByRole('button',{name:'Save restaurant',exact:true}).click();
  const row=await saved(page,'Held Review Table');
  expect(row.ratings[0].notes).toBe('Personal experience');expect(row.notes).toBe('Useful shared facts');expect(row.visited).toEqual(['You']);
});

test('explicit bookmark choices survive status changes, while untouched choices follow visit intent',async ({page})=>{
  const form=await open(page);
  await more(form);
  const bookmark=form.getByLabel(/Add to Bookmarks/);
  await expect(bookmark).toBeChecked();
  await form.getByRole('radio',{name:'Visited',exact:true}).check();
  await expect(bookmark).not.toBeChecked();
  await bookmark.check();
  await form.getByRole('radio',{name:'Not visited',exact:true}).check();
  await form.getByRole('radio',{name:'Visited',exact:true}).check();
  await expect(bookmark).toBeChecked();
  await form.getByRole('button',{name:'Save restaurant',exact:true}).click();
  expect((await saved(page,'Fresh Table')).wantToGo).toBe(true);
});

test('playlist search retains selections, supports clearing and saves comma-containing names intact',async ({page})=>{
  const form=await open(page,'Multi Playlist Table'); await more(form);
  const picker=form.locator('#playlistPicker'); const search=picker.getByRole('searchbox',{name:'Search playlists',exact:true});
  await picker.getByRole('checkbox',{name:'Date night',exact:true}).check();
  await search.fill('Dinner');
  await picker.getByRole('checkbox',{name:'Dinner, Drinks',exact:true}).check();
  await expect(picker.getByRole('status')).toContainText('2 selected');
  await search.fill('Weekend');
  await picker.getByRole('checkbox',{name:'Weekend brunch',exact:true}).check();
  await picker.getByRole('button',{name:'Clear selection',exact:true}).click();
  await expect(search).toBeFocused();await expect(picker.getByRole('status')).toHaveText('No playlist selected');
  await search.fill('Dinner');await picker.getByRole('checkbox',{name:'Dinner, Drinks',exact:true}).check();
  await form.locator('#closeRestaurantModal').click();await page.reload();
  await page.getByRole('button',{name:'Add restaurant',exact:true}).click();
  await expect(page.locator('#playlistInput')).toHaveValue('Dinner, Drinks');
  await page.locator('#restaurantModal').getByRole('button',{name:'Save restaurant',exact:true}).click();
  expect((await saved(page,'Multi Playlist Table')).playlists).toEqual(['Dinner, Drinks']);
});

test('creating a playlist is explicit, normalizes spaces and reuses equivalent names',async ({page})=>{
  const form=await open(page,'Created Playlist Table');await more(form);
  const picker=form.locator('#playlistPicker'); const search=picker.getByRole('searchbox',{name:'Search playlists',exact:true});
  await search.fill('ＤＡＴＥ   NIGHT');
  await expect(picker.locator('.playlist-create-choice')).toBeHidden();
  await search.press('Enter');await expect(picker.getByRole('checkbox',{name:'Date night',exact:true})).toBeChecked();
  await expect(form).toBeVisible();
  await search.fill('All places');await picker.getByRole('button',{name:'Add “All places” as a new playlist',exact:true}).click();
  await expect(picker.getByRole('alert')).toContainText('used by the playlist filters');
  await search.fill('  Friday   dinner  ');await search.press('Enter');
  await expect(picker.getByRole('button',{name:'Add “Friday dinner” as a new playlist',exact:true})).toBeFocused();
  await expect(picker.getByRole('checkbox',{name:/Friday dinner/})).toHaveCount(0);
  await page.keyboard.press('Enter');
  await expect(picker.getByRole('checkbox',{name:/Friday dinner/})).toBeChecked();
  await expect(picker).toContainText('New · saved with restaurant');
  await form.getByRole('button',{name:'Save restaurant',exact:true}).click();
  expect((await saved(page,'Created Playlist Table')).playlists).toEqual(['Date night','Friday dinner']);
  await form.getByRole('button',{name:'Done',exact:true}).click();await page.reload();
  await expect(page.locator('#playlistSwitcher')).toContainText('Friday dinner');
});

test('earlier nested-detail drafts restore their content and expose the flat shared fields',async ({page})=>{
  await page.evaluate(()=>sessionStorage.setItem('foodlog-restaurant-capture-draft-v1',JSON.stringify({name:'Earlier Form Table',intent:'visited',rating:'4',ratingNotes:'Earlier review',notes:'Earlier shared description',playlists:['Dinner, Drinks'],price:'$$$',planOpen:true,visitOpen:true,wantToGo:false})));
  await page.getByRole('button',{name:'Add restaurant',exact:true}).click();
  const form=page.locator('#restaurantModal');
  await expect(form.getByRole('button',{name:/More details/})).toHaveAttribute('aria-expanded','true');
  await expect(form.getByLabel('Your review (optional)')).toHaveValue('Earlier review');
  await expect(form.getByLabel('Restaurant description (shared · optional)')).toHaveValue('Earlier shared description');
  await expect(form.getByRole('checkbox',{name:'Dinner, Drinks',exact:true})).toBeChecked();
});

test('editing retains existing data and other peoples opinions and allows your own rating',async ({page})=>{
  const reviewFixture={...fixture[0],visited:['Earlier friend'],ratings:[{email:'friend@example.com',name:'Friend',rating:4,notes:'Friend review'}],photos:[{id:'photo',photo:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII='}]};
  await page.evaluate(data=>localStorage.setItem('plate-log-data-v1',JSON.stringify([data])),reviewFixture);await page.reload();
  await page.getByRole('button',{name:'Fixture Table, Visited',exact:true}).click();
  await page.locator('#detailPanel').getByRole('button',{name:'More',exact:true}).click();
  await page.getByRole('button',{name:'Edit restaurant details',exact:true}).click();
  const form=page.locator('#restaurantModal');await more(form);
  await expect(form.getByRole('checkbox',{name:'Dinner, Drinks',exact:true})).toBeChecked();
  await form.getByRole('slider',{name:'Your rating',exact:true}).press('End');await form.getByLabel('Your review (optional)').fill('My own review');
  await form.getByRole('button',{name:'Save restaurant',exact:true}).click();
  const row=await saved(page,'Fixture Table');
  expect(row.notes).toBe(reviewFixture.notes);expect(row.visited).toEqual(reviewFixture.visited);expect(row.photos).toEqual(reviewFixture.photos);expect(row.playlists).toEqual(reviewFixture.playlists);expect(row.ratings.find(r=>r.email==='friend@example.com')).toEqual(reviewFixture.ratings[0]);
});

test('the whole form reflows and has accessible names and contrast in both themes',async ({page})=>{
  await page.addScriptTag({content:await readFile('node_modules/axe-core/axe.min.js','utf8')});
  const form=await open(page,'A Narrow Restaurant With A Long Name');await more(form);
  for(const width of [320,390,515,1280]) {
    await page.setViewportSize({width,height:900});
    for(const dark of [false,true]) {
      await page.evaluate(dark=>document.documentElement.classList.toggle('dark-theme',dark),dark);
      for(const visited of [false,true]) {
        await form.getByRole('radio',{name:visited?'Visited':'Not visited',exact:true}).check();
        await form.evaluate(async el=>{await document.fonts.ready;await Promise.all(el.getAnimations({subtree:true}).map(a=>a.finished.catch(()=>{})));});
        const result=await page.evaluate(()=>window.axe.run(document.querySelector('#restaurantModal'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa']}}));
        expect(result.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))).toEqual([]);
        expect(await form.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
        expect(await form.locator('#restaurantEditorBody').evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
        await form.getByRole('searchbox',{name:'Search playlists',exact:true}).focus();await page.keyboard.press('Tab');
        const size=await form.getByRole('checkbox',{name:'Date night',exact:true}).evaluate(el=>({w:el.parentElement.getBoundingClientRect().width,h:el.parentElement.getBoundingClientRect().height}));
        expect(size.w).toBeGreaterThanOrEqual(44);expect(size.h).toBeGreaterThanOrEqual(44);
      }
    }
  }
});


test('an empty playlist catalog explains creation and pending choices survive draft recovery',async ({page})=>{
  await page.evaluate(()=>{localStorage.setItem('plate-log-data-v1','[]');localStorage.setItem('foodlog-playlists-v1','[]');});await page.reload();
  const form=await open(page,'First Playlist Table');await more(form);
  const picker=form.locator('#playlistPicker');
  await expect(picker).toContainText('No playlists yet');
  await picker.getByRole('searchbox',{name:'Search playlists',exact:true}).fill('Weekend tables');
  await picker.getByRole('button',{name:'Add “Weekend tables” as a new playlist',exact:true}).click();
  await form.locator('#closeRestaurantModal').click();await page.reload();
  await page.getByRole('button',{name:'Add restaurant',exact:true}).click();
  await expect(picker.getByRole('checkbox',{name:/Weekend tables/})).toBeChecked();
  await expect(picker).toContainText('New · saved with restaurant');
});

test('many long playlist names remain reachable and toggling a row does not move its neighbors',async ({page})=>{
  const names=Array.from({length:40},(_,i)=>`Playlist ${String(i+1).padStart(2,'0')} — a shared collection with a long name`);
  await page.evaluate(names=>localStorage.setItem('foodlog-playlists-v1',JSON.stringify(names)),names);await page.reload();
  const form=await open(page);await more(form);
  const picker=form.locator('#playlistPicker');
  const choice=picker.getByRole('checkbox',{name:names[12],exact:true});
  // Measure after disclosure expansion, not while its height is changing.
  await form.evaluate(async el => { await Promise.all(el.getAnimations({subtree:true}).map(a=>a.finished.catch(()=>{}))); });
  await choice.scrollIntoViewIfNeeded();
  await choice.focus();
  // Browser focus may scroll ancestors; compare the row's position within its list.
  const rowPosition = el => {
    const row=el.parentElement, list=row.parentElement;
    return row.getBoundingClientRect().top - list.getBoundingClientRect().top + list.scrollTop;
  };
  const before=await choice.evaluate(rowPosition);
  await choice.press('Space');
  await expect(choice).toBeChecked();
  const after=await choice.evaluate(rowPosition);
  expect(Math.abs(after-before)).toBeLessThan(1);
  await picker.getByRole('searchbox',{name:'Search playlists',exact:true}).fill('Playlist 40');
  await picker.getByRole('checkbox',{name:names[39],exact:true}).check();
  await expect(picker.getByRole('status')).toContainText('2 selected');
});


test('a rating-only draft survives Close even before the restaurant has a name',async ({page})=>{
  await page.getByRole('button',{name:'Add restaurant',exact:true}).click();const form=page.locator('#restaurantModal');
  await form.getByRole('radio',{name:'Visited',exact:true}).check();
  await form.getByRole('slider',{name:'Your rating',exact:true}).press('End');
  await form.locator('#closeRestaurantModal').click();await page.reload();
  await page.getByRole('button',{name:'Add restaurant',exact:true}).click();
  await expect(form.getByRole('radio',{name:'Visited',exact:true})).toBeChecked();
  await expect(form.locator('#ratingReadout')).toHaveText('5 / 5');
});
