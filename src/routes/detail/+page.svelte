<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { decompressRouteFromUrl } from '$lib/utils/urlRoute';
	import type { FareInfo } from '$lib/types';
	import { initFarert } from '$lib/wasm';
	import type { FaretClass } from '$lib/wasm/types';

	let loading = $state(true);
	let error = $state('');
	let fareInfo = $state<FareInfo | null>(null);
	let routeScript = $state('');
	let beginStation = $state('');
	let endStation = $state('');
	let messages = $state<string[]>([]);
	let totalSalesKm = $state<number | null>(null);
	let route = $state<FaretClass | null>(null);
	let { initialCompressedRoute = '' } = $props<{ initialCompressedRoute?: string }>();

	onMount(async () => {
		try {
			await initFarert();
			let compressed =
				initialCompressedRoute ||
				new URLSearchParams(window.location.search).get('r') ||
				'';

			if (!compressed) {
				error = '経路データが指定されていません。';
				loading = false;
				return;
			}

			const restored = decompressRouteFromUrl(compressed);
			if (!restored) {
				error = '経路データの復元に失敗しました。';
				loading = false;
				return;
			}

			route = restored;
			routeScript = restored.routeScript();
			beginStation = restored.departureStationName();
			endStation = restored.arrivevalStationName();

			try {
				const parsed = JSON.parse(restored.getFareInfoObjectJson()) as FareInfo;
				fareInfo = parsed;
				messages = Array.isArray(parsed.messages) ? parsed.messages : [];
				totalSalesKm =
					typeof parsed.totalSalesKm === 'number' ? parsed.totalSalesKm : parsed.distance ?? null;
			} catch (parseError) {
				console.error('運賃情報の解析に失敗', parseError);
				error = '運賃情報の解析に失敗しました。';
			}
		} catch (err) {
			console.error('詳細画面初期化エラー', err);
			error = `詳細画面の初期化に失敗しました: ${err}`;
		} finally {
			loading = false;
		}
	});

	function goBack() {
		goto('/');
	}
</script>

<div class="detail-container">
	<h1>Farert - 経路詳細</h1>

	{#if loading}
		<p class="info">経路データを読み込み中です...</p>
	{:else if error}
		<div class="error-card">
			<p>{error}</p>
			<button onclick={goBack}>メイン画面に戻る</button>
		</div>
	{:else if fareInfo && route}
		<section class="summary-card">
			<h2>{beginStation} → {endStation}</h2>
			<p class="route-script">{routeScript}</p>
			<div class="stats">
				<div>
					<p class="label">運賃</p>
					<p class="value">¥{fareInfo.fare?.toLocaleString() ?? '—'}</p>
				</div>
				<div>
					<p class="label">営業キロ</p>
					<p class="value">{totalSalesKm ?? '—'} km</p>
				</div>
				<div>
					<p class="label">有効日数</p>
					<p class="value">{fareInfo.ticketAvailDays ?? '—'} 日</p>
				</div>
			</div>
		</section>

		<section>
			<h3>詳細情報</h3>
			<pre class="fare-json">{JSON.stringify(fareInfo, null, 2)}</pre>
		</section>

		{#if messages.length > 0}
			<section>
				<h3>注意事項</h3>
				<ul>
					{#each messages as message}
						<li>{message}</li>
					{/each}
				</ul>
			</section>
		{/if}

		<div class="actions">
			<button onclick={goBack}>メインへ戻る</button>
		</div>
	{:else}
		<div class="error-card">
			<p>運賃情報が取得できませんでした。</p>
			<button onclick={goBack}>メイン画面に戻る</button>
		</div>
	{/if}
</div>

<style>
	.detail-container {
		max-width: 960px;
		margin: 0 auto;
		padding: 2rem 1.5rem;
		font-family: system-ui, -apple-system, sans-serif;
	}

	h1 {
		color: #111827;
		margin-bottom: 1rem;
	}

	.info {
		padding: 1rem;
		background: #eff6ff;
		border-radius: 0.5rem;
		color: #1e40af;
	}

	.error-card {
		background: #fee2e2;
		color: #7f1d1d;
		padding: 1rem;
		border-radius: 0.5rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	button {
		align-self: flex-start;
		padding: 0.5rem 1.25rem;
		background-color: #9333ea;
		color: white;
		border: none;
		border-radius: 9999px;
		font-weight: 600;
		cursor: pointer;
	}

	.summary-card {
		background: #f8fafc;
		border: 1px solid #cbd5e1;
		border-radius: 0.75rem;
		padding: 1.5rem;
		margin-bottom: 1.5rem;
	}

	.route-script {
		color: #475569;
		margin: 0.75rem 0 1rem;
		font-family: 'Courier New', monospace;
	}

	.stats {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
		gap: 1rem;
	}

	.label {
		font-size: 0.875rem;
		color: #64748b;
		margin-bottom: 0.25rem;
	}

	.value {
		font-size: 1.25rem;
		font-weight: 600;
		color: #1f2937;
	}

	section {
		margin-bottom: 1.5rem;
	}

	.fare-json {
		background: #0f172a;
		color: #f8fafc;
		padding: 1rem;
		border-radius: 0.5rem;
		overflow-x: auto;
		font-size: 0.875rem;
	}

	ul {
		padding-left: 1.25rem;
	}

	.actions {
		display: flex;
		justify-content: flex-end;
	}
</style>
