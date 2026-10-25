import { expect, test } from '@playwright/test';

import { boot, openA, settled, changeA, rows } from './fixtures/navigation.js';

test('rapid browser Back then Forward cancels stale close and remains interruptible', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await boot(page); await openA(page);
  await page.evaluate(async () => {
    const pop = () => new Promise(resolve => window.addEventListener('popstate', resolve, { once: true }));
    const back = pop(); history.back(); await back;
    await new Promise(resolve => setTimeout(resolve, 35));
    const forward = pop(); history.forward(); await forward;
  });
  await page.waitForTimeout(350); // Wait past the old callback's deadline.
  await expect(page).toHaveURL(/place=place-A/);
  await expect(page.locator('body')).toHaveClass(/mobile-detail-view/); await settled(page);
  await page.getByRole('button', { name: 'Back to places', exact: true }).click();
  await expect(page.locator('body')).not.toHaveClass(/mobile-detail-view/);
  await expect(page).not.toHaveURL(/place=/);
});

test('browser Back retains deep scroll and carousel through a visit to another place', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await boot(page); await openA(page);
  await page.locator('#detailPanel').evaluate(el => {
    el.scrollTop = 680; const track=el.querySelector('.dish-photo-track'); track.scrollLeft=track.clientWidth;
  });
  const before = await page.locator('#detailPanel').evaluate(el => el.scrollTop);
  await page.goBack(); await expect(page.locator('body')).not.toHaveClass(/mobile-detail-view/);
  await page.locator('.restaurant-row[data-id="place-B"]').click(); await settled(page);
  await page.getByRole('button', { name: 'Back to places', exact: true }).click();
  await expect(page.locator('body')).not.toHaveClass(/mobile-detail-view/); await openA(page);
  await expect.poll(() => page.locator('#detailPanel').evaluate(el => el.scrollTop)).toBeCloseTo(before, 0);
  expect(await page.locator('#detailPanel .dish-photo-track').first().evaluate(el => el.scrollLeft / el.clientWidth)).toBeCloseTo(1, 1);
});

test('background changes preserve open identity outside filters and deletion returns to Places', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await boot(page);
  await page.getByRole('button', { name: 'Open filters', exact: true }).click();
  await page.locator('#cuisineFilter').selectOption('Egyptian');
  await page.getByRole('button', { name: 'Show 2 places', exact: true }).click();
  await openA(page);
  await changeA(page, { cuisine: 'Chinese' });
  await expect(page.locator('.restaurant-row')).toHaveCount(1);
  await expect(page.locator('#detailPanel h2')).toHaveText('Place A');
  await expect(page).toHaveURL(/place=place-A/);
  await page.evaluate(() => { window.__rows=window.__rows.filter(row=>row.id!=='place-A'); window.__emit('restaurants','place-A'); });
  await expect(page.locator('body')).not.toHaveClass(/mobile-detail-view/);
  await expect(page).not.toHaveURL(/place=/);
});

test('first review keeps section order, visible dish, and unchanged cards attached', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 }); await boot(page); await openA(page);
  await page.locator('#detailPanel').evaluate(el => {
    const card=el.querySelector('.dish-card'); el.scrollTop=card.offsetTop - 80;
    window.__card=card; window.__hero=el.querySelector('.detail-hero');
    window.__dishTop=card.getBoundingClientRect().top;
    window.__sectionOrder=[...el.children].filter(n=>n.matches('.detail-grid,.detail-dishes-heading,.detail-photos-heading')).map(n=>n.className);
  });
  await changeA(page, { restaurant_ratings: [{ rater_email:'friend@example.com',rater_name:'Friend',rating:4,notes:'First review',updated_at:'2026-10-13T11:00:00Z' }] }, 'restaurant_ratings');
  await expect(page.locator('#detailPanel .ratings-breakdown')).toContainText('First review');
  const result=await page.locator('#detailPanel').evaluate(el=>({
    card:el.querySelector('.dish-card')===window.__card,hero:el.querySelector('.detail-hero')===window.__hero,
    top:el.querySelector('.dish-card').getBoundingClientRect().top,expected:window.__dishTop,
    order:[...el.children].filter(n=>n.matches('.detail-grid,.detail-dishes-heading,.detail-photos-heading')).map(n=>n.className),original:window.__sectionOrder
  }));
  expect(result.card).toBe(true); expect(result.hero).toBe(true); expect(result.order).toEqual(result.original);
  expect(result.top).toBeCloseTo(result.expected,0);
  await page.screenshot({ path:`docs/audit-screenshots/2026-10-13/stable-review-${testInfo.project.name}.png` });
});

