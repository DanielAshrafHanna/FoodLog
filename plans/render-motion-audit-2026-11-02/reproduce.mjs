import {chromium} from 'playwright';
import {boot,openA,changeA,rows} from '../../tests/fixtures/navigation.js';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch(); const results=[];
for(const [width,height] of [[390,844],[1440,1000]]){
 const page=await browser.newPage({baseURL:'http://127.0.0.1:4181',viewport:{width,height},serviceWorkers:'block'});
 await boot(page);await openA(page);
 const detail=page.locator('#detailPanel');
 const snap=()=>detail.evaluate(el=>({scroll:el.scrollTop,height:el.scrollHeight,client:el.clientHeight,minimum:el.querySelector('#detail-reviews-panel').style.minHeight,active:document.activeElement?.outerHTML.slice(0,180)}));
 await detail.evaluate(el=>el.scrollTop=1100);await page.locator('#detail-tab-reviews').evaluate(el=>el.click());
 const reviewBefore=await snap();await changeA(page,{updated_at:'2026-11-02T11:00:00Z'});await page.waitForTimeout(250);const reviewAfter=await snap();
 await page.locator('#detail-tab-dishes').evaluate(el=>el.click());await detail.evaluate(el=>el.scrollTop=1100);await page.locator('#detail-tab-reviews').evaluate(el=>el.click());const resizeBefore=await snap();await page.setViewportSize({width,height:height-80});await page.waitForTimeout(150);const resizeAfter=await snap();
 await page.locator('#detail-tab-photos').evaluate(el=>el.click());
 await detail.evaluate(el=>el.scrollTop=500);
 const tile=page.locator('#photoLibrary .library-tile').nth(3);await tile.focus();const focusBefore=await tile.getAttribute('data-library-key');
 await changeA(page,{updated_at:'2026-11-02T12:00:00Z'});await page.waitForTimeout(250);
 const focusAfter=await page.evaluate(()=>({key:document.activeElement?.dataset.libraryKey,tag:document.activeElement?.tagName}));
 results.push({width,reviewBefore,reviewAfter,resizeBefore,resizeAfter,focusBefore,focusAfter});await page.close();
}
console.log(JSON.stringify(results,null,2));await writeFile(new URL('tab-results.json',import.meta.url),JSON.stringify(results,null,2));await browser.close();
