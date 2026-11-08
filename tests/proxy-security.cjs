const {spawn}=require('node:child_process'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),net=require('node:net'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),api=path.join(root,'platform/Api'),dotnet=process.env.JP_DOTNET||'dotnet',dll=path.join(api,'bin/Debug/net10.0/Api.dll');
let checks=0;
async function run(host){const temp=fs.mkdtempSync(path.join(os.tmpdir(),'jp-proxy-test-'));const socket=net.createServer();await new Promise(r=>socket.listen(0,'127.0.0.1',r));const port=socket.address().port;await new Promise(r=>socket.close(r));const base='http://127.0.0.1:'+port;const child=spawn(dotnet,[dll],{cwd:api,env:{...process.env,ASPNETCORE_ENVIRONMENT:'Testing',ASPNETCORE_URLS:base,Database__UseSqlite:'true',ConnectionStrings__Database:'Data Source='+path.join(temp,'test.db'),DataProtection__Path:path.join(temp,'keys'),Security__RequireSecureCookies:'true',Proxy__TrustedProxyHost:host,Logging__LogLevel__Default:'Warning'},stdio:['ignore','pipe','pipe']});let logs='';child.stdout.on('data',d=>logs+=d);child.stderr.on('data',d=>logs+=d);
try{let ready=false;for(let i=0;i<100;i++){try{if((await fetch(base+'/healthz')).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}assert.ok(ready,logs);
 const direct=await fetch(base+'/api/v1/auth/csrf');assert.equal(direct.status,400,'direct insecure API access is rejected, not a 500');checks++;
 const forwarded=await fetch(base+'/api/v1/auth/csrf',{headers:{'X-Forwarded-Proto':'https'}});
 if(host==='localhost'){assert.equal(forwarded.status,200,'trusted gateway HTTPS reaches CSRF successfully');checks++;assert.ok(forwarded.headers.getSetCookie().some(c=>/;\s*secure/i.test(c)),'HTTPS cookie stays Secure');checks++;const token=(await forwarded.json()).token;assert.ok(token,'CSRF token issued');checks++;
 const cookie=forwarded.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');
 const headers={'Content-Type':'application/json','X-CSRF-TOKEN':token,'X-Forwarded-Proto':'https',Cookie:cookie};
 const credentials={email:'proxy@example.test',password:'SyntheticProxy!12345'};
 const register=await fetch(base+'/api/v1/auth/register',{method:'POST',headers,body:JSON.stringify(credentials)});assert.equal(register.status,200,'registration uses trusted HTTPS context');checks++;
 const login=await fetch(base+'/api/v1/auth/login?useCookies=true',{method:'POST',headers,body:JSON.stringify(credentials)});assert.equal(login.status,200,'cookie login behind gateway succeeds');checks++;
 assert.ok(login.headers.getSetCookie().some(c=>c.startsWith('jp.member=')&&/;\s*secure/i.test(c)),'member cookie remains Secure');checks++;
 const authenticated=await fetch(base+'/api/v1/me',{headers:{'X-Forwarded-Proto':'https',Cookie:[cookie,...login.headers.getSetCookie().map(c=>c.split(';')[0])].join('; ')}});assert.equal(authenticated.status,200,'same cookie accesses signed-in account');checks++;}
 else{assert.equal(forwarded.status,400,'untrusted connection cannot forge HTTPS');checks++;}
 const malformed=await fetch(base+'/api/v1/auth/csrf',{headers:{'X-Forwarded-Proto':'https,http'}});assert.equal(malformed.status,400,'ambiguous proto header is rejected');checks++;
}finally{if(child.exitCode===null){child.kill('SIGTERM');await new Promise(r=>child.once('exit',r));}fs.rmSync(temp,{recursive:true,force:true});}}
(async()=>{await run('localhost');await run('192.0.2.1');console.log(`PASS ${checks} trusted-proxy and secure-cookie HTTP checks`);})().catch(e=>{console.error(e);process.exitCode=1;});
