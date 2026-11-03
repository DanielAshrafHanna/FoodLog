// Local fixtures only; no production requests/writes. Run a preview on :4185.
import { chromium } from '@playwright/test';
import { boot, rows } from '../../tests/fixtures/navigation.js';
import { mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
const phase=process.env.PROFILE_PHASE || 'baseline';
const out='/private/tmp/foodlog-motion-2026-11-03';
await mkdir(out,{recursive:true});
const fixture=Array.from({length:40},(_,i)=>{
 const row=structuredClone(rows[i%2]);row.id=i===0?'place-A':`fixture-${i}`;row.name=`Fixture place ${i}`;
 row.dishes=Array.from({length:20},(_,d)=>({...structuredClone(row.dishes[d%4]),id:`${row.id}-dish-${d}`}));return row;
});
const browser=await chromium.launch();const results=[];
try {
 for(const rate of [1,4])for(let repeat=1;repeat<=3;repeat++){
  const context=await browser.newContext({baseURL:'http://127.0.0.1:4185',viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'});
  const page=await context.newPage();
  if(phase==='baseline'){
   const baseline=Object.fromEntries(['app.js','styles.css','lib/detail-view.js','lib/navigation.js'].map(p=>[p,execFileSync('git',['show',`dd73372:${p}`],{encoding:'utf8'})]));
   await page.route('**/*',route=>{const p=new URL(route.request().url()).pathname.slice(1);return baseline[p]?route.fulfill({contentType:p.endsWith('.css')?'text/css':'text/javascript',body:baseline[p]}):route.fallback();});
  }
  await boot(page,'/',{count:40,fixture});
  await page.locator('[data-id="place-A"].restaurant-row').click();
  await page.waitForTimeout(400);
  const cdp=await context.newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate});
  const events=[];cdp.on('Tracing.dataCollected',v=>events.push(...v.value));
  await cdp.send('Tracing.start',{categories:'devtools.timeline,blink.user_timing',transferMode:'ReportEvents'});
  await page.evaluate(()=>{window.__sample={frames:[],long:[]};let prev=performance.now();window.__sampling=true;const f=t=>{window.__sample.frames.push(t-prev);prev=t;if(window.__sampling)requestAnimationFrame(f)};requestAnimationFrame(f);new PerformanceObserver(l=>window.__sample.long.push(...l.getEntries().map(e=>e.duration))).observe({type:'longtask'});});
  // Includes a cancelled swipe, then a committed dismissal. Native touch input.
  for(const end of [70,330]){
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:24,y:110,id:1}]});
   for(let step=1;step<=14;step++){
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:24+(end-24)*step/14,y:110,id:1}]});
    await page.waitForTimeout(16);
   }
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(350);
  }
  const perf=await page.evaluate(()=>{window.__sampling=false;return window.__sample;});
  const done=new Promise(r=>cdp.once('Tracing.tracingComplete',r));await cdp.send('Tracing.end');await done;
  const aggregate=name=>{const ds=events.filter(e=>e.name===name&&e.ph==='X').map(e=>(e.dur||0)/1000);return{count:ds.length,totalMs:+ds.reduce((a,b)=>a+b,0).toFixed(2),maxMs:+Math.max(0,...ds).toFixed(2)}};
  const moves=events.filter(e=>e.name==='EventDispatch'&&['pointerdown','pointermove','pointerup','touchstart','touchmove','touchend'].includes(e.args?.data?.type));
  const fs=perf.frames.slice(1).sort((a,b)=>a-b);
  const result={phase,rate,repeat,closed:!(await page.locator('#listLayout').getAttribute('class')).includes('mobile-detail-open'),Layout:aggregate('Layout'),Style:aggregate('UpdateLayoutTree'),Paint:aggregate('Paint'),events:moves.map(e=>({type:e.args.data.type,ms:+(e.dur/1000).toFixed(2)})),longTasks:perf.long,rafP95:fs[Math.floor(fs.length*.95)],rafMax:Math.max(...fs)};
  results.push(result);console.log(JSON.stringify(result));await writeFile(`${out}/${phase}-${rate}x-${repeat}.trace.json`,JSON.stringify({traceEvents:events}));await context.close();
 }
 await writeFile(`plans/render-motion-audit-2026-11-03/${phase}-results.json`,JSON.stringify({browser:browser.version(),fixture:'40 invented places, 20 dishes each; native touch cancel and dismiss; no incoming data',limitations:'Main-thread rAF/CPU traces do not measure physical GPU frame delivery.',results},null,2));
}finally{await browser.close()}
