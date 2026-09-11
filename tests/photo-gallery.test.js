// @vitest-environment jsdom
import {expect,it,vi} from 'vitest';
import {galleryPhotos,commitQueuedPhoto,photoAttribution,mountDishCarousels} from '../lib/photo-gallery.js';

function dispatchTouch(target, type, x, y) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  const touches = type === "touchend" || type === "touchcancel" ? [] : [{ clientX: x, clientY: y }];
  Object.defineProperty(event, "touches", { value: touches });
  target.dispatchEvent(event);
  return event;
}

function mountCarouselFixture() {
  document.body.innerHTML = `
    <div class="dish-carousel">
      <div class="dish-photo-track">
        <button class="dish-gallery-cover" type="button"></button>
        <button class="dish-gallery-cover" type="button"></button>
      </div>
      <div class="dish-photo-pagination">
        <button type="button" data-action="dish-photo-prev"></button>
        <span data-photo-position></span>
        <button type="button" data-action="dish-photo-next"></button>
      </div>
    </div>`;
  const track = document.querySelector(".dish-photo-track");
  Object.defineProperty(track, "clientWidth", { configurable: true, value: 200 });
  track.scrollLeft = 0;
  track.scrollTo = ({ left }) => {
    track.scrollLeft = left;
    track.dispatchEvent(new Event("scroll"));
  };
  mountDishCarousels(document.body);
  return { track, position: document.querySelector("[data-photo-position]") };
}
it('keeps legacy photo without inventing its contributor and excludes trashed photos',()=>{
  const dish={photo:'old.jpg',photoPath:'old',photos:[{id:'a',photo:'new.jpg',contributorName:'Friend'},{id:'b',photo:'deleted.jpg',deletedAt:1}]};
  expect(galleryPhotos(dish).map(p=>p.contributorName)).toEqual(['Contributor unknown','Friend']);
  expect(dish.photos).toHaveLength(2);
});
it('labels legacy attribution honestly and keeps known contributors explicit',()=>{
  expect(photoAttribution({contributorName:'Contributor unknown'})).toBe('Legacy photo · Contributor unavailable');
  expect(photoAttribution({contributorName:'Friend'})).toBe('Photo by Friend');
  expect(photoAttribution({}, {compact:true})).toBe('Contributor unavailable (legacy)');
});
it('does not repeat a legacy image already present in the gallery',()=>{
  expect(galleryPhotos({photo:'old.jpg',photoPath:'old',photos:[{photo:'signed.jpg',photoPath:'old'}]})).toHaveLength(1);
});
it('recovers a lost insert response without reuploading or duplicating a photo',async()=>{
  const pending={id:'stable-id',path:'',file:{}};
  const rows=new Map();
  const upload=vi.fn(async()=> 'owner/photo.jpg');
  let offline=true;
  const insert=vi.fn(async(id,path)=>{ rows.set(id,path);return {error:new Error('Response lost')}; });
  const find=vi.fn(async(id)=>offline ? {error:new Error('Offline')} : {data:{photo_path:rows.get(id)}});
  await expect(commitQueuedPhoto(pending,{upload,insert,find})).rejects.toThrow('Response lost');
  offline=false;
  await commitQueuedPhoto(pending,{upload,insert,find});
  expect(upload).toHaveBeenCalledTimes(1);
  expect(rows.size).toBe(1);
  expect(pending.path).toBe('owner/photo.jpg');
});
it('does not accept an existing row with a different upload path',async()=>{
  await expect(commitQueuedPhoto({id:'id',path:'owner/new.jpg'}, {
    upload:vi.fn(),insert:async()=>({error:new Error('Conflict')}),find:async()=>({data:{photo_path:'owner/other.jpg'}})
  })).rejects.toThrow('Conflict');
});

it('chooses a new cover while retaining the original and every contributor photo',()=>{
 const photos=galleryPhotos({photo:'legacy.jpg',coverPhotoId:'new',photos:[{id:'new',photo:'new.jpg',contributorName:'Friend'}]});
 expect(photos.map(p=>p.photo)).toEqual(['new.jpg','legacy.jpg']);
});

it('removes legacy and shared photos from display without changing their originals',()=>{
  const dish={photo:'legacy.jpg',photoPath:'owner/legacy.jpg',photos:[{id:'new',photo:'new.jpg',photoPath:'owner/new.jpg'}],photoRemovals:[{photoPath:'owner/legacy.jpg'},{photoPath:'owner/new.jpg'}]};
  expect(galleryPhotos(dish)).toEqual([]);
  expect(dish.photo).toBe('legacy.jpg'); expect(dish.photos).toHaveLength(1);
  dish.photoRemovals=[];
  expect(galleryPhotos(dish)).toHaveLength(2);
});
it('does not resurrect a removed legacy duplicate under another signed URL',()=>{
  expect(galleryPhotos({photo:'old-url',photoPath:'same',photos:[{photo:'new-url',photoPath:'same',deletedAt:1}]})).toEqual([]);
});

it('lets a vertical swipe on a dish photo pass through so the restaurant can scroll',()=>{
  const {track}=mountCarouselFixture();
  dispatchTouch(track,'touchstart',80,120);
  const move=dispatchTouch(track,'touchmove',78,40);
  dispatchTouch(track,'touchend',78,40);
  expect(move.defaultPrevented).toBe(false);
  expect(track.scrollLeft).toBe(0);
});

it('pages the dish photo on a horizontal swipe without treating it as a tap',()=>{
  const {track,position}=mountCarouselFixture();
  dispatchTouch(track,'touchstart',180,80);
  const move=dispatchTouch(track,'touchmove',40,84);
  dispatchTouch(track,'touchend',40,84);
  expect(move.defaultPrevented).toBe(true);
  expect(track.scrollLeft).toBe(200);
  expect(position.textContent).toBe('2 / 2');
});

it('does not steal a tap-sized movement for photo paging',()=>{
  const {track}=mountCarouselFixture();
  dispatchTouch(track,'touchstart',80,80);
  const move=dispatchTouch(track,'touchmove',84,81);
  dispatchTouch(track,'touchend',84,81);
  expect(move.defaultPrevented).toBe(false);
  expect(track.scrollLeft).toBe(0);
});
