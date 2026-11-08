<script setup>
import { ref, computed, onMounted } from 'vue';
import { api, send } from './api';
const emit = defineEmits(['calculated']);
const q=ref(''),foods=ref([]),portions=ref([]),result=ref(null),error=ref(''),busy=ref(false),hasMore=ref(false);
const chosen=ref(''),grams=ref(100);
const payload=computed(()=>portions.value.map(x=>({foodId:x.foodId,grams:Number(x.grams)})));
async function search(more=false){busy.value=true;error.value='';try{const last=more?foods.value.at(-1)?.id:0;const batch=await api('/catalog/foods?q='+encodeURIComponent(q.value)+'&take=30&after='+(last||0));foods.value=more?[...foods.value,...batch]:batch;hasMore.value=batch.length===30;chosen.value='';}catch(e){error.value=e.message;}finally{busy.value=false;}}
function add(){const f=foods.value.find(x=>x.id===Number(chosen.value));if(!f||Number(grams.value)<=0||portions.value.length>=30)return;portions.value.push({foodId:f.id,name:f.name,grams:Number(grams.value)});invalidate();}
function invalidate(){result.value=null;emit('calculated',null);}
function remove(i){portions.value.splice(i,1);invalidate();}
async function calculate(){busy.value=true;error.value='';try{result.value=await send('/nutrition/calculate',payload.value);emit('calculated',{portions:payload.value,result:result.value});}catch(e){error.value=e.message;}finally{busy.value=false;}}
onMounted(()=>search());
</script>
<template>
  <div class="food-builder">
    <div class="search-row"><label>Find a food<input v-model="q" type="search" placeholder="Try oats, rice, banana…" maxlength="100" @keydown.enter.prevent="search()"></label><button type="button" class="secondary" :disabled="busy" @click="search()">Search</button></div>
    <p class="hint">Choose the matching preparation: raw, cooked and drained values differ. Weigh the edible portion in grams.</p>
    <div class="food-choice"><label>Search results<select v-model="chosen"><option value="">{{foods.length?'Choose a food…':'No foods found. Try another search.'}}</option><option v-for="f in foods" :key="f.id" :value="f.id">{{f.name}} · {{f.kcal100g}} kcal/100 g</option></select></label><label>Grams<input v-model="grams" type="number" min="1" max="5000" step="1"></label><button type="button" :disabled="!chosen||busy||portions.length>=30" @click="add">+ Add</button></div>
    <button v-if="hasMore" type="button" class="text-button" :disabled="busy" @click="search(true)">Load more results</button>
    <div v-if="portions.length" class="table-scroll"><table><thead><tr><th>Food</th><th>Amount</th><th><span class="sr-only">Remove</span></th></tr></thead><tbody><tr v-for="(p,i) in portions" :key="i"><td>{{p.name}}</td><td>{{p.grams}} g</td><td><button class="text-button" type="button" :aria-label="'Remove '+p.name" @click="remove(i)">Remove</button></td></tr></tbody></table></div>
    <p v-else class="empty-small">Your plate is empty. Add a food to begin.</p>
    <p v-if="error" class="error" role="alert">{{error}}</p><button type="button" class="primary" :disabled="busy||!portions.length" @click="calculate">{{busy?'Please wait…':'Calculate this meal →'}}</button>
    <div v-if="result" class="nutrition-result" aria-live="polite"><div><strong>{{Math.round(result.kcal)}}</strong><span>kcal</span></div><div><strong>{{result.protein}}</strong><span>g protein</span></div><div><strong>{{result.carbs}}</strong><span>g carbohydrate</span></div><div><strong>{{result.fat}}</strong><span>g fat</span></div></div>
    <p class="hint">Source: <a href="https://www.gov.uk/government/publications/composition-of-foods-integrated-dataset-cofid" target="_blank" rel="noopener">CoFID 2021 · Public Health England</a>. Contains public sector information licensed under the Open Government Licence v3.0. Estimates per 100 g; trace values are treated as zero. Brand, preparation and portion sizes affect actual nutrition.</p>
  </div>
</template>
