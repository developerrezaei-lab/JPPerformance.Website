// پیام‌ها فقط متن هستند؛ هیچ محتوای HTML سرور در toast اجرا نمی‌شود.
const kinds={error:['Error','!'],success:['Success','✓'],info:['Information','i'],warning:['Please check','!']};
let host,installed=false;
export function notify(message,type='info'){
 if(typeof document==='undefined'||!message)return;
 type=kinds[type]?type:'info';
 if(!host||!host.isConnected){host=document.createElement('section');host.className='toast-stack';host.setAttribute('aria-label','Notifications');document.body.append(host);}
 if([...host.children].some(n=>n.dataset.message===message))return;
 while(host.children.length>=4)host.firstElementChild.remove();
 const node=document.createElement('div');node.className='jp-toast toast-'+type;node.dataset.message=message;node.setAttribute('role',type==='error'?'alert':'status');
 const icon=document.createElement('span');icon.className='toast-icon';icon.textContent=kinds[type][1];icon.setAttribute('aria-hidden','true');
 const content=document.createElement('div'),title=document.createElement('strong'),text=document.createElement('p'),close=document.createElement('button');
 title.textContent=kinds[type][0];text.textContent=message;close.type='button';close.textContent='×';close.setAttribute('aria-label','Dismiss notification');
 content.append(title,text);node.append(icon,content,close);host.append(node);
 let timer;const stop=()=>clearTimeout(timer),start=()=>{stop();if(type!=='error')timer=setTimeout(()=>node.remove(),type==='warning'?10000:6500);};
 close.addEventListener('click',()=>{stop();node.remove();});node.addEventListener('mouseenter',stop);node.addEventListener('mouseleave',start);node.addEventListener('focusin',stop);node.addEventListener('focusout',start);start();
}
export function installFeedback(){
 if(installed||typeof document==='undefined')return;installed=true;
 document.addEventListener('jp:feedback',e=>notify(e.detail?.message,e.detail?.type));
 let pending=false;
 document.addEventListener('invalid',event=>{
  event.preventDefault();const input=event.target;input.setAttribute('aria-invalid','true');
  if(pending)return;pending=true;
  const label=input.labels?.[0]?.textContent?.split('\n')[0]?.trim()||'This field';
  notify(label+': '+input.validationMessage,'warning');input.focus();queueMicrotask(()=>{pending=false;});
 },true);
 document.addEventListener('input',event=>{if(event.target.validity?.valid)event.target.removeAttribute('aria-invalid');});
 try{const message=sessionStorage.getItem('jp:notice');sessionStorage.removeItem('jp:notice');if(message)notify(message,'success');}catch{}
}
export function queueNotice(message){try{sessionStorage.setItem('jp:notice',message);}catch{}}
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installFeedback,{once:true});else installFeedback();}
