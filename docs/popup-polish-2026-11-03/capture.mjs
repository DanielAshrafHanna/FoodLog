import { chromium } from '@playwright/test';
import { fileURLToPath } from 'node:url';
const phase = process.argv[2] || 'after';
const baseURL = process.env.POPUP_PREVIEW_URL || 'http://127.0.0.1:4183';
const fixture=[{id:'popup-table',name:'Juniper Table',location:'Maadi',cuisine:'Italian',playlists:['Weekend tables'],visited:['Fixture friend'],updatedAt:2,ratings:[{email:'you',name:'You',rating:4,notes:'A quiet table and a memorable lunch.'}],photos:[],dishes:[{id:'popup-dish',name:'Roasted seasonal vegetables',photos:[],ratings:[{email:'you',name:'You',rating:4,notes:'A fixture review.'}],likedBy:[]}]},{id:'popup-other',name:'Nori Kitchen',location:'Maadi',cuisine:'Japanese',playlists:['Weekend tables'],visited:[],updatedAt:1,ratings:[],photos:[],dishes:[]}];
const browser=await chromium.launch();
try {
 for(const width of [390,1440]) for(const theme of ['light','dark']) {
  const page=await browser.newPage({viewport:{width,height:900},deviceScaleFactor:1});
  await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
  await page.addInitScript(({fixture,theme})=>{localStorage.clear();sessionStorage.clear();localStorage.setItem('plate-log-data-v1',JSON.stringify(fixture));localStorage.setItem('plate-log-theme',theme);}, {fixture,theme});
  await page.goto(baseURL);await page.locator('.restaurant-row[data-id]').first().waitFor();await page.evaluate(()=>document.fonts.ready);
  const shot=async(name)=>{await page.evaluate(()=>Promise.all(document.getAnimations().filter(a=>Number.isFinite(a.effect?.getTiming().iterations)).map(a=>a.finished.catch(()=>{}))));await page.screenshot({path:fileURLToPath(new URL(`./${phase}-${width}-${theme}-${name}.png`,import.meta.url)),animations:'disabled'});};
  await page.locator('[data-playlist="Weekend tables"]').click();await page.locator('#playlistManageButton').click();await shot('playlist');await page.locator('#closePlaylistManageModal').click();
  await page.locator('#createPlaylistButton').click();await shot('create');await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'Open account menu',exact:true}).click();await shot('account');await page.getByRole('menuitem',{name:'Open settings',exact:true}).click();await shot('settings');await page.locator('#closeSettingsModal').click();
  await page.locator('#filterButton').click();await shot('filters');await page.locator('#closeFilterSheet').click();
  await page.locator('[data-id="popup-table"].restaurant-row').click();await page.locator('#detailPanel').getByRole('button',{name:'More',exact:true}).click();await shot('actions');await page.locator('#closePlaceActionSheet').click();
  await page.locator('#detailPanel').getByRole('button',{name:'Edit your review',exact:true}).first().click();await shot('review');
  await page.close();
 }
} finally {await browser.close();}
