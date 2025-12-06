<script lang="ts">
import { goto } from '$app/navigation';
import { onMount } from 'svelte';
import FareSummaryCard from '$lib/components/FareSummaryCard.svelte';
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
let appMenuOpen = $state(false);
let optionMenuOpen = $state(false);
let hasOsakakanOption = $state(false);
let hasKokuraOption = $state(false);
let osakaDetourSelected = $state(false);
let treatKokuraAsSame = $state(true);
const osakaMenuLabel = $derived(
	osakaDetourSelected ? '大阪環状線近回り' : '大阪環状線遠回り'
);

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
	const hasStart = Boolean(startStation);

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
	canUndo = hasStart;

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

	try {
		const notSame = current.isNotSameKokuraHakataShinZai
			? current.isNotSameKokuraHakataShinZai()
			: false;
		treatKokuraAsSame = !notSame;
	} catch (err) {
		console.warn('小倉-博多オプション状態の取得に失敗しました', err);
		treatKokuraAsSame = true;
	}

	try {
		osakaDetourSelected = current.isOsakakanDetour ? current.isOsakakanDetour() : false;
	} catch (err) {
		console.warn('大阪環状線オプション状態の取得に失敗しました', err);
		osakaDetourSelected = false;
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
	hasOsakakanOption = false;
	hasKokuraOption = false;
	osakaDetourSelected = false;
	treatKokuraAsSame = true;
	appMenuOpen = false;
	optionMenuOpen = false;
}

