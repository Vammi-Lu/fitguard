import { computed, defineAsyncComponent, ref, type Component, type DefineComponent } from 'vue';

interface Page {
  path: string;
  label: string;
  view?: Component;
  viewProps?: {
    articleData?: () => Promise<{ default: DefineComponent; frontmatter: Record<string, unknown> }>;
  };
  children?: PageName[];
  parent?: PageName;
}

const pagesBase = {
  home: {
    path: '/',
    label: 'Главная',
    view: defineAsyncComponent(() => import('@/views/ContentView.vue')),
    viewProps: {
      articleData: () => import('@/articles/about.mdx'),
    },
  },
  info: {
    path: '/info',
    label: 'Информация',
    view: defineAsyncComponent(() => import('@/views/ContentView.vue')),
    viewProps: {
      articleData: () => import('@/articles/information.mdx'),
    },
  },
  prevention: {
    path: '/prevention',
    label: 'Профилактика ожирения',
  },
  rational: {
    path: '/prevention/rational',
    label: 'Рациональное питание',
    view: defineAsyncComponent(() => import('@/views/ContentView.vue')),
    viewProps: {
      articleData: () => import('@/articles/rational-nutrition.mdx'),
    },
  },
  activity: {
    path: '/prevention/activity',
    label: 'Физическая активность',
    view: defineAsyncComponent(() => import('@/views/ContentView.vue')),
    viewProps: {
      articleData: () => import('@/articles/physical-activity.mdx'),
    },
  },
  bmi: {
    path: '/bmi',
    label: 'Калькулятор ИМТ',
    view: defineAsyncComponent(() => import('@/views/ContentView.vue')),
    viewProps: {
      articleData: () => import('@/articles/bmi-calculator.mdx'),
    },
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
  const path = window.location.hash.slice(1);
  const found = Object.entries(pages).find(([, page]) => page.path === path);
  return found ? (found[0] as PageName) : 'home';
};

export const activePageName = ref<PageName>(getPageNameFromHash());
export const activePage = computed(() => pages[activePageName.value] ?? pages.home);

export const switchPage = (pageName: PageName) => {
  activePageName.value = pageName;
  window.location.hash = `#${pages[pageName].path}`;
};
