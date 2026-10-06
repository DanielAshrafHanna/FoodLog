import { expandRestaurantExtras, editCaptureLookup } from './quick-capture.helpers.js';
import { expect, test } from '@playwright/test';

const fixture = [{ id: 'capture-seed', name: 'Fixture Table', location: 'Maadi', cuisine: 'Egyptian', price: '$$$', playlists: ['Date night'], visited: ['You'], ratings: [], photos: [], dishes: [], updatedAt: 1 }];

test.beforeEach(async ({ page }) => {
  await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  await page.goto('/');
  await page.evaluate(data => {
    localStorage.clear(); sessionStorage.clear();
    localStorage.setItem('plate-log-data-v1', JSON.stringify(data));
  }, fixture);
  await page.reload();
});

test('a name-only save keeps price unknown and refreshes all counts before reload', async ({ page }) => {
  await page.getByRole('button', { name: 'Add restaurant', exact: true }).click();
  await page.getByLabel('Restaurant name or Maps link (required)', { exact: true }).fill('Unknown Price Table');
  await expect(page.locator('#priceInput')).toHaveValue('');
  await page.getByRole('button', { name: 'Save restaurant', exact: true }).click();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('plate-log-data-v1')));
  expect(saved.find(r => r.name === 'Unknown Price Table').price).toBe('');
  expect(saved.find(r => r.id === 'capture-seed')).toEqual(fixture[0]);
  await expect(page.locator('.restaurant-row').filter({ hasText: 'Unknown Price Table' }).locator('.price')).toHaveCount(0);
  await expect(page.locator('#visitFilter [data-visit="all"]')).toHaveText('All2');
  await expect(page.locator('#visitFilter [data-visit="want"]')).toHaveText('Not visited1');
  await expect(page.locator('#visitFilter [data-visit="been"]')).toHaveText('Visited1');
  await expect(page.locator('[data-playlist="all"] .playlist-chip-count')).toHaveText('2');
  await expect(page.locator('[data-playlist="__none__"] .playlist-chip-count')).toHaveText('1');
  await page.reload();
  await expect(page.locator('.restaurant-row').filter({ hasText: 'Unknown Price Table' }).locator('.price')).toHaveCount(0);
});

test('price can be reset and remains unknown in a recovered draft', async ({ page }) => {
  await page.getByRole('button', { name: 'Add restaurant', exact: true }).click();
  await page.getByLabel('Restaurant name or Maps link (required)', { exact: true }).fill('Reset Price Table');
  await expandRestaurantExtras(page);
  await expect(page.getByRole('radio', { name: 'Not sure yet', exact: true })).toBeChecked();
  await page.getByText('Casual', { exact: true }).click();
  await expect(page.locator('#priceInput')).toHaveValue('$$');
  await page.getByRole('radio', { name: 'Not sure yet', exact: true }).check();
  await page.locator('#closeRestaurantModal').click();
  await page.reload();
  await page.getByRole('button', { name: 'Add restaurant', exact: true }).click();
  await expect(page.getByRole('radio', { name: 'Not sure yet', exact: true })).toBeChecked();
  await expect(page.locator('#priceInput')).toHaveValue('');
});

test('an explicit price-only draft survives closing before a name is entered', async ({ page }) => {
  await page.getByRole('button', { name: 'Add restaurant', exact: true }).click();
  await expandRestaurantExtras(page);
  await page.getByText('Treat', { exact: true }).click();
  await page.locator('#closeRestaurantModal').click();
  await page.reload();
  await page.getByRole('button', { name: 'Add restaurant', exact: true }).click();
  await expect(page.getByRole('radio', { name: 'Treat 1,200–2,000', exact: true })).toBeChecked();
});

test('a visited save updates playlist and visit counts immediately', async ({ page }) => {
  await page.getByRole('button', { name: 'Add restaurant', exact: true }).click();
  await page.getByLabel('Restaurant name or Maps link (required)', { exact: true }).fill('Visited Playlist Table');
  await page.getByRole('radio', { name: 'Yes', exact: true }).check();
  await expandRestaurantExtras(page);
  await page.getByRole('checkbox', { name: 'Date night', exact: true }).check();
  await page.getByRole('button', { name: 'Save restaurant', exact: true }).click();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(page.locator('#visitFilter [data-visit="been"]')).toHaveText('Visited2');
  await expect(page.locator('[data-playlist="Date night"] .playlist-chip-count')).toHaveText('2');
  await expect(page.locator('[data-playlist="all"] .playlist-chip-count')).toHaveText('2');
});

test('mocked cloud save sends unknown price and refreshes counts before the remote reload finishes', async ({ page }) => {
  await page.route('**/config.js*', route => route.fulfill({contentType:'text/javascript',body:"window.PLATE_LOG_CONFIG={supabaseUrl:'https://capture-fixture.supabase.co',supabasePublishableKey:'fixture-key'};"}));
  await page.route('**/vendor/supabase-2.110.8.js', route => route.fulfill({contentType:'text/javascript',body:`
    window.__captureCalls=[]; window.__captureSaved=false;
    const session={user:{id:'fixture-editor',email:'editor@example.com',user_metadata:{full_name:'Fixture Editor'}}};
    const rows=[{id:'cloud-seed',user_id:'fixture-editor',name:'Cloud Fixture',location:'',cuisine:'',price:'$$$',playlists:[],visited:[],restaurant_ratings:[],restaurant_photos:[],dishes:[]}];
    class Query {
      constructor(table){this.table=table;}
      select(){return this;} eq(){return this;} is(){return this;} in(){return this;} not(){return this;} order(){return this;} limit(){return this;} abortSignal(){return this;}
      insert(){return this;} update(){return this;} upsert(){return this;}
      maybeSingle(){return Promise.resolve({data:this.table==='approved_users'?{email:'editor@example.com'}:null,error:null});}
      async result(){
        if(this.table==='restaurants' && window.__captureSaved) await new Promise(resolve=>{window.__releaseCaptureReload=resolve;});
        return {data:this.table==='restaurants'?rows:[],error:null};
      }
      then(resolve,reject){return this.result().then(resolve,reject);}
    }
    const channel={on(){return this;},subscribe(){return this;}};
    window.supabase={createClient:()=>({
      auth:{getSession:()=>Promise.resolve({data:{session},error:null}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},
      from:table=>new Query(table), channel:()=>channel,
      storage:{from:()=>({getPublicUrl:()=>({data:{publicUrl:''}})})},
      rpc:async(name,args)=>{
        if(name==='save_restaurant_reliably'){
          window.__captureCalls.push(args); window.__captureSaved=true;
          rows.push({id:args.p_restaurant_id,user_id:'fixture-editor',...args.p_restaurant,restaurant_ratings:[],restaurant_photos:[],dishes:[]});
          return {data:args.p_restaurant_id,error:null};
        }
        return {data:[],error:null};
      }
    })};
  `}));
  await page.reload();
  await expect(page.locator('.restaurant-row')).toHaveCount(1);
  await page.getByRole('button', { name: 'Add restaurant', exact: true }).click();
  await page.getByLabel('Restaurant name or Maps link (required)', { exact: true }).fill('Cloud Unknown Price');
  await page.getByRole('button', { name: 'Save restaurant', exact: true }).click();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  expect(await page.evaluate(() => window.__captureCalls[0].p_restaurant.price)).toBe('');
  await expect(page.locator('#visitFilter [data-visit="all"]')).toHaveText('All2');
  await expect(page.locator('#visitFilter [data-visit="want"]')).toHaveText('Not visited2');
  await expect(page.locator('[data-playlist="all"] .playlist-chip-count')).toHaveText('2');
});
