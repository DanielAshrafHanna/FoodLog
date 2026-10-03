import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

async function mockCatalogCloud(page, email = 'danielhanna0001@gmail.com') {
  await page.route('**/config.js*', route => route.fulfill({ contentType: 'text/javascript', body: "window.PLATE_LOG_CONFIG={supabaseUrl:'https://foodlog-test.supabase.co',supabasePublishableKey:'test-key'};" }));
  await page.route('**/vendor/supabase-2.110.8.js', route => route.fulfill({ contentType: 'text/javascript', body: `
    const session = { user: { id: 'fixture-owner', email: ${JSON.stringify(email)}, user_metadata: {full_name:'Fixture Owner'}, app_metadata:{provider:'google'}, identities:[{provider:'google'}] } };
    window.__lookupRows = [
      {id:'fixture-cairo', kind:'location', name:'New Cairo', aliases:['tagamo3','New cauro'], usageCount:10, retired:false},
      {id:'fixture-maadi', kind:'location', name:'Maadi', aliases:[], usageCount:12, retired:false},
      {id:'fixture-chinese', kind:'cuisine', name:'Chinese', aliases:[], usageCount:5, retired:false}
    ];
    window.__lookupWrites=[];
    window.__lookupFailure=false;
    class Query {
      constructor(table) {this.table=table;}
      select(){return this;} eq(){return this;} is(){return this;} in(){return this;} not(){return this;} order(){return this;} limit(){return this;} insert(){return this;} update(){return this;} upsert(){return this;} delete(){return this;} abortSignal(){return this;}
      maybeSingle(){return Promise.resolve({data:this.table==='approved_users'?{email:session.user.email}:null,error:null});}
      then(resolve,reject){return Promise.resolve({data:[],error:null}).then(resolve,reject);}
    }
    const channel={on(){return this;},subscribe(){return this;}};
    window.supabase={createClient:()=>({
      auth:{getSession:()=>Promise.resolve({data:{session},error:null}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),signOut:()=>Promise.resolve({error:null})},
      from:table=>new Query(table),channel:()=>channel,
      rpc:(name,args)=>{
        if(name==='foodlog_lookup_catalog'||name==='foodlog_admin_lookup_catalog') return Promise.resolve({data:structuredClone(window.__lookupRows),error:null});
        if(name==='foodlog_manage_lookup') {
          window.__lookupWrites.push(args);
          if(window.__lookupFailure) return Promise.resolve({data:null,error:{message:'Could not save. Retry when connected.'}});
          const row=window.__lookupRows.find(r=>r.id===args.p_id);
          if(args.p_action==='rename'){row.aliases.push(row.name);row.name=args.p_name;}
          else row.retired=args.p_action==='delete';
          return Promise.resolve({data:{id:row.id},error:null});
        }
        return Promise.resolve({data:[],error:null});
      },storage:{from:()=>({getPublicUrl:()=>({data:{publicUrl:''}})})}
    })};
  ` }));
  await page.route('https://foodlog-test.supabase.co/**', route => route.abort());
  await page.goto('/');
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.reload();
  await expect(page.locator('#accountMenuButton')).toBeVisible();
  await page.getByRole('button', {name:'Open account menu',exact:true}).click();
  await page.getByRole('menuitem', {name:'Open settings',exact:true}).click();
}

