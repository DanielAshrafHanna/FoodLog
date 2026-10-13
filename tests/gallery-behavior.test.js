// @vitest-environment jsdom
import {it,expect,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {mountDishCarousels,mountGallery} from '../lib/photo-gallery.js';
function setup(options={}) {
 document.body.innerHTML=readFileSync('index.html','utf8');
 const dialog=document.querySelector('#sharedGallery');
 dialog.showModal=vi.fn(); dialog.close=vi.fn();
 const photos=[{id:'a',photo:'a.jpg',userId:'first'},{id:'b',photo:'b.jpg',userId:'second'}];
 mountGallery({dialog,photos,title:'Shared dish',...options});
 return {dialog,photos,remove:dialog.querySelector('[data-gallery-remove]'),next:dialog.querySelector('[data-gallery-next]')};
}
it('reveals removal only for an owned photo, while the owner can remove either',()=>{
 const {remove,next}=setup({canRemove:p=>p.userId==='first',onRemove:vi.fn()});
 expect(remove.hidden).toBe(false); next.click(); expect(remove.hidden).toBe(true);
 const owner=setup({canRemove:()=>true,onRemove:vi.fn()}); owner.next.click(); expect(owner.remove.hidden).toBe(false);
});
it('retains the selected photo and shows a recoverable error when the server denies removal',async()=>{
 const onRemove=vi.fn(async()=>{throw new Error('Permission denied');});
 const {dialog,remove,photos}=setup({canRemove:()=>true,onRemove});
 await remove.onclick();
 expect(dialog.querySelector('[data-gallery-error]').textContent).toContain('Permission denied');
 expect(dialog.querySelector('img').getAttribute('src')).toBe('a.jpg');
 expect(photos).toHaveLength(2); expect(dialog.close).not.toHaveBeenCalled(); expect(remove.disabled).toBe(false);
});
it('zooms a photo with ctrl/trackpad wheel without leaving the gallery',()=>{
 const {dialog}=setup();
 const image=dialog.querySelector('img');
 const viewport=dialog.querySelector('.gallery-viewport');
 viewport.dispatchEvent(new WheelEvent('wheel',{bubbles:true,cancelable:true,ctrlKey:true,deltaY:-40}));
 expect(image.style.transform).toContain('scale(1.25)');
});

it('does not submit a photo removal twice while a request is pending',async()=>{
 let resolve; const onRemove=vi.fn(()=>new Promise(r=>{resolve=r;}));
 const {remove,dialog}=setup({canRemove:()=>true,onRemove});
 const request=remove.onclick(); await remove.onclick();
 expect(onRemove).toHaveBeenCalledTimes(1); expect(remove.disabled).toBe(true);
 resolve(); await request;
 expect(dialog.querySelector('[data-gallery-caption]').textContent).toContain('1 of 1');
});


it('preserves carousel position and controls through repeated mounting and photo paging',()=>{
  document.body.innerHTML=`<div class="dish-carousel"><div class="dish-photo-track"><button>One</button><button>Two</button></div><span data-photo-position></span><button data-action="dish-photo-prev">Previous</button><button data-action="dish-photo-next">Next</button></div>`;
  const track=document.querySelector('.dish-photo-track');
  Object.defineProperty(track,'clientWidth',{value:100});track.scrollLeft=100;
  track.scrollTo=({left})=>{track.scrollLeft=left;track.dispatchEvent(new Event('scroll'));};
  mountDishCarousels(document.body);mountDishCarousels(document.body);
  expect(document.querySelector('[data-photo-position]').textContent).toBe('2 / 2');
  expect(document.querySelector('[data-action="dish-photo-next"]').disabled).toBe(true);
  document.querySelector('[data-action="dish-photo-prev"]').click();
  expect(track.scrollLeft).toBe(0);
  expect(document.querySelector('[data-photo-position]').textContent).toBe('1 / 2');
  expect(document.querySelector('[data-action="dish-photo-prev"]').disabled).toBe(true);
  expect(document.querySelector('[data-action="dish-photo-next"]').disabled).toBe(false);
});
