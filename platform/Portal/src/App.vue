<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { session, api, send, loadSession, refreshCsrf, loginMember, isCoach, isAdmin } from './api';
import { permissions } from './permissions';
const loading = ref(true), failure = ref(''), authError = ref(''), mode = ref('login'), email = ref(''), password = ref(''), name = ref(''), consent = ref(false);
const busy = ref(false);
const route = useRoute();
const currentPath = computed(() => route.path.replace(/\/$/, '') || '/');
const access = computed(() => permissions(session.user));
const wrongWorkspace = computed(() => session.user && ((currentPath.value==='/admin' && !access.value.admin) || (currentPath.value==='/coach' && !access.value.coach) || (currentPath.value==='/team' && !access.value.team)));
async function init() { loading.value = true; failure.value = ''; try { await refreshCsrf(); await loadSession(); } catch (e) { failure.value = e.message; } finally { loading.value = false; } }
onMounted(() => { if (route.query.register === '1') mode.value = 'register'; init(); });
async function authenticate() {
  busy.value = true; authError.value = ''; failure.value = '';
  try {
    if (mode.value === 'register') { await refreshCsrf(); if (!consent.value) throw new Error('Please confirm the membership terms.'); await send('/auth/register', { email: email.value, password: password.value }); }
    await loginMember(email.value, password.value);
    await loadSession();
    if (mode.value === 'register') { await send('/me', { displayName: name.value, healthDataConsent: true }, 'PUT'); await loadSession(); }
    password.value = '';
  } catch (e) { authError.value = e.message; password.value = ''; } finally { busy.value = false; }
}
async function logout() { try { await api('/auth/logout', { method: 'POST' }); session.user = null; await refreshCsrf(); } catch (e) { failure.value = e.message; } }
</script>
<template>
  <div class="studio-shell">
    <aside class="sidebar">
      <a class="brand" href="/"><img :src="'/assets/brand/logo-mark.svg?v=20261108.2'" alt="JP mind and body"><span>JP PERFORMANCE<small>MEMBER STUDIO</small></span></a>
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
      <header class="topbar"><span>YOUR MIND. YOUR BODY. YOUR PACE.</span><div v-if="session.user" class="member-menu"><span>{{ session.user.displayName || session.user.email }}<small class="role-label">{{access.label}}</small></span><button class="text-button" @click="logout">Sign out</button></div><span v-else class="tag">MEMBER SIGN IN</span></header>
      <main id="main">
        <div v-if="loading" class="card" role="status">Preparing your studio…</div>
        <div v-if="!loading && failure" class="card error" role="alert"><h2>We couldn’t connect.</h2><p>{{ failure }}</p><button @click="init">Try again</button></div>
        <section v-if="!loading && !session.user" class="auth-layout">
          <div class="auth-intro"><p class="eyebrow">A LITTLE STRUCTURE. A LOT OF POSSIBILITY.</p><h1>Your next<br> chapter<br> <em>starts here.</em></h1><p>Keep your training, meals and progress in one clear space. Work with your coach. Build habits at your pace.</p><div class="intro-pills"><span>Personal progress</span><span>Coach-led plans</span><span>Food diary</span></div><p class="muted">For adults aged 18 and over. General fitness support; not medical or clinical nutrition care.</p></div>
          <form class="card auth-card" @submit.prevent="authenticate">
            <div class="segmented"><button type="button" :class="{selected:mode==='login'}" @click="mode='login';authError=''">Sign in</button><button type="button" :class="{selected:mode==='register'}" @click="mode='register';authError=''">Create account</button></div>
            <h2>{{ mode === 'login' ? 'Welcome back.' : 'Make room for progress.' }}</h2><p class="muted">{{ mode === 'login' ? 'Sign in once. Your tools and dashboard adapt to your permissions.' : 'Start with a free student account. Coach access is approved by an administrator.' }}</p>
            <label v-if="mode==='register'">Your name<input v-model="name" autocomplete="name" required maxlength="80"></label>
            <label>Email address<input v-model="email" type="email" autocomplete="email" required maxlength="254"></label>
            <label>Password<input v-model="password" type="password" :autocomplete="mode==='login'?'current-password':'new-password'" required minlength="12" maxlength="128"></label>
            <p v-if="mode==='register'" class="hint">At least 12 characters, including upper and lowercase letters, a number and a symbol.</p>
            <label v-if="mode==='register'" class="check"><input v-model="consent" type="checkbox" required><span>I am 18 or older. I consent to storing my fitness and meal records as described in the <a href="/privacy.html" target="_blank" rel="noopener">privacy notice</a>. Coaches can access these records only after I accept their invitation.</span></label>
            <p v-if="authError" class="error" role="alert">{{ authError }}</p><button class="primary wide" :disabled="busy">{{ busy ? 'Please wait…' : mode==='login'?'Sign in →':'Create my account →' }}</button>
            <p class="hint">No role selection needed. Coach, supervisor and administrator access is assigned by your system administrator.</p>
            <p class="hint">Private technical preview: use fictional test data. Public registration is closed by default in production. Email password recovery is not yet available.</p>
          </form>
        </section>
        <section v-else-if="!loading && wrongWorkspace" class="card access-denied"><p class="eyebrow">WORKSPACE ACCESS</p><h1>This page requires additional access.</h1><p>You are signed in as {{session.user.displayName || session.user.email}}, but this page is not available to your account.</p><div class="actions"><RouterLink to="/">Continue to my workspace →</RouterLink><button class="secondary" @click="logout">Sign out and use another account</button></div></section>
        <template v-else-if="!loading && session.user"><div v-if="['/','/progress','/nutrition'].includes(currentPath) && !session.user.healthDataConsentAt" class="notice"><strong>Before saving health records:</strong><p>Confirm you are 18 or older and consent to the processing described in our <a href="/privacy.html">privacy notice</a>.</p><button @click="async()=>{try{await send('/me',{displayName:session.user.displayName||'Member',healthDataConsent:true},'PUT');await loadSession()}catch(e){failure=e.message}}">I agree and consent</button></div><RouterView :key="session.user.id"/></template>
      </main>
      <footer class="studio-footer">JP PERFORMANCE LTD <span>Move. Think. Grow.</span><a href="/privacy.html">Privacy & your data</a></footer>
    </div>
  </div>
</template>
