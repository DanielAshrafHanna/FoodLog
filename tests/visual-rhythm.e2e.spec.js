import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const places = [{id:'rhythm-place',name:'The Long Named Dining Room and Weekend Kitchen',location:'Maadi',cuisine:'Modern international',price:'$$$',playlists:[],photos:[],visited:[],updatedAt:1,ratings:[{email:'you',name:'A reviewer with a very long display name',rating:4.5,notes:'A readable review that should wrap comfortably and leave the rating and actions available.',updatedAt:1}],dishes:[]}];

async function settle(page) {
  await expect.poll(() => page.evaluate(() => document.getAnimations().filter(a => a.playState === "running").length)).toBe(0);
}

async function contrast(page) {
  await settle(page);
  await page.addScriptTag({content:await readFile('node_modules/axe-core/axe.min.js','utf8')});
  const violations = await page.evaluate(async () => (await window.axe.run(document,{runOnly:{type:'rule',values:['color-contrast']}})).violations.map(v => ({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})));
  expect(violations).toEqual([]);
}

for (const theme of ['light','dark']) test(`${theme} palette, long content and sheet rhythm stay usable`,async ({page},info)=>{
  const mobile=info.project.name==='mobile-chromium';
  if(mobile) await page.setViewportSize({width:320,height:740});
  await page.goto('/');
  await page.evaluate(({places,theme})=>{localStorage.clear();sessionStorage.clear();localStorage.setItem('plate-log-data-v1',JSON.stringify(places));localStorage.setItem('plate-log-theme',theme);}, {places,theme});
  await page.reload();
  // Use the public preference control, avoiding assumptions about its storage key.
  const isDark=await page.locator('html').evaluate(el=>el.classList.contains('dark-theme'));
  if(isDark !== (theme==='dark')) {
    await page.getByRole('button',{name:'Open account menu',exact:true}).click();
    await page.getByRole('menuitem',{name:`Switch to ${theme} theme`,exact:true}).click();
  }
  const palette=await page.locator('html').evaluate(el=>{const c=getComputedStyle(el);return {bg:c.getPropertyValue('--bg').trim(),panel:c.getPropertyValue('--panel').trim()};});
  expect(palette.bg).toBe(theme==='dark'?'#1c1b1a':'#f7f6f3');
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', theme==='dark'?'#1C1B1A':'#F7F6F3');
  await contrast(page);
  await page.getByRole('button',{name:'Open filters',exact:true}).click();
  const reset=page.locator('#clearFiltersButton'),show=page.locator('#applyFiltersButton');
  await expect(reset).toBeVisible();
  await settle(page);
  const r=await reset.boundingBox(), sh=await show.boundingBox();
  expect(mobile ? sh.y-(r.y+r.height) : sh.x-(r.x+r.width)).toBeGreaterThanOrEqual(8);
  await contrast(page);
  await page.getByRole('button',{name:'Close filters',exact:true}).click();
  await page.getByRole('button',{name:'Open account menu',exact:true}).click();
  await page.getByRole('menuitem',{name:'Open settings',exact:true}).click();
  await contrast(page);
  await page.locator('#closeSettingsModal').click();
  await page.locator('.restaurant-row').click();
  const mine=page.locator('.rating-row--mine');
  await expect(mine).toContainText('A reviewer with a very long display name');
  const fit=await mine.evaluate(el=>el.scrollWidth<=el.clientWidth);
  expect(fit).toBe(true);
  await mine.getByRole('button',{name:'Actions for your review',exact:true}).click();
  const actions=page.locator('#reviewActionSheet');
  await expect(actions).toBeVisible();
  await expect.poll(async()=>{
    const trash=await actions.getByRole('button',{name:'Move review to Trash'}).boundingBox();
    const cancel=await actions.getByRole('button',{name:'Cancel'}).boundingBox();
    return cancel.y-trash.y-trash.height;
  }).toBeGreaterThanOrEqual(12);
  await contrast(page);
  await actions.getByRole('button',{name:'Edit review',exact:true}).click();
  await expect(page.locator('#restaurantRatingModal')).toBeVisible();
  await contrast(page);
  await page.locator('#saveRestaurantRatingButton').hover();
  await contrast(page);
  await page.getByRole('button',{name:'Close restaurant review',exact:true}).click();
});
