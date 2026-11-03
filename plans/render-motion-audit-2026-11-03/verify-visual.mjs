// Local mock data only; run a preview on :4185.
import { chromium } from '@playwright/test';
import { boot, openA, rows } from '../../tests/fixtures/navigation.js';
const browser=await chromium.launch();
try {
 for(const [width,theme] of [[390,'light'],[1440,'dark']]){
  const context=await browser.newContext({baseURL:'http://127.0.0.1:4185',viewport:{width,height:844},hasTouch:true,isMobile:width<981,serviceWorkers:'block'});
  const page=await context.newPage();await page.addInitScript(theme=>localStorage.setItem('plate-log-theme',theme),theme);
  await boot(page);await openA(page);
  if(width<981){
   const cdp=await context.newCDPSession(page);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:24,y:110,id:1}]});
   for(const x of [50,90,140,200])await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:110,id:1}]});
   await page.screenshot({path:'plans/render-motion-audit-2026-11-03/phone-drag.png'});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  }else{
   await page.locator('.dish-gallery-cover').first().click();
   await page.locator('[data-gallery-zoom]').click();
   await page.screenshot({path:'plans/render-motion-audit-2026-11-03/desktop-gallery.png',animations:'disabled'});
  }
  await context.close();
 }
}finally{await browser.close()}
