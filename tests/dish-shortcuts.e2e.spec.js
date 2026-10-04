import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
const fixture = [{id:'focus-place',name:'Focused Table',location:'Maadi',cuisine:'Egyptian',visited:[],photos:[],ratings:[{email:'you',name:'You',rating:4,notes:'Restaurant review stays separate.'}],dishes:[{id:'focus-dish',name:'Roasted carrots',likedBy:['Dany'],photos:[],photo:'',ratings:[{email:'you',name:'You',rating:4.5,notes:'My smoky carrots.'},{email:'friend@example.com',name:'Friend',rating:4,notes:'Friend review stays separate.'}]}]}];
test.beforeEach(async ({page}) => {
  await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
  await page.goto('/');
  await page.evaluate(data=>{localStorage.clear();sessionStorage.clear();localStorage.setItem('plate-log-data-v1',JSON.stringify(data));},fixture);
  await page.reload(); await page.locator('.restaurant-row').click();
});
const card = page=>page.locator('.dish-card[data-dish-id="focus-dish"]');
const savedDish = page=>page.evaluate(()=>JSON.parse(localStorage.getItem('plate-log-cloud-cache-v1')??localStorage.getItem('plate-log-data-v1'))[0].dishes[0]);
test('review shortcuts protect review context, preserve the dish and restore the exact opener',async({page})=>{
  const before=await savedDish(page);
  const opener=card(page).getByRole('button',{name:'Edit your review',exact:true});
  await opener.click();
  const dialog=page.locator('#dishReviewModal');
  await expect(dialog).toBeVisible();
  await expect(page.locator('#dishModal')).toBeHidden();
  await expect(page.locator('#restaurantModal')).toBeHidden();
  await expect(dialog.getByRole('textbox')).toHaveCount(1);
  await expect(dialog.locator('input[type=file]')).toHaveCount(0);
  await dialog.getByLabel('Your review (optional)').fill('Sharper review, same dish.');
  await dialog.getByRole('button',{name:'Save my review'}).click();
  await expect(dialog).toBeHidden(); await expect(opener).toBeFocused();
  const after=await savedDish(page);
  expect(after.name).toBe(before.name);expect(after.likedBy).toEqual(before.likedBy);expect(after.photos).toEqual(before.photos);
  expect(after.ratings.find(r=>r.email==='friend@example.com')).toEqual(before.ratings.find(r=>r.email==='friend@example.com'));
  await opener.click();await page.keyboard.press('Escape'); await expect(opener).toBeFocused();
  await card(page).locator('[data-action="open-dish-reviews"]').click();
  await page.locator('#dishReviewsSheet').getByRole('button',{name:'Actions for your review'}).click();
  await page.locator('#reviewActionSheet').getByRole('button',{name:'Edit review',exact:true}).click();
  await expect(dialog).toBeVisible();await expect(page.locator('#dishModal')).toBeHidden();
});
test('details editor changes only dish details, validates duplicates and preserves contribution drafts',async({page})=>{
  const before=await savedDish(page);
  await page.evaluate(()=>sessionStorage.setItem('foodlog-dish-review-draft-v1:you:focus-dish',JSON.stringify({rating:3,notes:'Review draft'})));
  const opener=card(page).getByRole('button',{name:'Edit dish details',exact:true});await opener.click();
  const dialog=page.locator('#dishDetailsModal');
  await expect(dialog.getByRole('slider')).toHaveCount(0);await expect(dialog.locator('input[type=file],textarea')).toHaveCount(0);
  await dialog.getByLabel('Dish name',{exact:true}).fill('Glazed carrots');
  await dialog.getByRole('button',{name:'Save details'}).click();await expect(dialog).toBeHidden();await expect(opener).toBeFocused();
  const after=await savedDish(page);expect(after.name).toBe('Glazed carrots');expect(after.ratings).toEqual(before.ratings);expect(after.photos).toEqual(before.photos);
  expect(await page.evaluate(()=>sessionStorage.getItem('foodlog-dish-review-draft-v1:you:focus-dish'))).toContain('Review draft');
  await opener.click();await dialog.getByLabel('Dish name',{exact:true}).fill('Unsaved rename');await dialog.getByRole('button',{name:'Close',exact:true}).click();expect((await savedDish(page)).name).toBe('Glazed carrots');
  await page.evaluate(()=>{const data=JSON.parse(localStorage.getItem('plate-log-data-v1'));data[0].dishes.push({id:'duplicate-dish',name:'Chili noodles',ratings:[]});localStorage.setItem('plate-log-data-v1',JSON.stringify(data));});
  await page.reload();await expect(card(page)).toBeVisible();await opener.click();
  await dialog.getByLabel('Dish name',{exact:true}).fill('Chili noodles');await dialog.getByRole('button',{name:'Save details'}).click();
  await expect(dialog.locator('#dishDetailsDuplicate')).toContainText('Chili noodles');expect((await savedDish(page)).name).toBe('Glazed carrots');
  await dialog.getByLabel('This is a separate dish').check();await dialog.getByRole('button',{name:'Save details'}).click();await expect(dialog).toBeHidden();expect((await savedDish(page)).ratings).toEqual(before.ratings);
});
test('photo and restaurant review shortcuts remain focused and return to their controls',async({page})=>{
  const opener=card(page).getByRole('button',{name:'Add photos',exact:true});await opener.click();
  const dialog=page.locator('#photoContributionModal');await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('slider')).toHaveCount(0);await expect(dialog.locator('textarea,input:not([type=file])')).toHaveCount(0);
  await page.keyboard.press('Escape');await expect(opener).toBeFocused();
  await page.locator('.restaurant-rating-shortcut').click();const review=page.locator('#restaurantRatingModal');
  await expect(review).toBeVisible();await expect(page.locator('#restaurantModal')).toBeHidden();await expect(review.locator('input[type=file]')).toHaveCount(0);
});
test('narrow and dark focused dialogs have no serious accessibility issues or horizontal overflow',async({page})=>{
  const axe=await readFile(new URL('../node_modules/axe-core/axe.min.js',import.meta.url),'utf8');await page.addScriptTag({content:axe});
  await page.setViewportSize({width:320,height:740});await page.reload();await expect(card(page)).toBeVisible();await page.addScriptTag({content:axe});
  for (const theme of ['light','dark']) {
    await page.evaluate(theme=>document.documentElement.classList.toggle('dark-theme',theme==='dark'),theme);
    for(const action of ['Edit your review','Add photos','Edit dish details']) {
      await card(page).getByRole('button',{name:action,exact:true}).click();
      await page.evaluate(async()=>Promise.all(document.getAnimations().map(animation=>animation.finished.catch(()=>{}))));
      const dialog=page.locator('dialog[open]');
      const geometry=await dialog.evaluate(el=>({width:el.getBoundingClientRect().width,overflow:el.scrollWidth>el.clientWidth+1}));
      expect(geometry.width).toBeLessThanOrEqual(320);expect(geometry.overflow).toBe(false);
      if(action==='Edit dish details'){await expect(dialog.locator('.dish-focused-actions button')).toHaveCount(1);}
      const failures=await page.evaluate(async()=> (await axe.run(document.querySelector('dialog[open]'))).violations.filter(v=>['serious','critical'].includes(v.impact)).map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})));
      expect(failures).toEqual([]);await page.keyboard.press('Escape');
    }
  }
});

