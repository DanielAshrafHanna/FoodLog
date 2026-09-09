import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
const png = {name:'synthetic.png', mimeType:'image/png', buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64')};
const imageUrl = `data:image/png;base64,${png.buffer.toString('base64')}`;
test.beforeEach(async ({page}) => {
  await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  await page.goto('/');
  await page.evaluate(imageUrl => {
    localStorage.clear(); sessionStorage.clear();
    localStorage.setItem('plate-log-data-v1', JSON.stringify([{id:'test-place',name:'Gallery Table',location:'Maadi',cuisine:'Egyptian',visited:[],photos:[],ratings:[],dishes:[{id:'test-dish',name:'Roasted carrots',photo:imageUrl,photos:[{id:'friend-photo',photo:imageUrl+'#friend',contributorName:'Test friend'}],likedBy:[],ratings:[{email:'friend@example.com',name:'Test friend',rating:4,notes:'Sweet and smoky.'}]}]}]));
  }, imageUrl);
  await page.reload();
});

test('guided restaurant preserves answers and saves photos without marking a visit', async ({page}) => {
  await page.getByRole('button',{name:'Add place',exact:true}).click();
  const modal=page.locator('#restaurantModal');
  await modal.getByLabel('Restaurant name').fill('Synthetic Future Table');
  await expect(modal.locator('#locationSelect')).toBeHidden();
  await modal.getByRole('button',{name:'Add details',exact:true}).click();
  await modal.locator('#locationSelect').fill('Zamalek');
  await modal.getByRole('button',{name:'Add memories',exact:true}).click();
  await modal.locator('#restaurantCapturePhotos').setInputFiles([png,{...png,name:'second.png'}]);
  await expect(modal.locator('#restaurantCapturePreview img')).toHaveCount(2);
  await modal.getByRole('button',{name:'Back',exact:true}).click();
  await expect(modal.locator('#locationSelect')).toHaveValue('Zamalek');
  await modal.getByRole('button',{name:'Save place',exact:true}).click();
  await expect(modal.getByText('What would you like to do next?')).toBeVisible();
  await modal.getByRole('button',{name:'Done',exact:true}).click();
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('plate-log-data-v1')).find(p=>p.name==='Synthetic Future Table'));
  expect(saved.visited).toEqual([]);
  expect(saved.photos).toHaveLength(2);
  expect(saved.photos.every(p=>p.contributorName==='You')).toBe(true);
  await page.reload();
  const data=await page.evaluate(()=>JSON.parse(localStorage.getItem('plate-log-data-v1')));
  expect(data.find(p=>p.id==='test-place').dishes[0].ratings[0].notes).toBe('Sweet and smoky.');
  expect(data.find(p=>p.id===saved.id).photos).toHaveLength(2);
});

