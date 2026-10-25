import {test,expect} from '@playwright/test';
import {mkdir,readFile} from 'node:fs/promises';

// Fabricated local records reproduce the sparse, no-photo state from the UX report.
const place={id:'organization-place',name:'Bowl House',location:'New Cairo',cuisine:'Bowls',price:'$$',maps:'',playlists:['Asian'],visited:[],photos:[],ratings:[],updatedAt:1,dishes:[{id:'organization-dish',name:'Grilled chicken bowl',photos:[],likedBy:[],ratings:[{email:'you',name:'You',rating:3,notes:''}]}]};
async function boot(page,theme){
 await page.route('**/*',route=>{const url=new URL(route.request().url());if(url.hostname!=='127.0.0.1')return route.abort();if(url.pathname==='/config.js')return route.fulfill({contentType:'text/javascript',body:'window.PLATE_LOG_CONFIG={};'});return route.continue();});
 await page.addInitScript(({place,theme})=>{localStorage.clear();sessionStorage.clear();localStorage.setItem('plate-log-data-v1',JSON.stringify([place]));localStorage.setItem('plate-log-theme',theme);localStorage.setItem('foodlog-detail-swipe-hint-seen-v1','1');},{place,theme});
 await page.goto('/?place=organization-place');await expect(page.locator('#detailPanel')).toHaveAttribute('data-restaurant-id',place.id);await page.evaluate(()=>document.fonts.ready);
}
for(const theme of ['light','dark'])test(`${theme} restaurant identity and dish actions have a clear shared alignment`,async({page},info)=>{
 await boot(page,theme);const detail=page.locator('#detailPanel'),card=detail.locator('.dish-card').first();
 await expect(detail.locator('.detail-header-actions').getByRole('button',{name:'More',exact:true})).toBeVisible();
 await expect(detail.locator('.detail-actions')).toBeHidden();
 await expect(detail.locator('.detail-facts')).toContainText('New Cairo');await expect(detail.locator('.detail-facts')).toContainText('450–1,200 EGP');
 await detail.locator('.detail-bookmark-action').click();await expect(detail.locator('.detail-bookmark-action')).toHaveAttribute('aria-pressed','true');
 const review=card.getByRole('button',{name:'Edit your review',exact:true}),photos=card.getByRole('button',{name:'Add photos',exact:true}),edit=card.getByRole('button',{name:'Edit dish details',exact:true}),like=card.getByRole('button',{name:'Like Grilled chicken bowl',exact:true});
 const bounds=await Promise.all([review,photos,like,edit].map(el=>el.boundingBox()));
 expect(bounds[0].y).toBeCloseTo(bounds[1].y,0);expect(bounds[2].y).toBeCloseTo(bounds[3].y,0);
 expect(bounds[0].x).toBeCloseTo(bounds[2].x,0);expect(bounds[1].x).toBeCloseTo(bounds[3].x,0);
 expect(bounds[2].y-bounds[0].y-bounds[0].height).toBeLessThanOrEqual(16);
 for(const box of bounds){expect(box.height).toBeGreaterThanOrEqual(44);expect(box.width).toBeGreaterThanOrEqual(44);}
 if(info.project.name==='mobile-chromium')await expect(edit).toBeInViewport();
 if(process.env.CAPTURE_ORGANIZED_MENU==='1'){
  await expect(page.locator('#toast')).toBeHidden();await page.mouse.move(0,0);
  await mkdir('docs/organized-restaurant-menu-2026-10-26',{recursive:true});await page.evaluate(async()=>Promise.all(document.getAnimations().map(a=>a.finished.catch(()=>{}))));
  await page.screenshot({path:`docs/organized-restaurant-menu-2026-10-26/${theme}-${info.project.name}.png`});
 }
 await detail.getByRole('button',{name:'More',exact:true}).click();await expect(page.locator('#placeActionSheet')).toBeVisible();await page.keyboard.press('Escape');await expect(detail.getByRole('button',{name:'More',exact:true})).toBeFocused();
 await edit.click();await expect(page.locator('#dishDetailsModal')).toBeVisible();await page.keyboard.press('Escape');await expect(edit).toBeFocused();
 await page.addScriptTag({content:await readFile('node_modules/axe-core/axe.min.js','utf8')});expect(await page.evaluate(async()=>(await axe.run(document.querySelector('#detailPanel'),{runOnly:{type:'rule',values:['color-contrast','button-name','aria-valid-attr-value']}})).violations.map(v=>v.id))).toEqual([]);
 for(const width of [320,390,515,980,1024,1440]){
  await page.setViewportSize({width,height:900});expect(await detail.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
  expect(await card.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
 }
});