async function mockCloud(page, {owner=true}={}) {
  const rows=fixture.map(place=>({...place,updated_at:new Date().toISOString(),updated_by:'Editor',restaurant_ratings:[],restaurant_photos:[],dishes:place.dishes.map(d=>({...d,user_id:owner?'editor-id':'other-id',liked_by:d.likedBy,updated_at:new Date().toISOString(),dish_ratings:d.ratings.map(r=>({rater_email:r.email==='you'?'editor@example.com':r.email,rater_name:r.name,rating:r.rating,notes:r.notes,updated_at:'2026-10-01T12:00:00Z'})),dish_photos:[],dish_photo_removals:[]}))}));
  await page.route('**/config.js*',route=>route.fulfill({contentType:'text/javascript',body:"window.PLATE_LOG_CONFIG={supabaseUrl:'https://fixture.supabase.co',supabasePublishableKey:'fixture-key'}"}));
  await page.route('**/vendor/supabase-2.110.8.js',route=>route.fulfill({contentType:'text/javascript',body:`
    window.__rows=${JSON.stringify(rows)};window.__updates=[];window.__rpcs=[];window.__updateError=true;
    const session={user:{id:'editor-id',email:'editor@example.com',user_metadata:{full_name:'Editor'},app_metadata:{provider:'google'},identities:[{provider:'google'}]}};
    class Query {
      constructor(table){this.table=table;this.payload=null;this.filters=[];}
      select(){return this;} abortSignal(){return this;} eq(key,value){this.filters.push([key,value]);return this;} is(){return this;} in(){return this;} not(){return this;} order(){return this;} limit(){return this;}
      insert(){return this;} update(payload){this.payload=payload;return this;} upsert(){return this;}
      maybeSingle(){return Promise.resolve({data:this.table==='approved_users'?{email:'editor@example.com'}:null,error:null});}
      single(){window.__updates.push({table:this.table,payload:this.payload,filters:this.filters});
        if(window.__updateError)return Promise.resolve({data:null,error:{message:'Fixture save unavailable'}});
        Object.assign(window.__rows[0].dishes[0],this.payload);return Promise.resolve({data:{id:'focus-dish'},error:null});}
      then(resolve,reject){let data=this.table==='restaurants'?window.__rows:this.table==='dishes'?window.__rows[0].dishes:[];return Promise.resolve({data,error:null}).then(resolve,reject);}
    }
    const channel={on(){return this;},subscribe(){return this;}};
    window.supabase={createClient:()=>({from:table=>new Query(table),rpc:(name,args)=>{window.__rpcs.push({name,args});return Promise.resolve({data:null,error:null});},channel:()=>channel,removeChannel:()=>{},auth:{getSession:async()=>({data:{session},error:null}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}})};
  `}));
  await page.evaluate(()=>{localStorage.clear();sessionStorage.clear();});
  await page.goto('/');await expect(page.locator('#dockAddButton').or(page.locator('#quickAddButton')).first()).toBeAttached();
  await expect(page.locator('.restaurant-row')).toContainText('Focused Table');await page.locator('.restaurant-row').click();
  await expect(card(page).getByRole('button',{name:'Edit your review',exact:true})).toBeVisible();
}
test('cloud details update only the name, keep errors retryable and sync offline edits without touching reviews',async({page,context})=>{
  await mockCloud(page);
  const before=await savedDish(page);await card(page).getByRole('button',{name:'Edit dish details',exact:true}).click();
  const dialog=page.locator('#dishDetailsModal');await dialog.getByLabel('Dish name',{exact:true}).fill('Cloud glazed carrots');await dialog.getByRole('button',{name:'Save details'}).click();
  await expect(dialog.locator('#dishDetailsError')).toContainText('Fixture save unavailable');await expect(dialog.getByLabel('Dish name',{exact:true})).toHaveValue('Cloud glazed carrots');
  await page.evaluate(()=>window.__updateError=false);await dialog.getByRole('button',{name:'Save details'}).click();await expect(dialog).toBeHidden();
  const requests=await page.evaluate(()=>({updates:window.__updates,rpcs:window.__rpcs}));
  expect(requests.rpcs.filter(call=>/^save|rating|review/.test(call.name))).toEqual([]);expect(requests.updates.length).toBe(2);
  for(const request of requests.updates){expect(Object.keys(request.payload).sort()).toEqual(['name','updated_at','updated_by']);expect(request.filters).toContainEqual(['id','focus-dish']);expect(request.filters).toContainEqual(['restaurant_id','focus-place']);}
  expect((await savedDish(page)).ratings).toEqual(before.ratings);
  await context.setOffline(true);await card(page).getByRole('button',{name:'Edit dish details',exact:true}).click();await dialog.getByLabel('Dish name',{exact:true}).fill('Offline carrots');await dialog.getByRole('button',{name:'Save details'}).click();await expect(dialog).toBeHidden();
  expect((await savedDish(page)).name).toBe('Offline carrots');expect((await savedDish(page)).pendingSync).toBe(true);
  const operations=await page.evaluate(()=>JSON.parse(localStorage.getItem('foodlog-pending-operations-v1')));expect(operations).toHaveLength(1);expect(operations[0].kind).toBe('dish-details');
  await context.setOffline(false);await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('foodlog-pending-operations-v1')).length)).toBe(0);
  expect((await savedDish(page)).ratings).toEqual(before.ratings);expect(await page.evaluate(()=>window.__rpcs.filter(call=>/^save|rating|review/.test(call.name)))).toEqual([]);
});
test('a contributor can edit their review but cannot edit or trash another person’s dish',async({page})=>{
  await mockCloud(page,{owner:false});
  await expect(card(page).getByRole('button',{name:'Edit dish details',exact:true})).toHaveCount(0);
  await expect(card(page).getByRole('button',{name:'More actions for Roasted carrots',exact:true})).toHaveCount(0);
  await card(page).getByRole('button',{name:'Edit your review',exact:true}).click();await expect(page.locator('#dishReviewModal')).toBeVisible();
});


