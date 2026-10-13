// Native Android touches on the existing live FoodLog tab. No record edits.
// ADB tcp:9223 must forward to localabstract:chrome_devtools_remote.
import {chromium,expect} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
const adb='/Users/danielhanna/development/platform-tools/adb';
const out='/private/tmp/foodlog-pixel-native';await mkdir(out,{recursive:true});
const browser=await chromium.connectOverCDP('http://127.0.0.1:9223');
const context=browser.contexts()[0],page=context.pages().find(p=>p.url().startsWith('https://food.danyhanna.uk'));
if(!page)throw new Error('Open FoodLog on the unlocked Pixel first');
const cdp=await context.newCDPSession(page);await cdp.send('Page.bringToFront');
const physical=execFileSync(adb,['shell','wm','size'],{encoding:'utf8'}).match(/Physical size: (\d+)x(\d+)/);
const height=Number(physical[2]);
const originalURL=page.url();
const savedPrefs=await page.evaluate(()=>localStorage.getItem('plate-log-filters-v1'));
const errors=[];page.on('pageerror',e=>errors.push(e.message));
let pid;let tracing=false;
async function point(x,y){return page.evaluate(({x,y,height})=>({x:Math.round(x*devicePixelRatio),y:Math.round(height-innerHeight*devicePixelRatio+y*devicePixelRatio)}),{x,y,height});}
async function tap(locator){await locator.scrollIntoViewIfNeeded();await page.waitForTimeout(70);const b=await locator.boundingBox();if(!b)throw new Error('Missing touch target');const p=await point(b.x+b.width/2,b.y+b.height/2);execFileSync(adb,['shell','input','tap',String(p.x),String(p.y)]);}
async function swipe(x,y,dx,dy){const a=await point(x,y),b=await point(x+dx,y+dy);execFileSync(adb,['shell','input','swipe',String(a.x),String(a.y),String(b.x),String(b.y),'260']);}
async function settled(){await expect.poll(()=>page.locator('#detailPanel').evaluate(el=>{const t=getComputedStyle(el).transform;return Math.abs(t==='none'?0:new DOMMatrixReadOnly(t).m41)<1&&!document.documentElement.classList.contains('is-detail-swipe-settling');})).toBe(true);}
try{
 await page.goto('https://food.danyhanna.uk/',{waitUntil:'domcontentloaded'});await expect(page.locator('.restaurant-row[data-id]').first()).toBeVisible();
 const target=await page.locator('.restaurant-row[data-id]').evaluateAll(nodes=>nodes.map(n=>({id:n.dataset.id,count:parseInt(n.querySelector('.pill.dishes')?.textContent)||0})).sort((a,b)=>b.count-a.count)[0].id);
 const row=page.locator(`.restaurant-row[data-id="${target}"]`),back=page.getByRole('button',{name:'Back to places',exact:true});
 await tap(row);await settled();await page.waitForTimeout(1500);await tap(back);await expect(page.locator('body')).not.toHaveClass(/mobile-detail-view/);
 const frame=await cdp.send('Page.getFrameTree');
 const events=[];cdp.on('Tracing.dataCollected',e=>events.push(...e.value));
 pid=execFileSync(adb,['shell','perfetto','--txt','-c','-','-o','/data/misc/perfetto-traces/foodlog-pixel-native.pftrace','--background-wait'],{input:'buffers { size_kb: 16384 fill_policy: RING_BUFFER }\nduration_ms:60000\ndata_sources { config { name:"android.surfaceflinger.frametimeline" } }\ndata_sources { config { name:"linux.process_stats" process_stats_config { scan_all_processes_on_start:true } } }\n',encoding:'utf8'}).trim();
 await cdp.send('Tracing.start',{categories:'devtools.timeline,blink.user_timing',transferMode:'ReportEvents'});tracing=true;
 await page.evaluate(()=>{window.__nativePerf={tasks:[],shifts:[]};window.__nativeObservers=[new PerformanceObserver(l=>window.__nativePerf.tasks.push(...l.getEntries().map(e=>e.duration))),new PerformanceObserver(l=>window.__nativePerf.shifts.push(...l.getEntries().filter(e=>!e.hadRecentInput).map(e=>e.value)))];window.__nativeObservers[0].observe({type:'longtask'});window.__nativeObservers[1].observe({type:'layout-shift'});});
 for(let i=0;i<5;i++){await tap(row);await settled();await page.waitForTimeout(250);await tap(back);await expect(page.locator('body')).not.toHaveClass(/mobile-detail-view/);await page.waitForTimeout(250);}
 await tap(row);await settled();const box=await page.locator('#detailPanel').boundingBox();await swipe(box.x+box.width*.7,box.y+box.height*.75,0,-box.height*.5);await page.waitForTimeout(500);
 await swipe(box.x+8,box.y+box.height*.4,box.width*.8,0);await expect(page.locator('body')).not.toHaveClass(/mobile-detail-view/);
 const perf=await page.evaluate(()=>{window.__nativeObservers.forEach(o=>o.disconnect());return window.__nativePerf;});
 const complete=new Promise(resolve=>cdp.once('Tracing.tracingComplete',resolve));await cdp.send('Tracing.end');await complete;tracing=false;
 if(/^\d+$/.test(pid)){execFileSync(adb,['shell','kill','-TERM',pid]);pid=null;await page.waitForTimeout(1200);}
 execFileSync(adb,['pull','/data/misc/perfetto-traces/foodlog-pixel-native.pftrace',`${out}/navigation.pftrace`],{stdio:'pipe'});
 await writeFile(`${out}/chrome-trace.json`,JSON.stringify({traceEvents:events}));
 const ownEvents=events.filter(e=>(e.args?.data?.frame||e.args?.beginData?.frame)===frame.frameTree.frame.id);
 const style=ownEvents.filter(e=>e.name==='UpdateLayoutTree'&&e.ph==='X');
 const summary={recordedAt:new Date().toISOString(),device:'Pixel 8',input:'Native adb input tap/swipe; no synthetic rAF loop; no screencast',build:'cc8cb78',browser:(await cdp.send('Browser.getVersion')).product,cycles:5,scrollAndSwipeBackPassed:true,longTaskCount:perf.tasks.length,maxLongTaskMs:Math.max(0,...perf.tasks),unexpectedCLS:perf.shifts.reduce((a,b)=>a+b,0),ownFrameStyleEvents:style.length,ownFrameMaxStyleMs:Math.max(0,...style.map(e=>e.dur/1000)),pageErrors:errors};
 expect(errors).toEqual([]);await writeFile(`${out}/summary.json`,JSON.stringify(summary,null,2));console.log(JSON.stringify(summary));
}finally{
 if(tracing)await cdp.send('Tracing.end').catch(()=>{});
 if(pid&&/^\d+$/.test(pid))try{execFileSync(adb,['shell','kill','-TERM',pid]);}catch{}
 await page.evaluate(value=>value===null?localStorage.removeItem('plate-log-filters-v1'):localStorage.setItem('plate-log-filters-v1',value),savedPrefs).catch(()=>{});
 await page.goto(originalURL,{waitUntil:'domcontentloaded'}).catch(()=>{});await browser.close();
}
