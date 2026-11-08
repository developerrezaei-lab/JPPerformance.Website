'use strict';
const menu = document.querySelector('.menu');
const nav = document.querySelector('#navigation');
menu?.addEventListener('click', () => {
  const open = menu.getAttribute('aria-expanded') !== 'true';
  menu.setAttribute('aria-expanded', String(open));
  nav.classList.toggle('open', open);
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && menu?.getAttribute('aria-expanded') === 'true') {
    menu.setAttribute('aria-expanded','false'); nav.classList.remove('open'); menu.focus();
  }
});
for (const a of nav?.querySelectorAll('a') || []) {
  if (new URL(a.href).pathname === location.pathname) a.setAttribute('aria-current','page');
}
const filters = document.querySelectorAll('[data-filter]');
function filterProjects(value) {
  let shown = 0;
  for (const b of filters) {
    const active = b.dataset.filter === value;
    b.classList.toggle('selected',active); b.setAttribute('aria-pressed',String(active));
  }
  for (const row of document.querySelectorAll('[data-category]')) {
    row.hidden = value !== 'all' && row.dataset.category !== value;
    if (!row.hidden) shown++;
  }
  const status=document.querySelector('#filter-status');
  if(status) status.textContent = shown + (shown === 1 ? ' project shown.' : ' projects shown.');
}
for (const b of filters) b.addEventListener('click',()=>filterProjects(b.dataset.filter));
if(filters.length && ['#play','#utilities'].includes(location.hash)) filterProjects(location.hash.slice(1));
const contact = document.querySelector('#contact-form');
if(contact) {
  const topic = new URLSearchParams(location.search).get('topic');
  if([...contact.topic.options].some(x=>x.value===topic)) contact.topic.value=topic;
  contact.addEventListener('submit', e => {
    e.preventDefault();
    const f = new FormData(contact);
    const body = 'Name: '+f.get('name')+'\nReply email: '+f.get('email')+'\n\n'+f.get('message');
    const target = 'mailto:info@jpperformance.co.uk?subject='+encodeURIComponent('[Website] '+f.get('topic'))+'&body='+encodeURIComponent(body);
    location.href = target;
    document.querySelector('#contact-status').textContent='Your email app should open with a draft. Review it and press Send there. If it does not open, email info@jpperformance.co.uk directly.';
  });
}
// اطلاعات نمونه فقط در مرورگر نگهداری می‌شوند و به سرور ارسال نمی‌شوند.
if(document.querySelector('#set-form')) {
  const key='jp-fit-concept-v1';
  let state={sets:[], end:null};
  let storageAvailable = true;
  try {
    const saved=JSON.parse(localStorage.getItem(key)||'null');
    if(saved && Array.isArray(saved.sets)) state={sets:saved.sets.filter(x=>x && typeof x.name==='string' && Number.isInteger(x.reps) && x.reps>=1 && x.reps<=200 && Number.isFinite(x.weight) && x.weight>=0 && x.weight<=500).slice(0,200),end:Number.isFinite(saved.end)?saved.end:null};
  } catch { storageAvailable=false; }
  const status=document.querySelector('#demo-status');
  function persist() {
    try {localStorage.setItem(key,JSON.stringify(state));}
    catch {storageAvailable=false;}
    if(!storageAvailable) document.querySelector('#storage-notice').textContent='Browser storage is unavailable. This session may be lost when you leave the page.';
  }
  function render(){
    const list=document.querySelector('#set-list'); list.replaceChildren();
    document.querySelector('#set-count').textContent=state.sets.length+(state.sets.length===1?' set':' sets');
    if(!state.sets.length){const li=document.createElement('li');li.className='empty';li.textContent='Your next small win starts here. Log a sample set above.';list.append(li);}
    state.sets.forEach((set,index)=>{
      const li=document.createElement('li'),div=document.createElement('div'),title=document.createElement('b'),detail=document.createElement('small'),remove=document.createElement('button');
      title.textContent=set.name;detail.textContent=set.reps+' reps · '+set.weight+' kg';div.append(title,detail);
      remove.type='button';remove.textContent='Remove';remove.setAttribute('aria-label','Remove set '+(index+1)+' of '+set.name);
      remove.addEventListener('click',()=>{state.sets.splice(index,1);persist();render();status.textContent='Set removed.';});li.append(div,remove);list.append(li);
    });
  }
  document.querySelector('#set-form').addEventListener('submit',e=>{
    e.preventDefault();const reps=Number(document.querySelector('#reps').value),weight=Number(document.querySelector('#weight').value);
    if(!Number.isInteger(reps)||reps<1||reps>200||!Number.isFinite(weight)||weight<0||weight>500)return;
    if(state.sets.length>=200){status.textContent='Demo limit reached. Remove a set or clear the demo to continue.';return;}
    state.sets.unshift({name:document.querySelector('#movement').value,reps,weight});persist();render();status.textContent='Set logged in this browser.';
  });
  let remaining=60;
  function tick(){
    if(state.end){remaining=Math.max(0,Math.ceil((state.end-Date.now())/1000));if(!remaining){state.end=null;persist();status.textContent='Rest timer complete.';}}
    document.querySelector('#timer').textContent=String(Math.floor(remaining/60)).padStart(2,'0')+':'+String(remaining%60).padStart(2,'0');
    document.querySelector('#timer-toggle').textContent=state.end?'Pause':remaining===60?'Start 60s':remaining===0?'Restart':'Resume';
  }
  document.querySelector('#timer-toggle').addEventListener('click',()=>{
    if(state.end){remaining=Math.max(0,Math.ceil((state.end-Date.now())/1000));state.end=null;}
    else {if(!remaining) remaining=60;state.end=Date.now()+remaining*1000;}
    persist();tick();
  });
  document.querySelector('#timer-reset').addEventListener('click',()=>{state.end=null;remaining=60;persist();tick();status.textContent='Timer reset.';});
  document.querySelector('#clear-demo').addEventListener('click',()=>{state={sets:[],end:null};remaining=60;try{localStorage.removeItem(key);}catch{}render();tick();status.textContent='Demo workout data cleared from this browser.';});
  render();tick();setInterval(tick,250);
  if(!storageAvailable)document.querySelector('#storage-notice').textContent='Browser storage is unavailable. Entries last only for this page session.';
}
