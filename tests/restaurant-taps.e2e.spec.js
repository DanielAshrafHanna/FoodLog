import {test,expect} from '@playwright/test';

async function boot(page){
 await page.setViewportSize({width:390,height:844});
 await page.route('**/*',route=>{const url=new URL(route.request().url());if(url.hostname!=='127.0.0.1')return route.abort();if(url.pathname==='/config.js')return route.fulfill({contentType:'text/javascript',body:'window.PLATE_LOG_CONFIG={};'});return route.continue();});
 await page.addInitScript(()=>localStorage.setItem('plate-log-data-v1',JSON.stringify(['A','B'].map((name,i)=>({id:`tap-${name}`,name:`Tap ${name}`,location:'Maadi',cuisine:'Egyptian',price:'$$',playlists:['Dinner'],ratings:[],photos:[],dishes:[],visited:[],maps:'',notes:'',updatedAt:i+1})))));
 await page.goto('/');await expect(page.locator('.restaurant-row[data-id]')).toHaveCount(2);
}
const row=(page,id='A')=>page.locator(`.restaurant-row[data-id="tap-${id}"]`);
async function hold(page){
 await row(page).dispatchEvent('pointerdown',{pointerId:31,isPrimary:true,pointerType:'touch',button:0,clientX:100,clientY:300});
 await expect(page.getByRole('dialog',{name:'Place actions'})).toBeVisible();
 // Opening a native dialog can cancel the pointer, so no trailing row click arrives.
 await row(page).dispatchEvent('pointercancel',{pointerId:31,pointerType:'touch'});
}
async function closeMenu(page){await page.getByRole('button',{name:'Close place actions',exact:true}).click();await expect(page.getByRole('dialog',{name:'Place actions'})).not.toBeVisible();}
async function opened(page,id){await expect(page.locator('body')).toHaveClass(/mobile-detail-view/);await expect(page.locator('#detailPanel')).toHaveAttribute('data-restaurant-id',`tap-${id}`);await expect(page).toHaveURL(new RegExp(`place=tap-${id}`));}

test('next single tap opens a restaurant after a cancelled long-press click',async({page})=>{
 await boot(page);await hold(page);await closeMenu(page);await row(page,'B').click();await opened(page,'B');
});
test('a new tap on the same row opens after closing its context menu',async({page})=>{
 await boot(page);await row(page).dispatchEvent('contextmenu');await closeMenu(page);await row(page).click();await opened(page,'A');
});
test('keyboard activation opens after a hold with no trailing click',async({page})=>{
 await boot(page);await hold(page);await closeMenu(page);await row(page,'B').focus();await page.keyboard.press('Enter');await opened(page,'B');
});
test('the trailing click from a long press does not also open detail',async({page})=>{
 await boot(page);await hold(page);await row(page).dispatchEvent('click',{detail:1});await expect(page.locator('body')).not.toHaveClass(/mobile-detail-view/);await expect(page.getByRole('dialog',{name:'Place actions'})).toBeVisible();await closeMenu(page);await row(page,'B').click();await opened(page,'B');
});
test('scroll cancels a pending hold and the next tap opens normally',async({page})=>{
 await boot(page);await row(page).dispatchEvent('pointerdown',{pointerId:31,isPrimary:true,pointerType:'touch',button:0,clientX:100,clientY:300});
 await page.locator('#restaurantList').dispatchEvent('scroll');await page.waitForTimeout(650);
 await expect(page.getByRole('dialog',{name:'Place actions'})).not.toBeVisible();await row(page).dispatchEvent('pointercancel',{pointerId:31});await row(page,'B').click();await opened(page,'B');
});
test('a removed row cannot open a delayed hold menu',async({page})=>{
 await boot(page);await row(page).dispatchEvent('pointerdown',{pointerId:31,isPrimary:true,pointerType:'touch',button:0,clientX:100,clientY:300});await row(page).evaluate(el=>el.remove());await page.waitForTimeout(650);
 await expect(page.getByRole('dialog',{name:'Place actions'})).not.toBeVisible();await row(page,'B').click();await opened(page,'B');
});

