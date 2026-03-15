<script lang="ts">
	import { onMount } from 'svelte';
	import '../app.css';

	let { children } = $props();
	let updateAvailable = $state(false);
	let updateWorker = $state<ServiceWorker | null>(null);
	let dismissUpdate = $state(false);

	let cleanupServiceWorker: (() => void) | null = null;
	let autoApplyTimer: ReturnType<typeof setTimeout> | null = null;

	function scheduleAutoApply(): void {
		if (autoApplyTimer) {
			clearTimeout(autoApplyTimer);
		}
		autoApplyTimer = setTimeout(() => {
			applyUpdate();
		}, 400);
	}

	onMount(() => {
		const setupUpdateListener = (registration: ServiceWorkerRegistration) => {
			const registerWaitingWorker = (worker: ServiceWorker | null): void => {
				if (!worker) return;
				if (!navigator.serviceWorker.controller) {
					return;
				}
				updateWorker = worker;
				updateAvailable = true;
				dismissUpdate = false;
				scheduleAutoApply();
			};

			if (registration.waiting) {
				registerWaitingWorker(registration.waiting);
			}

			const onUpdateFound = () => {
				const installingWorker = registration.installing;
				if (!installingWorker) return;

				const onStateChange = () => {
					if (installingWorker.state === 'installed') {
						registerWaitingWorker(installingWorker);
					}
					if (installingWorker.state === 'installed' || installingWorker.state === 'redundant') {
						installingWorker.removeEventListener('statechange', onStateChange);
					}
				};
				installingWorker.addEventListener('statechange', onStateChange);
			};

			registration.addEventListener('updatefound', onUpdateFound);

			return () => {
				registration.removeEventListener('updatefound', onUpdateFound);
			};
		};

		let theme: 'light' | 'dark' = 'light';

		if (typeof localStorage !== 'undefined') {
			const stored = localStorage.getItem('theme');
			if (stored === 'light' || stored === 'dark') {
				theme = stored;
			}
		}

		if (typeof window !== 'undefined' && theme === 'light') {
			if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
				theme = 'dark';
			}
		}

		if (typeof document !== 'undefined') {
			document.documentElement.setAttribute('data-theme', theme);
		}

		if ('serviceWorker' in navigator) {
			navigator.serviceWorker
				.getRegistration()
				.then(async (registration) => {
					if (!registration) return;
					await registration.update().catch(() => {
						// 更新確認失敗時は自動更新しない
					});
					const cleanup = setupUpdateListener(registration);
					cleanupServiceWorker = cleanup ?? null;
				})
				.catch(() => {
					// SW登録取得失敗時は更新チェックを行わない
				});
		}

		return () => {
			cleanupServiceWorker?.();
			if (autoApplyTimer) {
				clearTimeout(autoApplyTimer);
				autoApplyTimer = null;
			}
		};
	});

	function applyUpdate(): void {
		if (!updateAvailable || !updateWorker) return;

		const onControllerChange = () => {
			window.removeEventListener('controllerchange', onControllerChange);
			window.location.reload();
		};
		window.addEventListener('controllerchange', onControllerChange, { once: true });
		updateWorker.postMessage({ type: 'SKIP_WAITING' });
	}

	function closeUpdatePrompt(): void {
		dismissUpdate = true;
		updateAvailable = false;
	}
</script>

<svelte:head>
	<title>経路運賃営業キロ計算アプリ Farert</title>
	<link rel="icon" href="/favicon.png" />
</svelte:head>

{#if updateAvailable && !dismissUpdate}
	<div class="fixed inset-x-0 top-0 z-50 border-b border-white/20 bg-amber-500 px-4 py-2 text-white shadow-lg">
		<div class="mx-auto flex max-w-3xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
			<p class="text-sm">新しいバージョンがあります。更新してください。</p>
			<div class="flex items-center gap-2">
				<button class="rounded border border-white/50 px-3 py-1 text-xs" on:click={closeUpdatePrompt}>あとで</button>
				<button class="rounded bg-white px-3 py-1 text-xs font-semibold text-amber-700" on:click={applyUpdate}>更新</button>
			</div>
		</div>
	</div>
{/if}

<div class={updateAvailable && !dismissUpdate ? 'pt-20' : ''}>
	{@render children()}
</div>
