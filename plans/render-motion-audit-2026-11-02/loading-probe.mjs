import {chromium} from '../../node_modules/playwright-core/index.mjs';
import {rows} from '../../tests/fixtures/navigation.js';
import {restaurantDetailFingerprint} from '../../lib/render-list.js';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:390,height:844},serviceWorkers:'block'});
await page.route('**/*',route=>{
 const u=new URL(route.request().url());if(u.hostname!=='127.0.0.1')return route.abort();
 if(u.pathname==='/config.js')return route.fulfill({contentType:'text/javascript',body:"window.PLATE_LOG_CONFIG={supabaseUrl:'https://loading-fixture.supabase.co',supabasePublishableKey:'fixture-key'};"});
 if(u.pathname==='/vendor/supabase-2.110.8.js')return route.fulfill({contentType:'text/javascript',body:`
 const rows=${JSON.stringify(rows)};const likesGate=new Promise(r=>window.__releaseLikes=r);
 class Query{constructor(table){this.table=table;}select(){return this;}eq(){return this;}is(){return this;}in(){return this;}not(){return this;}order(){return this;}limit(){return this;}abortSignal(){return this;}maybeSingle(){return Promise.resolve({data:null,error:null});}
 then(resolve,reject){return(async()=>{if(this.table==='restaurants')window.__restaurantsReady=performance.now();if(this.table==='dish_likes'){window.__likesStarted=performance.now();await likesGate;}return {data:this.table==='restaurants'?rows:[],error:null};})().then(resolve,reject);}}
 const channel={on(){return this},subscribe(){return this}};
 window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:null},error:null}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},from:t=>new Query(t),rpc:async()=>({data:[],error:null}),channel:()=>channel,storage:{from:()=>({getPublicUrl:()=>({data:{publicUrl:''}})})}})};
 `});return route.continue();
});
await page.goto('http://127.0.0.1:4181/');await page.waitForFunction(()=>window.__likesStarted>0);
await page.waitForTimeout(700);
const before=await page.evaluate(()=>({primaryReadyMs:window.__restaurantsReady,likesStartedMs:window.__likesStarted,rows:document.querySelectorAll('.restaurant-row[data-id]').length,skeletons:document.querySelectorAll('#restaurantList [data-loading]').length}));
await page.evaluate(()=>window.__releaseLikes());await page.waitForFunction(()=>document.querySelectorAll('.restaurant-row[data-id]').length===2);
const after=await page.evaluate(()=>({rows:document.querySelectorAll('.restaurant-row[data-id]').length,skeletons:document.querySelectorAll('#restaurantList [data-loading]').length}));
const a={id:'p',updatedAt:1,dishes:[{id:'d',updatedAt:1,coverPhotoId:'a',photos:[{id:'a'},{id:'b'}]}]};const b=structuredClone(a);b.dishes[0].coverPhotoId='b';
const result={coldStartupBlockedByOptionalLikes:{beforeRelease:before,afterRelease:after},dishCoverChangeDetectedByFingerprint:restaurantDetailFingerprint(a)!==restaurantDetailFingerprint(b)};
console.log(JSON.stringify(result,null,2));await writeFile(new URL('./loading-probe-results.json',import.meta.url),JSON.stringify(result,null,2)+'\n');await browser.close();
