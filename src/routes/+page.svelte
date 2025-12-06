<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { initFarert, Farert } from '$lib/wasm';
	import type { FaretClass } from '$lib/wasm/types';
	import type { FareInfo } from '$lib/types';
	import { initStores, mainRoute } from '$lib/stores';
	import { generateShareUrl } from '$lib/utils/urlRoute';

	interface RouteSegment {
		id: number;
		line: string;
		station: string;
	}

	const OSAKA_LOOP_LINE = '大阪環状線';
	const KOKURA_STATION = '小倉';
	const HAKATA_STATION = '博多';

	let loading = $state(true);
	let error = $state('');
	let route = $state<FaretClass | null>(null);
	let startStation = $state('');
	let segments = $state<RouteSegment[]>([]);
	let fareInfo = $state<FareInfo | null>(null);
	let detailLink = $state('');
	let canUndo = $state(false);
	let canReverse = $state(false);
	let optionEnabled = $state(false);

	onMount(() => {
		let unsubscribe: (() => void) | null = null;

		(async () => {
			try {
				await initFarert();
				initStores(Farert);
				unsubscribe = mainRoute.subscribe((value) => {
					route = value;
					refreshRouteState(value);
				});
			} catch (err) {
				console.error('メイン画面初期化エラー', err);
				error = `メイン画面の初期化に失敗しました: ${err}`;
			} finally {
				loading = false;
			}
		})();

		return () => {
			unsubscribe?.();
		};
	});

	function refreshRouteState(current: FaretClass | null) {
		if (!current) {
			resetView();
			return;
		}

		const script = current.routeScript().trim();
		if (!script) {
			resetView();
			return;
		}

		const tokens = script
			.split(',')
			.map((token) => token.trim())
			.filter((token) => token.length > 0);

		startStation = tokens[0] ?? '';

		const parsedSegments: RouteSegment[] = [];
		for (let i = 1, segIndex = 0; i < tokens.length; i += 2, segIndex += 1) {
			const lineName = tokens[i];
			const stationName = tokens[i + 1];
			if (!lineName || !stationName) continue;
			parsedSegments.push({
				id: segIndex,
				line: lineName,
				station: stationName
			});
		}

		segments = parsedSegments;
		canUndo = parsedSegments.length > 0;

		try {
			fareInfo = JSON.parse(current.getFareInfoObjectJson()) as FareInfo;
		} catch (err) {
			console.warn('運賃情報の解析に失敗しました', err);
			fareInfo = null;
		}

		try {
			detailLink = generateShareUrl(current);
		} catch (err) {
			console.error('シェアURLの生成に失敗しました', err);
			detailLink = '';
		}

		canReverse = current.isAvailableReverse ? current.isAvailableReverse() : parsedSegments.length > 0;
		updateOptionAvailability(tokens);
	}

	function resetView() {
		startStation = '';
		segments = [];
		fareInfo = null;
		detailLink = '';
		canUndo = false;
		canReverse = false;
		optionEnabled = false;
	}

	function updateOptionAvailability(tokens: string[]) {
		const stationTokens: string[] = [];
		for (let i = 0; i < tokens.length; i += 2) {
			if (tokens[i]) stationTokens.push(tokens[i]);
		}

		const hasOsakaLoop = segments.some((segment) => segment.line === OSAKA_LOOP_LINE);
		const hasKokuraHakata =
			stationTokens.includes(KOKURA_STATION) && stationTokens.includes(HAKATA_STATION);

		optionEnabled = hasOsakaLoop || hasKokuraHakata;
	}

	function ensureRoute(): FaretClass {
		if (route) return route;
		const next = new Farert();
		route = next;
		mainRoute.set(next);
		return next;
	}

	function openDrawer() {
		const event = new CustomEvent('open-ticket-holder');
		window.dispatchEvent(event);
	}

	function openVersionInfo() {
		goto('/version');
	}

	function openTerminalSelection() {
		goto('/terminal-selection');
	}

	function openRouteAddition() {
		if (!startStation) {
			error = '先に発駅を設定してください';
			return;
		}
		goto('/line-selection');
	}

	function openSegmentDetail(segmentIndex: number) {
		if (!route) return;
		try {
			const url = generateShareUrl(route, segmentIndex);
			goto(url);
		} catch (err) {
			error = `詳細画面を開けませんでした: ${err}`;
		}
	}

	function openFullDetail() {
		if (!route || !detailLink) return;
		goto(detailLink);
	}

	function handleUndo() {
		if (!route || !canUndo) return;
		route.removeTail();
		mainRoute.set(route);
		refreshRouteState(route);
	}

	function handleReverse() {
		if (!route || !canReverse) return;
		const result = route.reverse();
		if (result !== 0) {
			error = '経路の反転に失敗しました。';
			return;
		}
		mainRoute.set(route);
		refreshRouteState(route);
	}

	function openOptions() {
		if (!optionEnabled) return;
		goto('/option-menu');
	}

	function openSave() {
		goto('/save');
	}
