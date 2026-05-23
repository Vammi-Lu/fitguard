import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

import scssTokensPlugin from 'vite-plugin-css-vars-to-scss-tokens';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), '')

	return {
		plugins: [
			vue(),
			vueDevTools(),
			scssTokensPlugin()			
		],

		base: env.VITE_BASE_URL,

		resolve: {
			alias: {
				"@": fileURLToPath(new URL("./src", import.meta.url)),
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
	}
})