test('friends photos share one dish with legacy attribution, gallery browsing and unchanged reviews', async ({page}) => {
  await page.locator('.restaurant-row').click();
  const card=page.locator('.dish-card');
  await card.getByRole('button',{name:'More actions for Roasted carrots'}).click();
  await page.locator('#dishActionSheet').getByRole('button',{name:'Add photos',exact:true}).click();
  const modal=page.locator('#photoContributionModal');
  await expect(modal.getByText('Take photo',{exact:true})).toBeVisible();
  await expect(modal.getByText('Choose photos',{exact:true})).toBeVisible();
  await expect(modal.locator('#photoContributionCameraInput')).toHaveAttribute('capture','environment');
  await modal.locator('#photoContributionCameraInput').setInputFiles({...png,name:'camera.png'});
  await modal.locator('#photoContributionInput').setInputFiles({...png,name:'library.png'});
  await expect(modal.locator('#photoContributionPreview img')).toHaveCount(2);
  await modal.getByRole('button',{name:'Add photos',exact:true}).click();
  await expect(modal).toBeHidden();
  await expect(card).toHaveCount(1);
  await card.getByRole('button',{name:'View photo 1 of 4 of Roasted carrots'}).click();
  const gallery=page.locator('#sharedGallery');
  const bounds=await gallery.boundingBox();
  for (const control of [gallery.locator('h2'),gallery.locator('[data-gallery-caption]'),gallery.locator('[data-gallery-prev]')]) {
    const box=await control.boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(bounds.x);
    expect(box.x+box.width).toBeLessThanOrEqual(bounds.x+bounds.width);
  }
  await expect(gallery.locator('[data-gallery-caption]')).toContainText('Legacy photo · Contributor unavailable');
  await gallery.getByRole('button',{name:'Next photo'}).click();
  await expect(gallery.locator('[data-gallery-caption]')).toContainText('Test friend');
  await page.keyboard.press('ArrowRight');
  await expect(gallery.locator('[data-gallery-caption]')).toContainText('Photo by You');
  const image=gallery.locator('img');
  await image.dispatchEvent('pointerdown',{clientX:220});
  await image.dispatchEvent('pointerup',{clientX:60});
  await expect(gallery.locator('[data-gallery-caption]')).toContainText('4 of 4');
  const dish=await page.evaluate(()=>JSON.parse(localStorage.getItem('plate-log-data-v1'))[0].dishes[0]);
  expect(dish.ratings).toEqual([{email:'friend@example.com',name:'Test friend',rating:4,notes:'Sweet and smoky.'}]);
  expect(dish.photos).toHaveLength(3);
  await gallery.getByRole('button',{name:'Use as cover',exact:true}).click();
  await expect(gallery.getByRole('button',{name:'Cover photo',exact:true})).toBeDisabled();
  const changed=await page.evaluate(()=>JSON.parse(localStorage.getItem('plate-log-data-v1'))[0].dishes[0]);
  expect(changed.coverPhotoId).toBe(changed.photos[2].id);
  expect(changed.photo).toBe(dish.photo);
  expect(changed.photos).toHaveLength(3);
});

test('guided dish saves multiple photos and repeat entry starts at the first step', async ({page}) => {
  await page.locator('.restaurant-row').click();
  await page.getByRole('button',{name:'Add dish',exact:true}).click();
  const modal=page.locator('#dishModal');
  await modal.getByLabel('Dish name').fill('Synthetic lemon pudding');
  await expect(modal.locator('#saveDishAndAnotherButton')).toBeHidden();
  await modal.getByRole('button',{name:'Add my review',exact:true}).click();
  await expect(modal.locator('#saveDishAndAnotherButton')).toBeHidden();
  await modal.locator('#dishNotesInput').fill('Bright and silky.');
  await modal.getByRole('button',{name:'Increase dish rating by half a star'}).click();
  await modal.getByRole('button',{name:'Add photos',exact:true}).click();
  await expect(modal.locator('#saveDishAndAnotherButton')).toBeVisible();
  await modal.locator('#dishPhotoInput').setInputFiles([png,{...png,name:'second.png'}]);
  await expect(modal.locator('#photoPreview img')).toHaveCount(2);
  await modal.locator('#saveDishAndAnotherButton').click();
  await expect(modal.getByLabel('Dish name')).toHaveValue('');
  await expect(modal.locator('.capture-progress [aria-current=step]')).toHaveText('Dish');
  const dish=await page.evaluate(()=>JSON.parse(localStorage.getItem('plate-log-data-v1'))[0].dishes.find(d=>d.name==='Synthetic lemon pudding'));
  expect(dish.photos).toHaveLength(2);
  expect(dish.ratings[0].notes).toBe('Bright and silky.');
});