test('unchanged refresh and idle time do not rebuild visible rows or detail', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await boot(page); await openA(page);
  await page.evaluate(() => {
    window.__mutations=0; window.__stableRows=[...document.querySelectorAll('.restaurant-row')];
    window.__stableDetail=[...document.querySelector('#detailPanel').children];
    const observer=new MutationObserver(records=>{window.__mutations+=records.filter(record=>record.type==='childList').length;});
    observer.observe(document.querySelector('#restaurantList'),{subtree:true,childList:true});
    observer.observe(document.querySelector('#detailPanel'),{subtree:true,childList:true});
    window.__observer=observer;
  });
  await changeA(page, {});
  await page.waitForTimeout(850); // Deliberate idle observation window after the refresh.
  const result=await page.evaluate(()=>{
    window.__observer.disconnect();
    return {mutations:window.__mutations,rows:window.__stableRows.every((node,i)=>document.querySelectorAll('.restaurant-row')[i]===node),detail:window.__stableDetail.every((node,i)=>document.querySelector('#detailPanel').children[i]===node)};
  });
  expect(result).toEqual({mutations:0,rows:true,detail:true});
});

test('a selected-place update waits until the active photo swipe ends', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await boot(page); await openA(page);
  await page.locator('#detailPanel .dish-photo-track').first().evaluate(el => {
    const event=new Event('touchstart',{bubbles:true}); Object.defineProperty(event,'touches',{value:[{clientX:230,clientY:260}]}); el.dispatchEvent(event);
    window.__swipingTrack=el; el.scrollLeft=el.clientWidth*.4;
  });
  await changeA(page, { restaurant_ratings: [{rater_email:'friend@example.com',rating:4,notes:'Arrived during swipe'}] }, 'restaurant_ratings');
  await page.waitForTimeout(150);
  await expect(page.locator('#detailPanel .ratings-breakdown')).not.toContainText('Arrived during swipe');
  expect(await page.locator('#detailPanel .dish-photo-track').first().evaluate(el=>el===window.__swipingTrack)).toBe(true);
  await page.locator('#detailPanel .dish-photo-track').first().evaluate(el=>{
    const event=new Event('touchend',{bubbles:true}); Object.defineProperty(event,'touches',{value:[]}); el.dispatchEvent(event);
  });
  await expect(page.locator('#detailPanel .ratings-breakdown')).toContainText('Arrived during swipe');
});

test('map preserves camera across width/content changes but fits deliberate filter changes', async ({ page }) => {
  await page.setViewportSize({width:1440,height:900});
  await page.addInitScript(()=>{
    window.__fits=0; window.__mapZoom=8;
    const map={setView(){return this;},fitBounds(){window.__fits++;window.__mapZoom=8;},invalidateSize(){},removeLayer(){}};
    window.L={map:()=>map,tileLayer:()=>({addTo(){}}),marker:()=>({addTo(){return this;},on(){return this;},setLatLng(){},bindPopup(){}}),latLngBounds:()=>({pad(){return this;}})};
  });
  await boot(page); await page.getByRole('button',{name:'Map',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>window.__fits)).toBe(1);
  await page.evaluate(()=>{window.__mapZoom=13;});
  await page.setViewportSize({width:1400,height:900}); await changeA(page,{name:'Place A updated'});
  await expect(page.locator('#mapHint')).toContainText('2 on map');
  await page.waitForTimeout(250);
  expect(await page.evaluate(()=>({fits:window.__fits,zoom:window.__mapZoom}))).toEqual({fits:1,zoom:13});
  await page.getByRole('button',{name:'Open filters',exact:true}).click();
  await page.locator('#cuisineFilter').selectOption('Egyptian'); // A deliberate narrowing refits.
  await page.getByRole('button',{name:'Show 2 places',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>window.__fits)).toBe(2);
});

test('playlist centering honors reduced motion and never scrolls the page', async ({ page }) => {
  await page.setViewportSize({width:390,height:844}); await page.emulateMedia({reducedMotion:'reduce'}); await boot(page);
  await page.evaluate(()=>{
    window.__scrolls=[];
    const strip=document.querySelector('#playlistSwitcher'),scroll=strip.scrollTo.bind(strip);
    strip.scrollTo=options=>{window.__scrolls.push(options);scroll(options);};
  });
  await page.locator('[data-playlist="Dinner"]').click();
  await expect.poll(()=>page.evaluate(()=>window.__scrolls.length)).toBeGreaterThan(0);
  expect(await page.evaluate(()=>window.__scrolls.every(options=>options.behavior==='auto'))).toBe(true);
  expect(await page.evaluate(()=>window.scrollY)).toBe(0);
});