test('Add dish fits its contents and expanded fields scroll without losing its save controls', async ({page}) => {
  for (const width of [320, 390, 515, 1280]) {
    await page.setViewportSize({width,height:844});
    await page.goto('/?place=focus-place');
    await expect(card(page)).toBeVisible();
    for (const dark of [false,true]) {
      await page.evaluate(dark=>{document.documentElement.classList.toggle('dark-theme',dark);document.body.classList.toggle('dark-theme',dark);},dark);
      await page.locator('#detailPanel').getByRole('button',{name:'Add dish',exact:true}).click();
      const modal=page.locator('#dishModal');
      await expect(modal).toBeVisible();
      const more=modal.getByRole('button',{name:/More details/});
      if(await more.getAttribute('aria-expanded')==='true') await more.click();
      await expect.poll(()=>modal.locator('#dishMoreDetailsPanel').evaluate(el=>el.getBoundingClientRect().height)).toBeLessThan(18);
      await modal.evaluate(async el=>Promise.all(el.getAnimations({subtree:true}).map(a=>a.finished.catch(()=>{}))));
      const metrics=await modal.evaluate(el=>{
        const form=el.querySelector('form'), body=el.querySelector('.capture-scroll'), footer=el.querySelector('.capture-actions');
        return {height:el.getBoundingClientRect().height, gap:form.getBoundingClientRect().bottom-footer.getBoundingClientRect().bottom, overflow:el.scrollWidth>el.clientWidth, emptySpace:body.clientHeight-body.scrollHeight};
      });
      const ceiling=await modal.locator('.draft-notice').isVisible()?744:650;
      await expect.poll(()=>modal.evaluate(el=>el.getBoundingClientRect().height), {message:`Collapsed dish at ${width}px (${dark?'dark':'light'})`}).toBeLessThan(ceiling);
      expect(metrics.gap).toBeLessThanOrEqual(2);
      expect(metrics.overflow).toBe(false);
      await expect(modal.locator('.capture-actions > button')).toHaveText(['Save & add another','Save dish']);
      await modal.getByRole('button',{name:/More details/}).click();
      await modal.getByLabel('Your review (optional)').fill('Keep this draft when the X closes the form.');
      await modal.locator('.capture-scroll').evaluate(el=>{el.scrollTop=el.scrollHeight;});
      await expect(modal.getByRole('button',{name:'Save dish',exact:true})).toBeInViewport();
      await expect(modal.locator('.photo-capture-field')).toBeVisible();
      await modal.getByRole('button',{name:'Close',exact:true}).click();
      await expect(modal).toBeHidden();
      await page.locator('#detailPanel').getByRole('button',{name:'Add dish',exact:true}).click();
      await expect(modal.getByLabel('Your review (optional)')).toHaveValue('Keep this draft when the X closes the form.');
      await page.keyboard.press('Escape');
    }
  }
});

test('menus have one accessible header X and no redundant dismissal footer', async ({page}) => {
  for (const [action,modalId] of [['Add photos','photoContributionModal'],['Edit dish details','dishDetailsModal'],['Edit your review','dishReviewModal'],['More actions for Roasted carrots','dishActionSheet']]) {
    await card(page).getByRole('button',{name:action,exact:true}).click();
    const modal=page.locator('#'+modalId); await expect(modal).toBeVisible();
    await expect(modal.getByRole('button',{name:/^Cancel$/})).toHaveCount(0);
    const close=modal.locator('button.icon-button').filter({has:page.locator('svg.x-icon')});
    await expect(close).toHaveCount(1);
    await modal.evaluate(async el=>Promise.all(el.getAnimations({subtree:true}).map(a=>a.finished.catch(()=>{}))));
    const box=await close.boundingBox();expect(box.width).toBeGreaterThanOrEqual(44-0.001);expect(box.height).toBeGreaterThanOrEqual(44-0.001);
    await close.click();await expect(modal).toBeHidden();
  }
});
