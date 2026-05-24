<script setup lang="ts">
import { pages, topLevelPages, activePageName, switchPage, type PageName } from '@/shared/pages';

import Favicon from '@/assets/icons/favicon.svg?component';
import { ref } from 'vue';
</script>

<style lang="scss">
.header {
  display: flex;
  justify-content: flex-start;
  align-items: flex-start;
  flex-direction: column;
  gap: 1rem;

  width: 100%;
  max-width: 1900px;
  height: 120px;
  margin-block: 1rem;
  padding-inline: 2.5rem;

  &-title-wrapper {
    flex-shrink: 0;
    display: flex;
    justify-content: flex-start;
    align-items: center;
    gap: 1.05rem;
    color: $text-primary;
    text-decoration: none;

    font-size: 1.15rem;

    padding-inline: 1rem;

    &:hover {
      color: $text-primary;
      text-decoration: none;
    }
  }

  &-nav {
    background-color: $surface-1;

    width: 100%;
    height: 48px;
    border-radius: 0.5rem;

    &__list {
      display: flex;
      list-style-type: none;
      margin: 0;
      padding: 0;

      width: 100%;
      height: 100%;

      -webkit-user-select: none;
      user-select: none;
    }

    &__sublist {
      display: flex;
      position: absolute;
      flex-direction: column;

      width: 100%;
      top: 100%;
      left: 0;

      height: auto;
      background-color: $surface-0;
      z-index: 1;

      opacity: 0;
      pointer-events: none;

      transition: opacity 0.15s ease;
    }

    &__item:hover &__sublist {
      display: flex;
      flex-direction: column;
    }

    &__item {
      position: relative;
      display: flex;
      justify-content: center;
      align-items: center;

      height: 100%;

      font-size: 1.2rem;

      transition: background-color 0.15s ease;

      &:first-child {
        border-radius: 0.5rem 0 0 0.5rem;
      }

      &:last-child {
        margin-inline-start: auto;
        border-radius: 0 0.5rem 0.5rem 0;

        &:after {
          content: '';
          position: absolute;
          top: 50%;
          right: -1px;
          transform: translateY(-50%);
          width: 2px;
          height: 50%;
          background-color: $accent-0;
        }
      }

      &:hover {
        background-color: $accent-2;

        & .header-nav__sublist {
          opacity: 1;
          pointer-events: all;
        }
      }

      &:active:not(:has(.header-nav__subitem:active)) {
        background-color: $accent-4;
      }

      &:before {
        content: '';
        position: absolute;
        top: 50%;
        left: -1px;
        transform: translateY(-50%);
        width: 2px;
        height: 50%;
        background-color: $accent-0;
      }
    }

    &__subitem {
      position: relative;
      display: flex;
      justify-content: flex-start;
      align-items: center;

      height: 48px;

      font-size: 1.2rem;

      transition: background-color 0.15s ease;

      &:hover {
        background-color: $surface-0--hover;
      }

      &:active {
        background-color: $surface-0--active;
      }

      &:before {
        content: '';
        position: absolute;
        top: 50%;
        left: -1px;
        transform: translateY(-50%);
        width: 2px;
        height: 50%;
        background-color: $accent-0;
      }
    }

    &__link {
      display: flex;
      justify-content: center;
      align-items: center;
      width: 100%;
      height: 100%;
      padding-inline: 1rem;

      color: $text-secondary;
      text-decoration: none;
      &:hover {
        color: $text-secondary;
        text-decoration: none;
      }
    }

    &__sublink {
      display: flex;
      justify-content: flex-start;
      align-items: center;
      width: 100%;
      height: 100%;
      padding-inline: 1rem;

      color: $text-primary;
      text-decoration: none;
      &:hover {
        color: $text-primary;
        text-decoration: none;
      }
    }
  }
}
</style>

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
            <a class="header-nav__link" :href="`/#${page.path}`" @click.prevent="switchPage(key)">
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
                  :href="`/#${pages[child].path}`"
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