test('desktop detail stays pinned on remote changes and follows deliberate browse changes', async ({ page }) => {
  await page.setViewportSize({width:1440,height:900}); await boot(page);
  await page.getByRole('button',{name:'Open filters',exact:true}).click();
  await page.locator('#cuisineFilter').selectOption('Egyptian');
  await page.getByRole('button',{name:'Show 2 places',exact:true}).click(); await openA(page);
  await changeA(page,{cuisine:'Chinese'});
  await expect(page.locator('.restaurant-row')).toHaveCount(1);
  await expect(page.locator('#detailPanel h2')).toHaveText('Place A');
  await page.locator('#searchInput').fill('Place B');
  await expect(page.locator('#detailPanel h2')).toHaveText('Place B');
  await expect(page).toHaveURL(/place=place-B/);
});

test('long incoming review content above the visible dish preserves its position', async ({ page }) => {
  await page.setViewportSize({width:390,height:844}); await boot(page);
  await changeA(page,{restaurant_ratings:[{rater_email:'friend@example.com',rating:4,notes:'Earlier review'}]},'restaurant_ratings');
  await openA(page);
  const before=await page.locator('#detailPanel').evaluate(el=>{
    const card=el.querySelector('.dish-card'),nav=el.querySelector('.detail-mobile-nav');
    el.scrollTop+=card.getBoundingClientRect().top-nav.getBoundingClientRect().bottom-20;
    return card.getBoundingClientRect().top;
  });
  await changeA(page,{restaurant_ratings:[{rater_email:'friend@example.com',rating:4,notes:'A longer review. '.repeat(60)}]},'restaurant_ratings');
  await expect(page.locator('#detailPanel .ratings-breakdown')).toContainText('A longer review.');
  await expect.poll(()=>page.locator('#detailPanel .dish-card').first().evaluate(el=>el.getBoundingClientRect().top)).toBeCloseTo(before,0);
});


test('cold cloud URL and saved filters survive before options exist', async ({ page }) => {
  const fixture = structuredClone(rows); fixture[1].cuisine = 'Chinese'; fixture[1].location = 'Heliopolis';
  await boot(page, '/?cuisine=Egyptian&location=Maadi', {count:1,fixture});
  await expect(page.locator('#cuisineFilter')).toHaveValue('Egyptian');
  await expect(page.locator('#locationFilter')).toHaveValue('Maadi');
  await expect(page.locator('.restaurant-row')).toHaveAttribute('data-id','place-A');
  await expect(page).toHaveURL(/cuisine=Egyptian/);
  await page.evaluate(() => localStorage.setItem('plate-log-filters-v1', JSON.stringify({cuisine:'Chinese',location:'Heliopolis'})));
  await page.goto('/');
  await expect(page.locator('.restaurant-row')).toHaveCount(1);
  await expect(page.locator('.restaurant-row')).toHaveAttribute('data-id','place-B');
  await expect(page.locator('#cuisineFilter')).toHaveValue('Chinese');
  await page.goto('/?cuisine='+encodeURIComponent('مصري')+'&location='+encodeURIComponent('المعادي'));
  await expect(page.locator('.restaurant-row')).toHaveCount(1);
  await expect(page.locator('.restaurant-row')).toHaveAttribute('data-id','place-A');
  await expect(page.locator('#locationFilter')).toHaveValue('Maadi');
  await expect(page.locator('#cuisineFilter')).toHaveValue('Egyptian');
});

test('unknown linked filter stays clearable and never silently expands results', async ({ page }) => {
  await boot(page, '/?cuisine=Unavailable', {count:0});
  await expect(page.locator('#cuisineFilter')).toHaveValue('Unavailable');
  await expect(page.locator('#restaurantList')).toContainText('No places match');
  await page.getByRole('button', {name:'Reset filters', exact:true}).click();
  await expect(page.locator('.restaurant-row')).toHaveCount(2);
});

