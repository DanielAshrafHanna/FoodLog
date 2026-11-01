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
 return {dialog,photos,remove:dialog.querySelector('[data-gallery-remove]'),confirm:dialog.querySelector('[data-gallery-confirm-remove]'),next:dialog.querySelector('[data-gallery-next]')};
}
it('asks before moving a photo to Trash and keeps it when the person cancels',()=>{
 const onRemove=vi.fn();
 const {dialog,remove,photos}=setup({canRemove:()=>true,onRemove});
 const panel=dialog.querySelector('[data-gallery-confirm]');
 expect(panel.hidden).toBe(true);
 remove.onclick();
 expect(panel.hidden).toBe(false); expect(dialog.querySelector('[data-gallery-actions]').hidden).toBe(true);
 dialog.querySelector('[data-gallery-confirm-cancel]').onclick();
 expect(panel.hidden).toBe(true); expect(onRemove).not.toHaveBeenCalled(); expect(photos).toHaveLength(2);
});
it('labels one main-photo control the same way for dishes and restaurants',()=>{
 const {dialog,next}=setup({coverId:'a',onCover:vi.fn()});
 const cover=dialog.querySelector('[data-gallery-cover]');
 expect(cover.getAttribute('aria-label')).toBe('Main photo'); expect(cover.disabled).toBe(true);
 next.click();
 expect(cover.getAttribute('aria-label')).toBe('Set as main photo'); expect(cover.disabled).toBe(false);
});
it('registers one ctrl-wheel zoom handler no matter how often the viewer opens',()=>{
 const add=vi.spyOn(EventTarget.prototype,'addEventListener');
 setup(); setup();
 expect(add.mock.calls.filter(([type])=>type==='wheel')).toHaveLength(0);
 add.mockRestore();
});
it('reveals removal only for an owned photo, while the owner can remove either',()=>{
 const {remove,next}=setup({canRemove:p=>p.userId==='first',onRemove:vi.fn()});
 expect(remove.hidden).toBe(false); next.click(); expect(remove.hidden).toBe(true);
 const owner=setup({canRemove:()=>true,onRemove:vi.fn()}); owner.next.click(); expect(owner.remove.hidden).toBe(false);
});
it('retains the selected photo and shows a recoverable error when the server denies removal',async()=>{
 const onRemove=vi.fn(async()=>{throw new Error('Permission denied');});
 const {dialog,remove,confirm,photos}=setup({canRemove:()=>true,onRemove});
 remove.onclick(); await confirm.onclick();
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
 const {remove,confirm,dialog}=setup({canRemove:()=>true,onRemove});
 remove.onclick();
 const request=confirm.onclick(); await confirm.onclick();
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

it('shows a per-photo handoff action and closes before running it',()=>{
 const run=vi.fn(), onClose=vi.fn();
 const {dialog,next}=setup({extraAction:p=>p.id==='a'?{label:'Make it a dish',icon:'M3 17h18',run}:null,onClose});
 const extra=dialog.querySelector('[data-gallery-extra]');
 expect(extra.hidden).toBe(false); expect(extra.textContent).toContain('Make it a dish');
 next.click(); expect(extra.hidden).toBe(true);
 dialog.querySelector('[data-gallery-prev]').click();
 dialog.close=vi.fn(()=>dialog.onclose());
 extra.onclick();
 expect(dialog.close).toHaveBeenCalled(); expect(run).toHaveBeenCalledWith(expect.objectContaining({id:'a'}));
 expect(onClose).toHaveBeenCalledWith({handedOff:true});
});
it('limits the main-photo control to photos that allow it',()=>{
 const {dialog,next}=setup({onCover:vi.fn(),canCover:p=>p.id==='a'});
 const cover=dialog.querySelector('[data-gallery-cover]');
 expect(cover.hidden).toBe(false); next.click(); expect(cover.hidden).toBe(true);
 expect(dialog.querySelector('[data-gallery-actions]').hidden).toBe(true);
});
it('adds the dish name to the caption when a photo carries one',()=>{
 document.body.innerHTML=readFileSync('index.html','utf8');
 const viewer=document.querySelector('#sharedGallery');
 viewer.showModal=vi.fn(); viewer.close=vi.fn();
 mountGallery({dialog:viewer,photos:[{id:'k',photo:'k.jpg',galleryLabel:'Garden salad bowl',contributorName:'Anna'}],title:'Place'});
 expect(viewer.querySelector('[data-gallery-caption]').textContent).toBe('1 of 1 · Garden salad bowl · Photo by Anna');
});

it('updates dish context with each photo, renders authored text safely and clears old disclosures',()=>{
 const context={name:'<img src=x onerror=alert(1)>',average:'4.5',reviews:[{name:'<b>Sam</b>',score:'4.5',notes:'Full review <script>alert(1)</script>'}]};
 const {dialog,next}=setup({getContext:p=>p.id==='b'?context:null});
 const region=dialog.querySelector('[data-gallery-context]');
 expect(region.hidden).toBe(true);
 next.click();
 expect(region.hidden).toBe(false);
 expect(region.querySelector('h3').textContent).toBe(context.name);
 expect(region.querySelector('img,script,b')).toBeNull();
 expect(region.querySelector('.gallery-review-author').textContent).toContain('<b>Sam</b>');
 region.querySelector('details').open=true;
 next.click();expect(region.hidden).toBe(true);expect(region.children).toHaveLength(0);
 next.click();expect(region.querySelector('details').open).toBe(false);
 dialog.onclose();expect(region.hidden).toBe(true);
});
it('shows score-only context without inventing review text or an empty disclosure',()=>{
 const {dialog}=setup({getContext:()=>({name:'Soup',average:'3',reviews:[{name:'Jo',score:'3',notes:''}]})});
 const region=dialog.querySelector('[data-gallery-context]');
 expect(region.textContent).toContain('3 / 5');expect(region.textContent).toContain('1 rating');
 expect(region.querySelector('.gallery-review-prose,details')).toBeNull();
});
it('replaces dish context after photo removal with the surviving photo context',async()=>{
 const {dialog,remove,confirm}=setup({canRemove:()=>true,onRemove:vi.fn(),getContext:p=>({name:p.id,average:'4',reviews:[{name:'Sam',score:'4',notes:''}]})});
 remove.click();await confirm.onclick();
 expect(dialog.querySelector('#galleryDishTitle').textContent).toBe('b');
 expect(dialog.querySelector('[data-gallery-caption]').textContent).toContain('1 of 1');
});

it('keeps dish navigation outside the command row and returns conversions to that row',()=>{
 const run=vi.fn();
 const {dialog,next}=setup({extraAction:p=>p.id==='a'?{label:'View dish',kind:'navigation',run}:{label:'Make it a dish',run}});
 const extra=dialog.querySelector('[data-gallery-extra]'),nav=dialog.querySelector('[data-gallery-navigation]'),actions=dialog.querySelector('[data-gallery-actions]');
 expect(extra.parentElement).toBe(nav);expect(nav.hidden).toBe(false);expect(actions.hidden).toBe(true);
 next.click();expect(nav.hidden).toBe(true);expect(extra.parentElement).toBe(actions);expect(actions.hidden).toBe(false);
 next.click();expect(extra.parentElement).toBe(nav);expect(actions.hidden).toBe(true);
 extra.click();expect(dialog.close).toHaveBeenCalled();expect(run).toHaveBeenCalledTimes(1);
});
it('hides navigation during Trash confirmation and restores it on cancellation or failure',async()=>{
 const {dialog,remove,confirm}=setup({extraAction:()=>({label:'View dish',kind:'navigation',run:vi.fn()}),canRemove:()=>true,onRemove:vi.fn(async()=>{throw new Error('Try again');})});
 const nav=dialog.querySelector('[data-gallery-navigation]');
 remove.click();expect(nav.hidden).toBe(true);
 dialog.querySelector('[data-gallery-confirm-cancel]').click();expect(nav.hidden).toBe(false);
 remove.click();await confirm.onclick();expect(nav.hidden).toBe(false);expect(dialog.querySelector('[data-gallery-actions]').hidden).toBe(false);
 expect(dialog.querySelector('[data-gallery-error]').textContent).toContain('Try again');
});
