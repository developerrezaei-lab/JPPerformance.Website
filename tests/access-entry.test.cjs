// Exercise availability checks without a browser, backend or user credentials.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
let checks=0;
async function scenario(response){
 const make=()=>({disabled:true,hidden:false,textContent:'',listeners:{},addEventListener(event,callback){this.listeners[event]=callback;}});
 const buttons=['/portal/','/portal/coach','/portal/admin'].map(target=>({...make(),dataset:{portal:target}}));
 const title=make(),status=make(),retry=make();let navigated='';
 const context={AbortSignal,document:{querySelectorAll:()=>buttons,querySelector:id=>({'#access-title':title,'#access-message':status,'#access-retry':retry}[id])},location:{assign:p=>navigated=p},fetch:async()=>{if(response instanceof Error)throw response;return response;}};
 vm.runInNewContext(fs.readFileSync('site/assets/access.js','utf8'),context);await new Promise(resolve=>setImmediate(resolve));return{buttons,title,status,retry,get navigated(){return navigated;}};
}
(async()=>{
 const ready=await scenario({ok:true,headers:{get:()=> 'application/json; charset=utf-8'},json:async()=>({token:'synthetic-csrf-token-for-unit-test'})});
 assert.ok(ready.buttons.every(b=>!b.disabled));checks++;assert.ok(ready.retry.hidden);checks++;
 for(const button of ready.buttons){button.listeners.click();assert.equal(ready.navigated,button.dataset.portal);checks++;}
 for(const response of [{ok:false},{ok:true,headers:{get:()=> 'text/html'}},{ok:true,headers:{get:()=> 'application/json'},json:async()=>({})},new Error('offline')]){
  const state=await scenario(response);assert.ok(state.buttons.every(b=>b.disabled));checks++;assert.equal(state.retry.hidden,false);checks++;state.buttons[0].listeners.click();assert.equal(state.navigated,'');checks++;
 }
 console.log(`PASS ${checks} workspace-entry availability checks`);
})().catch(e=>{console.error(e);process.exitCode=1;});