test('background sorting holds rows and layout until Update order or deliberate sorting', async ({ page }, testInfo) => {
  await page.setViewportSize({width:390,height:844}); await boot(page);
  const list = page.locator('.restaurant-row');
  const ids = () => list.evaluateAll(nodes=>nodes.map(n=>n.dataset.id));
  expect(await ids()).toEqual(['place-B','place-A']);
  const top = await list.first().evaluate(el=>el.getBoundingClientRect().top);
  await changeA(page, {updated_at:'2026-10-13T12:00:00Z'});
  await expect(page.getByRole('button',{name:'Apply updated place order'})).toBeVisible();
  expect(await ids()).toEqual(['place-B','place-A']);
  expect(await list.first().evaluate(el=>el.getBoundingClientRect().top)).toBeCloseTo(top,0);
  await page.screenshot({path:`docs/audit-screenshots/2026-10-13/update-order-${testInfo.project.name}.png`});
  await page.getByRole('button',{name:'Apply updated place order'}).click();
  expect(await ids()).toEqual(['place-A','place-B']);
  await expect(page.locator('#applyBrowseOrder')).toBeDisabled();
  await changeA(page, {updated_at:'2026-10-13T09:00:00Z'});
  await expect(page.getByRole('button',{name:'Apply updated place order'})).toBeVisible();
  await page.getByRole('button',{name:'Open filters',exact:true}).click();
  await page.locator('#filterRefinements > summary').click();
  await page.locator('#sortFilter').selectOption('name');
  await page.getByRole('button',{name:'Show 2 places',exact:true}).click();
  expect(await ids()).toEqual(['place-A','place-B']);
  await expect(page.locator('#applyBrowseOrder')).toBeDisabled();
});


test('manual Refresh accepts latest ordering and new matches append without moving rows', async ({ page }) => {
  await page.setViewportSize({width:1440,height:900}); await boot(page);
  await page.evaluate(() => {
    const added=structuredClone(window.__rows[0]); added.id='place-C'; added.name='Place C'; added.updated_at='2026-10-13T13:00:00Z';
    window.__rows.push(added); window.__emit('restaurants','place-C');
  });
  await expect(page.locator('.restaurant-row')).toHaveCount(3);
  expect(await page.locator('.restaurant-row').evaluateAll(nodes=>nodes.map(n=>n.dataset.id))).toEqual(['place-B','place-A','place-C']);
  await page.getByRole('button',{name:'Open account menu',exact:true}).click();
  await page.getByRole('menuitem',{name:'Refresh log',exact:true}).click();
  await expect.poll(()=>page.locator('.restaurant-row').evaluateAll(nodes=>nodes.map(n=>n.dataset.id))).toEqual(['place-C','place-B','place-A']);
  await expect(page.locator('#applyBrowseOrder')).toBeDisabled();
});

test('Update order keeps the count and filter chips usable at narrow and desktop widths', async ({ page }, testInfo) => {
  await boot(page,'/?cuisine=Egyptian'); await changeA(page,{updated_at:'2026-10-13T12:00:00Z'});
  const action=page.getByRole('button',{name:'Apply updated place order'});
  await expect(action).toBeVisible();
  await page.addScriptTag({path:'node_modules/axe-core/axe.min.js'});
  for(const width of [320,1440]) for(const theme of ['light','dark']) {
    await page.setViewportSize({width,height:900});
    await page.evaluate(theme=>document.documentElement.classList.toggle('dark-theme',theme==='dark'),theme);
    await page.evaluate(()=>Promise.all(document.getAnimations().filter(a=>a.effect?.getTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{}))));
    await expect(page.locator('.list-count')).toBeVisible();
    await expect(page.getByRole('button',{name:'Remove cuisine filter Egyptian'})).toBeVisible();
    const layout=await action.evaluate(el=>{
      const rect=el.getBoundingClientRect();const css=getComputedStyle(el);const summary=el.closest('.filter-summary').getBoundingClientRect();
      return {height:rect.height,inside:rect.left>=summary.left&&rect.right<=summary.right+1,scroll:document.documentElement.scrollWidth,width:innerWidth,color:css.color,bg:getComputedStyle(document.documentElement).getPropertyValue('--bg')};
    });
    expect(layout.height).toBeGreaterThanOrEqual(44);expect(layout.inside).toBe(true);expect(layout.scroll).toBeLessThanOrEqual(layout.width);
    const contrast=await page.evaluate(async()=> (await window.axe.run(document.querySelector('.filter-summary'), {runOnly:['color-contrast']})).violations.map(v=>v.id));
    expect(contrast).toEqual([]);
    await page.screenshot({path:`docs/audit-screenshots/2026-10-13/order-${width}-${theme}-${testInfo.project.name}.png`});
  }
});
