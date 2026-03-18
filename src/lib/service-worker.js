/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

/** @type {ServiceWorkerGlobalScope & { __WB_MANIFEST?: Array<{ url: string; revision?: string }> }} */
const sw = self;

const precacheManifest = self.__WB_MANIFEST ?? [];
const manifestUrls = precacheManifest.map((entry) => entry.url);
const basePath = new URL(import.meta.env.BASE_URL || '/', self.location.origin).pathname;
const shellPath = basePath.endsWith('/') ? basePath : `${basePath}/`;

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
	sw.addEventListener('message', (event) => {
		if (event.data?.type === 'SKIP_WAITING') {
			sw.skipWaiting();
		}
	});

	const CACHE_NAME = `farert-cache-${hashManifest(precacheManifest)}`;

	// キャッシュするファイル
	const assetSet = new Set([...manifestUrls]);
	const ASSETS = Array.from(assetSet);

	/**
	 * SPA のエントリ（シェル）として返却する候補
	 * @returns {string[]}
	 */
	function getShellCandidates() {
		const indexShell = `${shellPath}index.html`.replace('//', '/');
		return [shellPath, indexShell, '/'];
	}

	/**
	 * キャッシュからシェルを返却する
	 * @param {Cache} cache
	 * @returns {Promise<Response | null>}
	 */
	async function getCachedShell(cache) {
		for (const candidate of getShellCandidates()) {
			const response = await cache.match(candidate);
			if (response) {
				return response;
			}
		}
		return null;
	}

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
				if (key !== CACHE_NAME) {
					await caches.delete(key);
				}
			}
		}

		sw.clients.claim();
		event.waitUntil(deleteOldCaches());
	});

	// フェッチ時
	sw.addEventListener('fetch', (event) => {
		if (event.request.method !== 'GET') {
			return;
		}

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

				if (event.request.mode === 'navigate') {
					return (await getCachedShell(cache)) || new Response('Not found', { status: 404 });
				}

				// その他は404
				return new Response('Not found', { status: 404 });
			}
		}

		event.respondWith(respond());
	});

} // end else (production mode)

/**
 * @param {Array<{ url: string; revision?: string }>} manifest
 * @returns {string}
 */
function hashManifest(manifest) {
	let hash = 0;
	for (const entry of manifest) {
		const value = `${entry.url}:${entry.revision ?? ''}`;
		for (let i = 0; i < value.length; i += 1) {
			hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
		}
	}

	return hash.toString(16);
}
