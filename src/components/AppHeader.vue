<script setup lang="ts">
import Favicon from '@/assets/icons/favicon.svg?component';

// пока сделаю временную заглушку элементов навигации

const navTabs = [
  { label: 'Главная', path: '/#/home' },
  { label: 'Сведения', path: '/#/info' },
  { label: 'Профилактика ожирения', path: '/#/prevention' },
  { label: 'Калькулятор ИМТ', path: '/#/bmi' },
];
</script>

<style></style>

<template>
  <header class="header">
    <div class="header-title-wrapper">
      <Favicon width="64" />
      <h1 class="header-title__text">Профилактика ожирения</h1>
    </div>
    <nav class="header-nav">
      <!-- Навигация по сайту -->
      <!-- Используем цикл для генерации ссылок вместо того. что бы вручную описывать каждую -->
      <ul class="header-nav__list">
        <li class="header-nav__item" v-for="tab in navTabs" :key="tab.path">
          <a class="header-nav__link" :href="tab.path">{{ tab.label }}</a>
        </li>
      </ul>
    </nav>
  </header>
</template>
