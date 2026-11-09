<script setup>
import { watchFeedback } from './feedback';
import { ref, computed, onMounted } from 'vue';
import { api } from './api';
const exercises=ref([]),q=ref(''),group=ref(''),error=ref(''),selected=ref(null),loading=ref(true);
const filtered=computed(()=>exercises.value.filter(e=>(!group.value||e.group===group.value)&&e.name.toLowerCase().includes(q.value.toLowerCase())));
async function load(){loading.value=true;error.value='';try{exercises.value=await api('/catalog/exercises');}catch(e){error.value=e.message;}finally{loading.value=false;}}
onMounted(load);
watchFeedback(error,null);
</script>
<template>
  <div class="page-heading"><div><p class="eyebrow">MOVE WITH A LITTLE MORE CONFIDENCE</p><h1>Find your next move<span class="lime-dot">.</span></h1><p>Clear cues. Simple equipment. A place to start.</p></div><span class="tag">EXERCISE LIBRARY</span></div>
  <div class="card filters"><label>Search exercises<input v-model="q" type="search" placeholder="e.g. Squat"></label><label>Focus area<select v-model="group"><option value="">All areas</option><option v-for="g in [...new Set(exercises.map(x=>x.group))]" :key="g">{{g}}</option></select></label></div>
  <p v-if="loading" role="status">Loading exercises…</p><p v-if="error" class="error" role="alert">{{error}} <button @click="load">Retry</button></p>
  <div class="exercise-grid"><article v-for="e in filtered" :key="e.id" class="card exercise"><div class="exercise-art"><img :src="'/assets/exercises/'+e.pose+'.svg'" :alt="e.name+' movement illustration'" loading="lazy"></div><span class="eyebrow">{{e.group}} · {{e.equipment}}</span><h2>{{e.name}}</h2><p>{{e.description}}</p><button class="secondary" @click="selected=selected===e.id?null:e.id" :aria-expanded="selected===e.id">{{selected===e.id?'Hide instructions':'Movement guide →'}}</button><div v-if="selected===e.id"><ol><li v-for="cue in e.cues" :key="cue">{{cue}}</li></ol><a :href="e.source" target="_blank" rel="noopener">Read the source guidance →</a></div></article></div>
  <div v-if="!loading&&!error&&!filtered.length" class="card empty"><h2>No matching movements.</h2><p>Try a different search or focus area.</p></div><p class="hint">Illustrations explain the movement; they do not assess your form. Use a comfortable range and stop if you feel pain.</p>
</template>
