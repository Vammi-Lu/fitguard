import { fileURLToPath, URL } from 'node:url';

import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueDevTools from 'vite-plugin-vue-devtools';

// MDX
import mdx from '@mdx-js/rollup';

import remarkFrontmatter from 'remark-frontmatter';
import remarkMdxFrontmatter from 'remark-mdx-frontmatter';
import remarkGfm from 'remark-gfm';
import remarkExtractToc from 'remark-extract-toc';

import rehypeExternalLinks from 'rehype-external-links';

// Локальные плагины
import svgLoader from './plugins/svg-loader';

import { remarkTypography } from './plugins/remarkTypography';

import scssTokensPlugin from 'vite-plugin-css-vars-to-scss-tokens';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      {
        enforce: 'pre',
        ...mdx({
          jsxImportSource: 'vue',
          remarkPlugins: [
            remarkFrontmatter,
            [remarkMdxFrontmatter, { name: 'frontmatter' }],
            remarkGfm,
            [remarkExtractToc, { name: 'toc', keys: ['value', 'depth', 'data'] }],
            remarkTypography,
          ],
          rehypePlugins: [
            [rehypeExternalLinks, { target: '_blank', rel: ['noopener', 'noreferrer'] }],
          ],
        }),
      },
      vue(),
      vueDevTools(),
      scssTokensPlugin(),
      svgLoader(),
    ],

    base: env.VITE_BASE_URL || '/',

    server: {
      host: true,
      port: 5173,
      strictPort: true,
      hmr: {
        clientPort: 5173,
      },
      allowedHosts: ['nkardaz.loca.lt'],
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
