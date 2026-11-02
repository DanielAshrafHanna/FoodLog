import {test,expect} from '@playwright/test';
import {boot,openA,changeA,rows} from './fixtures/navigation.js';

// Disposable records, mocked queries and synthetic images only.
test('short tabs retain their scroll extent through refresh and viewport-height changes',async({page})=>{
 await boot(page);await openA(page);const panel=page.locator('#detailPanel');
 await panel.evaluate(el=>el.scrollTop=1100);await page.locator('#detail-tab-reviews').evaluate(el=>el.click());
 const before=await panel.evaluate(el=>el.scrollTop);
 await changeA(page,{updated_at:'2026-11-02T11:00:00Z'});
 await expect(page.locator('.restaurant-row[data-id=place-A]')).toHaveAttribute('data-fingerprint',/1793617200000/);
 await expect.poll(()=>panel.evaluate(el=>el.scrollTop)).toBeCloseTo(before,0);
 const size=page.viewportSize();await page.setViewportSize({width:size.width,height:size.height-80});
 await page.waitForTimeout(100);
 expect(await panel.evaluate(el=>el.scrollTop)).toBeCloseTo(before,0);
 await page.setViewportSize(size);await page.waitForTimeout(100);
 expect(await panel.evaluate(el=>el.scrollTop)).toBeCloseTo(before,0);
 // Scrolling back toward the header must not be undone by the next resize.
 await panel.evaluate(el=>el.scrollTop=40);await page.waitForTimeout(50);
 await page.setViewportSize({width:size.width,height:size.height-40});await page.waitForTimeout(100);
 expect(await panel.evaluate(el=>el.scrollTop)).toBeCloseTo(40,0);
});

test('background refresh retains the exact photo tile and keyboard focus',async({page})=>{
 await boot(page);await openA(page);await page.locator('#detail-tab-photos').click();
 const tile=page.locator('#photoLibrary .library-tile').nth(3);await tile.focus();
 await tile.evaluate(el=>window.__retainedTile=el);
 await changeA(page,{updated_at:'2026-11-02T11:00:00Z'});
 await expect(page.locator('.restaurant-row[data-id=place-A]')).toHaveAttribute('data-fingerprint',/1793617200000/);
 await expect(tile).toBeFocused();expect(await tile.evaluate(el=>el===window.__retainedTile)).toBe(true);
});

async function gatedCloud(page){
 await page.route('**/*',r=>{
  const url=new URL(r.request().url());if(url.hostname!=='127.0.0.1')return r.abort();
  if(url.pathname==='/config.js')return r.fulfill({contentType:'text/javascript',body:"window.PLATE_LOG_CONFIG={supabaseUrl:'https://gated-fixture.supabase.co',supabasePublishableKey:'fixture-key'};"});
  if(url.pathname==='/vendor/supabase-2.110.8.js')return r.fulfill({contentType:'text/javascript',body:`
   window.__rows=${JSON.stringify(rows)};window.__likesRequests=[];window.__listeners={};
   class Query{constructor(table){this.table=table;}select(){return this;}eq(){return this;}is(){return this;}in(){return this;}not(){return this;}order(){return this;}limit(){return this;}abortSignal(){return this;}upsert(){return this;}maybeSingle(){return Promise.resolve({data:this.table==='approved_users'?{email:'second@example.com'}:null,error:null});}
    then(resolve,reject){if(this.table==='dish_likes')return new Promise(done=>window.__likesRequests.push(done)).then(resolve,reject);return Promise.resolve({data:this.table==='restaurants'?structuredClone(window.__rows):[],error:null}).then(resolve,reject);}}
   const channel={on(type,filter,callback){window.__listeners[filter.table]=callback;return this;},subscribe(){return this;}};
   window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:null},error:null}),onAuthStateChange:callback=>{window.__authChange=callback;return {data:{subscription:{unsubscribe(){}}}};}},from:t=>new Query(t),rpc:async()=>({data:[],error:null}),channel:()=>channel,storage:{from:()=>({getPublicUrl:()=>({data:{publicUrl:''}})})}})};
  `});return r.continue();
 });await page.goto('/');
}
test('primary collection paints before optional Likes and older results cannot overwrite a newer refresh',async({page})=>{
 await gatedCloud(page);await expect(page.locator('.restaurant-row')).toHaveCount(2);
 await expect.poll(()=>page.evaluate(()=>window.__likesRequests.length)).toBe(1);
 await page.evaluate(()=>window.__likesRequests[0]({data:[{dish_id:'A-dish-0',user_id:'friend',display_name:'Known friend',liked_at:'2026-11-02T10:00:00Z'}],error:null}));
 await page.locator('.restaurant-row[data-id=place-A]').click();
 await expect(page.locator('.dish-card').first()).toContainText('Known friend');
 // Start a second query, then a newer primary refresh while that optional query is held.
 const refresh=()=>page.evaluate(()=>window.__listeners.restaurants({new:{id:'place-A'},old:{id:'place-A'}}));
 await refresh();await expect.poll(()=>page.evaluate(()=>window.__likesRequests.length)).toBe(2);
 await refresh();await expect.poll(()=>page.evaluate(()=>window.__likesRequests.length)).toBe(3);
 await page.evaluate(()=>window.__likesRequests[2]({data:[{dish_id:'A-dish-0',user_id:'new',display_name:'Newest friend',liked_at:'2026-11-02T11:00:00Z'}],error:null}));
 await expect(page.locator('.dish-card').first()).toContainText('Newest friend');
 await page.evaluate(()=>window.__likesRequests[1]({data:[],error:null}));await page.waitForTimeout(100);
 await expect(page.locator('.dish-card').first()).toContainText('Newest friend');
 await refresh();await expect.poll(()=>page.evaluate(()=>window.__likesRequests.length)).toBe(4);
 await page.evaluate(()=>window.__likesRequests[3]({data:null,error:{message:'Optional endpoint unavailable'}}));await page.waitForTimeout(100);
 await expect(page.locator('.dish-card').first()).toContainText('Newest friend');
});

