import { describe, expect, it } from 'vitest';
import { activeDishLikes, applyDishLike, importedDishLikeNames, likeInitials } from '../lib/dish-likes.js';
import { restaurantDetailFingerprint } from '../lib/render-list.js';
describe('account dish likes', () => {
  it('identifies people by account rather than matching display names', () => {
    const dish = { likedBy: ['Mina'], likes: [{userId:'a',name:'Mina'},{userId:'b',name:'Mina'},{userId:'a',name:'Duplicate'},{userId:'c',liked:false}] };
    expect(activeDishLikes(dish).map(like=>like.userId)).toEqual(['a','b']);
    applyDishLike(dish,'a','Mina',false);
    expect(activeDishLikes(dish).map(like=>like.userId)).toEqual(['b']);
    expect(dish.likedBy).toEqual(['Mina']);
  });
  it('repeated like does not multiply votes or touch reviews/photos', () => {
    const dish = {ratings:[{email:'friend',rating:5}],photos:[{id:'image'}],likedBy:['Earlier friend']};
    applyDishLike(dish,'me','You',true);applyDishLike(dish,'me','You',true);
    expect(activeDishLikes(dish)).toHaveLength(1);
    expect(dish.ratings).toEqual([{email:'friend',rating:5}]);expect(dish.photos).toEqual([{id:'image'}]);
    const place={dishes:[dish]};const before=restaurantDetailFingerprint(place);
    applyDishLike(dish,'me','You',false);expect(restaurantDetailFingerprint(place)).not.toBe(before);
  });
  it('uses real initials without breaking Unicode or one-word names', () => {
    expect(likeInitials('Daniel Hanna')).toBe('DH');expect(likeInitials('Mina')).toBe('M');expect(likeInitials('منى حنا')).toBe('مح');
  });
  it('retains backed-up likes as historical names without claiming account identity', () => {
    const dish={likedBy:['Earlier friend'],likes:[{userId:'a',name:'Mina'},{userId:'b',name:'Earlier friend'}]};
    expect(importedDishLikeNames(dish)).toEqual(['Earlier friend','Mina']);
    expect(dish.likes).toHaveLength(2);
  });
});
