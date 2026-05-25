<script setup lang="ts">
import { computed, defineAsyncComponent, ref, watchEffect, type DefineComponent } from 'vue';

const props = defineProps<{
  articleData?: () => Promise<{ default: DefineComponent; frontmatter: Record<string, unknown> }>;
}>();

const ArticleComponent = computed(() =>
  props.articleData ? defineAsyncComponent(props.articleData) : null
);
</script>

<template>
  <article class="content-view__body">
    <main class="content-view__main">
      <component :is="ArticleComponent" v-if="ArticleComponent" />
    </main>
  </article>
</template>
