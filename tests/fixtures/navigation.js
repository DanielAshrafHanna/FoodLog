import { expect } from '@playwright/test';

const photo = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="640" height="480"%3E%3Crect width="640" height="480" fill="%23a78c76"/%3E%3C/svg%3E';
export const rows = ['A', 'B'].map((name, index) => ({
  id: `place-${name}`, name: `Place ${name}`, location: 'Maadi', cuisine: 'Egyptian',
  price: '$$', playlists: ['Dinner'], visited: [], maps: `https://www.google.com/maps?q=${30 + index / 10},31.2`,
  restaurant_ratings: [], restaurant_photos: [], updated_at: `2026-10-13T10:0${index}:00Z`,
  dishes: Array.from({ length: 4 }, (_, i) => ({
    id: `${name}-dish-${i}`, name: `Dish ${name} ${i}`, updated_at: '2026-10-13T10:00:00Z',
    dish_photos: [1, 2].map(n => ({ id: `${name}-${i}-photo-${n}`, photo_path: `fixture/${name}/${i}/${n}.jpg`, created_at: `2026-10-13T10:00:0${n}Z` })),
    dish_ratings: [], liked_by: []
  }))
}));

export async function boot(page, url = '/', { count = 2, fixture = rows } = {}) {
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.hostname !== '127.0.0.1') return route.abort();
    if (url.pathname === '/config.js') return route.fulfill({ contentType: 'text/javascript', body: "window.PLATE_LOG_CONFIG={supabaseUrl:'https://navigation-fixture.supabase.co',supabasePublishableKey:'fixture-key'};" });
    if (url.pathname === '/vendor/supabase-2.110.8.js') return route.fulfill({ contentType: 'text/javascript', body: `
      window.__rows=${JSON.stringify(fixture)}; window.__reads=0; const listeners=new Map();
      window.__emit=(table,id)=>listeners.get(table)?.({eventType:'UPDATE',new:{id,restaurant_id:id},old:{id,restaurant_id:id}});
      class Query {
        constructor(table){this.table=table;}
        select(){return this;} eq(){return this;} is(){return this;} not(){return this;} order(){return this;} limit(){return this;} abortSignal(){return this;}
        in(column,ids){if(column==='id') this.ids=ids; return this;}
        maybeSingle(){return Promise.resolve({data:null,error:null});}
        then(resolve,reject){
          if(this.table==='restaurants') window.__reads++;
          const data=this.table==='restaurants'?window.__rows.filter(row=>!this.ids||this.ids.includes(row.id)):[];
          return Promise.resolve({data:structuredClone(data),error:null}).then(resolve,reject);
        }
      }
      const channel={on(type,filter,callback){listeners.set(filter.table,callback);return this;},subscribe(){return this;}};
      window.supabase={createClient:()=>({
        auth:{getSession:async()=>({data:{session:null},error:null}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},
        from:table=>new Query(table),rpc:async()=>({data:[],error:null}),channel:()=>channel,
        storage:{from:()=>({getPublicUrl:path=>({data:{publicUrl:path?${JSON.stringify(photo)}:''}})})}
      })};
    ` });
    return route.fallback();
  });
  await page.goto(url);
  await expect(page.locator('.restaurant-row')).toHaveCount(count);
}

export async function openA(page) {
  await page.locator('.restaurant-row[data-id="place-A"]').click();
  await expect(page.locator('#detailPanel')).toHaveAttribute('data-restaurant-id', 'place-A');
  await settled(page);
}
export async function settled(page) {
  await expect.poll(() => page.locator('#detailPanel').evaluate(el => {
    const transform = getComputedStyle(el).transform;
    return Math.abs(transform === 'none' ? 0 : new DOMMatrixReadOnly(transform).m41) < 1
      && !document.documentElement.classList.contains('is-detail-swipe-settling');
  })).toBe(true);
}
export async function changeA(page, change, table = 'restaurants') {
  const reads = await page.evaluate(() => window.__reads);
  await page.evaluate(({ change, table }) => {
    Object.assign(window.__rows[0], change); window.__emit(table, 'place-A');
  }, { change, table });
  await expect.poll(() => page.evaluate(() => window.__reads)).toBeGreaterThan(reads);
}