test('owner can review usage, rename, delete safely, restore, and manage cuisines', async ({page}, testInfo) => {
  await mockCatalogCloud(page);
  const panel=page.locator('#lookupManagement');
  await expect(panel).toBeVisible();
  const row=panel.locator('.admin-lookup-row').filter({hasText:'New Cairo'});
  await expect(row).toContainText('10 restaurants');
  await row.getByRole('button',{name:'Edit',exact:true}).click();
  await panel.locator('#adminLookupName').fill('New Cairo · Cairo');
  await panel.getByRole('button',{name:'Save name',exact:true}).click();
  await expect(row).toContainText('New Cairo · Cairo');
  await row.getByRole('button',{name:'Delete',exact:true}).click();
  await expect(panel.locator('#adminLookupDeleteNote')).toContainText('10 restaurants will keep their saved labels');
  await panel.getByRole('button',{name:'Keep entry',exact:true}).click();
  expect(await page.evaluate(()=>window.__lookupWrites.length)).toBe(1);
  await row.getByRole('button',{name:'Delete',exact:true}).click();
  await panel.getByRole('button',{name:'Delete from suggestions',exact:true}).click();
  await expect(row).toContainText('Deleted from suggestions');
  await row.getByRole('button',{name:'Restore',exact:true}).click();
  await expect(row.getByRole('button',{name:'Edit',exact:true})).toBeVisible();
  await panel.locator('#adminLookupKind').selectOption('cuisine');
  await expect(panel.locator('.admin-lookup-row')).toHaveCount(1);
  await panel.getByRole('button',{name:'Edit',exact:true}).click();
  await panel.locator('#adminLookupName').fill('Chinese cuisine');
  await page.screenshot({path:`/private/tmp/foodlog-admin-${testInfo.project.name}.png`});
  expect(await panel.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
  await panel.getByRole('button',{name:'Save name',exact:true}).click();
  await expect(panel.locator('.admin-lookup-row')).toContainText('Chinese cuisine');
  expect(await page.evaluate(()=>window.__lookupWrites.map(x=>x.p_action))).toEqual(['rename','delete','restore','rename']);
});

test('failed catalog save retains editing and ordinary editors cannot see management', async ({page}) => {
  await mockCatalogCloud(page);
  const panel=page.locator('#lookupManagement');
  await panel.locator('.admin-lookup-row').filter({hasText:'Maadi'}).getByRole('button',{name:'Edit',exact:true}).click();
  await panel.locator('#adminLookupName').fill('Maadi Cairo');
  await page.evaluate(()=>window.__lookupFailure=true);
  await panel.getByRole('button',{name:'Save name',exact:true}).click();
  await expect(panel.locator('#adminLookupStatus')).toContainText('Could not save');
  await expect(panel.locator('#adminLookupName')).toHaveValue('Maadi Cairo');
  await expect(panel.getByRole('button',{name:'Save name',exact:true})).toBeEnabled();
  await page.locator('#closeSettingsModal').click();
  await page.unrouteAll({behavior:'wait'});
  await mockCatalogCloud(page, 'editor@example.com');
  await expect(page.locator('#lookupManagement')).toBeHidden();
});


for (const theme of ['light', 'dark']) test(`${theme} owner catalog actions fit at 320px with readable contrast`, async ({page}) => {
  await mockCatalogCloud(page);
  await page.locator('#closeSettingsModal').click();
  await page.evaluate(theme => localStorage.setItem('plate-log-theme', theme), theme);
  await page.setViewportSize({width:320,height:740});
  await page.reload();
  await page.getByRole('button',{name:'Open account menu',exact:true}).click();
  await page.getByRole('menuitem',{name:'Open settings',exact:true}).click();
  const panel=page.locator('#lookupManagement');
  await expect(panel.locator('.admin-lookup-row')).toHaveCount(2);
  await panel.locator('.admin-lookup-row').filter({hasText:'Maadi'}).getByRole('button',{name:'Edit',exact:true}).click();
  const save=panel.getByRole('button',{name:'Save name',exact:true});
  const box=await save.boundingBox();
  expect(box.width).toBeGreaterThanOrEqual(44); expect(box.height).toBeGreaterThanOrEqual(44);
  expect(await panel.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
  await page.addScriptTag({content:await readFile('node_modules/axe-core/axe.min.js','utf8')});
  expect(await page.evaluate(async()=> (await window.axe.run(document.querySelector('#lookupManagement'),{runOnly:{type:'rule',values:['color-contrast']}})).violations)).toEqual([]);
});
