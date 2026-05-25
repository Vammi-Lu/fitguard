import { createApp } from 'vue';
import App from './App.vue';

import './styles/main.scss';
import './styles/_variables.scss';

import favicon from '@/assets/icons/favicon.svg?url';

const link = document.createElement('link');
link.rel = 'icon';
link.type = 'image/svg+xml';
link.href = favicon;
document.head.appendChild(link);

createApp(App).mount('#app');
