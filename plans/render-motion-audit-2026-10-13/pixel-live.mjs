// Physical Android Chrome only. Forward ADB tcp:9223 to chrome_devtools_remote.
// Run: FOODLOG_PIXEL_OUT=/private/tmp/foodlog-pixel node plans/render-motion-audit-2026-10-13/pixel-live.mjs
// No production saves/deletes or fixture writes. Raw traces remain local.
import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
const out=process.env.FOODLOG_PIXEL_OUT || '/private/tmp/foodlog-pixel';
await mkdir(out,{recursive:true});
const browser=await chromium.connectOverCDP('http://127.0.0.1:9223');
const context=browser.contexts()[0];
const existingPage=context.pages().find(p=>p.url().startsWith('https://food.danyhanna.uk'));
const page=existingPage || await context.newPage();
const originalURL=page.url();
const cdp=await context.newCDPSession(page);
const browserVersion=await cdp.send('Browser.getVersion');
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const results=[];
let savedPrefs;
const storageKeys=['plate-log-filters-v1','plate-log-view-v1','plate-log-theme'];
const tick=ms=>page.waitForTimeout(ms);
async function touch(locator) {
  await locator.scrollIntoViewIfNeeded();const box=await locator.boundingBox();if(!box)throw new Error('Touch target unavailable');
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width/2,y:box.y+box.height/2}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
}
async function settled() {
  await expect.poll(()=>page.locator('#detailPanel').evaluate(el=>{
    const t=getComputedStyle(el).transform;
    return Math.abs(t==='none'?0:new DOMMatrixReadOnly(t).m41)<1 && !document.documentElement.classList.contains('is-detail-swipe-settling');
  })).toBe(true);
}
async function closed() { await expect(page.locator('body')).not.toHaveClass(/mobile-detail-view/); }
async function scrollGesture(x,y,dx,dy) {
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
  for(let i=1;i<=12;i++) {await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx*i/12,y:y+dy*i/12}]});await tick(16);}
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
}
async function record(name, action) {
  const events=[];const collect=e=>events.push(...e.value);cdp.on('Tracing.dataCollected',collect);
  await cdp.send('Tracing.start',{categories:'devtools.timeline,blink.user_timing',transferMode:'ReportEvents'});
  await page.evaluate(()=>{
    window.__pixelPerf={frames:[],tasks:[],shifts:[]};const perf=window.__pixelPerf;const token=window.__pixelSampling=(window.__pixelSampling||0)+1;let last=performance.now();
    const frame=now=>{if(token!==window.__pixelSampling)return;perf.frames.push(now-last);last=now;requestAnimationFrame(frame);};requestAnimationFrame(frame);
    window.__pixelObservers=[new PerformanceObserver(list=>window.__pixelPerf.tasks.push(...list.getEntries().map(e=>e.duration))),new PerformanceObserver(list=>window.__pixelPerf.shifts.push(...list.getEntries().filter(e=>!e.hadRecentInput).map(e=>e.value)))];
    window.__pixelObservers[0].observe({type:'longtask'});window.__pixelObservers[1].observe({type:'layout-shift'});
  });
  await action();await tick(300);
  const measurements=await page.evaluate(()=>{window.__pixelSampling++;window.__pixelObservers.forEach(o=>o.disconnect());return window.__pixelPerf;});
  const complete=new Promise(resolve=>cdp.once('Tracing.tracingComplete',resolve));await cdp.send('Tracing.end');await complete;cdp.off('Tracing.dataCollected',collect);
  await writeFile(`${out}/${name}.chrome-trace.json`,JSON.stringify({traceEvents:events}));
  const gaps=measurements.frames.slice(1).sort((a,b)=>a-b);
  const aggregate=eventName=>{const durations=events.filter(e=>e.ph==='X'&&e.name===eventName&&e.dur).map(e=>e.dur/1000);return {count:durations.length,totalMs:durations.reduce((a,b)=>a+b,0),maxMs:Math.max(0,...durations)};};
  const result={name,frameSamples:gaps.length,rafMedianMs:gaps[Math.floor(gaps.length*.5)],rafP95Ms:gaps[Math.floor(gaps.length*.95)],rafMaxMs:Math.max(...gaps),rafGapsOver25ms:gaps.filter(n=>n>25).length,longTaskCount:measurements.tasks.length,maxLongTaskMs:Math.max(0,...measurements.tasks),unexpectedCLS:measurements.shifts.reduce((a,b)=>a+b,0),Layout:aggregate('Layout'),UpdateLayoutTree:aggregate('UpdateLayoutTree'),Paint:aggregate('Paint')};
  results.push(result);console.log(JSON.stringify(result));
}
try {
  await page.goto('https://food.danyhanna.uk/',{waitUntil:'domcontentloaded'});await cdp.send('Page.bringToFront');
  await expect(page.locator('.restaurant-row[data-id]').first()).toBeVisible({timeout:30000});
  await expect(page.locator('#applyBrowseOrder')).toBeAttached();
  savedPrefs=await page.evaluate(keys=>Object.fromEntries(keys.map(k=>[k,localStorage.getItem(k)])),storageKeys);
  // Start from All without changing account state or saved records.
  await touch(page.getByRole('button',{name:'Open filters',exact:true}));
  await touch(page.locator('#clearFiltersButton'));
  await touch(page.locator('#applyFiltersButton'));
  await expect(page.locator('#filterSheet')).not.toBeVisible();
  await tick(1200);
  const device=await page.evaluate(()=>({width:innerWidth,height:innerHeight,dpr:devicePixelRatio,visibility:document.visibilityState,rowCount:document.querySelectorAll('.restaurant-row[data-id]').length,appBuild:new URL([...document.scripts].find(s=>s.src.includes('/app.js')).src).searchParams.get('v'),swBuild:navigator.serviceWorker.controller?new URL(navigator.serviceWorker.controller.scriptURL).searchParams.get('v'):null,reducedMotion:matchMedia('(prefers-reduced-motion:reduce)').matches}));
  if(device.appBuild!=='cc8cb78')throw new Error(`Unexpected live build ${device.appBuild}`);
  const candidates=await page.locator('.restaurant-row[data-id]').evaluateAll(nodes=>nodes.map(n=>({id:n.dataset.id,dishes:parseInt(n.querySelector('.pill.dishes')?.textContent)||0})).sort((a,b)=>b.dishes-a.dishes));
  const chosen=candidates[0].id;const row=()=>page.locator(`.restaurant-row[data-id="${chosen}"]`);
  const open=async()=>{await touch(row());await expect(page.locator('body')).toHaveClass(/mobile-detail-view/);await settled();};
  const back=async()=>{await touch(page.getByRole('button',{name:'Back to places',exact:true}));await closed();};
  // Warm one actual detail and its real media before the steady-navigation recording.
  await open();await tick(2000);const detailCounts=await page.locator('#detailPanel').evaluate(el=>({dishes:el.querySelectorAll('.dish-card').length,tracks:el.querySelectorAll('.dish-photo-track').length,images:el.querySelectorAll('img').length}));await back();
  const adb='/Users/danielhanna/development/platform-tools/adb';
  const perfettoPid=execFileSync(adb,['shell','perfetto','--txt','-c','-','-o','/data/misc/perfetto-traces/foodlog-pixel-navigation.pftrace','--background-wait'],{input:'buffers { size_kb: 16384 fill_policy: RING_BUFFER }\nduration_ms: 60000\ndata_sources { config { name: "android.surfaceflinger.frametimeline" } }\ndata_sources { config { name: "linux.process_stats" process_stats_config { scan_all_processes_on_start: true } } }\n',encoding:'utf8'}).trim();
  console.log('Android frame timeline recording started');
  await record('drawer-cycles',async()=>{for(let i=0;i<5;i++){await open();await tick(250);await back();await tick(250);}});
  await open();
  await record('detail-scroll-swipe',async()=>{
    const box=await page.locator('#detailPanel').boundingBox();const x=box.x+box.width*.65;const y=box.y+box.height*.75;
    await scrollGesture(x,y,0,-box.height*.5);await tick(400);
    const visibleTrack=page.locator('#detailPanel .dish-photo-track').first();
    if(await visibleTrack.count()){await visibleTrack.scrollIntoViewIfNeeded();const b=await visibleTrack.boundingBox();if(b&&b.width>40)await scrollGesture(b.x+b.width*.8,b.y+b.height*.5,-b.width*.6,0);}
    const scroll=await page.locator('#detailPanel').evaluate(el=>el.scrollTop);await back();await open();
    const restored=await page.locator('#detailPanel').evaluate(el=>el.scrollTop);expect(Math.abs(restored-scroll)).toBeLessThanOrEqual(3);
    const box2=await page.locator('#detailPanel').boundingBox();await scrollGesture(box2.x+8,box2.y+box2.height*.4,box2.width*.12,0);await settled();
    await scrollGesture(box2.x+8,box2.y+box2.height*.4,box2.width*.8,0);await closed();
  });
  await open();
  await record('history-interruption',async()=>{
    for(let i=0;i<3;i++){
      await page.evaluate(async()=>{const pop=()=>new Promise(resolve=>addEventListener('popstate',resolve,{once:true}));const b=pop();history.back();await b;await new Promise(r=>setTimeout(r,35));const f=pop();history.forward();await f;});
      await tick(350);await expect(page.locator('body')).toHaveClass(/mobile-detail-view/);await settled();
      expect(new URL(page.url()).searchParams.get('place')).toBe(chosen);
    }
  });
  await record('idle-reading',async()=>{
    await page.evaluate(()=>{window.__idleMutations=0;window.__idleObserver=new MutationObserver(r=>window.__idleMutations+=r.filter(x=>x.type==='childList').length);window.__idleObserver.observe(document.querySelector('#detailPanel'),{subtree:true,childList:true});window.__idleObserver.observe(document.querySelector('#restaurantList'),{subtree:true,childList:true});});
    await tick(6000);const mutations=await page.evaluate(()=>{window.__idleObserver.disconnect();return window.__idleMutations;});results.push({name:'idle-mutations',count:mutations});
  });
  await back();
  if(/^\d+$/.test(perfettoPid)){execFileSync(adb,['shell','kill','-TERM',perfettoPid]);await tick(1200);}
  execFileSync(adb,['pull','/data/misc/perfetto-traces/foodlog-pixel-navigation.pftrace',`${out}/navigation.pftrace`],{stdio:'pipe'});
  const selectedFilter=await page.locator('#cuisineFilter option').evaluateAll(options=>options.map(o=>o.value).find(v=>v!=='all'));
  await page.goto('https://food.danyhanna.uk/?cuisine='+encodeURIComponent(selectedFilter),{waitUntil:'domcontentloaded'});
  await expect(page.locator('#cuisineFilter')).toHaveValue(selectedFilter);await tick(1500);
  results.push({name:'cold-filter-link',passed:true});
  // Inspector-only preference override; it does not change the phone's accessibility setting.
  await cdp.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await page.goto('https://food.danyhanna.uk/',{waitUntil:'domcontentloaded'});await expect(page.locator('.restaurant-row[data-id]').first()).toBeVisible();
  await touch(page.locator('.restaurant-row[data-id]').first());await settled();
  const reduced=await page.locator('#detailPanel').evaluate(el=>({matches:matchMedia('(prefers-reduced-motion:reduce)').matches,settling:document.documentElement.classList.contains('is-detail-swipe-settling'),transition:getComputedStyle(el).transitionDuration}));
  expect(reduced.matches).toBe(true);expect(reduced.settling).toBe(false);results.push({name:'reduced-motion',...reduced});
  await cdp.send('Emulation.setEmulatedMedia',{features:[]});
  expect(errors).toEqual([]);
  const summary={recordedAt:new Date().toISOString(),device:'Physical Pixel 8',browser:browserVersion.product,deviceViewport:device,detailCounts,productionWrites:false,errors,results};
  await writeFile(`${out}/summary.json`,JSON.stringify(summary,null,2));console.log('Pixel live tests passed');
} finally {
  if(savedPrefs)await page.evaluate(prefs=>{for(const [key,value]of Object.entries(prefs)){if(value===null)localStorage.removeItem(key);else localStorage.setItem(key,value);}},savedPrefs).catch(()=>{});
  await cdp.send('Emulation.setEmulatedMedia',{features:[]}).catch(()=>{});
  if(!existingPage)await page.close();
  else await page.goto(originalURL,{waitUntil:'domcontentloaded'}).catch(()=>{});
  await browser.close();
}
