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
 await detail.locator('.detail-section-nav [data-section=dishes]').click();
 const image=card.locator('.dish-photo').first(),body=card.locator('.dish-body');
 await expect(image).toHaveAttribute('sizes','(max-width: 980px) calc(100vw - 56px), 640px');
 const imageBox=await image.boundingBox(),cardBox=await card.boundingBox(),bodyBox=await body.boundingBox();
 expect(imageBox.width).toBeGreaterThan(cardBox.width*.95);expect(imageBox.height).toBeGreaterThan(180);expect(bodyBox.y).toBeGreaterThan(imageBox.y+imageBox.height);
 await expect(card.getByRole('button',{name:'Edit your review',exact:true})).toBeVisible();await expect(card.getByRole('button',{name:'Add photos',exact:true})).toBeVisible();await expect(card.getByRole('button',{name:'Edit dish details',exact:true})).toBeVisible();
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
 const measure=async row=>row.evaluate(el=>{const box=node=>node.getBoundingClientRect().toJSON();return{row:box(el),media:box(el.querySelector('.restaurant-ticket-media')),body:box(el.querySelector('.restaurant-main')),padding:getComputedStyle(el).padding,infoPadding:getComputedStyle(el.querySelector('.restaurant-main')).padding};});
 const photoBox=await measure(rows.first()),emptyBox=await measure(rows.last());
 expect(emptyBox.padding).toBe(photoBox.padding);expect(emptyBox.infoPadding).toBe(photoBox.infoPadding);
 expect(emptyBox.media.width).toBeCloseTo(photoBox.media.width,0);
 if(mobile){expect(emptyBox.media.height).toBeCloseTo(photoBox.media.height,0);expect(emptyBox.body.y).toBeGreaterThanOrEqual(emptyBox.media.bottom-1);}else{expect(Math.abs(emptyBox.media.height-emptyBox.row.height)).toBeLessThanOrEqual(1.5);expect(emptyBox.body.x).toBeCloseTo(photoBox.body.x,0);}
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
