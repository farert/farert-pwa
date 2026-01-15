import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import { sveltekit } from '@sveltejs/kit/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { execSync } from 'node:child_process';

const localHost = process.env.BIND_HOST ?? '127.0.0.1';
const base = process.env.NODE_ENV === 'production' ? '/farert-pwa/' : '/';
const buildAt = process.env.BUILD_AT ?? new Date().toISOString();
const gitCommitAt =
	process.env.GIT_COMMIT_AT ??
	(readGitValue('git log -1 --format=%cI'));
const gitSha = process.env.GIT_SHA ?? readGitValue('git rev-parse --short HEAD');

function readGitValue(command: string): string {
	try {
		return execSync(command, { encoding: 'utf8' }).trim();
	} catch {
		return '';
	}
}

export default defineConfig({
	base,
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
		VitePWA({
			mode: 'production',
			strategies: 'injectManifest',
			injectRegister: 'auto',
			srcDir: 'src/lib',
			filename: 'service-worker.js',
			scope: base,
			base: base,
			disable: process.env.NODE_ENV === 'development',
			manifest: {
				name: 'Farert - JR運賃計算',
				short_name: 'Farert',
				description: 'JR線の経路と運賃を計算するアプリ',
				theme_color: '#9333ea',
				background_color: '#ffffff',
				display: 'standalone',
				start_url: base,
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
				globPatterns: ['**/*.{js,css,html,svg,png,wasm}']
			}
		})
	],
	define: {
		__APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? 'dev'),
		__BUILD_AT__: JSON.stringify(buildAt),
		__GIT_COMMIT_AT__: JSON.stringify(gitCommitAt),
		__GIT_SHA__: JSON.stringify(gitSha)
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
