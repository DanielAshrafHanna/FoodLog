import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
const authMock = `
window.__authCalls=[]; window.__authSession=null; window.__authApproved=false;
window.__authError=null; window.__publicPlaces=[]; window.__signupSession=false; window.__pendingWrites=[];
const session=()=>({user:{id:'signup-user',email:'new@example.com',user_metadata:{full_name:'New user',is_admin:true},app_metadata:{provider:'email'}}});
class Query {
 constructor(table){this.table=table;}
 select(){return this;} eq(){return this;} is(){return this;} in(){return this;} not(){return this;} order(){return this;} limit(){return this;}
 abortSignal(){return this;}
 insert(row){if(this.table==='pending_approvals')window.__pendingWrites.push(row);return this;}
 update(){return this;} upsert(){return this;} delete(){return this;}
 maybeSingle(){return Promise.resolve({data:this.table==='approved_users'&&window.__authApproved?{email:'new@example.com'}:null,error:null});}
 then(resolve,reject){return Promise.resolve({data:this.table==='restaurants'?window.__publicPlaces:[],error:null}).then(resolve,reject);}
}
async function authCall(method,args){
 window.__authCalls.push({method,args});
 if(window.__authDelay)await new Promise(resolve=>{window.__finishAuth=resolve;});
 if(window.__authError)return {data:{session:null},error:window.__authError};
 if(method==='signInWithPassword'||(method==='signUp'&&window.__signupSession))window.__authSession=session();
 return {data:{session:window.__authSession,user:method==='signUp'?{id:'signup-user'}:null},error:null};
}
const channel={on(){return this;},subscribe(){return this;}};
window.supabase={createClient:()=>({
 auth:{getSession:()=>Promise.resolve({data:{session:window.__authSession},error:null}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),
 signUp:args=>authCall('signUp',args),signInWithPassword:args=>authCall('signInWithPassword',args),signInWithOAuth:args=>authCall('signInWithOAuth',args),resend:args=>authCall('resend',args),signOut:()=>Promise.resolve({error:null})},
 from:table=>new Query(table),rpc:()=>Promise.resolve({data:[],error:null}),channel:()=>channel,
 storage:{from:()=>({getPublicUrl:()=>({data:{publicUrl:''}})})}
})};`;
test.beforeEach(async({page})=>{
 await page.route('**/*', route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
 await page.route('**/config.js*',route=>route.fulfill({contentType:'text/javascript',body:"window.PLATE_LOG_CONFIG={supabaseUrl:'https://auth-fixture.supabase.co',supabasePublishableKey:'fixture-key'};"}));
 await page.route('**/vendor/supabase-2.110.8.js',route=>route.fulfill({contentType:'text/javascript',body:authMock}));
 await page.goto('/');
 await expect(page.locator('#guestAccess')).toBeVisible();
});
async function emailForm(page,signup=false){
 await page.getByRole('button',{name:'Use email',exact:true}).click();
 const modal=page.locator('#authModal');
 if(signup)await modal.locator('#authSignUpMode').click();
 await modal.getByLabel('Email',{exact:true}).fill(' New@example.com ');
 await modal.getByLabel('Password',{exact:true}).fill('long-fixture-password');
 return modal;
}
test('Google is directly visible outside Settings and uses the existing OAuth callback',async({page})=>{
 await expect(page.locator('#settingsModal')).toBeHidden();
 await page.locator('#guestGoogleSignInButton').click();
 const calls=await page.evaluate(()=>window.__authCalls);
 expect(calls).toHaveLength(1);expect(calls[0].method).toBe('signInWithOAuth');
 expect(calls[0].args.provider).toBe('google');
 expect(calls[0].args.options.redirectTo).toBe('http://127.0.0.1:4173');
 await expect(page.locator('#dockAddButton')).toBeHidden();
});
test('email signup confirms without granting access and protects against duplicate submission',async({page})=>{
 const modal=await emailForm(page,true);
 await expect(modal.getByLabel('Password',{exact:true})).toHaveAttribute('autocomplete','new-password');
 await modal.getByRole('button',{name:'Show password',exact:true}).click();
 await expect(modal.getByLabel('Password',{exact:true})).toHaveAttribute('type','text');
 await page.evaluate(()=>{window.__authDelay=true;});
 await modal.locator('#authSubmitButton').click();
 await expect(modal.locator('#authSubmitButton')).toBeDisabled();
 await expect(modal.locator('#authSignInMode')).toBeDisabled();
 expect(await page.evaluate(()=>window.__authCalls.length)).toBe(1);
 await page.evaluate(()=>{window.__authDelay=false;window.__finishAuth();});
 await expect(modal.locator('#authStatus')).toContainText('Check your email');
 await expect(modal.locator('#authStatus')).toContainText('owner approval');
 await expect(modal.getByLabel('Password',{exact:true})).toHaveValue('');
 const call=await page.evaluate(()=>window.__authCalls[0]);
 expect(call.method).toBe('signUp');expect(call.args.email).toBe('new@example.com');
 expect(call.args.options.emailRedirectTo).toBe('http://127.0.0.1:4173');
 await modal.getByRole('button',{name:'Resend confirmation email',exact:true}).click();
 await expect(modal.locator('#authStatus')).toContainText('wait one minute');
 expect(await page.evaluate(()=>window.__authCalls.length)).toBe(1);
 await expect(page.locator('#dockAddButton')).toBeHidden();
});
test('email login and immediate-session signup remain read-only until owner approval',async({page})=>{
 await page.evaluate(()=>{window.__signupSession=true;});
 const modal=await emailForm(page,true);
 await modal.locator('#authSubmitButton').click();
 await expect(modal).toBeHidden();
 await expect(page.locator('#guestAccessTitle')).toHaveText('Waiting for editing approval');
 await expect(page.locator('#dockAddButton')).toBeHidden();
 await expect.poll(()=>page.evaluate(()=>window.__pendingWrites.length)).toBeGreaterThan(0);
 expect(await page.evaluate(()=>window.__pendingWrites[0].email)).toBe('new@example.com');
 await page.locator('#guestRefreshAccessButton').click();
 await expect(page.locator('#guestAccessTitle')).toHaveText('Waiting for editing approval');
 await page.evaluate(()=>{window.__authApproved=true;});
 await page.locator('#guestRefreshAccessButton').click();
 await expect(page.locator('#guestAccess')).toBeHidden();
 await expect(page.locator('#quickAddButton')).toHaveAttribute('data-requires-sign-in','false');
});
test('errors stay beside the form, preserve retry input, and resend unconfirmed signup',async({page})=>{
 const modal=await emailForm(page);
 await page.evaluate(()=>{window.__authError={code:'invalid_credentials',message:'Invalid login credentials'};});
 await modal.locator('#authSubmitButton').click();
 await expect(modal.getByRole('alert')).toContainText('Email or password is incorrect');
 await expect(modal.getByLabel('Email',{exact:true})).toHaveValue('New@example.com');
 await expect(modal.locator('#authSubmitButton')).toBeEnabled();
 await page.evaluate(()=>{window.__authError={code:'email_not_confirmed',message:'Email not confirmed'};});
 await modal.locator('#authSubmitButton').click();
 await expect(modal.getByRole('alert')).toContainText('Confirm your email');
 await page.evaluate(()=>{window.__authError=null;});
 await modal.getByRole('button',{name:'Resend confirmation email',exact:true}).click();
 await expect(modal.locator('#authStatus')).toContainText('a new link is on its way');
 expect(await page.evaluate(()=>window.__authCalls.at(-1).method)).toBe('resend');
 await modal.locator('#authSubmitButton').click();
 await expect(modal).toBeHidden();
 await expect(page.locator('#guestAccessTitle')).toHaveText('Waiting for editing approval');
});
test('failed Google opens a clear retry dialog and email signup works at 320px in both themes',async({page})=>{
 await page.evaluate(()=>{window.__authError={message:'Google temporarily unavailable'};});
 await page.locator('#guestGoogleSignInButton').click();
 const modal=page.locator('#authModal');
 await expect(modal).toBeVisible();
 await expect(modal.getByRole('alert')).toContainText('Google temporarily unavailable');
 await page.setViewportSize({width:320,height:720});
 await modal.locator('#authSignUpMode').click();
 const axe=await readFile(new URL('../node_modules/axe-core/axe.min.js',import.meta.url),'utf8');
 await page.addScriptTag({content:axe});
 for(const theme of ['light','dark']){
  await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);
  const violations=await page.evaluate(async()=> (await window.axe.run(document.querySelector('#authModal'))).violations.filter(v=>['critical','serious'].includes(v.impact)).map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})));
  expect(violations).toEqual([]);
  const bounds=await modal.boundingBox();expect(bounds.x).toBeGreaterThanOrEqual(0);expect(bounds.x+bounds.width).toBeLessThanOrEqual(320);
 }
 await modal.getByRole('button',{name:'Close sign in',exact:true}).click();
 await expect(page.locator('#guestGoogleSignInButton')).toBeFocused();
});

test('mobile restaurant details keep Google sign-in visible and callbacks show a useful error',async({page},testInfo)=>{
 test.skip(testInfo.project.name !== 'mobile-chromium','Phone detail access.');
 await page.evaluate(()=>{window.__publicPlaces=[{id:'public-place',name:'Public table',location:'Maadi',cuisine:'Egyptian',dishes:[],restaurant_ratings:[],restaurant_photos:[]}];});
 await page.getByRole('button',{name:'Open account menu',exact:true}).click();
 await page.getByRole('menuitem',{name:'Refresh log',exact:true}).click();
 await page.locator('.restaurant-row').click();
 const google=page.locator('#detailPanel').getByRole('button',{name:'Continue with Google',exact:true});
 await expect(google).toBeVisible();
 await google.click();
 expect(await page.evaluate(()=>window.__authCalls.at(-1).method)).toBe('signInWithOAuth');
 await page.goto('/?error=access_denied&error_description=Sign-in+cancelled');
 await expect(page.locator('#authModal')).toBeVisible();
 await expect(page.locator('#authModal').getByRole('alert')).toContainText('Sign-in cancelled');
 expect(new URL(page.url()).searchParams.has('error')).toBe(false);
});
