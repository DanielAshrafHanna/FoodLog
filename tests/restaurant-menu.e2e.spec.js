import { test, expect } from '@playwright/test';
import { mkdir, readFile } from 'node:fs/promises';
import { boot, openA, rows, settled } from './fixtures/navigation.js';

// Mocked public cloud responses; no external requests or production writes.
const fixture = structuredClone(rows);
fixture[0].restaurant_ratings = [
  {rater_email:'one@example.com',rater_name:'Sam',rating:4,notes:'Friendly service and a relaxed room.',updated_at:'2026-10-25T10:00:00Z'},
  {rater_email:'two@example.com',rater_name:'Alex',rating:5,notes:'',updated_at:'2026-10-25T10:00:00Z'}
];
fixture[0].restaurant_photos = [{id:'room-photo',photo_path:'fixture/room.jpg',created_at:'2026-10-25T10:00:00Z'}];
fixture[0].dishes.forEach((dish,i) => {
  dish.name = ['Roasted aubergine','Lemon chicken','Garden salad','Chocolate tart'][i];
  dish.dish_ratings = [{rater_email:'one@example.com',rater_name:'Sam',rating:4+i*.25,notes:'Fresh flavours, nicely cooked. A dish I would order again.',updated_at:'2026-10-25T10:00:00Z'}];
});

for (const theme of ['light','dark']) test(`${theme} dishes lead and compact comparisons retain full content`, async ({page}, info) => {
  await page.addInitScript(theme => { localStorage.setItem('plate-log-theme',theme);localStorage.setItem('foodlog-detail-swipe-hint-seen-v1','1'); },theme);
  await boot(page,'/',{fixture}); await openA(page);
  const detail=page.locator('#detailPanel'), nav=detail.locator('.detail-section-nav'), first=detail.locator('.dish-card').first();
  await expect(first.getByRole('heading',{name:'Roasted aubergine'})).toBeInViewport();
  const sections=await detail.evaluate(el=>[...el.children].filter(n=>n.matches('.detail-dishes-heading,.ratings-breakdown,.detail-photos-heading')).map(n=>n.classList[0]==='section-heading'?n.classList[1]:n.classList[0]));
  expect(sections).toEqual(['detail-dishes-heading','ratings-breakdown','detail-photos-heading']);
  await expect(detail.locator('.restaurant-summary-line')).toContainText('2 ratings');
  await expect(detail.locator('.restaurant-review-count')).toHaveText('2 ratings · 1 written review');
  await expect(detail.locator('.ratings-list .rating-row')).toHaveCount(2);
  const photoSize=await first.locator('.dish-photo').first().boundingBox();
  expect(photoSize.width).toBeLessThanOrEqual(112); expect(photoSize.height).toBeLessThanOrEqual(104);
  expect((await first.boundingBox()).height).toBeLessThan(260);
  await expect(nav.locator('[data-section=dishes]')).toHaveAttribute('aria-current','location');
  await mkdir('docs/restaurant-view-audit-2026-10-25/implementation',{recursive:true});
  const capture=async name=>{
    await page.evaluate(async()=>Promise.all(document.getAnimations().map(a=>a.finished.catch(()=>{}))));
    await page.screenshot({path:`docs/restaurant-view-audit-2026-10-25/implementation/${name}-${theme}-${info.project.name}.png`});
  };
  await capture('entry');
  await nav.locator('[data-section=dishes]').click();
  await expect(detail.locator('.detail-dishes-heading h3')).toBeFocused();
  await first.getByRole('button',{name:'Next dish photo',exact:true}).click();
  await expect(first.locator('[data-photo-position]')).toHaveText('2 / 2');
  await first.locator('[data-action=dish-gallery]').nth(1).click();
  await expect(page.locator('#sharedGallery')).toBeVisible();
  await page.keyboard.press('Escape');
  await first.locator('[data-action=open-dish-reviews]').click();
  await expect(page.locator('#dishReviewsSheet')).toContainText('Fresh flavours, nicely cooked. A dish I would order again.');
  await expect(page.locator('#dishReviewsSheet .review-updated-time')).toHaveCount(1);
  await page.keyboard.press('Escape');
  await capture('comparison');
  await nav.locator('[data-section=reviews]').click();
  await expect(detail.locator('.ratings-breakdown h3')).toBeFocused();
  await expect(nav.locator('[data-section=reviews]')).toHaveAttribute('aria-current','location');
  await expect(nav).toBeInViewport();
  await capture('restaurant-reviews');
  await nav.locator('[data-section=photos]').click();
  await expect(detail.locator('.detail-photos-heading h3')).toBeFocused();
  await expect(nav.locator('[data-section=photos]')).toHaveAttribute('aria-current','location');
  await expect(nav).toBeInViewport();
  await page.addScriptTag({content:await readFile('node_modules/axe-core/axe.min.js','utf8')});
  const failures=await page.evaluate(async()=>(await axe.run(document.querySelector('#detailPanel'),{runOnly:{type:'rule',values:['color-contrast','button-name','aria-valid-attr-value']}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})));
  expect(failures).toEqual([]);
  expect(await detail.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
});

test('first-open places reset scroll and returning places retain their position',async({page},info)=>{
  if(info.project.name!=='desktop-chromium') test.skip();
  await boot(page,'/',{fixture});await openA(page);
  const detail=page.locator('#detailPanel');
  await detail.locator('.detail-section-nav [data-section=reviews]').click();
  const previous=await detail.evaluate(el=>el.scrollTop); expect(previous).toBeGreaterThan(300);
  await page.locator('.restaurant-row[data-id=place-B]').click();await settled(page);
  await expect.poll(()=>detail.evaluate(el=>el.scrollTop)).toBe(0);
  await expect(detail.getByRole('heading',{name:'Place B',exact:true})).toBeInViewport();
  await openA(page);
  await expect.poll(()=>detail.evaluate(el=>el.scrollTop)).toBeCloseTo(previous,0);
});

test('320px menu keeps names and navigation usable',async({page})=>{
  await page.setViewportSize({width:320,height:740});await boot(page,'/',{fixture});await openA(page);
  const detail=page.locator('#detailPanel');
  await expect(detail.locator('.dish-card').first().getByRole('heading',{name:'Roasted aubergine'})).toBeInViewport();
  expect(await detail.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
  await detail.locator('.detail-section-nav [data-section=reviews]').click();
  const rect=await detail.locator('.ratings-breakdown h3').boundingBox(),nav=await detail.locator('.detail-section-nav').boundingBox();
  expect(rect.y).toBeGreaterThanOrEqual(nav.y+nav.height-1);
});
