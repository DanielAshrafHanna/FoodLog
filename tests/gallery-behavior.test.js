// @vitest-environment jsdom
import {it,expect,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {mountGallery} from '../lib/photo-gallery.js';
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
it('does not submit a photo removal twice while a request is pending',async()=>{
 let resolve; const onRemove=vi.fn(()=>new Promise(r=>{resolve=r;}));
 const {remove,dialog}=setup({canRemove:()=>true,onRemove});
 const request=remove.onclick(); await remove.onclick();
 expect(onRemove).toHaveBeenCalledTimes(1); expect(remove.disabled).toBe(true);
 resolve(); await request;
 expect(dialog.querySelector('[data-gallery-caption]').textContent).toContain('1 of 1');
});
