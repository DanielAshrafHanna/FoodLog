import { expect, test } from '@playwright/test';
import { editCaptureLookup } from './quick-capture.helpers.js';
const mapsUrl='https://www.google.com/maps/place/Cafe+Roma/@30.1,31.2,15z';
test.beforeEach(async ({page})=>{
  await page.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
  await page.goto('/');await page.evaluate(()=>{localStorage.clear();sessionStorage.clear();localStorage.setItem('plate-log-data-v1',JSON.stringify([{id:'maps-seed',name:'Maps Fixture',location:'Maadi',cuisine:'Egyptian',playlists:[],visited:[],ratings:[],photos:[],dishes:[]} ]));});await page.reload();
  await page.getByRole('button',{name:'Add restaurant',exact:true}).click();
});
async function row(page,name){return page.evaluate(name=>JSON.parse(localStorage.getItem('plate-log-data-v1')).find(r=>r.name===name),name);}

test('the smart field detects Maps, autofills a name and saves the existing URL format',async({page})=>{
  await expect(page.locator('#mapsInput')).toBeHidden();
  await expect(page.locator('#saveRestaurantButton')).toBeDisabled();
  await page.locator('#nameInput').fill(mapsUrl);
  await expect(page.locator('#mapsResolvePreview')).toContainText('Cafe Roma');
  await expect(page.locator('#nameInput')).toHaveValue('Cafe Roma');
  await expect(page.locator('#saveRestaurantButton')).toBeEnabled();
  await page.locator('#saveRestaurantButton').click();await page.reload();
  expect((await row(page,'Cafe Roma')).maps).toBe(mapsUrl);
});

test('autofill protects manually selected names and metadata, and undo restores only auto-filled answers',async({page})=>{
  await page.locator('#nameInput').fill('My chosen name');
  await editCaptureLookup(page,'location');await page.locator('#locationSelect').fill('Maadi');await page.getByRole('option',{name:/^Maadi/}).click();
  await page.locator('#nameInput').fill(mapsUrl);
  await expect(page.locator('#mapsResolvePreview')).toBeVisible();
  await expect(page.locator('#nameInput')).toHaveValue('My chosen name');
  await page.getByRole('button',{name:'Remove Maps link and undo autofill'}).click();
  await expect(page.locator('#nameInput')).toHaveValue('My chosen name');
  await expect(page.locator('#locationCaptureButton')).toHaveText('Maadi');
  await expect(page.locator('#mapsInput')).toHaveValue('');
});

test('undo a detected link clears its auto-filled name and disables Save',async({page})=>{
  await page.locator('#nameInput').fill(mapsUrl);await expect(page.locator('#nameInput')).toHaveValue('Cafe Roma');
  await page.getByRole('button',{name:'Remove Maps link and undo autofill'}).click();
  await expect(page.locator('#nameInput')).toHaveValue('');await expect(page.locator('#mapsResolvePreview')).toBeHidden();
  await expect(page.locator('#saveRestaurantButton')).toBeDisabled();
});

test('manual edits after autofill survive undo and recovered drafts retain the link',async({page})=>{
  await page.locator('#nameInput').fill(mapsUrl);await expect(page.locator('#nameInput')).toHaveValue('Cafe Roma');
  await page.locator('#nameInput').fill('Edited name');await page.locator('#closeRestaurantModal').click();await page.reload();
  await page.getByRole('button',{name:'Add restaurant',exact:true}).click();await expect(page.locator('#mapsResolvePreview')).toBeVisible();
  await page.getByRole('button',{name:'Remove Maps link and undo autofill'}).click();
  await expect(page.locator('#nameInput')).toHaveValue('Edited name');
});

test('failed short links retain the URL, offer Retry and permit a manual-name save',async({page})=>{
  let attempts=0;await page.route('**/api/maps/resolve',r=>{attempts++;return r.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'Could not check this link. Try again.'})});});
  const short='https://maps.app.goo.gl/offline-fixture';await page.locator('#nameInput').fill(short);
  await expect(page.locator('#mapsResolveStatus')).toContainText('Try again');await expect(page.locator('#mapsInput')).toHaveValue(short);await expect(page.locator('#saveRestaurantButton')).toBeDisabled();
  await page.getByRole('button',{name:'Retry link',exact:true}).click();await expect.poll(()=>attempts).toBe(2);
  await page.locator('#nameInput').fill('Offline Maps Fixture');await page.locator('#saveRestaurantButton').click();
  expect((await row(page,'Offline Maps Fixture')).maps).toBe(short);
});

