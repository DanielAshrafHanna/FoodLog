// Disposable image/restaurant fixtures, with every external request blocked.
import {chromium} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
const photo=await readFile('tests/fixtures/photography/salad-anna-pelzer.jpg');
const browser=await chromium.launch();
try{
 for(const width of [390,1440]){
  const context=await browser.newContext({viewport:{width,height:844},deviceScaleFactor:1,hasTouch:width<981,isMobile:width<981,serviceWorkers:'block'});
  const page=await context.newPage(), requests=[];
  await page.route('**/*',async route=>{
   const u=new URL(route.request().url());if(u.hostname!=='127.0.0.1')return route.abort();
   if(u.pathname==='/config.js')return route.fulfill({contentType:'text/javascript',body:'window.PLATE_LOG_CONFIG={};'});
   if(u.pathname.startsWith('/photo-')){requests.push({path:u.pathname,time:Date.now()});if(u.pathname.includes('large'))await new Promise(r=>setTimeout(r,300));return route.fulfill({contentType:'image/jpeg',body:photo});}
   return route.continue();
  });
  await page.addInitScript(()=>{
   if(sessionStorage.seeded)return;sessionStorage.seeded='1';localStorage.clear();
   localStorage.setItem('plate-log-data-v1',JSON.stringify(['A','B'].map(id=>({id,name:`Fixture ${id}`,location:'Maadi',cuisine:'Italian',playlists:[],visited:[],ratings:[],updatedAt:id==='A'?2:1,photos:[{id:`${id}-hero`,photo:`http://127.0.0.1:4186/photo-${id}-large.jpg`,thumb:`http://127.0.0.1:4186/photo-${id}-thumb.jpg`}],dishes:[{id:`${id}-dish`,name:`Dish ${id}`,photos:[{id:`${id}-dish-photo`,photo:`http://127.0.0.1:4186/photo-${id}-dish-large.jpg`,thumb:`http://127.0.0.1:4186/photo-${id}-dish-thumb.jpg`}],ratings:[],likedBy:[]}]}))));
  });
  await page.goto('http://127.0.0.1:4186');await page.locator('.restaurant-row').first().waitFor();
  await page.evaluate(()=>Promise.all([...document.querySelectorAll('.restaurant-row img')].map(im=>im.decode().catch(()=>{}))));
  await page.evaluate(()=>{window.__frames=[];window.__oldHero=null;window.__oldDish=null;window.__end=performance.now()+900;const f=t=>{const panel=document.querySelector('#detailPanel'),im=panel.querySelector('.detail-hero img'),dish=panel.querySelector('.dish-photo');window.__frames.push({t,place:panel.dataset.restaurantId,panelX:panel.getBoundingClientRect().x,hero:im?{complete:im.complete,w:im.naturalWidth,src:im.currentSrc,identity:window.__oldHero?im===window.__oldHero:null}:null,dish:dish?{complete:dish.complete,w:dish.naturalWidth,src:dish.currentSrc,identity:window.__oldDish?dish===window.__oldDish:null}:null});if(im)window.__oldHero=im;if(dish)window.__oldDish=dish;if(t<window.__end)requestAnimationFrame(f)};requestAnimationFrame(f)});
  await page.locator('.restaurant-row[data-id="B"]').click();await page.waitForTimeout(1000);
  const frames=await page.evaluate(()=>window.__frames);
  const events=frames.filter((f,i)=>!i||JSON.stringify({...f,t:0,panelX:0})!==JSON.stringify({...frames[i-1],t:0,panelX:0}));
  console.log(JSON.stringify({width,requests,events},null,2));
  await writeFile(`plans/restaurant-image-flicker-2026-11-03/baseline-${width}.json`,JSON.stringify({requests,frames},null,2));
  await page.screenshot({path:`plans/restaurant-image-flicker-2026-11-03/baseline-${width}.png`});
  await context.close();
 }
}finally{await browser.close()}
