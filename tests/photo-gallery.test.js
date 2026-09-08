import {expect,it,vi} from 'vitest';
import {galleryPhotos,commitQueuedPhoto,photoAttribution} from '../lib/photo-gallery.js';
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
