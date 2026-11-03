import { test, expect } from '@playwright/test';
const fixture=[{id:'overlay-table',name:'Fixture Table',location:'Maadi',cuisine:'Italian',playlists:['Weekend tables'],visited:[],ratings:[],photos:[],dishes:[],updatedAt:2}];
async function boot(page) {
  await page.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
  await page.addInitScript(data=>{localStorage.clear();sessionStorage.clear();localStorage.setItem('plate-log-data-v1',JSON.stringify(data));},fixture);
  await page.goto('/');await expect(page.locator('.restaurant-row[data-id]')).toHaveCount(1);
}
async function settle(page) {
  await page.evaluate(()=>Promise.all(document.getAnimations().filter(a=>Number.isFinite(a.effect?.getTiming().iterations)).map(a=>a.finished.catch(()=>{}))));
}
for(const theme of ['light','dark']) test(`${theme} compact editing and menu alignment fit narrow and desktop screens`,async({page},info)=>{
  await boot(page); await page.addScriptTag({path:'node_modules/axe-core/axe.min.js'});
  for(const width of info.project.name.includes('mobile')?[320,390]:[1024,1440]) {
    await page.setViewportSize({width,height:740});
    await page.evaluate(theme=>document.documentElement.classList.toggle('dark-theme',theme==='dark'),theme);
    await page.locator('[data-playlist="Weekend tables"]').click();await page.locator('#playlistManageButton').click();await settle(page);
    const dialog=page.getByRole('dialog',{name:'Edit playlist',exact:true});
    await expect(dialog).toBeVisible();await expect(dialog.getByLabel('Name',{exact:true})).toBeFocused();
    await dialog.getByLabel('Name',{exact:true}).fill('A long playlist name that remains editable without widening the card');
    const geometry=await dialog.evaluate(el=>{const r=el.getBoundingClientRect();return {x:r.x,right:r.right,width:r.width,overflow:el.scrollWidth>el.clientWidth+1,page:document.documentElement.scrollWidth,viewport:innerWidth};});
    expect(geometry.x).toBeGreaterThanOrEqual(0);expect(geometry.right).toBeLessThanOrEqual(width);expect(geometry.width).toBeLessThanOrEqual(460);expect(geometry.overflow).toBe(false);expect(geometry.page).toBeLessThanOrEqual(geometry.viewport);
    const save=await dialog.getByRole('button',{name:'Save name'}).boundingBox(),trash=await dialog.getByRole('button',{name:'Move playlist to Trash'}).boundingBox();
    expect(save.height).toBeGreaterThanOrEqual(48);expect(trash.height).toBeGreaterThanOrEqual(44);expect(trash.y).toBeGreaterThanOrEqual(save.y+save.height);
    expect(await page.evaluate(async()=>(await axe.run(document.querySelector('#playlistManageModal'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})))).toEqual([]);
    await page.keyboard.press('Escape');await expect(dialog).toBeHidden();
    await page.getByRole('button',{name:'Open account menu',exact:true}).click();await settle(page);
    const alignment=await page.locator('#accountMenu').evaluate(menu=>{
      const trigger=document.querySelector('#accountMenuButton').getBoundingClientRect(),r=menu.getBoundingClientRect();
      const starts=[...menu.querySelectorAll('.account-menu-item > span:last-child')].map(el=>el.getBoundingClientRect().left);
      return {gap:r.top-trigger.bottom,right:r.right,left:r.left,spread:Math.max(...starts)-Math.min(...starts),overflow:menu.scrollWidth>menu.clientWidth};
    });
    expect(alignment.gap).toBeCloseTo(8,0);expect(alignment.left).toBeGreaterThanOrEqual(0);expect(alignment.right).toBeLessThanOrEqual(width);expect(alignment.spread).toBeLessThan(1);expect(alignment.overflow).toBe(false);
    expect(await page.evaluate(async()=>(await axe.run(document.querySelector('#accountMenu'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>v.id))).toEqual([]);
    await page.keyboard.press('Escape');
  }
});

test('rapid close and reopen cannot clear a fresh playlist name or expose closed controls',async({page})=>{
  await boot(page);await page.locator('[data-playlist="Weekend tables"]').click();await page.locator('#playlistManageButton').click();await settle(page);
  const result=await page.evaluate(()=>{
    document.querySelector('#closePlaylistManageModal').click();
    const card=document.querySelector('#playlistManageModal');
    const closing={open:card.open,inert:card.inert,value:document.querySelector('#playlistRenameInput').value};
    document.querySelector('#playlistManageButton').click();
    document.querySelector('#playlistRenameInput').value='Fresh draft';
    return closing;
  });
  expect(result).toEqual({open:false,inert:true,value:'Weekend tables'});
  await settle(page);await expect(page.locator('#playlistRenameInput')).toHaveValue('Fresh draft');
  await expect(page.locator('#playlistManageModal')).toHaveJSProperty('inert',false);
  await page.locator('#closePlaylistManageModal').click();
  await expect(page.getByRole('button',{name:'Save name',exact:true})).toHaveCount(0);
  await expect(page.locator('#playlistManageButton')).toBeFocused();
});

test('keyboard, reduced motion and the non-discrete fallback remain immediate and usable',async({page})=>{
  await boot(page);const opener=page.locator('#createPlaylistButton');
  await opener.focus();await page.keyboard.press('Enter');
  const dialog=page.locator('#playlistCreateModal');await expect(dialog).toBeVisible();
  expect(await dialog.evaluate(el=>el.getAnimations().filter(a=>a.playState==='running').length)).toBe(0);
  await page.keyboard.press('Escape');await expect(opener).toBeFocused();
  await page.emulateMedia({reducedMotion:'reduce'});await opener.click();
  expect(await dialog.evaluate(el=>el.getAnimations().filter(a=>a.playState==='running').length)).toBe(0);
  await page.keyboard.press('Escape');await page.emulateMedia({reducedMotion:'no-preference'});
  await page.evaluate(()=>document.documentElement.dataset.overlayLifecycle='false');
  await opener.click();await page.locator('#closePlaylistCreateModal').click();await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();
});


test('form controls retain their 44px hit targets during pointer entry',async({page})=>{
  await boot(page);await page.locator('#createPlaylistButton').click();
  const heights=await page.locator('#playlistCreateModal').evaluate(el=>new Promise(resolve=>{
    const samples=[];const sample=()=>{samples.push(el.querySelector('#closePlaylistCreateModal').getBoundingClientRect().height);if(samples.length===5)resolve(samples);else requestAnimationFrame(sample);};sample();
  }));
  // Fractional translate coordinates can differ by <0.001px in DOMRect subtraction.
  expect(Math.round(Math.min(...heights)*1000)/1000).toBeGreaterThanOrEqual(44);
});
