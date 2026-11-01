import {test,expect} from '@playwright/test';
import {readFile,mkdir} from 'node:fs/promises';
const photograph=await readFile(new URL('./fixtures/photography/salad-anna-pelzer.jpg',import.meta.url));
const photo='http://127.0.0.1:4173/fixture-salad.jpg';
const thumb=photo+'?small=1';
const records=[{
 id:'photo-table',name:'The Garden Table',location:'Maadi',cuisine:'Vegetarian',price:'$$',maps:'https://maps.example.com/garden',playlists:['Weekend'],visited:['Friend'],updatedAt:3,
 photos:[{id:'room-preview',photo,thumb,contributorName:'Anna Pelzer · preview photo'}],ratings:[{email:'you',name:'You',rating:4.5,notes:'A calm setting for lunch.'}],
 dishes:[{id:'photo-dish',name:'Garden salad bowl',photos:[{id:'food-one',photo,thumb,contributorName:'Anna Pelzer · preview photo'},{id:'food-two',photo,contributorName:'Anna Pelzer · preview photo'}],ratings:[{email:'you',name:'You',rating:4.5,notes:'Crisp vegetables, bright dressing, and plenty of texture.'}],likedBy:['Friend']},
 {id:'plain-dish',name:'Soup of the day',photos:[],ratings:[],likedBy:[]}]
},{id:'photo-long',name:'The Long Named Dining Room and Weekend Kitchen',location:'New Cairo',cuisine:'Modern international',price:'$$$',playlists:['Dinner with friends','Special occasions'],visited:[],updatedAt:2,photos:[{id:'second-preview',photo,contributorName:'Anna Pelzer · preview photo'}],ratings:[],dishes:[]},
{id:'photo-none',name:'Next Kitchen',location:'',cuisine:'',playlists:[],visited:[],updatedAt:1,photos:[],ratings:[],dishes:[]}];
async function boot(page,theme,data=records){
 await page.route('**/*',route=>{const url=new URL(route.request().url());if(url.hostname!=='127.0.0.1')return route.abort();if(url.pathname==='/fixture-salad.jpg')return route.fulfill({contentType:'image/jpeg',body:photograph});if(url.pathname==='/config.js')return route.fulfill({contentType:'text/javascript',body:'window.PLATE_LOG_CONFIG={};'});return route.continue();});
 await page.addInitScript(({records,theme})=>{localStorage.clear();sessionStorage.clear();localStorage.setItem('plate-log-data-v1',JSON.stringify(records));localStorage.setItem('plate-log-theme',theme);localStorage.setItem('foodlog-detail-swipe-hint-seen-v1','1');},{records:data,theme});
 await page.goto('/');await expect(page.locator('.restaurant-row[data-id]')).toHaveCount(data.length);await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.querySelectorAll('.restaurant-row img')].map(img=>img.decode()));});
}

