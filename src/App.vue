<script setup lang="ts">
import { provide } from 'vue';

import AppHeader from '@/components/AppHeader.vue';
import AppMain from '@/components/AppMain.vue';
import AppFooter from '@/components/AppFooter.vue';

import { activePage } from '@/shared/pages';
</script>

<template>
  <AppHeader />
  <AppMain>
    <component :is="activePage.view" v-bind="activePage.viewProps" />
  </AppMain>
  <AppFooter />
</template>

<style>
#app {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  min-height: 100vh;
}
</style>
