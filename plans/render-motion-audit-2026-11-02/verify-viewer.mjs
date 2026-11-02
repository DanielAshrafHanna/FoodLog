import {chromium} from 'playwright';
const browser=await chromium.launch();
for(const [name,width,height,theme] of [['phone',390,844,'light'],['desktop',1440,1000,'dark']]){
 const page=await browser.newPage({viewport:{width,height},serviceWorkers:'block'});let release;const gate=new Promise(r=>release=r);
 const svg=c=>`<svg xmlns="http://www.w3.org/2000/svg" width="500" height="500"><rect width="500" height="500" fill="${c}"/></svg>`;
 await page.addInitScript(theme=>localStorage.setItem('plate-log-theme',theme),theme);
 await page.route('**/*',async r=>{const u=new URL(r.request().url());if(u.hostname!=='127.0.0.1')return r.abort();if(u.pathname==='/config.js')return r.fulfill({contentType:'text/javascript',body:'window.PLATE_LOG_CONFIG={};'});if(u.pathname==='/audit-red.svg')return r.fulfill({contentType:'image/svg+xml',body:svg('red')});if(u.pathname==='/audit-blue.svg'){await gate;return r.fulfill({contentType:'image/svg+xml',body:svg('blue')});}return r.continue();});
 await page.goto('http://127.0.0.1:4181/');await page.evaluate(async()=>{const {mountGallery}=await import('/lib/photo-gallery.js');mountGallery({dialog:document.querySelector('#sharedGallery'),photos:[{id:'red',photo:'/audit-red.svg',contributorName:'Red fixture'},{id:'blue',photo:'/audit-blue.svg',contributorName:'Blue fixture'}],title:'Viewer fixture',canRemove:()=>true,onRemove:async()=>{},getContext:p=>({name:p.id+' dish',average:4,reviews:[{name:'Fixture reviewer',score:4,notes:p.id+' review'}]})});});
 await page.waitForFunction(()=>getComputedStyle(document.querySelector('#sharedGallery img')).visibility==='visible');await page.locator('[data-gallery-next]').click();await page.waitForTimeout(320);
 await page.screenshot({path:new URL(`${name}-pending.png`,import.meta.url).pathname});release();await page.waitForFunction(()=>getComputedStyle(document.querySelector('#sharedGallery img')).visibility==='visible');await page.waitForTimeout(250);
 await page.screenshot({path:new URL(`${name}-loaded.png`,import.meta.url).pathname});await page.close();
}await browser.close();
