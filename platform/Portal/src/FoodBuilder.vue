<script setup>
import { ref, computed, onMounted, watch, onBeforeUnmount } from 'vue';
import { api, send } from './api';
import { notify, watchFeedback } from './feedback';
const emit=defineEmits(['calculated']);
const q=ref(''),category=ref(''),cuisine=ref(''),mode=ref('common'),filters=ref({categories:[],cuisines:[]});
const foods=ref([]),portions=ref([]),chosen=ref(null),grams=ref(100),result=ref(null),error=ref(''),searching=ref(false),calculating=ref(false),hasMore=ref(false);
const payload=computed(()=>portions.value.map(x=>({foodId:x.foodId,grams:Number(x.grams)})));
let timer,controller,generation=0,calculationVersion=0;
async function search(more=false){
 clearTimeout(timer);controller?.abort();controller=new AbortController();const own=++generation;
 searching.value=true;error.value='';if(!more){foods.value=[];hasMore.value=false;}
 try{
  const params=new URLSearchParams({take:'30',after:String(more?foods.value.at(-1)?.id||0:0)});
  if(q.value.trim())params.set('q',q.value.trim());if(category.value)params.set('category',category.value);if(cuisine.value)params.set('cuisine',cuisine.value);if(mode.value==='common')params.set('common','true');
  const batch=await api('/catalog/foods?'+params,{signal:controller.signal});
  if(own!==generation)return;foods.value=more?[...foods.value,...batch]:batch;hasMore.value=batch.length===30;
 }catch(e){if(own===generation&&e.name!=='AbortError')error.value=e.message;}
 finally{if(own===generation)searching.value=false;}
}
watch(q,()=>{if(q.value.trim())mode.value='all';});
watch(cuisine,()=>{if(cuisine.value)mode.value='all';});
function showCommon(){q.value='';category.value='';cuisine.value='';mode.value='common';}
watch([q,category,cuisine,mode],()=>{controller?.abort();generation++;clearTimeout(timer);foods.value=[];hasMore.value=false;searching.value=true;timer=setTimeout(()=>search(),250);},{flush:'sync'});
function pick(food){chosen.value=food;grams.value=100;}
function add(){
 const f=chosen.value,g=Number(grams.value);if(!f)return;
 if(!Number.isFinite(g)||g<1||g>5000){notify('Enter an amount between 1 and 5,000 grams.','warning');return;}
 if(portions.value.length>=30){notify('A meal can contain up to 30 food portions.','warning');return;}
 portions.value.push({foodId:f.id,name:f.name,grams:g});invalidate();notify('Food added to your plate.','success');
}
function invalidate(){calculationVersion++;result.value=null;emit('calculated',null);}
function remove(i){portions.value.splice(i,1);invalidate();}
async function calculate(){
 calculating.value=true;error.value='';const own=++calculationVersion;const snapshot=payload.value.map(p=>({...p}));
 try{const estimate=await send('/nutrition/calculate',snapshot);if(own!==calculationVersion)return;result.value=estimate;emit('calculated',{portions:snapshot,result:estimate});notify('Your meal estimate is ready.','success');}
 catch(e){error.value=e.message;}finally{calculating.value=false;}
}
onMounted(async()=>{notify('Choose an everyday food, or browse all foods.','info');try{filters.value=await api('/catalog/food-filters');}catch(e){error.value=e.message;}search();});
onBeforeUnmount(()=>{clearTimeout(timer);controller?.abort();generation++;calculationVersion++;});
watchFeedback(error);
</script>
<template>
 <div class="food-builder">
  <div class="food-browse-tabs" role="group" aria-label="Browse foods"><button type="button" :class="{active:mode==='common'}" :aria-pressed="mode==='common'" @click="showCommon">Everyday foods</button><button type="button" :class="{active:mode==='all'}" :aria-pressed="mode==='all'" @click="mode='all'">All foods</button></div>
  <label>Search this food list<input v-model="q" type="search" maxlength="100" placeholder="Rice, برنج, chicken, banana…" @keydown.enter.prevent="search()"></label>
  <div class="food-filter-grid"><label>Food group<select v-model="category"><option value="">All groups</option><option v-for="item in filters.categories" :key="item">{{item}}</option></select></label><label>Country / cuisine style<select v-model="cuisine"><option value="">All countries / styles</option><option v-for="item in filters.cuisines" :key="item">{{item}}</option></select></label></div>
  <p class="hint">Everyday foods is a curated shortlist. Country tags help browse styles, not verified origins. This UK reference dataset does not yet include labelled Iranian dishes.</p>
  <div class="food-results" :aria-busy="searching" aria-label="Food search results">
   <p v-if="searching&&!foods.length" class="empty-small" role="status">Finding foods…</p>
   <button v-for="food in foods" :key="food.id" type="button" class="food-result" :class="{selected:chosen?.id===food.id}" :aria-pressed="chosen?.id===food.id" @click="pick(food)"><img :src="food.imageUrl" alt="" width="48" height="48" loading="lazy"><span><strong>{{food.name}}</strong><small>{{food.kcal100g}} kcal / 100 g · {{food.category}}</small></span><span aria-hidden="true">{{chosen?.id===food.id?'✓':'+'}}</span></button>
   <p v-if="!searching&&!foods.length" class="empty-small">No matching foods. Try All foods, another group or clear the country filter.</p>
  </div>
  <button v-if="hasMore" type="button" class="text-button" :disabled="searching" @click="search(true)">{{searching?'Loading…':'Show more foods'}}</button>
  <div v-if="chosen" class="food-selected"><img :src="chosen.imageUrl" :alt="chosen.category+' illustration'" width="90" height="90"><div><strong>{{chosen.name}}</strong><small>Food-group illustration · choose the matching raw/cooked preparation.</small></div></div>
  <div class="food-add-row"><label>Amount in grams<input v-model="grams" type="number" min="1" max="5000" step="1"></label><button type="button" :disabled="!chosen||calculating" @click="add">+ Add to plate</button></div>
  <div v-if="portions.length" class="table-scroll"><table><thead><tr><th>Food</th><th>Amount</th><th><span class="sr-only">Remove</span></th></tr></thead><tbody><tr v-for="(p,i) in portions" :key="i"><td>{{p.name}}</td><td>{{p.grams}} g</td><td><button type="button" class="text-button" :aria-label="'Remove '+p.name" @click="remove(i)">Remove</button></td></tr></tbody></table></div>
  <p v-else class="empty-small">Your plate is empty. Choose a food above to begin.</p>
  <p v-if="error" class="error" role="alert">{{error}}</p><button type="button" class="primary" :disabled="calculating||!portions.length" @click="calculate">{{calculating?'Calculating…':'Calculate this meal →'}}</button>
  <div v-if="result" class="nutrition-result" aria-live="polite"><div><strong>{{Math.round(result.kcal)}}</strong><span>kcal</span></div><div><strong>{{result.protein}}</strong><span>g protein</span></div><div><strong>{{result.carbs}}</strong><span>g carbohydrate</span></div><div><strong>{{result.fat}}</strong><span>g fat</span></div></div>
  <p class="hint">Source: <a href="https://www.gov.uk/government/publications/composition-of-foods-integrated-dataset-cofid" target="_blank" rel="noopener">CoFID 2021 · Public Health England</a>. Open Government Licence v3.0. Estimates per 100 g; raw, cooked, drained and edible portions differ. Illustrations do not show an exact dish or portion.</p>
 </div>
</template>
