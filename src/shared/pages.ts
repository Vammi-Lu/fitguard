import { computed, defineAsyncComponent, ref, type Component } from 'vue';

interface Page {
  path: string;
  label: string;
  view?: Component;
  children?: PageName[];
  parent?: PageName;
}

const pagesBase = {
  home: {
    path: '/',
    label: 'Главная',
    view: defineAsyncComponent(() => import('@/views/HomeView.vue')),
  },
  info: {
    path: '/info',
    label: 'Информация',
    view: defineAsyncComponent(() => import('@/views/HomeView.vue')),
  },
  prevention: {
    path: '/prevention',
    label: 'Профилактика ожирения',
  },
  rational: {
    path: '/prevention/rational',
    label: 'Рациональное питание',
    view: defineAsyncComponent(() => import('@/views/HomeView.vue')),
  },
  activity: {
    path: '/prevention/activity',
    label: 'Физическая активность',
    view: defineAsyncComponent(() => import('@/views/HomeView.vue')),
  },
  bmi: {
    path: '/bmi',
    label: 'Калькулятор ИМТ',
    view: defineAsyncComponent(() => import('@/views/HomeView.vue')),
  },
  profile: {
    path: '/profile',
    label: 'Профиль',
    view: defineAsyncComponent(() => import('@/views/HomeView.vue')),
  },
} satisfies Record<string, Omit<Page, 'children' | 'parent'>>;

export type PageName = keyof typeof pagesBase;

const PageRelations: Partial<Record<PageName, { children?: PageName[]; parent?: PageName }>> = {
  prevention: { children: ['rational', 'activity'] },
  rational: { parent: 'prevention' },
  activity: { parent: 'prevention' },
};

export const pages = Object.fromEntries(
  Object.entries(pagesBase).map(([name, page]) => [
    name,
    { ...page, ...PageRelations[name as PageName] },
  ])
) as Record<PageName, Page>;

export const topLevelPages = Object.fromEntries(
  Object.entries(pages).filter(([, page]) => !page.parent)
) as Record<PageName, (typeof pages)[PageName]>;

const getPageNameFromHash = (): PageName => {
  const hash = window.location.hash.slice(2);
  return hash in pages ? (hash as PageName) : 'home';
};

export const activePageName = ref<PageName>(getPageNameFromHash());
export const activePage = computed(() => pages[activePageName.value] ?? pages.home);

export const switchPage = (pageName: PageName) => {
  activePageName.value = pageName;
  window.location.hash = `#${pages[pageName].path}`;
};
