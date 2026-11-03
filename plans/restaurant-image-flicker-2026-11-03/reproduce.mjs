// Run local preview on :4186. Invented records/synthetic images; external requests blocked.
import {chromium} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import {writeFile} from 'node:fs/promises';
import {boot,openA,changeA,rows} from '../../tests/fixtures/navigation.js';
const phase=process.env.CONTINUITY_PHASE||'final';
const browser=await chromium.launch();
try{
 const page=await browser.newPage({baseURL:'http://127.0.0.1:4186',viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'});
 if(phase==='baseline'){
  const body=execFileSync('git',['show','f0ead1f:lib/detail-view.js'],{encoding:'utf8'});
  await page.route('**/lib/detail-view.js',route=>route.fulfill({contentType:'text/javascript',body}));
 }
 await boot(page);await openA(page);
 await page.evaluate(()=>{const p=document.querySelector('#detailPanel');p.scrollTop=p.querySelector('.dish-card').offsetTop-100;window.__beforeImages=[...p.querySelectorAll('.dish-photo')];window.__beforeCards=[...p.querySelectorAll('.dish-card')];});
 const dishes=structuredClone(rows[0].dishes);dishes[0].dish_ratings=[{rater_email:'fixture@example.com',rater_name:'Fixture',rating:4,notes:'A fresh review.'}];
 await changeA(page,{dishes});
 await page.waitForTimeout(100);
 const result=await page.evaluate(()=>({imagesRetained:[...document.querySelectorAll('#detailPanel .dish-photo')].map((im,i)=>im===window.__beforeImages[i]),cardsRetained:[...document.querySelectorAll('#detailPanel .dish-card')].map((im,i)=>im===window.__beforeCards[i])}));
 console.log(result);
 await writeFile(`plans/restaurant-image-flicker-2026-11-03/${phase}-continuity.json`,JSON.stringify(result,null,2));
 if(phase==='final')await page.screenshot({path:'plans/restaurant-image-flicker-2026-11-03/phone-after.png'});
}finally{await browser.close()}