</script>

<div class="page">
	<header class="top-bar">
		<button type="button" class="icon-button" aria-label="きっぷホルダ" onclick={openDrawer}>
			☰
		</button>
		<div class="title">
			<h1>Farert</h1>
			<p>JR運賃計算</p>
		</div>
		<button type="button" class="icon-button" aria-label="バージョン情報" onclick={openVersionInfo}>
			⋮
		</button>
	</header>

	{#if loading}
		<p class="info-banner">データを読み込み中です...</p>
	{:else}
		{#if error}
			<div class="error-banner" role="alert">
				<p>{error}</p>
				<button type="button" class="text-button" onclick={() => (error = '')}>閉じる</button>
			</div>
		{/if}

		<button type="button" class="card station-card actionable" onclick={openTerminalSelection}>
			<h2>発駅</h2>
			{#if startStation}
				<p class="station-name">{startStation}</p>
			{:else}
				<p class="placeholder">発駅を指定してください</p>
			{/if}
		</button>

		<section class="segment-section">
			<p class="section-title">経路区間</p>
			{#if segments.length === 0}
				<p class="placeholder">まだ区間が追加されていません</p>
			{:else}
				<ul class="segment-cards">
					{#each segments as segment, index}
						<li>
							<button
								type="button"
								class="card route-card actionable"
								onclick={() => openSegmentDetail(segment.id)}
								aria-label={`区間 ${index + 1} (${segment.line} → ${segment.station})`}
							>
								<span class="route-badge" aria-hidden="true">{index + 1}</span>
								<div class="route-info">
									<p class="route-line">{segment.line}</p>
									<p class="route-station">{segment.station}</p>
								</div>
								<span class="chevron" aria-hidden="true">&gt;</span>
							</button>
						</li>
					{/each}
				</ul>
			{/if}
		</section>

		<button
			type="button"
			class="card add-route-card actionable"
			onclick={openRouteAddition}
			disabled={!startStation}
			aria-disabled={!startStation}
		>
			<span>+ 経路を追加</span>
			<p>路線 → 着駅の順で選択します</p>
		</button>

		{#if fareInfo && segments.length > 0}
			<section class="card fare-summary">
				<div class="fare-rows">
					<div class="fare-item">
						<p class="label">普通運賃</p>
						<p class="value">¥{fareInfo.fare?.toLocaleString?.() ?? '—'}</p>
					</div>
					<div class="fare-item">
						<p class="label">営業キロ</p>
						<p class="value">
							{(fareInfo.totalSalesKm as number | undefined) ??
							(fareInfo.distance as number | undefined) ??
							'—'} km
						</p>
					</div>
					<div class="fare-item">
						<p class="label">有効日数</p>
						<p class="value">
							{(fareInfo.ticketAvailDays as number | undefined) ?? fareInfo.validDays ?? '—'} 日
						</p>
					</div>
				</div>
				<button type="button" class="detail-button" onclick={openFullDetail}>
					詳細&gt;&gt;
				</button>
			</section>
		{/if}

		<nav class="bottom-nav">
			<button type="button" onclick={handleUndo} disabled={!canUndo}>戻る</button>
			<button type="button" onclick={handleReverse} disabled={!canReverse}>反転</button>
			<button type="button" onclick={openOptions} disabled={!optionEnabled}>オプション</button>
			<button type="button" onclick={openSave} disabled={!segments.length}>保存</button>
		</nav>
	{/if}
</div>

<style>
	:global(body) {
		background: #f4f5f7;
		font-family: 'Noto Sans JP', system-ui, sans-serif;
	}

	.page {
		max-width: 960px;
		margin: 0 auto;
		padding: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.top-bar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.5rem 0;
	}

	.icon-button {
		width: 48px;
		height: 48px;
		border-radius: 50%;
		border: none;
		background: #f3e8ff;
		color: #6b21a8;
		font-size: 1.2rem;
		cursor: pointer;
	}

	.title h1 {
		margin: 0;
		font-size: 1.4rem;
		color: #1f2937;
	}

	.title p {
		margin: 0;
		color: #9ca3af;
		font-size: 0.85rem;
	}

	.info-banner,
	.error-banner {
		padding: 1rem;
		border-radius: 0.75rem;
	}

	.info-banner {
		background: #eff6ff;
		color: #1d4ed8;
	}

	.error-banner {
		background: #fee2e2;
		color: #b91c1c;
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.5rem;
	}

	.card {
		background: #fff;
		border-radius: 1rem;
		padding: 1rem 1.25rem;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
		border: none;
		text-align: left;
		transition: transform 0.15s ease, box-shadow 0.15s ease;
	}

	.card.actionable {
		cursor: pointer;
	}

	.card.actionable:active {
		transform: translateY(1px);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
	}

	.station-card {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		background: linear-gradient(135deg, #2563eb, #38bdf8);
		color: #fff;
	}

	.station-card h2 {
		color: rgba(255, 255, 255, 0.9);
	}

	.station-name {
		font-size: 1.6rem;
		font-weight: 600;
		margin: 0;
	}

	.placeholder {
		color: #9ca3af;
		font-style: italic;
		margin: 0;
	}

	.station-card .placeholder {
		color: rgba(255, 255, 255, 0.85);
		font-style: normal;
	}

	.segment-section {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.section-title {
		margin: 0;
		font-size: 1rem;
		font-weight: 600;
		color: #6b7280;
	}

	.segment-cards {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.route-card {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		cursor: pointer;
	}

	.route-badge {
		width: 36px;
		height: 36px;
		border-radius: 999px;
		background: #c084fc;
		color: #fff;
		font-weight: 700;
		display: inline-flex;
		align-items: center;
		justify-content: center;
	}

	.route-info {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}

	.route-line {
		margin: 0;
		font-size: 1rem;
		font-weight: 600;
		color: #0f172a;
	}

	.route-station {
		margin: 0;
		color: #6b7280;
	}

	.chevron {
		font-size: 1.5rem;
		color: #c084fc;
	}

	.add-route-card {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		background: #fff7ed;
		color: #92400e;
		font-weight: 600;
		cursor: pointer;
	}

	.add-route-card span {
		font-size: 1.1rem;
	}

	.add-route-card p {
		margin: 0;
		font-size: 0.85rem;
		color: #b45309;
	}

	.add-route-card:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.fare-summary {
		background: #ecfdf5;
		color: #065f46;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.fare-rows {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
	}

	.fare-item {
		flex: 1 1 160px;
	}

	.label {
		margin: 0;
		font-size: 0.85rem;
		color: rgba(6, 95, 70, 0.8);
	}

	.value {
		margin: 0.1rem 0 0;
		font-size: 1.2rem;
		font-weight: 600;
	}

	.detail-button {
		align-self: flex-end;
		padding: 0.5rem 1.2rem;
		border-radius: 999px;
		border: none;
		background: #0f766e;
		color: #fff;
		cursor: pointer;
	}

	.bottom-nav {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 0.75rem;
		margin-top: 1rem;
	}

	.bottom-nav button {
		border: none;
		border-radius: 0.75rem;
		padding: 0.75rem;
		background: #ede9fe;
		color: #4c1d95;
		font-weight: 600;
		cursor: pointer;
	}

	.bottom-nav button:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.text-button {
		border: none;
		background: transparent;
		color: #7c3aed;
		cursor: pointer;
	}
</style>
