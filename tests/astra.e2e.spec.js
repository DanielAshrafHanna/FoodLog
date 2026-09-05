import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear(); sessionStorage.clear();
    localStorage.setItem('plate-log-data-v1', JSON.stringify([
      {id:'recap-table', name:'Recap Table', location:'Maadi', cuisine:'Egyptian', price:'$$', visited:['Friend'], playlists:[], photos:[], updatedAt:2,
        ratings:[{email:'friend@example.com',name:'Friend',rating:4}],
        dishes:[{id:'recap-dish',name:'Roasted aubergine',photo:'',likedBy:[],ratings:[{email:'friend@example.com',name:'Friend',rating:4,notes:'Smoky and soft.'}]}]},
      {id:'unvisited-table', name:'Tomorrow Table', location:'Zamalek', cuisine:'Italian', price:'$$',visited:[],playlists:[],photos:[],ratings:[],dishes:[],updatedAt:1}
    ]));
  });
  await page.reload();
});

test('recap saves individual ratings and dish reviews without changing a friend’s reviews', async ({page}) => {
  await page.locator('#logVisitButton').click();
  const recap = page.locator('#visitRecapModal');
  await recap.getByRole('button', {name:'Needs my rating',exact:true}).click();
  await expect(recap.locator('.visit-place-option')).toHaveCount(1);
  await recap.getByRole('button', {name:/Recap Table/}).click();
  await recap.getByRole('button', {name:'Rate place',exact:true}).click();
  const rating = page.locator('#restaurantRatingModal');
  await rating.getByRole('button',{name:'Increase restaurant rating by half a star'}).click();
  await rating.getByRole('button',{name:'Save my rating'}).click();
  await expect(recap.getByText('0.5 / 5 · Saved')).toBeVisible();
  await expect(recap.getByRole('button',{name:'Edit rating',exact:true})).toBeFocused();
  await recap.getByRole('button',{name:'Review',exact:true}).click();
  const review=page.locator('#dishReviewModal');
  await review.getByRole('button',{name:'Increase review rating by half a star'}).click();
  await review.getByLabel('Your review (optional)').fill('Would order again.');
  await review.getByRole('button',{name:'Save my review'}).click();
  await expect(recap.getByText('1 of 1 reviewed')).toBeVisible();
  await recap.getByRole('button',{name:'Choose another place'}).click();
  await expect(recap.locator('.visit-place-option')).toHaveCount(0);
  await page.keyboard.press('Escape');
  const data = await page.evaluate(()=>JSON.parse(localStorage.getItem('plate-log-data-v1')));
  expect(data).toHaveLength(2);
  expect(data[0].ratings.find(r=>r.email==='friend@example.com').rating).toBe(4);
  expect(data[0].dishes[0].ratings.find(r=>r.email==='friend@example.com').notes).toBe('Smoky and soft.');
  expect(data[0].dishes[0].ratings).toHaveLength(2);
});

test('recap search, empty results, keyboard dismissal, and new dish handoff work', async ({page}) => {
  await page.locator('#searchInput').fill('Tomorrow');
  await expect(page.locator('.restaurant-row')).toHaveCount(1);
  await page.locator('#logVisitButton').click();
  const recap=page.locator('#visitRecapModal');
  await recap.getByLabel('Find a restaurant').fill('no matching restaurant');
  await expect(recap.getByText(/No matching places/)).toBeVisible();
  await recap.getByLabel('Find a restaurant').fill('maadi');
  await recap.getByRole('button',{name:/Recap Table/}).click();
  await recap.getByRole('button',{name:'Add a dish you tried'}).click();
  await expect(recap).toBeHidden();
  await expect(page.locator('#dishModal')).toBeVisible();
  await expect(page.locator('#dishModalEyebrow')).toHaveText('Recap Table');
  await page.locator('#dishNameInput').fill('Fresh salad');
  await page.locator('#saveDishButton').click();
  const data = await page.evaluate(()=>JSON.parse(localStorage.getItem('plate-log-data-v1')));
  expect(data.find(p=>p.id==='recap-table').dishes.some(d=>d.name==='Fresh salad')).toBe(true);
  expect(data.find(p=>p.id==='unvisited-table').dishes).toHaveLength(0);
});

test('recap is accessible and fits a narrow viewport', async ({page}) => {
  await page.setViewportSize({width:320,height:844});
  await page.locator('#logVisitButton').click();
  await page.addScriptTag({content:await readFile('node_modules/axe-core/axe.min.js','utf8')});
  const violations=await page.evaluate(async()=> (await axe.run(document)).violations.filter(v=>['critical','serious'].includes(v.impact)));
  expect(violations.map(v=>`${v.id}: ${v.help}`)).toEqual([]);
  const size=await page.locator('#visitRecapModal').boundingBox();
  expect(size.x).toBeGreaterThanOrEqual(0);
  expect(size.x+size.width).toBeLessThanOrEqual(320);
});

test('dish capture returns to its recap after repeat entry and preserves a cancelled draft', async ({page}) => {
  await page.locator('#logVisitButton').click();
  const recap=page.locator('#visitRecapModal');
  await recap.getByRole('button',{name:/Recap Table/}).click();
  await recap.getByRole('button',{name:'Add a dish you tried'}).click();
  await page.locator('#dishNameInput').fill('Lemon sorbet');
  await page.locator('#saveDishAndAnotherButton').click();
  await expect(page.locator('#dishNameInput')).toHaveValue('');
  await expect(recap).toBeHidden();
  await page.locator('#dishNameInput').fill('Pumpkin soup');
  await page.locator('#saveDishButton').click();
  await expect(recap).toBeVisible();
  await expect(recap.getByText('Pumpkin soup',{exact:true})).toBeVisible();
  await expect(recap.getByRole('button',{name:'Add a dish you tried'})).toBeFocused();
  await recap.getByRole('button',{name:'Add a dish you tried'}).click();
  await page.locator('#dishNameInput').fill('Unfinished salad');
  await page.keyboard.press('Escape');
  await expect(recap).toBeVisible();
  await recap.getByRole('button',{name:'Add a dish you tried'}).click();
  await expect(page.locator('#dishNameInput')).toHaveValue('Unfinished salad');
});

test('dish form labels people and keeps optional photo preview out of the empty form', async ({page}) => {
  await page.locator('#logVisitButton').click();
  await page.locator('#visitRecapModal').getByRole('button',{name:/Recap Table/}).click();
  await page.getByRole('button',{name:'Add a dish you tried'}).click();
  const dialog=page.locator('#dishModal');
  await expect(dialog.locator('#photoPreview')).toBeHidden();
  await dialog.getByRole('textbox',{name:'Add a person',exact:true}).fill('Audit friend');
  await dialog.getByRole('textbox',{name:'Add a person',exact:true}).press('Enter');
  const person=dialog.getByRole('button',{name:'Audit friend',exact:true});
  await expect(person).toHaveAttribute('aria-pressed','true');
  await person.click();
  await expect(person).toHaveAttribute('aria-pressed','false');
  await page.addScriptTag({content:await readFile('node_modules/axe-core/axe.min.js','utf8')});
  const violations=await page.evaluate(async()=> (await axe.run(document)).violations.filter(v=>['critical','serious'].includes(v.impact)));
  expect(violations.map(v=>v.id)).toEqual([]);
});
