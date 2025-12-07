import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';

const localHost = process.env.BIND_HOST ?? '127.0.0.1';

export default defineConfig({
	server: {
		host: localHost,
		port: 5173
	},
	preview: {
		host: localHost,
		port: 4173
	},
	plugins: [
		sveltekit(),
		SvelteKitPWA({
			mode: 'production',
			strategies: 'injectManifest',
			scope: '/',
			base: '/',
			disable: process.env.NODE_ENV === 'development',
			manifest: {
				name: 'Farert - JR運賃計算',
				short_name: 'Farert',
				description: 'JR線の経路と運賃を計算するアプリ',
				theme_color: '#9333ea',
				background_color: '#ffffff',
				display: 'standalone',
				start_url: '/',
				icons: [
					{
						src: '/icon-192.png',
						sizes: '192x192',
						type: 'image/png'
					},
					{
						src: '/icon-512.png',
						sizes: '512x512',
						type: 'image/png'
					}
				]
			},
			injectManifest: {
				swSrc: 'src/service-worker.ts',
				globPatterns: ['**/*.{js,css,html,svg,png,wasm}']
			}
		})
	],
	define: {
		__APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? 'dev')
	},
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'client',
					browser: {
						enabled: true,
						provider: playwright(),
						instances: [{ browser: 'chromium', headless: true }]
					},
					include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					exclude: ['src/lib/server/**']
				}
			},
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
