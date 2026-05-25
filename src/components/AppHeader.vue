<script setup lang="ts">
import { pages, topLevelPages, activePageName, switchPage } from '@/shared/pages';
import { baseUrl } from '@/constants';

import Favicon from '@/assets/icons/favicon.svg?component';
</script>

<style lang="scss" src="./AppHeader.scss" />

<template>
  <header class="header">
    <a class="header-title-wrapper" href="/">
      <Favicon width="55" />
      <h1 class="header-title__text">Профилактика ожирения</h1>
    </a>
    <nav class="header-nav">
      <!-- Навигация по сайту -->
      <!-- Используем цикл для генерации ссылок вместо того. что бы вручную описывать каждую -->
      <ul class="header-nav__list">
        <li
          class="header-nav__item"
          :class="{ 'header-nav__item--active': activePageName === key }"
          v-for="(page, key) in topLevelPages"
          :key="key"
        >
          <template v-if="page.view">
            <a
              class="header-nav__link"
              :href="`${baseUrl}/#${page.path}`"
              @click.prevent="switchPage(key)"
            >
              {{ page.label }}
            </a>
          </template>
          <template v-else>
            <span class="header-nav__link">
              {{ page.label }}
            </span>
            <ul class="header-nav__list header-nav__sublist">
              <li
                class="header-nav__subitem"
                :class="{ 'header-nav__subitem--active': activePageName === child }"
                v-for="child in page.children"
                :key="child"
              >
                <a
                  class="header-nav__sublink"
                  :href="`${baseUrl}/#${pages[child].path}`"
                  @click.prevent="switchPage(child)"
                >
                  {{ pages[child].label }}
                </a>
              </li>
            </ul>
          </template>
        </li>
      </ul>
    </nav>
  </header>
</template>
