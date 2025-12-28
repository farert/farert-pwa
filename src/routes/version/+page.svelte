<script lang="ts">
	import { goto } from '$app/navigation';
import { base } from '$app/paths';
	import { onMount } from 'svelte';
	import { initFarert, databaseInfo } from '$lib/wasm';
	import { APP_VERSION } from '$lib/version';

	interface DbMeta {
		name: string;
		createDate: string;
		tax: number | null;
	}

	let loading = $state(true);
	let error = $state('');
	let appVersion = $state(APP_VERSION);
	let dbMeta = $state<DbMeta>({ name: '', createDate: '', tax: null });

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

	const taxText = $derived(
		dbMeta.tax === null || Number.isNaN(dbMeta.tax) ? '—%' : `${dbMeta.tax}%`
	);
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

		<section class="block">
			<p class="db">DB Rev. [{dbMeta.name || '—'}] ({dbMeta.createDate || '—'})</p>
			<p class="tax">消費税: {taxText}</p>
		</section>

		<p class="copyright">Copyright © 2015-2023 Sutezo</p>

		<section class="eula">
			<p>
				本アプリを使用することにより、利用規約および使用許諾契約に同意したものとみなされます。無断転載・再配布を禁じます。
			</p>
		</section>

		<button type="button" class="link-button" onclick={openSupport}>
			http://farert.blogspot.jp/
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
		background: #f8fafc;
		color: #0f172a;
	}

	.app-version {
		margin: 0.5rem 0;
		font-weight: 700;
		font-size: 1.1rem;
		color: #4c1d95;
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
		color: #6b7280;
	}

	.banner {
		padding: 0.8rem 1rem;
		border-radius: 0.75rem;
		background: #e0f2fe;
		color: #0369a1;
	}

	.banner.error {
		background: #fee2e2;
		color: #b91c1c;
	}

	.copyright {
		margin: 0.5rem 0;
		color: #374151;
	}

	.eula {
		max-width: 420px;
		background: #fff;
		padding: 1rem;
		border-radius: 0.85rem;
		box-shadow: 0 6px 18px rgba(15, 23, 42, 0.08);
		color: #111827;
		font-size: 0.95rem;
		line-height: 1.6;
	}

	.link-button {
		border: none;
		background: none;
		color: #2563eb;
		font-weight: 700;
		text-decoration: underline;
		cursor: pointer;
	}

	.close-button {
		border: none;
		background: #2563eb;
		color: #fff;
		padding: 0.75rem 2.5rem;
		border-radius: 999px;
		font-weight: 700;
		font-size: 1rem;
	}
</style>
