<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useRoute } from 'vue-router';
import { session, api, send, loadSession, isCoach, isAdmin } from './api';
import { permissions } from './permissions';
import { safeReturnPath, notifySessionChange } from '../../../site/assets/auth-client.js';
import { notify, watchFeedback } from './feedback';
const loading=ref(true),failure=ref(''),busy=ref(false);
const route=useRoute();
const currentPath=computed(()=>route.path.replace(/\/$/,'')||'/');
const access=computed(()=>permissions(session.user));
const wrongWorkspace=computed(()=>session.user&&((currentPath.value==='/admin'&&!access.value.admin)||(currentPath.value==='/coach'&&!access.value.coach)||(currentPath.value==='/team'&&!access.value.team)));
const needsConsent=computed(()=>session.user&&!session.user.healthDataConsentAt&&(['/progress','/nutrition'].includes(currentPath.value)||(currentPath.value==='/'&&!access.value.coach&&!access.value.team)));
let request=0,channel;
async function init(){
  const own=++request;loading.value=true;failure.value='';
  try{
    await loadSession();
    if(own!==request)return;
    if(!session.user){
      const register=route.query.register==='1'||currentPath.value==='/register';
      const next=safeReturnPath('/portal'+(route.path==='/'?'/':route.path));
      location.replace(register?'/register/':'/login/?next='+encodeURIComponent(next));
    }
  }catch(e){if(own===request)failure.value=e.message;}
  finally{if(own===request)loading.value=false;}
}
async function logout(){busy.value=true;failure.value='';try{await api('/auth/logout',{method:'POST'});session.user=null;notifySessionChange();location.replace('/login/');}catch(e){failure.value=e.message;}finally{busy.value=false;}}
async function consent(){try{await send('/me',{displayName:session.user.displayName||'Member',healthDataConsent:true},'PUT');await loadSession();notify('Your preference was saved.','success');}catch(e){failure.value=e.message;}}
function restore(event){if(event.persisted)init();}
onMounted(()=>{init();window.addEventListener('pageshow',restore);if(window.BroadcastChannel){channel=new BroadcastChannel('jp-member-session');channel.addEventListener('message',init);}});
onBeforeUnmount(()=>{window.removeEventListener('pageshow',restore);channel?.close();});
watchFeedback(failure);
</script>
<template>
  <div class="studio-shell" :class="{'studio-guest':!session.user}">
    <aside v-if="session.user" class="sidebar">
      <a class="brand" href="/"><img :src="'/assets/brand/logo-mark.svg?v=20261109.5'" alt="JP mind and body"><span>JP PERFORMANCE<small>MEMBER STUDIO</small></span></a>
      <p class="nav-label">YOUR SPACE</p>
      <nav aria-label="Member navigation">
        <RouterLink to="/">My dashboard <span>→</span></RouterLink>
        <RouterLink to="/progress">My progress <span>→</span></RouterLink>
        <RouterLink to="/nutrition">Food & calories <span>→</span></RouterLink>
        <RouterLink to="/exercises">Exercise library <span>→</span></RouterLink>
        <RouterLink v-if="isCoach()" to="/coach">Coaching desk <span>→</span></RouterLink>
        <RouterLink v-if="access.team" to="/team">Coaching team <span>→</span></RouterLink>
        <RouterLink v-if="isAdmin()" to="/admin">Member access <span>→</span></RouterLink>
      </nav>
      <div class="sidebar-note"><span class="spark">✳</span><h3>Small steps.<br>Lasting progress.</h3><p>A space to move, nourish and grow.</p><a href="/tools/">Explore free tools →</a></div>
      <a class="back-link" href="/">← Back to JP Performance</a>
    </aside>
    <div class="studio-main">
      <header v-if="session.user" class="topbar"><span>YOUR MIND. YOUR BODY. YOUR PACE.</span><div class="member-menu"><span>{{session.user.displayName||session.user.email}}<small class="role-label">{{access.label}}</small></span><button class="text-button" :disabled="busy" @click="logout">Sign out</button></div></header>
      <header v-else class="guest-bar"><a href="/" class="brand"><img :src="'/assets/brand/logo-mark.svg?v=20261109.5'" alt="JP"><span>JP PERFORMANCE</span></a><nav aria-label="Account access"><a href="/login/">Sign in</a><a href="/register/">Create account</a></nav></header>
      <main id="main">
        <div v-if="loading" class="card guest-status" role="status">Checking your account…</div>
        <div v-else-if="failure" class="card error guest-status" role="alert"><h1>We couldn’t connect.</h1><p>{{failure}}</p><div class="actions"><button @click="init">Try again</button><a href="/login/">Sign in</a><a href="/register/">Create account</a></div></div>
        <template v-else-if="session.user">
          <section v-if="wrongWorkspace" class="card access-denied"><p class="eyebrow">WORKSPACE ACCESS</p><h1>This page requires additional access.</h1><p>You are signed in as {{session.user.displayName||session.user.email}}, but this page is not available to your account.</p><div class="actions"><RouterLink to="/">Continue to my workspace →</RouterLink><button class="secondary" @click="logout">Sign out</button></div></section>
          <template v-else><div v-if="needsConsent" class="notice"><strong>Before saving health records:</strong><p>Confirm you are 18 or older and consent to the processing described in our <a href="/privacy.html">privacy notice</a>.</p><button @click="consent">I agree and consent</button></div><RouterView :key="session.user.id"/></template>
        </template>
        <div v-else class="card guest-status" role="status">Opening account access… <a href="/login/">Sign in</a> or <a href="/register/">create an account</a>.</div>
      </main>
      <footer class="studio-footer">JP PERFORMANCE LTD <span>Move. Think. Grow.</span><a href="/privacy.html">Privacy & your data</a></footer>
    </div>
  </div>
</template>
