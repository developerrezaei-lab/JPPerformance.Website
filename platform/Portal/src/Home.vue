<script setup>
import { computed } from 'vue';
import { session } from './api';
import { permissions } from './permissions';
import Dashboard from './Dashboard.vue';
import Coach from './Coach.vue';
import Team from './Team.vue';
import Admin from './Admin.vue';
const component=computed(()=>({admin:Admin,team:Team,coach:Coach,athlete:Dashboard}[permissions(session.user).home]));
</script>
<template><component :is="component"/></template>
