<script lang="ts">
	import { goto } from '$app/navigation';
import { base } from '$app/paths';
	import { onMount } from 'svelte';
	import { initFarert, databaseInfo } from '$lib/wasm';
	import { APP_VERSION, BUILD_AT, GIT_COMMIT_AT, GIT_SHA } from '$lib/version';

	interface DbMeta {
		name: string;
		createDate: string;
		tax: number | null;
	}

	let loading = $state(true);
	let error = $state('');
	let appVersion = $state(APP_VERSION);
	let buildAt = $state(BUILD_AT);
	let gitCommitAt = $state(GIT_COMMIT_AT);
	let gitSha = $state(GIT_SHA);
	let dbMeta = $state<DbMeta>({ name: '', createDate: '', tax: null });
	let checkingUpdate = $state(false);
	let updateMessage = $state('');
	let updateWorker = $state<ServiceWorker | null>(null);

	onMount(() => {
		(async () => {
			try {
				await initFarert();
				dbMeta = parseDatabaseInfo(databaseInfo());
			} catch (err) {
				console.error('バージョン情報の取得に失敗しました', err);
				error = 'バージョン情報の取得に失敗しました。';
			} finally {
				loading = false;
			}
		})();
	});

	function parseDatabaseInfo(raw: unknown): DbMeta {
		if (typeof raw !== 'string') return { name: '', createDate: '', tax: null };
		try {
			const parsed = JSON.parse(raw) as {
				dbName?: string;
				createdate?: string;
				tax?: number;
				name?: string;
				create_date?: string;
				createdbdate?: string;
				dbverInf?: { dbName?: string; createdate?: string; name?: string; create_date?: string; createdbdate?: string; tax?: number };
			};
			const name =
				parsed.dbName ??
				parsed.dbverInf?.dbName ??
				parsed.name ??
				parsed.dbverInf?.name ??
				'';
			const createDate =
				parsed.createdate ??
				parsed.dbverInf?.createdate ??
				parsed.createdbdate ??
				parsed.create_date ??
				parsed.dbverInf?.createdbdate ??
				parsed.dbverInf?.create_date ??
				'';
			const rawTax = parsed.tax ?? parsed.dbverInf?.tax ?? null;
			const tax =
				typeof rawTax === 'number'
					? rawTax
					: typeof rawTax === 'string' && rawTax.trim() !== ''
						? Number(rawTax)
						: null;
			return { name, createDate, tax: typeof tax === 'number' && !Number.isNaN(tax) ? tax : null };
		} catch (err) {
			console.warn('DB情報の解析に失敗しました', err);
			return { name: '', createDate: '', tax: null };
		}
	}

	function openSupport(): void {
		if (typeof window !== 'undefined') {
			window.open('http://farert.blogspot.jp/', '_blank', 'noopener');
		}
	}

	function close(): void {
		goto(`${base}/`);
	}

	function registerPendingWorker(worker: ServiceWorker | null): boolean {
		if (!worker) return false;
		if (!navigator.serviceWorker.controller) return false;
		updateWorker = worker;
		updateMessage = '更新候補が見つかりました。反映して最新版を使えます。';
		return true;
	}

	async function applyUpdate(): Promise<void> {
		if (!('serviceWorker' in navigator) || !updateWorker) {
			updateMessage = '更新対象が見つかりません。';
			return;
		}

		let hasReloaded = false;
		const onControllerChange = () => {
			hasReloaded = true;
			window.removeEventListener('controllerchange', onControllerChange);
			window.location.reload();
		};
		window.addEventListener('controllerchange', onControllerChange, { once: true });

		window.setTimeout(() => {
			if (!hasReloaded) {
				window.location.reload();
			}
		}, 1200);

		try {
			updateWorker.postMessage({ type: 'SKIP_WAITING' });
		} catch (err) {
			console.warn('SW更新通知の送信に失敗しました', err);
			if (!hasReloaded) {
				window.location.reload();
			}
		}
	}

	async function checkAndApplyUpdate(): Promise<void> {
		if (!('serviceWorker' in navigator)) {
			updateMessage = 'この環境ではService Workerを更新できません。';
			return;
		}

		checkingUpdate = true;
		updateMessage = '更新の確認を開始しています...';
		updateWorker = null;

		try {
			const registration = await navigator.serviceWorker.getRegistration();
			if (!registration) {
				updateMessage = 'Service Workerが未登録です。';
				return;
			}

			if (registerPendingWorker(registration.waiting)) {
				await applyUpdate();
				return;
			}

			await registration.update();
			await new Promise((resolve) => {
				setTimeout(resolve, 300);
			});

			if (registerPendingWorker(registration.waiting)) {
				await applyUpdate();
			} else if (registration.installing) {
				await new Promise<void>((resolve) => {
					const clearState = () => {
						registration.installing?.removeEventListener('statechange', onStateChange);
						resolve();
					};
					const onStateChange = () => {
						if (
							registration.installing?.state === 'installed' ||
							registration.installing?.state === 'redundant'
						) {
							clearState();
						}
					};
					registration.installing.addEventListener('statechange', onStateChange);
				});

				if (registerPendingWorker(registration.waiting)) {
					await applyUpdate();
				} else {
					updateMessage = '更新は見つかりませんでした。';
				}
			} else {
				updateMessage = '更新は見つかりませんでした。';
			}
		} catch (err) {
			console.error('SW更新の確認に失敗しました', err);
			updateMessage = '更新の確認に失敗しました。';
		} finally {
			checkingUpdate = false;
		}
	}

	const taxText = $derived(
		dbMeta.tax === null || Number.isNaN(dbMeta.tax) ? '—%' : `${dbMeta.tax}%`
	);

	function formatDateTime(value: string): string {
		if (!value) return '—';
		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return value;
		return new Intl.DateTimeFormat('ja-JP', {
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			timeZone: 'Asia/Tokyo'
		}).format(date);
	}

	const buildText = $derived(formatDateTime(buildAt));
	const commitText = $derived.by(() => {
		const commitDate = formatDateTime(gitCommitAt);
		const shortSha = gitSha ? gitSha : '';
		if (commitDate === '—' && !shortSha) return '—';
		if (commitDate === '—') return shortSha;
		if (!shortSha) return commitDate;
		return `${commitDate} (${shortSha})`;
	});
