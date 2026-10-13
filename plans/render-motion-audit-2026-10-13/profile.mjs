// Run a local preview on :4173, then: node plans/render-motion-audit-2026-10-13/profile.mjs
// All cloud calls are replaced by the shared disposable fixture. Never writes production.
import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { boot, rows } from '../../tests/fixtures/navigation.js';

const browser = await chromium.launch();
const out = '/private/tmp/foodlog-motion-profile';
await mkdir(out, {recursive:true});
const baseline = Object.fromEntries(['index.html','styles.css','app.js','lib/navigation.js','lib/photo-gallery.js'].map(path=>[path,execFileSync('git',['show',`24a95f8:${path}`],{encoding:'utf8'})]));
const fixture = Array.from({length:60},(_,i)=>{
  const row=structuredClone(rows[i%2]);
  row.id=i===0?'place-A':`fixture-${i}`; row.name=`Place ${String(i).padStart(2,'0')}`;
  row.dishes=Array.from({length:12},(_,d)=>({...structuredClone(row.dishes[d%4]),id:`${row.id}-dish-${d}`}));
  return row;
});
const results=[];
try {
  for (const rate of [1,4]) for (let repeat=1;repeat<=3;repeat++) for (const version of ['original','final']) {
    const context=await browser.newContext({baseURL:'http://127.0.0.1:4173',viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'});
    const page=await context.newPage();
    // Baseline overrides precede boot; the fixture route falls back to this handler.
    if(version==='original') await page.route('**/*',route=>{
      const path=new URL(route.request().url()).pathname.slice(1) || 'index.html';
      const body=baseline[path];
      return body ? route.fulfill({contentType:path.endsWith('.js')?'text/javascript':path.endsWith('.css')?'text/css':'text/html',body}) : route.fallback();
    });
    await boot(page,'/',{count:60,fixture});
    if (version === 'final' && rate === 1 && repeat === 1) {
      const inventory = await page.evaluate(() => ['.detail-panel','.list-panel','.list-header','.detail-underlay-scrim','.restaurant-row','.t-acc-panel','.t-acc-panel-inner','.toast','.t-modal','.sheet','.place-action-sheet','.t-dropdown','.applied-filter-chip','.capture-page','.skeleton'].map(selector => {
        const element=document.querySelector(selector);if(!element)return {selector,present:false};
        const css=getComputedStyle(element);
        return {selector,transitionProperty:css.transitionProperty,transitionDuration:css.transitionDuration,animationName:css.animationName,willChange:css.willChange,filter:css.filter};
      }));
      await writeFile('plans/render-motion-audit-2026-10-13/motion-inventory.json', JSON.stringify(inventory,null,2));
    }
    const cdp=await context.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate',{rate});
    const events=[];cdp.on('Tracing.dataCollected',chunk=>events.push(...chunk.value));
    await cdp.send('Tracing.start',{categories:'devtools.timeline,blink.user_timing',transferMode:'ReportEvents'});
    await page.evaluate(()=>{
      window.__perf={frames:[],longTasks:[],shifts:[],mutations:0};
      let last=performance.now();window.__sampling=true;
      const frame=now=>{window.__perf.frames.push(now-last);last=now;if(window.__sampling)requestAnimationFrame(frame);};requestAnimationFrame(frame);
      new PerformanceObserver(list=>window.__perf.longTasks.push(...list.getEntries().map(e=>e.duration))).observe({type:'longtask'});
      new PerformanceObserver(list=>window.__perf.shifts.push(...list.getEntries().filter(e=>!e.hadRecentInput).map(e=>e.value))).observe({type:'layout-shift'});
      new MutationObserver(records=>window.__perf.mutations+=records.filter(r=>r.type==='childList').length).observe(document.querySelector('#restaurantList'),{childList:true,subtree:true});
    });
    // Exercise both settling under load and a changed row/review during reading.
    for(let i=0;i<3;i++) {
      await page.locator('.restaurant-row[data-id="place-A"]').click();
      await page.waitForTimeout(75);
      await page.evaluate(i=>{
        window.__rows[0].restaurant_ratings=[{rater_email:'fixture@example.com',rating:4,notes:`Incoming review ${i}`}];
        window.__rows[0].updated_at=`2026-10-13T12:0${i}:00Z`;
        window.__emit('restaurants','place-A');
      },i);
      await page.waitForTimeout(700);
      await page.getByRole('button',{name:'Back to places',exact:true}).click();
      await page.waitForTimeout(300);
    }
    const perf=await page.evaluate(()=>{window.__sampling=false;return window.__perf;});
    const complete=new Promise(resolve=>cdp.once('Tracing.tracingComplete',resolve));
    await cdp.send('Tracing.end');await complete;
    const name=`${version}-${rate}x-${repeat}`;
    const traceJSON=JSON.stringify({traceEvents:events});
    await writeFile(`${out}/${name}.trace.json`,traceJSON);
    if(rate===4 && repeat===2) await writeFile(`plans/render-motion-audit-2026-10-13/${name}.trace.json.gz`,gzipSync(traceJSON));
    const sorted=perf.frames.slice(1).sort((a,b)=>a-b);
    const aggregate=eventName=>{
      const durations=events.filter(e=>e.name===eventName&&e.ph==='X'&&e.dur).map(e=>e.dur/1000);
      return {count:durations.length,totalMs:+durations.reduce((a,b)=>a+b,0).toFixed(2),maxMs:+Math.max(0,...durations).toFixed(2)};
    };
    const result={version,rate,repeat,frameSamples:sorted.length,rafP95Ms:sorted[Math.floor(sorted.length*.95)],rafMaxMs:Math.max(...sorted),rafGapsAbove25ms:sorted.filter(n=>n>25).length,longTaskCount:perf.longTasks.length,maxLongTaskMs:Math.max(0,...perf.longTasks),unexpectedCLS:perf.shifts.reduce((a,b)=>a+b,0),listChildMutations:perf.mutations,Layout:aggregate('Layout'),UpdateLayoutTree:aggregate('UpdateLayoutTree'),Paint:aggregate('Paint'),trace:`${out}/${name}.trace.json`};
    results.push(result);console.log(JSON.stringify(result));
    await context.close();
  }
  await writeFile('plans/render-motion-audit-2026-10-13/performance-results.json',JSON.stringify({recordedAt:new Date().toISOString(),browser:browser.version(),fixture:'60 places, 12 dishes each, mocked photos/cloud; three drawer cycles with incoming review',limitations:'RAF gaps are main-thread sampling, not GPU/compositor dropped-frame counts. CPU throttling does not model a phone GPU. Trace excludes startup.',results},null,2));
} finally { await browser.close(); }
