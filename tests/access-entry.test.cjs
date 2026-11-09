const assert=require('node:assert/strict');
(async()=>{
 const {getCsrfToken,signIn,readMember,signOut,signUp,safeReturnPath}=await import('data:text/javascript;base64,'+require('node:fs').readFileSync(require.resolve('../site/assets/auth-client.js')).toString('base64'));
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
 const member={id:'synthetic-member',displayName:'Alex'};
 ok((await readMember(async()=>({...json(''),json:async()=>member}))).id===member.id,'read current session from API');
 ok(await readMember(async()=>({status:401}))===null,'expired session is anonymous');
 await assert.rejects(()=>readMember(async()=>({ok:true,status:200,headers:{get:()=> 'text/html'}})));checks++;
 let out=[];await signOut(async(url,options)=>{out.push({url,options});return out.length===1?json('csrf-out'):{ok:true,status:204};});
 ok(out[1].url==='/api/v1/auth/logout'&&out[1].options.headers['X-CSRF-TOKEN']==='csrf-out','sign-out validates CSRF');
 for(const unsafe of ['https://outside.example/','//outside.example/','javascript:alert(1)','/portal/../../other','/portal/not-a-page'])ok(safeReturnPath(unsafe)==='/portal/','reject unsafe return destination');
 ok(safeReturnPath('/portal/team?ignored=1')==='/portal/team','preserve an allowed protected destination');
 let signup=[];await signUp({email:'synthetic@example.test',password:'synthetic-only',name:'Alex'},async(url,options)=>{signup.push({url,options});return [1,3,5].includes(signup.length)?json('token-'+signup.length):{ok:true,status:signup.length===6?204:200};});
 ok(signup.length===6,'registration signs in and sets profile');
 const saved=JSON.parse(signup[5].options.body);ok(signup[5].url==='/api/v1/me'&&saved.displayName==='Alex'&&saved.healthDataConsent===true,'registration saves the agreed profile');
 let closed=0;await assert.rejects(()=>signUp({email:'synthetic@example.test',password:'synthetic-only',name:'Alex'},async()=>{closed++;return closed===1?json('csrf'):{ok:false,status:403,json:async()=>({})};}),e=>e.status===403&&e.message.includes('not open'));checks++;
 ok(closed===2,'closed registration never attempts login or profile writes');
 const cases=[{roles:[],home:'athlete',team:false,coach:false,admin:false},{roles:['Coach'],home:'coach',team:false,coach:true,admin:false},{roles:['Supervisor'],home:'team',team:true,coach:false,admin:false},{roles:['Admin'],home:'admin',team:true,coach:false,admin:true},{roles:['Coach','Supervisor'],home:'team',team:true,coach:true,admin:false}];
 for(const c of cases){const p=permissions({roles:c.roles});ok(p.home===c.home&&p.team===c.team&&p.coach===c.coach&&p.admin===c.admin,'permission-based dashboard '+c.home);}
 console.log(`PASS ${checks} shared-login and navigation permission checks`);
})().catch(e=>{console.error(e);process.exitCode=1;});