test('every guided step fits 320px and has no serious automated accessibility findings', async ({page}) => {
  await page.setViewportSize({width:320,height:844});
  await page.addScriptTag({content:await readFile('node_modules/axe-core/axe.min.js','utf8')});
  await page.getByRole('button',{name:'Add place',exact:true}).click();
  const restaurant=page.locator('#restaurantModal');
  await restaurant.getByLabel('Restaurant name').fill('Synthetic place');
  for(const step of ['Place','Details','Memories']) {
    await restaurant.getByRole('button',{name:step,exact:true}).click();
    await page.locator('dialog[open]').evaluate(el=>Promise.all(el.getAnimations({subtree:true}).map(a=>a.finished.catch(()=>{}))));
    const violations=await page.evaluate(async()=> (await axe.run(document.querySelector('dialog[open]'))).violations.filter(v=>['critical','serious'].includes(v.impact)).map(v=>({id:v.id,nodes:v.nodes.map(n=>n.failureSummary)})));
    expect(violations).toEqual([]);
    expect(await restaurant.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
  }
  await page.keyboard.press('Escape');
  await page.locator('.restaurant-row').click();
  await page.getByRole('button',{name:'Add dish',exact:true}).click();
  const dish=page.locator('#dishModal');
  await dish.getByLabel('Dish name').fill('Synthetic dish');
  for(const step of ['Dish','Your take','Photos']) {
    await dish.getByRole('button',{name:step,exact:true}).click();
    await page.locator('dialog[open]').evaluate(el=>Promise.all(el.getAnimations({subtree:true}).map(a=>a.finished.catch(()=>{}))));
    const violations=await page.evaluate(async()=> (await axe.run(document.querySelector('dialog[open]'))).violations.filter(v=>['critical','serious'].includes(v.impact)).map(v=>({id:v.id,nodes:v.nodes.map(n=>n.failureSummary)})));
    expect(violations).toEqual([]);
    expect(await dish.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
  }
});

test('card photos scroll independently, open the selected photo, zoom, and restore from Trash', async ({page}) => {
  await page.locator('.restaurant-row').click();
  const card=page.locator('.dish-card');
  const track=card.locator('.dish-photo-track');
  await expect(track.locator('button')).toHaveCount(2);
  await expect(card.getByRole('button',{name:'Previous dish photo'})).toBeDisabled();
  await card.getByRole('button',{name:'Next dish photo'}).click();
  await expect(card.locator('[data-photo-position]')).toHaveText('2 / 2');
  await expect(page.locator('#sharedGallery')).toBeHidden();
  await card.locator('[data-photo-id="friend-photo"]').click();
  const gallery=page.locator('#sharedGallery');
  await expect(gallery.locator('[data-gallery-caption]')).toContainText('2 of 2 · Photo by Test friend');
  await gallery.getByRole('button',{name:'Zoom in',exact:true}).click();
  await expect(gallery.getByRole('button',{name:'Zoom out',exact:true})).toHaveAttribute('aria-pressed','true');
  const viewport=gallery.locator('.gallery-viewport');
  await viewport.dispatchEvent('pointerdown',{pointerId:11,button:0,clientX:200,clientY:200});
  await viewport.dispatchEvent('pointermove',{pointerId:11,clientX:150,clientY:180});
  await viewport.dispatchEvent('pointerup',{pointerId:11,clientX:150,clientY:180});
  await expect(gallery.locator('[data-gallery-caption]')).toContainText('2 of 2');
  await expect(gallery.locator('img')).toHaveCSS('transform', /matrix\(2.5/);
  await gallery.getByRole('button',{name:'Zoom out',exact:true}).click();
  await gallery.getByRole('button',{name:'Move to Trash',exact:true}).click();
  await expect(gallery.locator('[data-gallery-caption]')).toContainText('1 of 1');
  await gallery.getByRole('button',{name:'Close',exact:true}).click();
  await expect(card.locator('[data-action="dish-gallery"]')).toHaveCount(1);
  let saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('plate-log-data-v1'))[0].dishes[0]);
  expect(saved.photos).toHaveLength(1); expect(saved.ratings).toHaveLength(1); expect(saved.photoRemovals).toHaveLength(1);
  await page.reload();
  await expect(card.locator('[data-action="dish-gallery"]')).toHaveCount(1);
  await page.getByRole('button',{name:'Open Trash',exact:true}).click();
  await page.locator('.trash-item').filter({hasText:'Photo from Roasted carrots'}).getByRole('button',{name:'Restore'}).click();
  await page.getByRole('button',{name:'Close Trash'}).click();
  await expect(card.locator('[data-action="dish-gallery"]')).toHaveCount(2);
  saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('plate-log-data-v1'))[0].dishes[0]);
  expect(saved.photoRemovals).toEqual([]); expect(saved.photos).toHaveLength(1);
});