function updateOptionAvailability(tokens: string[]) {
	const stationTokens: string[] = [];
	for (let i = 0; i < tokens.length; i += 2) {
		if (tokens[i]) stationTokens.push(tokens[i]);
	}

	const hasOsakaLoop = segments.some((segment) => segment.line === OSAKA_LOOP_LINE);
	const hasKokuraHakata =
		stationTokens.includes(KOKURA_STATION) && stationTokens.includes(HAKATA_STATION);

	hasOsakakanOption = hasOsakaLoop;
	hasKokuraOption = hasKokuraHakata;
	optionEnabled = hasOsakaLoop || hasKokuraHakata;
	if (!optionEnabled) {
		optionMenuOpen = false;
	}
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

	function toggleAppMenu() {
		appMenuOpen = !appMenuOpen;
		if (appMenuOpen) {
			optionMenuOpen = false;
		}
	}

	function closeMenus() {
		appMenuOpen = false;
		optionMenuOpen = false;
	}

	function handleVersionMenuSelection() {
		closeMenus();
		openVersionInfo();
	}

	function openOptionsFromMenu() {
		if (!optionEnabled) return;
		optionMenuOpen = true;
		appMenuOpen = false;
	}

	function openTerminalSelection() {
		goto('/terminal-selection');
	}

	function openRouteAddition() {
		if (!startStation) {
			error = '先に発駅を設定してください';
			return;
		}
		const lastSegment = segments[segments.length - 1];
		const stationParam = lastSegment ? lastSegment.station : startStation;
		if (!stationParam) {
			error = '次に接続する駅を特定できません。';
			return;
		}
		const params = new URLSearchParams();
		params.set('from', 'main');
		params.set('station', stationParam);
		if (lastSegment?.line) {
			params.set('line', lastSegment.line);
		}
		goto(`/line-selection?${params.toString()}`);
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
	if (segments.length > 0) {
		route.removeTail();
		mainRoute.set(route);
		refreshRouteState(route);
		return;
	}
	route.removeAll();
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
		optionMenuOpen = !optionMenuOpen;
		if (optionMenuOpen) {
			appMenuOpen = false;
		}
	}

	function openSave() {
		goto('/save');
	}

	function toggleKokuraHakataLink() {
		if (!route || !hasKokuraOption) return;
		const next = !treatKokuraAsSame;
		try {
			route.setNotSameKokuraHakataShinZai(!next);
			treatKokuraAsSame = next;
			mainRoute.set(route);
			optionMenuOpen = false;
		} catch (err) {
			console.error('小倉-博多オプションの切り替えに失敗しました', err);
		}
	}

	function toggleOsakaDetourOption() {
		if (!route || !hasOsakakanOption) return;
		const next = !osakaDetourSelected;
		try {
			const result = route.setDetour(next);
			if (typeof result === 'number' && result < 0) {
				error = '大阪環状線オプションの切り替えに失敗しました。';
				return;
			}
			osakaDetourSelected = next;
			mainRoute.set(route);
			optionMenuOpen = false;
		} catch (err) {
			console.error('大阪環状線オプションの切り替えに失敗しました', err);
			error = '大阪環状線オプションの切り替えに失敗しました。';
		}
	}
</script>

<div class="page">
	<header class="top-bar">
		<button type="button" class="icon-button" aria-label="きっぷホルダ" onclick={openDrawer}>
			<span class="material-symbols-rounded icon-button-symbol" aria-hidden="true">menu</span>
		</button>
		<div class="title">
			<h1>Farert</h1>
			<p>JR運賃計算</p>
		</div>
		<div class="menu-container">
			<button
				type="button"
				class="icon-button"
				aria-label="メニュー"
				aria-expanded={appMenuOpen}
				onclick={toggleAppMenu}
			>
				<span class="material-symbols-rounded icon-button-symbol" aria-hidden="true">more_vert</span>
			</button>
			{#if appMenuOpen}
				<div class="app-menu" role="menu">
					<button type="button" role="menuitem" onclick={handleVersionMenuSelection}>
						バージョン情報
					</button>
					<button
						type="button"
						role="menuitem"
						onclick={openOptionsFromMenu}
						disabled={!optionEnabled}
					>
						オプション
					</button>
				</div>
			{/if}
		</div>
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
			<span
				class="material-symbols-rounded station-card-icon"
				aria-hidden="true"
				data-testid="start-station-train-icon"
			>
				train
			</span>
			<div class="station-card-text">
				<h2>発駅</h2>
				{#if startStation}
					<p class="station-name">{startStation}</p>
				{:else}
					<p class="placeholder">発駅を指定してください</p>
				{/if}
			</div>
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

		<FareSummaryCard
			fareInfo={fareInfo}
			detailEnabled={Boolean(detailLink && segments.length > 0)}
			onDetailClick={openFullDetail}
		/>

		<nav class="bottom-nav">
			<button type="button" onclick={handleUndo} disabled={!canUndo} aria-label="戻る">
				<span class="material-symbols-rounded bottom-nav-icon" aria-hidden="true">undo</span>
			</button>
			<button type="button" onclick={handleReverse} disabled={!canReverse} aria-label="反転">
				<span class="material-symbols-rounded bottom-nav-icon" aria-hidden="true">swap_horiz</span>
			</button>
			<button type="button" onclick={openOptions} disabled={!optionEnabled} aria-label="オプション">
				<span class="material-symbols-rounded bottom-nav-icon" aria-hidden="true">tune</span>
			</button>
			<button type="button" onclick={openSave} disabled={!segments.length} aria-label="保存">
				<span class="material-symbols-rounded bottom-nav-icon" aria-hidden="true">save</span>
			</button>
		</nav>

		{#if optionMenuOpen}
			<div class="option-menu" role="menu">
				<p class="menu-title">経路オプション</p>
				<button
					type="button"
					role="menuitem"
					onclick={toggleKokuraHakataLink}
					disabled={!hasKokuraOption}
				>
					<span>小倉博多間新幹線・在来線同一視</span>
					{#if treatKokuraAsSame}
						<span class="material-symbols-rounded" aria-hidden="true">check</span>
					{/if}
				</button>
				<button
					type="button"
					role="menuitem"
					onclick={toggleOsakaDetourOption}
					disabled={!hasOsakakanOption}
				>
					<span>{osakaMenuLabel}</span>
					{#if osakaDetourSelected}
						<span class="material-symbols-rounded" aria-hidden="true">check</span>
					{/if}
				</button>
			</div>
		{/if}
	{/if}

	{#if appMenuOpen || optionMenuOpen}
		<button
			type="button"
			class={`menu-overlay ${optionMenuOpen ? 'dim' : ''}`}
			aria-label="メニューを閉じる"
			onclick={closeMenus}
		></button>
	{/if}
</div>

<style>
	:global(body) {
		background: #f4f5f7;
		font-family: 'Noto Sans JP', system-ui, sans-serif;
	}

	:global(.material-symbols-rounded) {
		font-family: 'Material Symbols Rounded';
		font-weight: normal;
		font-style: normal;
		font-size: 1em;
		line-height: 1;
		letter-spacing: normal;
		text-transform: none;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		white-space: nowrap;
		-webkit-font-feature-settings: 'liga';
		-webkit-font-smoothing: antialiased;
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
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		justify-content: center;
	}

	.icon-button-symbol {
		font-size: 1.5rem;
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
		align-items: center;
		justify-content: flex-start;
		gap: 1rem;
		background: linear-gradient(135deg, #2563eb, #38bdf8);
		color: #fff;
	}

	.station-card-text {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		flex: 1;
	}

	.station-card h2 {
		color: rgba(255, 255, 255, 0.9);
	}

	.station-card-icon {
		font-size: 2.25rem;
		color: rgba(255, 255, 255, 0.9);
		margin-right: 0.25rem;
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
		width: 100%;
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

	.menu-container {
		position: relative;
	}

	.app-menu {
		position: absolute;
		top: calc(100% + 0.25rem);
		right: 0;
		background: #fff;
		border-radius: 0.75rem;
		box-shadow: 0 8px 20px rgba(15, 23, 42, 0.18);
		padding: 0.5rem 0;
		min-width: 180px;
		display: flex;
		flex-direction: column;
		z-index: 30;
	}

	.app-menu button {
		border: none;
		background: transparent;
		text-align: left;
		padding: 0.65rem 1rem;
		font-size: 0.95rem;
		cursor: pointer;
		color: #1f2937;
	}

	.app-menu button:disabled {
		opacity: 0.4;
		cursor: not-allowed;
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
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
	}

	.bottom-nav-icon {
		font-size: 1.6rem;
	}

	.option-menu {
		position: fixed;
		right: 1rem;
		bottom: 5rem;
		background: #fff;
		border-radius: 1rem;
		box-shadow: 0 16px 40px rgba(15, 23, 42, 0.25);
		padding: 0.75rem;
		width: min(360px, calc(100% - 2rem));
		z-index: 30;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.menu-title {
		margin: 0 0 0.25rem;
		font-weight: 600;
		font-size: 1rem;
		color: #111827;
	}

	.option-menu button {
		width: 100%;
		border: none;
		background: transparent;
		padding: 0.75rem 1rem;
		border-radius: 0.75rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-size: 0.95rem;
		cursor: pointer;
		color: #1f2937;
	}

	.option-menu button:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.menu-overlay {
		position: fixed;
		inset: 0;
		background: transparent;
		z-index: 20;
		border: none;
		padding: 0;
}

	.menu-overlay.dim {
		background: rgba(15, 23, 42, 0.2);
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
