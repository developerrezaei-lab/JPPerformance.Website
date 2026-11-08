const assert=require('node:assert/strict');
(async()=>{
 const {getCsrfToken,signIn}=await import('data:text/javascript;base64,'+require('node:fs').readFileSync(require.resolve('../site/assets/auth-client.js')).toString('base64'));
 const {permissions}=await import('data:text/javascript;base64,'+require('node:fs').readFileSync(require.resolve('../platform/Portal/src/permissions.js')).toString('base64'));
 let checks=0;const ok=(v,m)=>{assert.ok(v,m);checks++;};
 const json=token=>({ok:true,status:200,headers:{get:()=> 'application/json'},json:async()=>({token})});
 let calls=[];const transport=async(url,options)=>{calls.push({url,options});return calls.length===2?{ok:true,status:200}:json(calls.length===1?'before-auth':'after-auth');};
 ok(await signIn('synthetic@example.test','synthetic-unit-password',transport)==='after-auth','refresh CSRF after sign-in');
 ok(calls.length===3,'three requests in secure order');
 ok(calls.every(x=>x.options.credentials==='same-origin'),'cookies remain same origin');
 ok(calls[1].options.headers['X-CSRF-TOKEN']==='before-auth','submit pre-auth CSRF token');
 ok(calls[1].url==='/api/v1/auth/login?useCookies=true','one login endpoint for every role');
 ok(!('roles' in JSON.parse(calls[1].options.body)),'sign-in never accepts a chosen role');
 for(const response of [{ok:false,status:500},{ok:false,status:404},{ok:true,status:200,headers:{get:()=> 'text/html'}},json('')]){
  let count=0;await assert.rejects(()=>signIn('synthetic@example.test','synthetic',async()=>{count++;return response;}));checks++;
  ok(count===1,'do not transmit credentials when CSRF bootstrap fails');
 }
 let count=0;await assert.rejects(()=>signIn('synthetic@example.test','synthetic',async()=>{count++;return count===1?json('csrf'):{ok:false,status:401};}),e=>e.status===401&&e.message.includes('incorrect'));checks++;
 await assert.rejects(()=>getCsrfToken(async()=>{throw new TypeError('network down');}),e=>e.status===0);checks++;
 const cases=[{roles:[],home:'athlete',team:false,coach:false,admin:false},{roles:['Coach'],home:'coach',team:false,coach:true,admin:false},{roles:['Supervisor'],home:'team',team:true,coach:false,admin:false},{roles:['Admin'],home:'admin',team:true,coach:false,admin:true},{roles:['Coach','Supervisor'],home:'team',team:true,coach:true,admin:false}];
 for(const c of cases){const p=permissions({roles:c.roles});ok(p.home===c.home&&p.team===c.team&&p.coach===c.coach&&p.admin===c.admin,'permission-based dashboard '+c.home);}
 console.log(`PASS ${checks} shared-login and navigation permission checks`);
})().catch(e=>{console.error(e);process.exitCode=1;});