for(const theme of ['light','dark']) test(`${theme} place tabs share one non-modal interaction and retain reading state`,async({page})=>{
 await boot(page,theme);await page.locator('.restaurant-row[data-id=photo-table]').click();
 const detail=page.locator('#detailPanel'),tabs=detail.getByRole('tablist',{name:'Place sections'});
 await expect(tabs.getByRole('tab')).toHaveCount(3);
 await tabs.getByRole('tab',{name:'Dishes (2)',exact:true}).click();
 for(const section of ['photos','reviews','dishes','photos','reviews']){
  await tabs.locator(`[data-section=${section}]`).scrollIntoViewIfNeeded();
  const position=await detail.evaluate(el=>el.scrollTop);
  await tabs.locator(`[data-section=${section}]`).click();
  await expect.poll(()=>detail.evaluate(el=>el.scrollTop)).toBeCloseTo(position,0);
  await expect(tabs.locator(`[data-section=${section}]`)).toHaveAttribute('aria-selected','true');
  await expect(detail.locator('[role=tabpanel]:visible')).toHaveCount(1);
  await expect(detail.locator('[role=tabpanel]:visible')).toHaveAttribute('id',`detail-${section}-panel`);
  await expect(page.locator('dialog[open]')).toHaveCount(0);

 }
 // Preserve a deeper position even when the destination is shorter.
 await detail.evaluate(el=>{el.scrollTop+=100;});
 for(const section of ['photos','reviews','dishes']){
  const position=await detail.evaluate(el=>el.scrollTop);
  await tabs.locator(`[data-section=${section}]`).evaluate(el=>el.click());
  expect(await detail.evaluate(el=>el.scrollTop)).toBeCloseTo(position,0);
 }
 // Roving keyboard focus/automatic activation uses local, already-loaded panels.
 await tabs.locator('[data-section=reviews]').focus();await page.keyboard.press('ArrowRight');
 await expect(tabs.locator('[data-section=photos]')).toBeFocused();await expect(tabs.locator('[data-section=photos]')).toHaveAttribute('aria-selected','true');
 await page.keyboard.press('Home');await expect(tabs.locator('[data-section=dishes]')).toHaveAttribute('aria-selected','true');
 await detail.evaluate(el=>{el.scrollTop+=60;window.__tabsDish=el.querySelector('.dish-card');const track=el.querySelector('.dish-photo-track');track.scrollLeft=track.clientWidth;return el.scrollTop;});
 await tabs.locator('[data-section=photos]').click();await page.locator('[data-library-filter=dish]').click();
 await tabs.locator('[data-section=reviews]').click();
 await expect(page.locator('#restaurantReviewsBody')).toContainText('A calm setting for lunch.');
 await page.locator('#restaurantReviewsWriteButton').click();
 await page.locator('#restaurantRatingModal').getByLabel('Your review').fill('Updated in the reviews view.');
 await page.locator('#saveRestaurantRatingButton').click();
 await expect(page.locator('#restaurantReviewsBody')).toContainText('Updated in the reviews view.');
 await expect(page.locator('#restaurantReviewsWriteButton')).toBeFocused();
 await page.keyboard.press('Escape');await expect(tabs.locator('[data-section=reviews]')).toHaveAttribute('aria-selected','true');
 await tabs.locator('[data-section=photos]').click();await expect(page.locator('[data-library-filter=dish]')).toHaveAttribute('aria-pressed','true');
 await page.locator('#photoLibrary .library-tile').first().click();await expect(page.locator('#sharedGallery')).toBeVisible();
 await page.keyboard.press('Escape');await expect(tabs.locator('[data-section=photos]')).toHaveAttribute('aria-selected','true');
 const beforeReturn=await detail.evaluate(el=>el.scrollTop);
 await tabs.locator('[data-section=dishes]').click();
 expect(await detail.evaluate(el=>el.querySelector('.dish-card')===window.__tabsDish)).toBe(true);
 expect(await detail.locator('.dish-photo-track').first().evaluate(el=>el.scrollLeft/el.clientWidth)).toBeCloseTo(1,1);
 await expect.poll(()=>detail.evaluate(el=>el.scrollTop)).toBeCloseTo(beforeReturn,0);
 await tabs.locator('[data-section=reviews]').click();
 await page.addScriptTag({content:await readFile('node_modules/axe-core/axe.min.js','utf8')});
 expect(await page.evaluate(async()=>(await axe.run(document.querySelector('#detailPanel'),{runOnly:{type:'rule',values:['color-contrast','button-name','aria-valid-attr-value','aria-required-children','aria-required-parent']}})).violations.map(v=>v.id))).toEqual([]);
 for(const width of [320,390,1440]){
  await page.setViewportSize({width,height:740});if(!await detail.isVisible()) await page.locator('.restaurant-row[data-id=photo-table]').click();
  await tabs.locator('[data-section=reviews]').click();expect(await detail.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
 }
 // Header shortcuts use the same focus and keyboard motion policy as the tabs.
 await detail.locator('[data-action=open-photo-library]').focus();await page.keyboard.press('Enter');
 await expect(detail.locator('#detail-photos-panel')).toBeFocused();
 expect(await detail.locator('#detail-photos-panel').evaluate(el=>el.getAnimations().filter(animation=>animation.playState==='running').length)).toBe(0);
 await detail.locator('.restaurant-score-link').focus();await page.keyboard.press('Enter');
 await expect(detail.locator('#detail-reviews-panel')).toBeFocused();
 expect(await detail.locator('#detail-reviews-panel').evaluate(el=>el.getAnimations().filter(animation=>animation.playState==='running').length)).toBe(0);
 await page.emulateMedia({reducedMotion:'reduce'});
 await tabs.locator('[data-section=photos]').click();
 expect(await detail.locator('#detail-photos-panel').evaluate(el=>el.getAnimations().filter(animation=>animation.playState==='running').length)).toBe(0);
});

for (const theme of ['light', 'dark']) test(`${theme} compact restaurant header keeps review controls and a flush sticky section bar`, async ({ page }, info) => {
 await boot(page, theme);
 await page.locator('.restaurant-row[data-id=photo-table]').click();
 const detail=page.locator('#detailPanel'), nav=detail.locator('.detail-section-nav');
 const summary=detail.locator('.restaurant-summary-line');
 await expect(summary.getByRole('button',{name:'Read restaurant ratings and reviews'})).toBeVisible();
 await expect(summary.getByRole('button',{name:'Edit your review',exact:true})).toBeVisible();
 expect((await summary.boundingBox()).height).toBeLessThanOrEqual(56);
 for(const control of await summary.locator('button').all()) expect((await control.boundingBox()).height).toBeGreaterThanOrEqual(44);
 const score=summary.locator('strong'), count=summary.locator('.restaurant-score-link > span').last();
 expect(Math.abs((await score.boundingBox()).y-(await count.boundingBox()).y)).toBeLessThan(5);
 await summary.getByRole('button',{name:'Edit your review',exact:true}).click();
 await expect(page.locator('#restaurantRatingModal')).toBeVisible();await page.keyboard.press('Escape');
 await expect(summary.getByRole('button',{name:'Edit your review',exact:true})).toBeFocused();
 await expect(detail.getByRole('link',{name:'Open in Maps',exact:true})).toHaveAttribute('href',records[0].maps);
 const hero=await detail.locator('.detail-hero').boundingBox();expect(hero.height).toBeGreaterThanOrEqual(180);
 if(info.project.name==='mobile-chromium'){
  const header=await detail.locator('.detail-title').boundingBox();
  expect(header.y+header.height-hero.y-hero.height).toBeLessThanOrEqual(280);
 }else{
  // A photograph's intrinsic dimensions must not inflate the desktop list row.
  const row=page.locator('.restaurant-row[data-id=photo-table]');
  expect((await row.boundingBox()).height).toBeLessThanOrEqual(230);
  for(const fraction of [.6,.8]){
   await detail.evaluate((el,fraction)=>{el.scrollTop=(el.scrollHeight-el.clientHeight)*fraction;},fraction);
   const geometry=await detail.evaluate(el=>{const bar=el.querySelector('.detail-section-nav'),p=el.getBoundingClientRect(),n=bar.getBoundingClientRect();return{gap:n.top-p.top,left:n.left-p.left,width:n.width,client:el.clientWidth,border:parseFloat(getComputedStyle(el).borderLeftWidth)};});
   expect(geometry.gap).toBeCloseTo(geometry.border,0);expect(geometry.left).toBeCloseTo(geometry.border,0);expect(geometry.width).toBeCloseTo(geometry.client,0);
  }
 }
 for(const section of ['photos','dishes']){
  await nav.locator(`[data-section=${section}]`).click();
  await expect(nav.locator(`[data-section=${section}]`)).toBeFocused();
  await expect(detail.locator(`[id=detail-${section}-panel]`)).toBeVisible();
  // A short page can reach its end before the requested heading reaches the top;
  // the existing reading indicator then selects the last visible section.
  await expect(nav.locator('[aria-selected=true]')).toHaveCount(1);
 }
 for(const width of [320,390,980,1024,1440]){
  await page.setViewportSize({width,height:900});expect(await detail.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
 }
});
for(const theme of ['light','dark'])test(`${theme} photography leads without compressing reading or contribution controls`,async({page},info)=>{
 const mobile=info.project.name==='mobile-chromium';await boot(page,theme);
 const folder='docs/photo-led-restaurant-2026-10-25/after';await mkdir(folder,{recursive:true});
 const capture=async name=>{await page.evaluate(async()=>Promise.all(document.getAnimations().map(a=>a.finished.catch(()=>{}))));await page.screenshot({path:`${folder}/${name}-${theme}-${mobile?'phone':'desktop'}.png`});};
 const row=page.locator('.restaurant-row[data-id=photo-table]');await row.scrollIntoViewIfNeeded();
 const geometry=await row.evaluate(el=>{const r=el.getBoundingClientRect(),m=el.querySelector('.restaurant-ticket-media').getBoundingClientRect(),body=el.querySelector('.restaurant-main').getBoundingClientRect();return{row:r.toJSON(),media:m.toJSON(),body:body.toJSON(),fit:getComputedStyle(el.querySelector('img')).objectFit};});
 expect(geometry.fit).toBe('cover');
 await expect(row.locator('img')).toHaveAttribute('srcset',`${thumb} 480w, ${photo} 1200w`);
 if(mobile){expect(geometry.media.width).toBeGreaterThan(geometry.row.width*.95);expect(geometry.body.top).toBeGreaterThanOrEqual(geometry.media.bottom-1);}else{expect(geometry.media.width).toBeGreaterThan(geometry.row.width*.35);expect(geometry.body.left).toBeGreaterThanOrEqual(geometry.media.right-1);}
 await capture('browse');await row.click();
 const detail=page.locator('#detailPanel'),card=detail.locator('[data-dish-id=photo-dish]').first();
 const hero=detail.locator('.detail-hero'),heroBox=await hero.boundingBox();
 expect(heroBox.width).toBeGreaterThan((await detail.locator('.detail-title').boundingBox()).width*.95);
 expect(heroBox.height).toBeGreaterThanOrEqual(180);
 await expect(hero.locator('img')).toHaveAttribute('srcset',`${thumb} 480w, ${photo} 1200w`);
 await expect(hero.locator('img')).toHaveAttribute('sizes','(max-width: 980px) calc(100vw - 32px), 720px');
 expect(await hero.locator('img').evaluate(el=>getComputedStyle(el).objectFit)).toBe('cover');
 await detail.locator('.detail-section-nav [data-section=dishes]').click();
 const image=card.locator('.dish-photo').first(),body=card.locator('.dish-body');
 await expect(image).toHaveAttribute('sizes','(max-width: 980px) calc(100vw - 56px), 640px');
 const imageBox=await image.boundingBox(),cardBox=await card.boundingBox(),bodyBox=await body.boundingBox();
 expect(imageBox.width).toBeGreaterThan(cardBox.width*.95);expect(imageBox.height).toBeGreaterThan(180);expect(bodyBox.y).toBeGreaterThan(imageBox.y+imageBox.height);
 await expect(card.getByRole('button',{name:'Edit your review',exact:true})).toBeVisible();await expect(card.getByRole('button',{name:'Add photos',exact:true})).toBeVisible();await expect(card.getByRole('button',{name:'Like Garden salad bowl',exact:true})).toBeVisible();await expect(card.getByRole('button',{name:'More actions for Garden salad bowl',exact:true})).toBeVisible();
 await capture('dishes');
 await card.locator('[data-action=dish-gallery]').first().click();const gallery=page.locator('#sharedGallery');await expect(gallery).toBeVisible();await expect(gallery.locator('.shared-gallery-image')).toHaveAttribute('src',photo);expect(await gallery.locator('.shared-gallery-image').evaluate(el=>getComputedStyle(el).objectFit)).toBe('contain');await expect(gallery).toContainText('Anna Pelzer');await page.keyboard.press('Escape');
 await card.getByRole('button',{name:'Next dish photo',exact:true}).click();await expect(card.locator('[data-photo-position]')).toHaveText('2 / 2');
 await card.locator('[data-action=open-dish-reviews]').click();await expect(page.locator('#dishReviewsSheet')).toContainText('Crisp vegetables, bright dressing, and plenty of texture.');await page.keyboard.press('Escape');
 await page.addScriptTag({content:await readFile('node_modules/axe-core/axe.min.js','utf8')});const violations=await page.evaluate(async()=>(await axe.run(document.querySelector('#detailPanel'),{runOnly:{type:'rule',values:['color-contrast','button-name','aria-valid-attr-value']}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})));expect(violations).toEqual([]);
});
test('narrow, intermediate and wide lists retain full text and consistent media regions',async({page},info)=>{
 if(info.project.name!=='desktop-chromium')test.skip();await boot(page,'light');
 for(const width of [320,390,515,1024,1440]){await page.setViewportSize({width,height:900});const fit=await page.locator('.restaurant-row[data-id]').evaluateAll(rows=>rows.map(el=>{const name=el.querySelector('h3');return{overflow:el.scrollWidth>el.clientWidth+1,clipped:name.scrollWidth>name.clientWidth+1||name.scrollHeight>name.clientHeight+1};}));expect(fit.every(x=>!x.overflow&&!x.clipped)).toBe(true);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);const media=await page.locator('.restaurant-row[data-id=photo-none] .restaurant-ticket-media').boundingBox();const photoMedia=await page.locator('.restaurant-row[data-id=photo-table] .restaurant-ticket-media').boundingBox();expect(media.width).toBeCloseTo(photoMedia.width,0);if(width<=980)expect(media.height).toBeCloseTo(photoMedia.height,0);else expect(media.height).toBeGreaterThanOrEqual(176);}
});

for(const theme of ['light','dark'])test(`${theme} missing restaurant photos keep the shared composition`,async({page},info)=>{
 const mobile=info.project.name==='mobile-chromium';
 // Equivalent metadata isolates layout differences caused by the absence of media.
 const missing={...records[0],id:'photo-none',name:'The Quiet Kitchen',photos:[],dishes:[],updatedAt:2};
 await boot(page,theme,[records[0],missing]);
 const rows=page.locator('.restaurant-row[data-id]');
 const measure=async row=>row.evaluate(el=>{const box=node=>node.getBoundingClientRect().toJSON();return{row:box(el),inner:el.clientHeight,media:box(el.querySelector('.restaurant-ticket-media')),body:box(el.querySelector('.restaurant-main')),padding:getComputedStyle(el).padding,infoPadding:getComputedStyle(el.querySelector('.restaurant-main')).padding};});
 const photoBox=await measure(rows.first()),emptyBox=await measure(rows.last());
 expect(emptyBox.padding).toBe(photoBox.padding);expect(emptyBox.infoPadding).toBe(photoBox.infoPadding);
 expect(emptyBox.media.width).toBeCloseTo(photoBox.media.width,0);
 if(mobile){expect(emptyBox.media.height).toBeCloseTo(photoBox.media.height,0);expect(emptyBox.body.y).toBeGreaterThanOrEqual(emptyBox.media.bottom-1);}else{expect(Math.abs(emptyBox.media.height-emptyBox.inner)).toBeLessThanOrEqual(1.5);expect(emptyBox.body.x).toBeCloseTo(photoBox.body.x,0);}
 await expect(rows.last().locator('.restaurant-ticket-placeholder')).toHaveAttribute('aria-hidden','true');
 await expect(rows.last().locator('h3')).toHaveText('The Quiet Kitchen');
 await rows.last().scrollIntoViewIfNeeded();await page.evaluate(async()=>Promise.all(document.getAnimations().map(a=>a.finished.catch(()=>{}))));
 if(process.env.CAPTURE_NO_PHOTO_LAYOUT==='1'){
  await mkdir('docs/no-photo-consistency-2026-10-26',{recursive:true});
  await page.screenshot({path:`docs/no-photo-consistency-2026-10-26/${theme}-${mobile?'phone':'desktop'}.png`});
 }
 await rows.last().focus();await page.keyboard.press('Enter');
 await expect(page.locator('#detailPanel .detail-name-row h2')).toHaveText('The Quiet Kitchen');
 if(mobile){await page.getByRole('button',{name:'Back to places',exact:true}).click();await expect(rows.last()).toBeFocused();}
 else await expect(rows.last()).toHaveClass(/active/);
});
