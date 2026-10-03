import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
const fixtures=[{id:'like-place',name:'Friends Table',location:'Maadi',cuisine:'Egyptian',visited:[],photos:[],ratings:[],dishes:[{id:'like-dish',userId:'owner-id',name:'Roasted carrots',likedBy:['Earlier friend'],photos:[],ratings:[{email:'friend@example.com',name:'Friend',rating:4,notes:'Keep this review'}],likes:[{userId:'friend-id',name:'Mina Hanna',likedAt:1},{userId:'other-id',name:'Samira',likedAt:2}]}]}];
const card=page=>page.locator('.dish-card[data-dish-id="like-dish"]');
const saved=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('plate-log-cloud-cache-v1')??localStorage.getItem('plate-log-data-v1'))[0].dishes[0]);
test.beforeEach(async({page})=>{
  await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
  await page.goto('/');await page.evaluate(data=>{localStorage.clear();sessionStorage.clear();localStorage.setItem('plate-log-data-v1',JSON.stringify(data));},fixtures);await page.reload();await page.locator('.restaurant-row').click();
});
test('self-service likes preserve earlier names, reviews, photos and survive reload',async({page})=>{
  const before=await saved(page);const toggle=card(page).getByRole('button',{name:'Like Roasted carrots',exact:true});
  await expect(toggle).toHaveAttribute('aria-pressed','false');await toggle.click();await expect(toggle).toHaveAttribute('aria-pressed','true');await expect(toggle).toBeFocused();
  const after=await saved(page);expect(after.likedBy).toEqual(before.likedBy);expect(after.ratings).toEqual(before.ratings);expect(after.photos).toEqual(before.photos);expect(after.likes).toHaveLength(3);
  await page.reload();await expect(toggle).toHaveAttribute('aria-pressed','true');await toggle.click();await expect(toggle).toHaveAttribute('aria-pressed','false');expect((await saved(page)).likes.map(like=>like.userId)).toEqual(['friend-id','other-id']);
  await card(page).getByRole('button',{name:'Edit dish details',exact:true}).click();await expect(page.locator('#dishDetailsModal').getByRole('textbox')).toHaveCount(1);await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'Add dish',exact:true}).click();await page.locator('#dishMoreDetails').getByRole('button',{name:/More details/}).click();await expect(page.locator('#dishModal').getByRole('textbox',{name:'Add a person'})).toHaveCount(0);await expect(page.locator('#dishModal')).not.toContainText('Who liked this?');
});
test('people panel shows everyone, supports Escape and fits narrow layouts in both themes',async({page})=>{
  await page.setViewportSize({width:320,height:740});await page.reload();await expect(card(page)).toBeVisible();
  const axe=await readFile(new URL('../node_modules/axe-core/axe.min.js',import.meta.url),'utf8');await page.addScriptTag({content:axe});
  for(const dark of [false,true]){
    await page.evaluate(dark=>document.documentElement.classList.toggle('dark-theme',dark),dark);
    const opener=card(page).getByRole('button',{name:'See everyone who liked Roasted carrots'});await opener.click();
    const panel=page.locator('#dishLikesPopover');await expect(panel).toBeVisible();await expect(panel).toContainText('Mina Hanna');await expect(panel).toContainText('Samira');
    const box=await panel.boundingBox();expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(320);expect(box.y+box.height).toBeLessThanOrEqual(740);
    await page.evaluate(async()=>Promise.all(document.getAnimations().map(a=>a.finished.catch(()=>{}))));
    const violations=await page.evaluate(async()=> (await axe.run(document.querySelector('#dishLikesPopover'))).violations.filter(v=>['serious','critical'].includes(v.impact)).map(v=>v.id));expect(violations).toEqual([]);
    await page.keyboard.press('Escape');await expect(panel).toBeHidden();await expect(opener).toBeFocused();
    expect(await card(page).evaluate(el=>el.scrollWidth>el.clientWidth+1)).toBe(false);
  }
});
test('a local storage failure does not pretend the new preference was saved',async({page})=>{
  const before=await saved(page);
  await page.evaluate(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='plate-log-data-v1')throw new DOMException('Fixture quota failure','QuotaExceededError');return original.call(this,key,value);};});
  await card(page).getByRole('button',{name:'Like Roasted carrots',exact:true}).click();
  await expect(card(page).getByRole('alert')).toContainText('could not save your like');
  await expect(card(page).getByRole('button',{name:'Like Roasted carrots',exact:true})).toHaveAttribute('aria-pressed','false');
  expect((await saved(page)).likes).toEqual(before.likes);
});
test('whole-dish Trash restores likes along with its reviews and earlier names',async({page})=>{
  const before=await saved(page);page.on('dialog',dialog=>dialog.accept());await card(page).getByRole('button',{name:'More actions for Roasted carrots'}).click();await page.locator('#dishActionSheet').getByRole('button',{name:'Move dish to Trash'}).click();await expect(card(page)).toHaveCount(0);
  const back=page.getByRole('button',{name:'Back to places',exact:true});if(await back.isVisible())await back.click();
  await page.getByRole('button',{name:'Open account menu'}).click();await page.getByRole('menuitem',{name:'Open Trash',exact:true}).click();await page.locator('#trashList').getByRole('button',{name:'Restore',exact:true}).click();
  await expect.poll(async()=> (await saved(page)).deletedAt??null).toBe(null);const after=await saved(page);expect(after.likes).toEqual(before.likes);expect(after.ratings).toEqual(before.ratings);expect(after.likedBy).toEqual(before.likedBy);
});
async function cloud(page,{approved=true,missing=false}={}){
  const rows=fixtures.map(place=>({...place,restaurant_ratings:[],restaurant_photos:[],updated_at:'2026-10-03T12:00:00Z',dishes:place.dishes.map(dish=>({...dish,user_id:'owner-id',liked_by:dish.likedBy,updated_at:'2026-10-03T12:00:00Z',dish_ratings:[],dish_photos:[],dish_photo_removals:[]}))}));
  await page.route('**/config.js*',route=>route.fulfill({contentType:'text/javascript',body:"window.PLATE_LOG_CONFIG={supabaseUrl:'https://fixture.supabase.co',supabasePublishableKey:'fixture'}"}));
  await page.route('**/vendor/supabase-2.110.8.js',route=>route.fulfill({contentType:'text/javascript',body:`
    window.__rows=${JSON.stringify(rows)};window.__likes=[{dish_id:'like-dish',user_id:'friend-id',display_name:'Mina Hanna',liked_at:'2026-10-03T12:00:00Z'}];window.__likeCalls=[];window.__likeError=true;window.__handlers={};
    const session={user:{id:'my-id',email:'my@example.com',user_metadata:{full_name:'My Name',role:'admin',approved:true},app_metadata:{provider:'google'},identities:[{provider:'google'}]}};
    class Query{constructor(table){this.table=table;}select(){return this;}eq(){return this;}in(){return this;}is(){return this;}not(){return this;}limit(){return this;}order(){return this;}abortSignal(){return this;}upsert(){return this;}insert(){return this;}
      maybeSingle(){return Promise.resolve({data:this.table==='approved_users'&&${approved}?{email:'my@example.com'}:null,error:null});}
      then(resolve,reject){return Promise.resolve({data:this.table==='restaurants'?window.__rows:this.table==='dish_likes'?window.__likes:[],error:this.table==='dish_likes'&&${missing}?{code:'PGRST205',message:'Missing table'}:null}).then(resolve,reject);}}
    const channel={on(type,filter,fn){window.__handlers[filter.table]=fn;return this;},subscribe(){return this;}};
    window.supabase={createClient:()=>({from:table=>new Query(table),channel:()=>channel,removeChannel(){},auth:{getSession:async()=>({data:{session},error:null}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},rpc:async(name,args)=>{if(name!=='set_dish_like')return {data:null,error:null};window.__likeCalls.push(args);await new Promise(resolve=>setTimeout(resolve,120));if(${missing})return {data:null,error:{code:'PGRST202',message:'Missing function'}};if(window.__likeError)return {data:null,error:{message:'Fixture connection failed'}};window.__likes=window.__likes.filter(like=>like.user_id!=='my-id');if(args.p_liked)window.__likes.push({dish_id:args.p_dish_id,user_id:'my-id',display_name:'My Name',liked_at:'2026-10-03T13:00:00Z'});return {data:args.p_liked,error:null};}})};
  `}));
  await page.evaluate(()=>{localStorage.clear();sessionStorage.clear();});await page.goto('/');await expect(page.locator('.restaurant-row')).toContainText('Friends Table');await page.locator('.restaurant-row').click();await expect(card(page)).toBeVisible();
}
test('cloud likes belong to the signed-in contributor and failures are retryable without changing anyone else',async({page,context})=>{
  await cloud(page);const toggle=card(page).getByRole('button',{name:'Like Roasted carrots',exact:true});await expect(card(page).getByRole('button',{name:'Edit dish details'})).toHaveCount(0);
  await page.evaluate(()=>{const b=document.querySelector('[data-action="toggle-dish-like"]');b.click();b.click();});await expect(card(page).getByRole('alert')).toContainText('Fixture connection failed');expect(await page.evaluate(()=>window.__likeCalls.length)).toBe(1);await expect(toggle).toHaveAttribute('aria-pressed','false');
  await page.evaluate(()=>window.__likeError=false);await toggle.click();await expect(toggle).toHaveAttribute('aria-pressed','true');await expect(card(page).getByRole('button',{name:'See everyone who liked Roasted carrots'})).toContainText('You');
  expect(await page.evaluate(()=>window.__likeCalls.at(-1))).toEqual({p_dish_id:'like-dish',p_liked:true});expect((await saved(page)).likedBy).toEqual(['Earlier friend']);
  await context.setOffline(true);await toggle.click();await expect(card(page).getByRole('alert')).toContainText('Reconnect');await expect(toggle).toHaveAttribute('aria-pressed','true');expect(await page.evaluate(()=>window.__likeCalls.length)).toBe(2);
  await context.setOffline(false);await toggle.click();await expect(toggle).toHaveAttribute('aria-pressed','false');expect(await page.evaluate(()=>window.__likes.map(like=>like.user_id))).toEqual(['friend-id']);
  await page.evaluate(()=>{window.__likes.push({dish_id:'like-dish',user_id:'third-id',display_name:'Third friend',liked_at:'2026-10-03T14:00:00Z'});window.__handlers.dish_like_changes({new:{dish_id:'like-dish'}});});await expect(card(page).getByRole('button',{name:'See everyone who liked Roasted carrots'})).toContainText('Third friend');
});
test('unapproved accounts cannot like despite forged admin metadata',async({page})=>{
  await cloud(page,{approved:false});await expect(card(page).locator('[data-action="toggle-dish-like"]')).toHaveCount(0);expect(await page.evaluate(()=>window.__likeCalls)).toEqual([]);await expect(card(page)).toContainText('Mina Hanna');
});
test('missing migration leaves the collection usable and reports an honest unavailable state',async({page})=>{
  await cloud(page,{missing:true});await expect(card(page)).toContainText('Earlier friend');const toggle=card(page).getByRole('button',{name:'Like Roasted carrots',exact:true});await toggle.click();await expect(card(page).getByRole('alert')).toContainText('not available yet');await expect(toggle).toHaveAttribute('aria-pressed','false');
});