</script>

<div class="version-page">
	{#if loading}
		<p class="banner">読み込み中です...</p>
	{:else}
		{#if error}
			<p class="banner error" role="alert">{error}</p>
		{/if}
		<img src="{base}/trade-icon.png" alt="Farert" class="hero-icon" />
		<h1>バージョン情報</h1>
		<p class="app-version">Farert {appVersion}</p>
		<p class="build-at">ビルド日時: {buildText}</p>
		<p class="commit-info">コミット: {commitText}</p>

		<section class="block">
			<p class="db">DB Rev. [{dbMeta.name || '—'}] ({dbMeta.createDate || '—'})</p>
			<p class="tax">消費税: {taxText}</p>
		</section>

		<p class="copyright">Copyright © 2015-2023 Sutezo</p>

		<section class="eula">
			<p>
				本アプリで表示される結果は必ずしも正確な情報ではないことがありえます。<br />
				実際のご旅行での費用とは異なることがありえますことをご理解の上ご利用ください。<br />
				複製・2次使用は許可なく利用できますが、アプリにより発生したあらゆる損害は作者は負いません。<br />
				免責・ライセンスの詳細は
				<a
					href="https://github.com/farert/farert-pwa/blob/main/README.md"
					target="_blank"
					rel="noopener noreferrer"
				>
					README.md
				</a>
				の「免責・利用上の注意」と
				<a href="https://github.com/farert/farert-pwa/blob/main/LICENSE" target="_blank" rel="noopener noreferrer">
					<code>LICENSE</code>
				</a>
				をご確認ください。  
			</p>
		</section>

		<button type="button" class="link-button" onclick={openSupport}>
			http://farert.blogspot.jp/
		</button>
		{#if updateMessage}
			<p class="banner">{updateMessage}</p>
		{/if}
		<button type="button" class="close-button" onclick={checkAndApplyUpdate} disabled={checkingUpdate}>
			{#if checkingUpdate}
				更新確認中...
			{:else}
				更新を確認
			{/if}
		</button>

		<button type="button" class="close-button" onclick={close}>OK</button>
	{/if}
</div>

<style>
	.version-page {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1rem;
		padding: 2rem 1.5rem 3rem;
		text-align: center;
		background: var(--page-bg);
		color: var(--text-main);
	}

	.app-version {
		margin: 0.5rem 0;
		font-weight: 700;
		font-size: 1.1rem;
		color: var(--nav-btn-text);
	}

	.build-at,
	.commit-info {
		margin: 0;
		font-weight: 600;
		color: var(--text-sub);
	}

	.hero-icon {
		width: 96px;
		height: 96px;
		object-fit: contain;
	}

	h1 {
		margin: 0;
		font-size: 1.25rem;
	}

	.block {
		margin-top: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}

	.db,
	.tax {
		margin: 0;
		font-weight: 600;
	}

	.tax {
		color: var(--text-sub);
	}

	.banner {
		padding: 0.8rem 1rem;
		border-radius: 0.75rem;
		background: var(--info-bg);
		color: var(--info-text);
	}

	.banner.error {
		background: var(--error-bg);
		color: var(--error-text);
	}

	.copyright {
		margin: 0.5rem 0;
		color: var(--text-main);
	}

	.eula {
		max-width: 420px;
		background: var(--card-bg);
		padding: 1rem;
		border-radius: 0.85rem;
		box-shadow: var(--card-shadow);
		color: var(--text-main);
		font-size: 0.95rem;
		line-height: 1.6;
	}

	.link-button {
		border: none;
		background: none;
		color: var(--link);
		font-weight: 700;
		text-decoration: underline;
		cursor: pointer;
	}

	.close-button {
		border: none;
		background: var(--primary);
		color: #fff;
		padding: 0.75rem 2.5rem;
		border-radius: 999px;
		font-weight: 700;
		font-size: 1rem;
	}
</style>
