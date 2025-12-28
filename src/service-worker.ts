/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { build, files, version } from '$service-worker';

declare const self: ServiceWorkerGlobalScope & {
	__WB_MANIFEST?: Array<{ url: string; revision?: string }>;
};

const sw = self as unknown as ServiceWorkerGlobalScope;

const precacheManifest = self.__WB_MANIFEST ?? [];
const manifestUrls = precacheManifest.map((entry) => entry.url);

// 開発モードでは何もしない
const isDev = import.meta.env.DEV;

if (isDev) {
	sw.addEventListener('install', () => {
		sw.skipWaiting();
	});
	sw.addEventListener('activate', () => {
		// 何もしない
	});
	sw.addEventListener('fetch', (event) => {
		// パススルー
		return;
	});
} else {

const CACHE_NAME = `farert-cache-${version}`;

// キャッシュするファイル
const assetSet = new Set<string>([...build, ...files, ...manifestUrls]);
const ASSETS = Array.from(assetSet);

// インストール時
sw.addEventListener('install', (event) => {
	async function addFilesToCache() {
		const cache = await caches.open(CACHE_NAME);
		await cache.addAll(ASSETS);
	}

	event.waitUntil(addFilesToCache());
});

// アクティベート時
sw.addEventListener('activate', (event) => {
	async function deleteOldCaches() {
		for (const key of await caches.keys()) {
			if (key !== CACHE_NAME) await caches.delete(key);
		}
	}

	event.waitUntil(deleteOldCaches());
});

// フェッチ時
sw.addEventListener('fetch', (event) => {
	if (event.request.method !== 'GET') return;

	async function respond() {
		const url = new URL(event.request.url);
		const cache = await caches.open(CACHE_NAME);

		// ビルドファイルはキャッシュから優先
		if (ASSETS.includes(url.pathname)) {
			const cachedResponse = await cache.match(url.pathname);
			if (cachedResponse) {
				return cachedResponse;
			}
		}

		// ネットワークを試行
		try {
			const response = await fetch(event.request);

			// 成功したらキャッシュに保存
			if (response.status === 200) {
				cache.put(event.request, response.clone());
			}

			return response;
		} catch {
			// オフライン時はキャッシュから返す
			const cachedResponse = await cache.match(event.request);
			if (cachedResponse) {
				return cachedResponse;
			}

			// フォールバック: index.htmlを返す（SPAルーティング用）
			return cache.match('/') || new Response('Not found', { status: 404 });
		}
	}

	event.respondWith(respond());
});

} // end else (production mode)