test('one review summary supports hold, keyboard, and the combined action menu', async ({page}) => {
  await page.locator('.restaurant-row').click();
  const card=page.locator('.dish-card');
  const summary=card.locator('[data-action="open-dish-reviews"]');
  await expect(summary).toHaveCount(1);
  await expect(card.getByRole('button',{name:/Read review|Edit your review|Add your review/})).toHaveCount(0);
  await summary.dispatchEvent('pointerdown',{pointerId:21,button:0,clientX:40,clientY:40});
  await expect(page.locator('#dishReviewsSheet')).toBeVisible();
  await expect(page.locator('#dishActionSheet')).toBeHidden();
  await page.keyboard.press('Escape'); await expect(summary).toBeFocused();
  await page.keyboard.press('Enter'); await expect(page.locator('#dishReviewsSheet')).toBeVisible();
  await page.keyboard.press('Escape');
  await card.getByRole('button',{name:'More actions for Roasted carrots'}).click();
  await expect(page.locator('#dishActionSheet .place-action-item:visible')).toHaveCount(3);
  await page.locator('#dishActionReview').click();
  await expect(page.locator('#dishReviewsSheet')).toContainText('Sweet and smoky.');
  await expect(page.locator('#dishReviewsWriteButton')).toHaveText('Add your review');
});

test('pinch zoom resets between photos and gallery controls meet accessibility requirements', async ({page}) => {
  await page.locator('.restaurant-row').click();
  await page.locator('.dish-gallery-cover').first().click();
  const gallery=page.locator('#sharedGallery');
  const viewport=gallery.locator('.gallery-viewport');
  await viewport.dispatchEvent('pointerdown',{pointerId:31,button:0,clientX:100,clientY:150});
  await viewport.dispatchEvent('pointerdown',{pointerId:32,button:0,clientX:200,clientY:150});
  await viewport.dispatchEvent('pointermove',{pointerId:32,clientX:300,clientY:150});
  await expect(gallery.locator('[data-gallery-zoom]')).toHaveAttribute('aria-pressed','true');
  await viewport.dispatchEvent('pointerup',{pointerId:31,clientX:100,clientY:150});
  await viewport.dispatchEvent('pointerup',{pointerId:32,clientX:300,clientY:150});
  await gallery.getByRole('button',{name:'Next photo'}).click();
  await expect(gallery.locator('[data-gallery-zoom]')).toHaveAttribute('aria-pressed','false');
  await page.addScriptTag({content:await readFile('node_modules/axe-core/axe.min.js','utf8')});
  const violations=await page.evaluate(async()=> (await axe.run(document.querySelector('#sharedGallery'))).violations.filter(v=>['serious','critical'].includes(v.impact)).map(v=>({id:v.id,nodes:v.nodes.map(n=>n.failureSummary)})));
  expect(violations).toEqual([]);
});

test('a real touch swipe changes the card photo without opening the gallery or leaving the place', async ({page},testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium','Native touch input contract.');
  await page.locator('.restaurant-row').click();
  const track=page.locator('.dish-photo-track');
  await track.scrollIntoViewIfNeeded();
  const box=await track.boundingBox();
  const session=await page.context().newCDPSession(page);
  const start=box.x+box.width*.85, end=box.x+box.width*.15, y=box.y+Math.min(box.height/2,100);
  await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:start,y}]});
  for(let step=1;step<=6;step++) await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:start+(end-start)*step/6,y}]});
  await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await expect(page.locator('[data-photo-position]')).toHaveText('2 / 2');
  await expect(page.locator('#sharedGallery')).toBeHidden();
  await expect(page.locator('#detailPanel')).toBeVisible();
  await expect(page).toHaveURL(/place=test-place/);
  await session.detach();
});