const svg=color=>`<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480"><rect width="640" height="480" fill="${color}"/></svg>`;
async function localPage(page){
 await page.route('**/*',r=>{const u=new URL(r.request().url());if(u.hostname!=='127.0.0.1')return r.abort();if(u.pathname==='/config.js')return r.fulfill({contentType:'text/javascript',body:'window.PLATE_LOG_CONFIG={};'});return r.continue();});
 await page.goto('/');
}
test('changing a dish main photo updates its card without a reload',async({page})=>{
 const photo=color=>'data:image/svg+xml,'+encodeURIComponent(svg(color));
 await page.addInitScript(data=>localStorage.setItem('plate-log-data-v1',JSON.stringify(data)),[{id:'main-place',name:'Main fixture',photos:[],ratings:[],dishes:[{id:'main-dish',name:'Dish',photos:[{id:'one',photo:photo('red')},{id:'two',photo:photo('blue')}],ratings:[],likedBy:[]}]}]);
 await localPage(page);await page.locator('.restaurant-row[data-id=main-place]').click();
 await page.locator('.dish-gallery-cover[data-photo-id=two]').click();await page.locator('#sharedGallery [data-gallery-cover]').click();
 await page.locator('#closeSharedGallery').click();await expect(page.locator('.dish-gallery-cover').first()).toHaveAttribute('data-photo-id','two');
 await expect.poll(()=>page.locator('.dish-photo-track').evaluate(el=>el.scrollLeft/el.clientWidth)).toBeCloseTo(0,1);
});

