<script setup>
import { ref } from 'vue';
import { send, session } from './api';
import FoodBuilder from './FoodBuilder.vue';
const calculated=ref(null),name=ref('Lunch'),date=ref(new Date().toISOString().slice(0,10)),error=ref(''),message=ref(''),busy=ref(false);
async function save(){busy.value=true;error.value='';message.value='';try{await send('/meals',{name:name.value,recordedAt:new Date(date.value+'T00:00:00Z').toISOString(),items:calculated.value.portions,requestId:crypto.randomUUID()});message.value='Meal saved to your private diary. See today’s total in Overview.';calculated.value=null;}catch(e){error.value=e.message;}finally{busy.value=false;}}
</script>
<template>
  <div class="page-heading"><div><p class="eyebrow">KNOW WHAT’S ON YOUR PLATE</p><h1>A little food clarity<span class="lime-dot">.</span></h1><p>Build a meal, see its nutrition, and keep a simple diary.</p></div><span class="tag">2,853 REFERENCE FOODS</span></div>
  <div class="two-column nutrition-layout"><section class="card"><h2>Build your plate</h2><FoodBuilder @calculated="calculated=$event;message=''"/></section><section class="card"><p class="eyebrow">SAVE YOUR CHECK-IN</p><h2>Your meal diary</h2><p class="muted">Calculate a meal first, then save it to your account. Your approved coaches can view this diary.</p><form @submit.prevent="save"><label>Meal name<input v-model="name" required maxlength="100" placeholder="e.g. Lunch"></label><label>Date<input v-model="date" type="date" required :max="new Date().toISOString().slice(0,10)"></label><p v-if="calculated"><strong>{{Math.round(calculated.result.kcal)}} kcal</strong> ready to record.</p><p v-if="error" class="error" role="alert">{{error}}</p><p v-if="message" class="notice" role="status">{{message}}</p><button class="primary wide" :disabled="!calculated||busy||!session.user.healthDataConsentAt">Save to my diary →</button></form><div class="soft-note"><h3>Food is more than a number.</h3><p>These tools estimate food composition. They do not prescribe a calorie target or replace care from a qualified dietitian. For a personal plan, work with your coach.</p></div></section></div>
</template>
