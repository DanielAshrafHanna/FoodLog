import {test,expect} from '@playwright/test';
import {rows} from './fixtures/navigation.js';

async function startup(page,{approved=true,guest=false,empty=false}={}){
 await page.route('**/*',route=>{
  const u=new URL(route.request().url());if(u.hostname!=='127.0.0.1')return route.abort();
  if(u.pathname==='/config.js')return route.fulfill({contentType:'text/javascript',body:"window.PLATE_LOG_CONFIG={supabaseUrl:'https://startup-fixture.supabase.co',supabasePublishableKey:'fixture-key'};"});
  if(u.pathname==='/vendor/supabase-2.110.8.js')return route.fulfill({contentType:'text/javascript',body:`
   const rows=${JSON.stringify(empty?[]:rows)};
   const session=${guest?'null':JSON.stringify({user:{id:'fixture-editor',email:'fixture@example.com'}})};
   const sessionReady=new Promise(r=>window.__releaseSession=r),accessReady=new Promise(r=>window.__releaseAccess=r),dataReady=new Promise(r=>window.__releaseData=r);
   class Query{constructor(table){this.table=table;}select(){return this;}eq(){return this;}is(){return this;}in(){return this;}not(){return this;}order(){return this;}limit(){return this;}abortSignal(){return this;}upsert(){return this;}insert(){return this;}delete(){return this;}
    async maybeSingle(){if(this.table==='approved_users'){window.__checkingAccess=true;await accessReady;return {data:${approved?"{email:'fixture@example.com'}":'null'},error:null};}return {data:null,error:null};}
    then(resolve,reject){return (async()=>{if(this.table==='restaurants'){window.__readingData=true;await dataReady;}return {data:this.table==='restaurants'?rows:[],error:null};})().then(resolve,reject);}}
   const channel={on(){return this;},subscribe(){return this;}};
   window.supabase={createClient:()=>({auth:{getSession:async()=>{await sessionReady;return {data:{session},error:null};},onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},from:t=>new Query(t),rpc:async()=>({data:[],error:null}),channel:()=>channel,storage:{from:()=>({getPublicUrl:()=>({data:{publicUrl:''}})})}})};
  `});return route.continue();
 });
 await page.goto('/');
 await expect.poll(()=>page.evaluate(()=>typeof window.__releaseSession)).toBe('function');
}

test('initial HTML hides the empty-journal hero before application JavaScript arrives',async({page})=>{
 let release;const gate=new Promise(r=>release=r);
 await page.route('**/app.js*',async route=>{await gate;await route.continue();});
 try{await page.goto('/',{waitUntil:'commit'});await expect(page.locator('.hero-panel')).toBeHidden();}finally{release();}
});
test('the initial shell reserves playlist and count geometry while scripts load',async({page})=>{
 let release;const gate=new Promise(r=>release=r);
 await page.route('**/app.js*',async route=>{await gate;await route.continue();});
 try{
  await page.goto('/',{waitUntil:'commit'});
  await expect(page.locator('#playlistSwitcher .playlist-chip')).toBeVisible();
  await expect(page.locator('#playlistSwitcher .playlist-chip')).toBeDisabled();
  expect((await page.locator('#playlistSwitcher').boundingBox()).height).toBeGreaterThanOrEqual(50);
  await expect(page.locator('#visitFilter .visit-chip-count')).toHaveCount(3);
  await expect(page.locator('#wantToGoFilterButton')).toBeDisabled();
  await expect(page.locator('#restaurantList [data-loading]')).toHaveCount(4);
  await expect(page.locator('#restaurantList .restaurant-ticket-media').first()).toBeVisible();
 }finally{release();}
});
for(const approved of [true,false])test(`startup waits for real access and collection results (${approved?'approved':'waiting'} account)`,async({page})=>{
 await startup(page,{approved});await expect(page.locator('.hero-panel')).toBeHidden();await expect(page.locator('#guestAccess')).toBeHidden();
 await expect(page.locator('#playlistSwitcher [data-playlist="all"]')).toHaveCount(1);
 await expect(page.locator('#playlistSwitcher .playlist-chip')).toHaveCount(1);
 await expect(page.locator('#wantToGoFilterButton')).toBeVisible();await expect(page.locator('#wantToGoFilterButton')).toBeDisabled();
 await expect(page.locator('#quickAddButton')).toBeDisabled();
 await page.evaluate(()=>window.__releaseSession());await expect.poll(()=>page.evaluate(()=>window.__checkingAccess)).toBe(true);
 await expect(page.locator('#guestAccess')).toBeHidden();await expect(page.locator('.hero-panel')).toBeHidden();
 await page.evaluate(()=>window.__releaseAccess());await expect.poll(()=>page.evaluate(()=>window.__readingData)).toBe(true);
 if(approved){await expect(page.locator('#wantToGoFilterButton')).toBeEnabled();await expect(page.locator('#quickAddButton')).toBeEnabled();}
 else await expect(page.locator('#wantToGoFilterButton')).toBeHidden();
 if(approved)await expect(page.locator('#guestAccess')).toBeHidden();else await expect(page.locator('#guestAccessTitle')).toHaveText('Waiting for editing approval');
 await expect(page.locator('.hero-panel')).toBeHidden();await page.evaluate(()=>window.__releaseData());await expect(page.locator('.restaurant-row[data-id]')).toHaveCount(2);await expect(page.locator('.hero-panel')).toBeHidden();
});
test('a real matching service-worker installation does not reload the new document',async({browser})=>{
 const context=await browser.newContext({serviceWorkers:'allow'});const page=await context.newPage();
 try{
  await startup(page);const origin=await page.evaluate(()=>performance.timeOrigin);
  await expect.poll(()=>page.evaluate(()=>Boolean(navigator.serviceWorker.controller)),{timeout:10000}).toBe(true);
  await page.waitForTimeout(1700);
  expect(await page.evaluate(()=>performance.timeOrigin)).toBe(origin);
  await page.evaluate(()=>window.__releaseSession());await page.evaluate(()=>window.__releaseAccess());await page.evaluate(()=>window.__releaseData());
  await expect(page.locator('.restaurant-row[data-id]')).toHaveCount(2);
 }finally{await context.close();}
});
test('genuine guest access and an empty collection remain available after startup',async({page})=>{
 await startup(page,{guest:true,empty:true});await expect(page.locator('#guestAccess')).toBeHidden();await expect(page.locator('.hero-panel')).toBeHidden();
 await page.evaluate(()=>window.__releaseSession());await expect(page.locator('#guestAccessTitle')).toHaveText('Make this your food journal');
 await expect(page.locator('.hero-panel')).toBeHidden();await expect.poll(()=>page.evaluate(()=>window.__readingData)).toBe(true);
 await page.evaluate(()=>window.__releaseData());await expect(page.locator('.hero-panel')).toBeVisible();await expect(page.locator('#guestGoogleSignInButton')).toBeVisible();
});
