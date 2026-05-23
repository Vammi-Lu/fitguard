import { fileURLToPath, URL } from 'node:url';

import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueDevTools from 'vite-plugin-vue-devtools';

// Локальные плагины
import svgLoader from './plugins/svg-loader';

import scssTokensPlugin from 'vite-plugin-css-vars-to-scss-tokens';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [vue(), vueDevTools(), scssTokensPlugin(), svgLoader()],

    base: env.VITE_BASE_URL || '/',

    server: {
      host: true,
      port: 5173,
      strictPort: true,
      hmr: {
        clientPort: 5173,
      },
    },

    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },

    css: {
      preprocessorOptions: {
        scss: {
          additionalData: `
					@use "@/styles/tokens" as *;
					@use "@/styles/constants" as *;
					@use "@/styles/functions" as *;
					@use "@/styles/mixins" as *;
					`,
        },
      },
    },
  };
});
