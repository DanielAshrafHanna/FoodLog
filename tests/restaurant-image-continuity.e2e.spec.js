import {test,expect} from '@playwright/test';
import {boot,openA,changeA,rows} from './fixtures/navigation.js';

// Invented records and synthetic images only; the fixture blocks external traffic.
for(const theme of ['light','dark']) test(`phone dish photos remain decoded through a fresh review in ${theme}`,async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.addInitScript(theme=>localStorage.setItem('plate-log-theme',theme),theme);
 await boot(page);await openA(page);
 const card=page.locator('.dish-card').first(),track=card.locator('.dish-photo-track');
 await card.locator('[data-action="dish-photo-next"]').click();
 await expect(card.locator('[data-photo-position]')).toHaveText('2 / 2');
 const photo=card.locator('.dish-gallery-cover').nth(1);await photo.focus();
 await page.evaluate(async()=>{
  const p=document.querySelector('#detailPanel');
  p.scrollTop=p.querySelector('.dish-card').offsetTop-100;
  await Promise.all([...p.querySelectorAll('.dish-photo')].map(im=>im.decode()));
  window.__retainedPhotos=[...p.querySelectorAll('.dish-photo')];
  window.__retainedTracks=[...p.querySelectorAll('.dish-photo-track')];
  window.__retainedCards=[...p.querySelectorAll('.dish-card')];
  window.__photoFailures=[];
  const observer=new MutationObserver(()=>{
   if(window.__retainedPhotos.some(im=>!im.isConnected||!im.complete||!im.naturalWidth))window.__photoFailures.push('loaded image disconnected or reset');
  });observer.observe(p,{subtree:true,childList:true,attributes:true});window.__photoObserver=observer;
 });
 const scroll=await track.evaluate(el=>el.scrollLeft);
 const dishes=structuredClone(rows[0].dishes);
 dishes[0].dish_ratings=[{rater_email:'fixture@example.com',rater_name:'Fixture',rating:4,notes:'Fresh review, same photographs.'}];
 await changeA(page,{dishes});
 await expect(card).toContainText('Fresh review, same photographs.');
 const continuity=await page.evaluate(()=>{
  window.__photoObserver.disconnect();const p=document.querySelector('#detailPanel');
  return {photos:[...p.querySelectorAll('.dish-photo')].every((n,i)=>n===window.__retainedPhotos[i]),tracks:[...p.querySelectorAll('.dish-photo-track')].every((n,i)=>n===window.__retainedTracks[i]),cards:[...p.querySelectorAll('.dish-card')].every((n,i)=>n===window.__retainedCards[i]),failures:window.__photoFailures};
 });
 expect(continuity).toEqual({photos:true,tracks:true,cards:true,failures:[]});
 await expect(photo).toBeFocused();await expect(card.locator('[data-photo-position]')).toHaveText('2 / 2');
 expect(await track.evaluate(el=>el.scrollLeft)).toBeCloseTo(scroll,0);
 // Native listeners and navigation must still work after preserving the subtree.
 await card.locator('[data-action="dish-photo-prev"]').click();
 await expect(card.locator('[data-photo-position]')).toHaveText('1 / 2');
});

test('a real photo change updates its carousel and retains unrelated photos',async({page})=>{
 await page.setViewportSize({width:390,height:844});await boot(page);await openA(page);
 await page.evaluate(()=>{window.__oldPhotos=[...document.querySelectorAll('#detailPanel .dish-photo')];});
 const dishes=structuredClone(rows[0].dishes);
 dishes[0].dish_photos=dishes[0].dish_photos.slice(1);
 await changeA(page,{dishes});
 const first=page.locator('.dish-card').first();
 await expect(first.locator('.dish-photo')).toHaveCount(1);
 await expect(first.locator('.dish-gallery-cover')).toHaveAttribute('data-photo-id','A-0-photo-2');
 expect(await page.locator('.dish-card').nth(1).locator('.dish-photo').first().evaluate(el=>el===window.__oldPhotos[2])).toBe(true);
 await first.locator('.dish-gallery-cover').click();
 await expect(page.locator('#sharedGallery')).toBeVisible();
 await page.keyboard.press('Escape');
 await page.getByRole('button',{name:'Back to places',exact:true}).click();
 await expect(page.locator('body')).not.toHaveClass(/mobile-detail-view/);
});