test('typing replaces scheduled checks and blur does not repeat a completed check',async({page})=>{
  const requests=[];await page.route('**/api/maps/resolve',r=>{requests.push(r.request().postDataJSON().url);return r.fulfill({contentType:'application/json',body:JSON.stringify({finalUrl:mapsUrl,placeName:'Cafe Roma'})});});
  await page.locator('#nameInput').fill('https://maps.app.goo.gl/first');await page.locator('#nameInput').fill('https://maps.app.goo.gl/second');
  await expect(page.locator('#nameInput')).toHaveValue('Cafe Roma');await page.locator('#nameInput').press('Tab');await page.waitForTimeout(650);
  expect(requests).toEqual(['https://maps.app.goo.gl/second']);
});

test('delayed checks cannot overwrite a newer link or show old details',async({page})=>{
  let release;const ready=new Promise(r=>{release=r;});await page.route('**/api/maps/resolve',async r=>{await ready;await r.fulfill({contentType:'application/json',body:JSON.stringify({finalUrl:mapsUrl,placeName:'Old link name'})}).catch(()=>{});});
  await page.locator('#nameInput').fill('https://maps.app.goo.gl/delayed-fixture');await expect(page.locator('#mapsResolveStatus')).toContainText('Checking');
  const newer='https://www.google.com/maps/place/New+Table/@30.2,31.3,15z';await page.locator('#nameInput').fill(newer);await expect(page.locator('#nameInput')).toHaveValue('New Table');release();await page.waitForTimeout(100);
  await expect(page.locator('#mapsInput')).toHaveValue(newer);await expect(page.locator('#mapsResolvePreview')).not.toContainText('Old link name');
});

test('close cancels scheduled checks and unrelated or partial URLs never call the resolver',async({page})=>{
  const requests=[];await page.route('**/api/maps/resolve',r=>{requests.push(r.request().postDataJSON());return r.fulfill({status:503,body:'{}'});});
  await page.locator('#nameInput').fill('https://maps.app.goo.gl/close-fixture');await page.locator('#nameInput').press('Escape');await page.waitForTimeout(650);expect(requests).toEqual([]);
  await page.getByRole('button',{name:'Add restaurant',exact:true}).click();
  await page.locator('#nameInput').fill('https://example.com/place');await page.locator('#nameInput').press('Tab');await page.waitForTimeout(650);expect(requests).toEqual([]);
  await expect(page.locator('#mapsResolvePreview')).toBeHidden();
});

test('a late Maps response keeps an open searchable picker anchored above Save',async({page})=>{
  let release;const ready=new Promise(r=>{release=r;});await page.route('**/api/maps/resolve',async r=>{await ready;await r.fulfill({contentType:'application/json',body:JSON.stringify({finalUrl:mapsUrl,placeName:'Cafe Roma'})});});
  await page.locator('#nameInput').fill('https://maps.app.goo.gl/lookup-fixture');await expect(page.locator('#mapsResolveStatus')).toContainText('Checking');await editCaptureLookup(page,'location');release();
  await expect(page.locator('#mapsResolvePreview')).toBeVisible();
  await expect.poll(async()=>{const input=await page.locator('#locationSelect').boundingBox();const list=await page.locator('#locationOptions').boundingBox();const upward=await page.locator('#locationOptions').getAttribute('data-origin')==='bottom-left';return Math.abs(upward?list.y+list.height+6-input.y:list.y-input.y-input.height-6);}).toBeLessThanOrEqual(1);
  const list=await page.locator('#locationOptions').boundingBox();const footer=await page.locator('#restaurantModalActions').boundingBox();expect(list.y+list.height).toBeLessThanOrEqual(footer.y+1);
});

test('unnamed links need a manual name and autofilled metadata safely undoes normalized values',async({page})=>{
  await page.locator('#nameInput').fill('https://www.google.com/maps/@30.1,31.2,15z');
  await expect(page.locator('#mapsResolvePreview')).toBeVisible();await expect(page.locator('#nameInput')).toHaveValue('');await expect(page.locator('#saveRestaurantButton')).toBeDisabled();
  await page.getByRole('button',{name:'Remove Maps link and undo autofill'}).click();
  await page.route('**/api/maps/resolve',r=>r.fulfill({contentType:'application/json',body:JSON.stringify({finalUrl:mapsUrl,placeName:'Cafe Roma',location:' MAADI ',cuisine:'Egyptian'})}));
  await page.locator('#nameInput').fill('https://maps.app.goo.gl/metadata-fixture');
  await expect(page.locator('#mapsResolvePreview')).toContainText('Maadi · Egyptian');await expect(page.locator('#locationCaptureButton')).toHaveText('Maadi');
  await page.getByRole('button',{name:'Remove Maps link and undo autofill'}).click();
  await expect(page.locator('#locationSelect')).toHaveValue('');await expect(page.locator('#cuisineSelect')).toHaveValue('');
});
