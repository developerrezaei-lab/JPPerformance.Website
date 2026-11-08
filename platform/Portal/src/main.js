import { createApp } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';
import App from './App.vue';
import Dashboard from './Dashboard.vue';
import Coach from './Coach.vue';
import Nutrition from './Nutrition.vue';
import Exercises from './Exercises.vue';
import Admin from './Admin.vue';
import './style.css';
const router = createRouter({ history: createWebHistory('/portal/'), routes: [
  { path: '/', component: Dashboard }, { path: '/coach', component: Coach }, { path: '/nutrition', component: Nutrition }, { path: '/exercises', component: Exercises }, { path: '/admin', component: Admin }, { path: '/:pathMatch(.*)*', redirect: '/' }
] });
createApp(App).use(router).mount('#app');