test('a short touch opens once while a background refresh changes the row',async({page},testInfo)=>{
 test.skip(testInfo.project.name!=='mobile-chromium','Native touch emulation.');
 const {boot:bootRemote}=await import('./fixtures/navigation.js');await bootRemote(page);await page.setViewportSize({width:390,height:844});
 const target=page.locator('.restaurant-row[data-id="place-A"]');await target.scrollIntoViewIfNeeded();
 const cdp=await page.context().newCDPSession(page);const box=await target.locator('img').boundingBox();
 const reads=await page.evaluate(()=>window.__reads);
 await page.evaluate(()=>{window.__rows[0].name='Updated during tap';window.__emit('restaurants','place-A');});
 await page.waitForTimeout(500);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width/2,y:box.y+box.height/2}]});
 await expect.poll(()=>page.evaluate(()=>window.__reads)).toBeGreaterThan(reads);
 await expect(target.locator('h3')).toHaveText('Updated during tap');
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await expect(page.locator('body')).toHaveClass(/mobile-detail-view/);await expect(page.locator('#detailPanel')).toHaveAttribute('data-restaurant-id','place-A');
});

test('ordinary short touches and taps after scrolling each open on the first try',async({page},testInfo)=>{
 test.skip(testInfo.project.name!=='mobile-chromium','Native touch emulation.');await boot(page);
 const cdp=await page.context().newCDPSession(page);
 for(let i=0;i<6;i++){
  const target=row(page,i%2?'A':'B');await target.scrollIntoViewIfNeeded();
  if(i%2)await cdp.send('Input.synthesizeScrollGesture',{x:200,y:600,yDistance:-120,gestureSourceType:'touch',speed:600});
  await target.scrollIntoViewIfNeeded();const b=await target.boundingBox();const x=b.x+b.width*.5,y=b.y+b.height*.4;
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await page.waitForTimeout(65);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+2,y:y+2}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await opened(page,i%2?'A':'B');await page.getByRole('button',{name:'Back to places',exact:true}).click();await expect(page.locator('body')).not.toHaveClass(/mobile-detail-view/);
 }
});

test('first touch survives a realtime row update between touch down and release',async({page},testInfo)=>{
 test.skip(testInfo.project.name!=='mobile-chromium','Native touch emulation.');
 const {boot:bootRemote,changeA}=await import('./fixtures/navigation.js');await bootRemote(page);
 const target=page.locator('.restaurant-row[data-id="place-A"]');await target.scrollIntoViewIfNeeded();
 const cdp=await page.context().newCDPSession(page);const box=await target.locator('h3').boundingBox();
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width/2,y:box.y+box.height/2}]});
 await changeA(page,{name:'Fresh place name'});await expect(target.locator('h3')).toHaveText('Fresh place name');
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await expect(page.locator('body')).toHaveClass(/mobile-detail-view/);await expect(page.locator('#detailPanel')).toHaveAttribute('data-restaurant-id','place-A');
});

for(const [delay,mode] of [[50,'tap'],[250,'tap'],[650,'tap'],[50,'no-click'],[50,'cancel'],[50,'scroll']])test(`one touch after swipe-back (${delay}ms, ${mode})`,async({page},testInfo)=>{
 test.skip(testInfo.project.name!=='mobile-chromium','Native touch emulation.');await boot(page);
 const {settled}=await import('./fixtures/navigation.js');await row(page,'B').click();await settled(page);
 const cdp=await page.context().newCDPSession(page);const title=await page.locator('#detailPanel .detail-title').boundingBox();
 const y=title.y+title.height/2;const x=35;
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
 for(const x of [80,150,230,330]){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y}]});await page.waitForTimeout(16);}
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(delay);
 // Native coordinate input intentionally does not wait for Playwright actionability.
 const box=await row(page,'A').boundingBox();const tx=box.x+box.width*.3,ty=box.y+box.height*.4;
 if(mode==='no-click')await page.locator('#restaurantList').evaluate(list=>list.addEventListener('touchend',event=>event.preventDefault(),{once:true,passive:false}));
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:tx,y:ty}]});await page.waitForTimeout(45);
 if(mode==='scroll')await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:tx,y:ty-40}]});
 if(mode==='cancel'||mode==='scroll'){await cdp.send('Input.dispatchTouchEvent',{type:mode==='cancel'?'touchCancel':'touchEnd',touchPoints:[]});await expect(page.locator('body')).not.toHaveClass(/mobile-detail-view/);await row(page,'A').click();}else
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await opened(page,'A');await settled(page);
 await page.getByRole('button',{name:'Back to places',exact:true}).click();await expect(page.locator('body')).not.toHaveClass(/mobile-detail-view/);await expect(page).not.toHaveURL(/place=/);
 await page.goForward();await opened(page,'A');await settled(page);
});
