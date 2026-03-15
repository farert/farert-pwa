<script lang="ts">
	import { onMount } from 'svelte';
	import '../app.css';

	let { children } = $props();
	let updateAvailable = $state(false);
	let updateWorker = $state<ServiceWorker | null>(null);
	let dismissUpdate = $state(false);
	let updatePreview = $state(false);

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
		const isUpdatePreview = () => {
			if (typeof window === 'undefined') return false;
			return new URLSearchParams(window.location.search).get('sw-update-preview') === '1';
		};

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
				})
				.finally(() => {
					if (isUpdatePreview() && !updateAvailable) {
						updateAvailable = true;
						updateWorker = null;
						updatePreview = true;
					}
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
	<div class="update-banner-wrap">
		<div class="update-banner">
			<div class="update-content">
				<div class="update-icon" aria-hidden="true">⟳</div>
				<div class="update-text">
					<p class="update-title">
						{#if updatePreview}
							テスト表示
						{:else}
							アプリ更新の通知
						{/if}
					</p>
					<p class="update-message">
						{#if updatePreview}
							【テスト表示】更新バナーの見た目確認
						{:else}
							新しいアプリバージョンが利用可能です。反映して最新状態に更新しますか？
						{/if}
					</p>
					<div class="update-actions">
						<button class="update-btn update-btn-secondary" on:click={closeUpdatePrompt}>
							あとで
						</button>
						<button
							class="update-btn"
							on:click={applyUpdate}
							disabled={updateWorker === null}
							title={updateWorker === null ? 'テスト表示では実反映なし' : 'Service Workerを適用'}
						>
							今すぐ反映
						</button>
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}

<div class={updateAvailable && !dismissUpdate ? 'pt-20' : ''}>
	{@render children()}
</div>

<style>
	.update-banner-wrap {
		position: fixed;
		inset-inline: 0;
		top: 0;
		z-index: 60;
		padding: 0.5rem 1rem 1rem;
		pointer-events: auto;
		animation: update-banner-pop 180ms ease-out;
	}

	.update-banner {
		margin: 0 auto;
		max-width: 48rem;
		border-radius: 1rem;
		border: 1px solid rgba(255, 255, 255, 0.35);
		box-shadow: 0 24px 45px rgba(15, 23, 42, 0.25);
		background: linear-gradient(120deg, #f59e0b 0%, #f97316 70%, #fb923c 100%);
		color: #fff7ed;
		padding: 1rem;
	}

	.update-content {
		display: grid;
		grid-template-columns: auto 1fr auto;
		gap: 0.75rem;
		align-items: center;
	}

	.update-icon {
		width: 2rem;
		height: 2rem;
		display: grid;
		place-items: center;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.2);
		font-weight: 700;
		font-size: 1rem;
	}

	.update-text {
		line-height: 1.3;
	}

	.update-title {
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		opacity: 0.95;
		margin: 0 0 0.2rem;
	}

	.update-message {
		font-size: 0.85rem;
		font-weight: 600;
		margin: 0;
	}

	.update-actions {
		display: flex;
		gap: 0.5rem;
		justify-content: end;
	}

	.update-btn {
		border: 0;
		border-radius: 999px;
		padding: 0.4rem 0.85rem;
		font-size: 0.8rem;
		font-weight: 700;
		background: #fff;
		color: #7c2d12;
		cursor: pointer;
		box-shadow: 0 8px 20px rgba(124, 45, 18, 0.25);
		white-space: nowrap;
	}

	.update-btn:hover {
		background: #fff7ed;
	}

	.update-btn:disabled {
		background: rgba(255, 255, 255, 0.55);
		color: rgba(124, 45, 18, 0.65);
		box-shadow: none;
		cursor: default;
	}

	.update-btn-secondary {
		background: rgba(255, 255, 255, 0.18);
		border: 1px solid rgba(255, 255, 255, 0.5);
		color: #fff;
		box-shadow: none;
	}

	@media (max-width: 640px) {
		.update-content {
			grid-template-columns: auto 1fr;
			grid-template-areas:
				'icon title'
				'icon text'
				'actions actions';
		}

		.update-icon {
			grid-area: icon;
			align-self: start;
			margin-top: 0.2rem;
		}

		.update-text {
			grid-area: text;
		}

		.update-title {
			grid-area: title;
		}

		.update-actions {
			grid-area: actions;
			justify-content: stretch;
		}

		.update-btn {
			flex: 1;
			text-align: center;
		}
	}

	@keyframes update-banner-pop {
		from {
			transform: translateY(-100%);
			opacity: 0.5;
		}
		to {
			transform: translateY(0);
			opacity: 1;
		}
	}

	:global(html[data-theme='dark']) .update-banner {
		background: linear-gradient(120deg, #7c3aed 0%, #9333ea 70%, #a855f7 100%);
		border-color: rgba(255, 255, 255, 0.3);
	}
</style>
