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
  await card.getByRole('button',{name:'Add photos',exact:true}).click();
  const modal=page.locator('#photoContributionModal');
  await modal.locator('input[type=file]').setInputFiles([png,{...png,name:'second.png'}]);
  await modal.getByRole('button',{name:'Add photos',exact:true}).click();
  await expect(modal).toBeHidden();
  await expect(card).toHaveCount(1);
  await card.getByRole('button',{name:'View 4 photos of Roasted carrots'}).click();
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