async function viewerFixture(page){
 await page.evaluate(async()=>{
  const {mountGallery}=await import('/lib/photo-gallery.js');window.__removed=[];
  window.__openViewer=()=>mountGallery({dialog:document.querySelector('#sharedGallery'),title:'Fixture viewer',startId:'red',photos:[{id:'red',photo:'/red.svg',contributorName:'Red author'},{id:'blue',photo:'/blue.svg',contributorName:'Blue author'}],canRemove:()=>true,onRemove:async p=>window.__removed.push(p.id),getContext:p=>({name:p.id,average:4,reviews:[{name:'Friend',score:4,notes:p.id+' review'}]})});
  window.__openViewer();
 });
 await expect(page.locator('#sharedGallery img')).toHaveCSS('visibility','visible');
}
test('a slow or superseded original never leaves the previous bitmap with new-photo management',async({page})=>{
 await localPage(page);let release;const gate=new Promise(r=>release=r);
 await page.route('**/red.svg',r=>r.fulfill({contentType:'image/svg+xml',body:svg('red')}));
 await page.route('**/blue.svg',async r=>{await gate;await r.fulfill({contentType:'image/svg+xml',body:svg('blue')});});
 try{
  await viewerFixture(page);const viewer=page.locator('#sharedGallery');await viewer.locator('[data-gallery-next]').click();
  await expect(viewer.locator('img')).toHaveCSS('visibility','hidden');
  await expect(viewer.locator('[data-gallery-loading]')).toBeVisible();await expect(viewer.locator('[data-gallery-remove]')).toBeDisabled();
  await viewer.locator('[data-gallery-remove]').evaluate(el=>el.onclick());expect(await page.evaluate(()=>window.__removed)).toEqual([]);
  await viewer.locator('[data-gallery-prev]').click();await expect(viewer.locator('img')).toHaveCSS('visibility','visible');
  release();await page.waitForTimeout(100);await expect(viewer.locator('[data-gallery-caption]')).toContainText('Red author');
  await viewer.locator('[data-gallery-next]').click();await expect(viewer.locator('img')).toHaveCSS('visibility','visible');
  await expect(viewer.locator('[data-gallery-remove]')).toBeEnabled();await expect(viewer.locator('[data-gallery-caption]')).toContainText('Blue author');
  await viewer.locator('[data-gallery-remove]').click();await viewer.locator('[data-gallery-confirm-remove]').click();expect(await page.evaluate(()=>window.__removed)).toEqual(['blue']);
 }finally{release();}
});
test('paging motion is cancelled when closing and reopening the viewer',async({page})=>{
 await localPage(page);await page.route('**/red.svg',r=>r.fulfill({contentType:'image/svg+xml',body:svg('red')}));await page.route('**/blue.svg',r=>r.fulfill({contentType:'image/svg+xml',body:svg('blue')}));
 await viewerFixture(page);await page.locator('[data-gallery-next]').click();await expect(page.locator('#sharedGallery img')).toHaveCSS('visibility','visible');
 const state=await page.evaluate(()=>{const d=document.querySelector('#sharedGallery'),image=d.querySelector('img'),old=image.getAnimations();d.close();window.__openViewer();return {old:old.map(a=>a.playState),current:image.getAnimations().length};});
 expect(state.old.every(s=>s==='idle'||s==='finished')).toBe(true);expect(state.current).toBe(0);
 await expect(page.locator('#sharedGallery img')).toHaveCSS('visibility','visible');
});

test('a delayed optional Likes response cannot apply across an account change',async({page})=>{
 await gatedCloud(page);await expect(page.locator('.restaurant-row')).toHaveCount(2);
 await expect.poll(()=>page.evaluate(()=>window.__likesRequests.length)).toBe(1);
 await page.evaluate(()=>window.__authChange('SIGNED_IN',{user:{id:'second-account',email:'second@example.com',user_metadata:{full_name:'Second account'}}}));
 await expect.poll(()=>page.evaluate(()=>window.__likesRequests.length)).toBe(2);
 await page.locator('.restaurant-row[data-id=place-A]').click();
 await page.evaluate(()=>window.__likesRequests[1]({data:[{dish_id:'A-dish-0',user_id:'new',display_name:'Current account result',liked_at:'2026-11-02T11:00:00Z'}],error:null}));
 await expect(page.locator('.dish-card').first()).toContainText('Current account result');
 await page.evaluate(()=>window.__likesRequests[0]({data:[{dish_id:'A-dish-0',user_id:'old',display_name:'Stale account result',liked_at:'2026-11-02T10:00:00Z'}],error:null}));
 await page.waitForTimeout(100);await expect(page.locator('.dish-card').first()).not.toContainText('Stale account result');
});

test('failed originals keep photo management disabled and permit navigation back to a loaded photo',async({page})=>{
 await localPage(page);await page.route('**/red.svg',r=>r.fulfill({contentType:'image/svg+xml',body:svg('red')}));await page.route('**/blue.svg',r=>r.fulfill({status:404,body:'Missing fixture'}));
 await viewerFixture(page);const viewer=page.locator('#sharedGallery');await viewer.locator('[data-gallery-next]').click();
 await expect(viewer.locator('[data-gallery-error]')).toBeVisible();await expect(viewer.locator('img')).toHaveCSS('visibility','hidden');await expect(viewer.locator('[data-gallery-remove]')).toBeDisabled();
 await expect(viewer.locator('[data-gallery-loading]')).toBeHidden();await viewer.locator('[data-gallery-prev]').click();await expect(viewer.locator('img')).toHaveCSS('visibility','visible');await expect(viewer.locator('[data-gallery-remove]')).toBeEnabled();await expect(viewer.locator('[data-gallery-error]')).toBeHidden();
});
