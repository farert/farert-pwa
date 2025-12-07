<script lang="ts">
import { goto } from '$app/navigation';
import { onDestroy, onMount } from 'svelte';
import { initFarert } from '$lib/wasm';
import { decompressRouteFromUrl } from '$lib/utils/urlRoute';
import type { FareInfo } from '$lib/types';
import type { FaretClass } from '$lib/wasm/types';

interface RouteSegment {
	line: string;
	station: string;
}

interface MetricRow {
	label: string;
	value: string;
	note?: string;
}

let loading = $state(true);
let errorMessage = $state('');
let shareFeedback = $state('');
let exportFeedback = $state('');
let menuOpen = $state(false);
let startStation = $state('');
let endStation = $state('');
let routeSegments = $state<RouteSegment[]>([]);
let fareInfo = $state<FareInfo | null>(null);
let shareUrl = $state('');
let routeRef = $state<FaretClass | null>(null);
let fareExportText = $state('');
let exportDialogOpen = $state(false);
let { initialCompressedRoute = null } = $props<{ initialCompressedRoute?: string | null }>();

const routeTitle = $derived(startStation && endStation ? `${startStation} → ${endStation}` : '経路詳細');
const kilometerRows = $derived(buildKilometerRows(fareInfo));
const fareRows = $derived(buildFareRows(fareInfo));
const stockDiscounts = $derived(() => (fareInfo?.stockDiscounts ?? []).filter((item) => item && typeof item.stockDiscountFare === 'number'));
const validityText = $derived(formatValidDays(fareInfo?.ticketAvailDays));
const validityMessage = $derived(buildValidityMessage(fareInfo));
let detailMessages = $state<string[]>([]);
$effect(() => {
	detailMessages = extractMessages(fareInfo);
});
const routeText = $derived(resolveRouteString(fareInfo, routeSegments));
const icRouteText = $derived(resolveIcRouteString(fareInfo, routeText));
const fareResultHint = $derived(resolveFareResultMessage(fareInfo?.fareResultCode));
const shareEnabled = $derived(Boolean(shareUrl));

let shareFeedbackTimer: ReturnType<typeof setTimeout> | null = null;
let exportFeedbackTimer: ReturnType<typeof setTimeout> | null = null;

onMount(() => {
	(async () => {
		try {
			await initFarert();
			const encoded = resolveCompressedRoute();
			if (!encoded) {
				errorMessage = '経路データが指定されていません。';
				return;
			}
			const route = decompressRouteFromUrl(encoded);
			if (!route) {
				errorMessage = '経路データの復元に失敗しました。';
				return;
			}
			routeRef = route;
			startStation = safeStationName(() => route.departureStationName());
			endStation = safeStationName(() => route.arrivevalStationName());
			routeSegments = parseRouteSegments(route);
			fareInfo = parseFareInfo(route);
			shareUrl = buildShareUrl(encoded);
			fareExportText = buildFareExportString(route);
		} catch (err) {
			console.error('詳細画面の初期化に失敗しました', err);
			errorMessage = '詳細情報の初期化に失敗しました。';
		} finally {
			loading = false;
		}
	})();
});

onDestroy(() => {
	if (shareFeedbackTimer) {
		clearTimeout(shareFeedbackTimer);
	}
	if (exportFeedbackTimer) {
		clearTimeout(exportFeedbackTimer);
	}
});

function resolveCompressedRoute(): string | null {
	if (initialCompressedRoute?.trim()) {
		return initialCompressedRoute.trim();
	}
	if (typeof window === 'undefined') {
		return null;
	}
	const search = new URLSearchParams(window.location.search);
	const param = search.get('r');
	return param?.trim() || null;
}

function parseRouteSegments(route: FaretClass): RouteSegment[] {
	try {
		const raw = route.getRoutesJson ? route.getRoutesJson() : '';
		if (!raw) return [];
		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [];
		return parsed
			.filter((item) => item && typeof item.line === 'string' && typeof item.station === 'string')
			.map((item) => ({
				line: item.line.trim(),
				station: item.station.trim()
			}));
	} catch (err) {
		console.warn('経路リストの解析に失敗しました', err);
		return [];
	}
}

function parseFareInfo(route: FaretClass): FareInfo | null {
	const raw = route.getFareInfoObjectJson ? route.getFareInfoObjectJson() : '';
	if (!raw) return null;
	const cleaned = raw.replace(/\u0000/g, '').trim();
	if (!cleaned) return null;
	const collapseCommas = (input: string): string => {
		let output = input.replace(/,\s*([}\]])/g, '$1').replace(/([\[{])\s*,/g, '$1');
		while (/,(\s*,)+/.test(output)) {
			output = output.replace(/,\s*,+/g, ',');
		}
		return output;
	};

	const candidates = [
		cleaned,
		collapseCommas(cleaned),
		collapseCommas(collapseCommas(cleaned))
	];
	for (const candidate of candidates) {
		try {
			const parsed = JSON.parse(candidate) as FareInfo;
			parsed.messages = Array.isArray(parsed.messages) ? [...parsed.messages] : [];
			return parsed;
		} catch (repairErr) {
			continue;
		}
	}
	console.warn('運賃情報の復元に失敗しました（修復不可）');
	return null;
}

function buildFareExportString(route: FaretClass): string {
	try {
		const exportText = route.showFare ? route.showFare() : '';
		return typeof exportText === 'string' ? exportText : '';
	} catch (err) {
		console.warn('結果エクスポート文字列の生成に失敗しました', err);
		return '';
	}
}

function buildShareUrl(token: string): string {
	if (!token) return '';
	const origin =
		typeof window !== 'undefined' && window.location?.origin ? window.location.origin : '';
	const normalizedOrigin = origin.endsWith('/') ? origin.slice(0, -1) : origin;
	return `${normalizedOrigin}/detail?r=${token}`;
}

function safeStationName(resolver: () => string): string {
	try {
		return resolver()?.trim() ?? '';
	} catch (err) {
		console.warn('駅名の取得に失敗しました', err);
		return '';
	}
}

function formatCurrency(value?: number | null): string {
	if (typeof value !== 'number' || Number.isNaN(value)) return '¥—';
	return `¥${value.toLocaleString('ja-JP')}`;
}

function formatKilometer(value?: number | null): string {
	if (typeof value !== 'number' || Number.isNaN(value)) return '— km';
	const decimals = Number.isInteger(value) ? 0 : 1;
	return `${value.toLocaleString('ja-JP', {
		minimumFractionDigits: decimals,
		maximumFractionDigits: decimals
	})}km`;
}

function formatValidDays(value?: number | null): string {
	if (typeof value !== 'number' || Number.isNaN(value)) return '— 日';
	return `${value}日間`;
}

function buildKilometerRows(info: FareInfo | null): MetricRow[] {
	if (!info) return [];
	const rows: MetricRow[] = [];
	rows.push({ label: '営業キロ', value: formatKilometer(info.totalSalesKm) });
	rows.push({ label: 'JR営業キロ', value: formatKilometer(info.jrSalesKm) });
	rows.push({ label: 'JR計算キロ', value: formatKilometer(info.jrCalcKm) });
	if ((info.companySalesKm ?? 0) > 0) {
		rows.push({ label: '会社線営業キロ', value: formatKilometer(info.companySalesKm) });
	}
	if ((info.brtSalesKm ?? 0) > 0) {
		rows.push({ label: 'BRT営業キロ', value: formatKilometer(info.brtSalesKm) });
	}
	const regionMetrics: { label: string; value?: number | null }[] = [
		{ label: '北海道営業キロ', value: info.salesKmForHokkaido },
		{ label: '北海道計算キロ', value: info.calcKmForHokkaido },
		{ label: '四国営業キロ', value: info.salesKmForShikoku },
		{ label: '四国計算キロ', value: info.calcKmForShikoku },
		{ label: '九州営業キロ', value: info.salesKmForKyusyu },
		{ label: '九州計算キロ', value: info.calcKmForKyusyu }
	];
	for (const metric of regionMetrics) {
		if ((metric.value ?? 0) > 0) {
			rows.push({ label: metric.label, value: formatKilometer(metric.value) });
		}
	}
	if (info.isRule114Applied) {
		rows.push({
			label: '規程114条適用',
			value: `${formatKilometer(info.rule114SalesKm)} / ${formatKilometer(info.rule114CalcKm)}`,
			note: info.rule114ApplyTerminal ? `${info.rule114ApplyTerminal}で計算` : undefined
		});
	}
	return rows;
}

function buildFareRows(info: FareInfo | null): MetricRow[] {
	if (!info) return [];
	const rows: MetricRow[] = [];
	rows.push({ label: '普通運賃', value: formatCurrency(info.fare) });
	if ((info.fareForCompanyline ?? 0) > 0) {
		rows.push({ label: '会社線運賃', value: formatCurrency(info.fareForCompanyline) });
	}
	if ((info.fareForIC ?? 0) > 0) {
		rows.push({ label: 'IC運賃', value: formatCurrency(info.fareForIC) });
	}
	if ((info.fareForBRT ?? 0) > 0) {
		rows.push({ label: 'BRT運賃', value: formatCurrency(info.fareForBRT) });
	}
	if (info.isRoundtripDiscount || (info.roundTripFareWithCompanyLine ?? 0) > 0) {
		rows.push({
			label: '往復運賃',
			value: formatCurrency(info.roundTripFareWithCompanyLine),
			note: info.isRoundtripDiscount ? '往復割引適用' : undefined
		});
	}
	if ((info.childFare ?? 0) > 0) {
		rows.push({ label: '小児運賃', value: formatCurrency(info.childFare) });
	}
	if ((info.roundtripChildFare ?? 0) > 0) {
		rows.push({ label: '小児往復運賃', value: formatCurrency(info.roundtripChildFare) });
	}
	if (info.isAcademicFare && (info.academicFare ?? 0) > 0) {
		rows.push({ label: '学割運賃', value: formatCurrency(info.academicFare) });
	}
	if (info.isAcademicFare && (info.roundtripAcademicFare ?? 0) > 0) {
		rows.push({ label: '学割往復運賃', value: formatCurrency(info.roundtripAcademicFare) });
	}
	if (info.isRule114Applied && (info.farePriorRule114 ?? 0) > 0) {
		rows.push({ label: '規程114条適用前', value: formatCurrency(info.farePriorRule114) });
	}
	return rows;
}

function buildValidityMessage(info: FareInfo | null): string {
	if (!info) return '';
	if (info.isSpecificFare) {
		return '近郊区間内ですので最安運賃の経路にしました（途中下車不可、有効日数当日限り）';
	}
	const distance = info.totalSalesKm ?? 0;
	if (distance < 101) {
		return '途中下車前途無効';
	}
	if (info.isBeginInCity || info.isEndInCity) {
		return '発着駅の都区市内を除き途中下車可能';
	}
	return '途中下車可能';
}

function extractMessages(info: FareInfo | null): string[] {
	if (!info) return [];
	return info.messages
		.map((message) => (typeof message === 'string' ? message.trim() : ''))
		.filter((message): message is string => message.length > 0);
}

function resolveRouteString(info: FareInfo | null, segments: RouteSegment[]): string {
	const fromInfo = info?.routeList?.trim();
	if (fromInfo) return fromInfo;
	if (!segments.length) return '';
	return segments.map((segment) => `[${segment.line}]${segment.station}`).join('');
}

function resolveIcRouteString(info: FareInfo | null, base: string): string {
	const icRoute = info?.routeListForTOICA?.trim();
	if (!icRoute) return '';
	const normalizedBase = (info?.routeList?.trim() || base || '').trim();
	return icRoute === normalizedBase ? '' : icRoute;
}

function resolveFareResultMessage(code?: number | null): string {
	if (code === 0 || code === undefined || code === null) return '';
	if (code === 1) return '経路が不完全です。続けて指定してください。';
	if (code === -2) return '会社線のみの経路は運賃を表示できません。';
	return '運賃計算でエラーが発生しました。';
}

function handleBack(): void {
	if (typeof window !== 'undefined' && window.history.length > 1) {
		window.history.back();
		return;
	}
	goto('/');
}

async function handleShare(): Promise<void> {
	if (!shareEnabled || !shareUrl) return;
	try {
		if (navigator?.share) {
			await navigator.share({ title: routeTitle, url: shareUrl });
			showShareMessage('共有しました');
			return;
		}
	} catch (err) {
		console.warn('Web Share APIでの共有に失敗しました', err);
	}
	try {
		if (navigator?.clipboard?.writeText) {
			await navigator.clipboard.writeText(shareUrl);
			showShareMessage('共有リンクをコピーしました');
			return;
		}
	} catch (err) {
		console.warn('共有リンクのコピーに失敗しました', err);
	}
	showShareMessage('このブラウザでは共有に対応していません');
}

function showShareMessage(message: string): void {
	shareFeedback = message;
	if (shareFeedbackTimer) {
		clearTimeout(shareFeedbackTimer);
	}
	shareFeedbackTimer = setTimeout(() => {
		shareFeedback = '';
	}, 4000);
}

function showExportMessage(message: string): void {
	exportFeedback = message;
	if (exportFeedbackTimer) {
		clearTimeout(exportFeedbackTimer);
	}
	exportFeedbackTimer = setTimeout(() => {
		exportFeedback = '';
	}, 4000);
}

function toggleMenu(): void {
	menuOpen = !menuOpen;
}

function closeMenu(): void {
	menuOpen = false;
}

function openVersionInfo(): void {
	closeMenu();
	goto('/version');
}

function openOptions(): void {
	closeMenu();
	goto('/');
}

async function copyFareExport(): Promise<void> {
	if (!fareExportText) return;
	try {
		if (navigator?.clipboard?.writeText) {
			await navigator.clipboard.writeText(fareExportText);
			showExportMessage('結果文字列をコピーしました');
			return;
		}
	} catch (err) {
		console.warn('結果文字列のコピーに失敗しました', err);
	}
	showExportMessage('このブラウザではコピーに対応していません');
}

function openExportDialog(): void {
	exportDialogOpen = Boolean(fareExportText);
}

function closeExportDialog(): void {
	exportDialogOpen = false;
}
</script>

<div class="detail-page">
	<header class="top-bar">
		<button type="button" class="icon-button" aria-label="戻る" onclick={handleBack}>
			<span class="material-symbols-rounded" aria-hidden="true">arrow_back</span>
		</button>
		<div class="title-group">
			<p>{startStation || '発駅未設定'}</p>
			<h1>{routeTitle}</h1>
		</div>
		<div class="actions">
			<button
				type="button"
				class="icon-button"
				aria-label="結果エクスポート"
				onclick={openExportDialog}
				disabled={!fareExportText}
			>
				<span class="material-symbols-rounded" aria-hidden="true">description</span>
			</button>
			<button
				type="button"
				class="icon-button"
				aria-label="共有"
				onclick={handleShare}
				disabled={!shareEnabled}
			>
				<span class="material-symbols-rounded" aria-hidden="true">share</span>
			</button>
			<button
				type="button"
				class="icon-button"
				aria-label="メニュー"
				aria-expanded={menuOpen}
				onclick={toggleMenu}
			>
				<span class="material-symbols-rounded" aria-hidden="true">more_vert</span>
			</button>
			{#if menuOpen}
				<div class="app-menu" role="menu">
					<button type="button" role="menuitem" onclick={openVersionInfo}>バージョン情報</button>
					<button type="button" role="menuitem" onclick={openOptions}>オプション</button>
				</div>
			{/if}
		</div>
	</header>

	{#if shareFeedback}
		<p class="info-banner success">{shareFeedback}</p>
	{/if}

	{#if loading}
		<p class="info-banner">運賃情報を読み込み中です...</p>
	{:else}
		{#if errorMessage}
			<div class="error-banner" role="alert">
				<p>{errorMessage}</p>
			</div>
		{:else}
			{#if fareResultHint}
				<div class="warning-banner" role="status">
					<p>{fareResultHint}</p>
				</div>
			{/if}

			<section class="card route-header-card">
				<p class="label">区間</p>
				<p class="route-title">{routeTitle}</p>
			</section>

			{#if fareInfo}
				<section class="card metric-card">
					<h3>キロ程</h3>
					{#if kilometerRows.length === 0}
						<p class="placeholder">キロ程情報がありません。</p>
					{:else}
						<ul class="metric-list">
							{#each kilometerRows as row}
								<li class="metric-row">
									<div>
										<p class="metric-label">{row.label}</p>
										{#if row.note}
											<p class="metric-note">{row.note}</p>
										{/if}
									</div>
									<p class="metric-value">{row.value}</p>
								</li>
							{/each}
						</ul>
					{/if}
				</section>

				<section class="card fare-card">
					<h3>運賃</h3>
					{#if fareRows.length === 0}
						<p class="placeholder">運賃情報がありません。</p>
					{:else}
						<ul class="metric-list">
							{#each fareRows as row}
								<li class="metric-row">
									<div>
										<p class="metric-label">{row.label}</p>
										{#if row.note}
											<p class="metric-note">{row.note}</p>
										{/if}
									</div>
									<p class="metric-value">{row.value}</p>
								</li>
							{/each}
						</ul>
					{/if}
					{#if stockDiscounts.length}
						<div class="stock-section">
							<p class="metric-label">株主優待</p>
							<ul>
								{#each stockDiscounts as stock}
									<li>
										<span>{stock.stockDiscountTitle}</span>
										<strong>{formatCurrency(stock.stockDiscountFare)}</strong>
									</li>
								{/each}
							</ul>
						</div>
					{/if}
				</section>

				{#if detailMessages.length}
					<section class="card note-card">
						<h3>備考</h3>
						<ul>
							{#each detailMessages as message}
								<li>{message}</li>
							{/each}
						</ul>
					</section>
				{/if}

				<section class="card validity-card">
					<h3>有効日数</h3>
					<p class="valid-days">{validityText}</p>
					{#if validityMessage}
						<p class="metric-note">{validityMessage}</p>
					{/if}
				</section>

				<section class="card route-detail-card">
					<h3>経由</h3>
					{#if routeText}
						<p class="route-string">{routeText}</p>
					{:else}
						<p class="placeholder">経路情報がありません。</p>
					{/if}
					{#if icRouteText}
						<p class="metric-label">IC運賃計算経路</p>
						<p class="route-string">{icRouteText}</p>
					{/if}
				</section>
			{:else}
				<p class="info-banner">運賃情報を取得できませんでした。</p>
			{/if}
		{/if}
	{/if}

	{#if menuOpen}
		<button type="button" class="menu-overlay" aria-label="メニューを閉じる" onclick={closeMenu}></button>
	{/if}

	{#if exportDialogOpen}
		<div class="export-dialog" role="dialog" aria-label="結果エクスポート">
			<section class="card export-card">
				<div class="export-card-header">
					<h3>結果エクスポート</h3>
					<button type="button" class="icon-button small" aria-label="閉じる" onclick={closeExportDialog}>
						<span class="material-symbols-rounded" aria-hidden="true">close</span>
					</button>
				</div>
				{#if fareExportText}
					<pre class="export-text" data-testid="fare-export-text">{fareExportText}</pre>
					<button type="button" class="copy-button" onclick={copyFareExport}>結果をコピー</button>
					{#if exportFeedback}
						<p class="metric-note success">{exportFeedback}</p>
					{/if}
				{:else}
					<p class="placeholder">結果をエクスポートできません。</p>
				{/if}
			</section>
			<button
				type="button"
				class="menu-overlay"
				aria-label="結果エクスポートを閉じる"
				onclick={closeExportDialog}
			></button>
		</div>
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
		font-size: 1.25rem;
		line-height: 1;
		letter-spacing: normal;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		white-space: nowrap;
		-webkit-font-feature-settings: 'liga';
		-webkit-font-smoothing: antialiased;
	}

	.detail-page {
		max-width: 720px;
		margin: 0 auto;
		padding: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.top-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		position: relative;
	}

	.title-group {
		flex: 1;
	}

	.title-group > p {
		margin: 0;
		color: #6b7280;
		font-size: 0.95rem;
	}

	.title-group > h1 {
		margin: 0.1rem 0 0;
		font-size: 1.35rem;
		color: #111827;
	}

	.actions {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		position: relative;
	}

	.icon-button {
		width: 44px;
		height: 44px;
		border-radius: 999px;
		border: none;
		background: #ede9fe;
		color: #5b21b6;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
	}

	.icon-button:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.icon-button.small {
		width: 36px;
		height: 36px;
	}

	.card {
		background: #fff;
		border-radius: 1rem;
		padding: 1.25rem;
		box-shadow: 0 10px 25px rgba(15, 23, 42, 0.08);
	}

	.route-header-card .route-title {
		margin: 0.25rem 0 0;
		font-size: 1.3rem;
		font-weight: 700;
		color: #111827;
	}

	.label {
		margin: 0;
		font-size: 0.85rem;
		color: #6b7280;
	}

	.metric-card h3,
	.fare-card h3,
	.note-card h3,
	.validity-card h3,
	.route-detail-card h3 {
		margin: 0 0 0.75rem;
		font-size: 1.05rem;
		color: #0f172a;
	}

	.metric-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.65rem;
	}

	.metric-row {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 1rem;
	}

	.metric-label {
		margin: 0;
		font-size: 0.95rem;
		color: #374151;
		font-weight: 600;
	}

	.metric-note {
		margin: 0.2rem 0 0;
		font-size: 0.85rem;
		color: #6b7280;
	}

	.metric-note.success {
		color: #15803d;
	}

	.metric-value {
		margin: 0;
		font-size: 1rem;
		font-weight: 700;
		color: #111827;
		white-space: nowrap;
	}

	.placeholder {
		margin: 0;
		color: #9ca3af;
		font-size: 0.95rem;
	}

	.stock-section ul,
	.note-card ul {
		padding-left: 1.1rem;
		margin: 0;
		color: #374151;
	}

	.stock-section li {
		display: flex;
		justify-content: space-between;
		gap: 0.5rem;
		font-size: 0.95rem;
	}

	.validity-card .valid-days {
		margin: 0 0 0.25rem;
		font-size: 1.5rem;
		font-weight: 700;
		color: #0f172a;
	}

	.route-string {
		margin: 0 0 0.5rem;
		font-family: 'Roboto Mono', 'Noto Sans JP', monospace;
		font-size: 0.95rem;
		color: #111827;
		word-break: break-word;
	}

	.info-banner,
	.error-banner,
	.warning-banner {
		padding: 0.9rem 1rem;
		border-radius: 0.85rem;
		font-size: 0.95rem;
	}

	.info-banner {
		background: #e0f2fe;
		color: #0369a1;
	}

	.info-banner.success {
		background: #dcfce7;
		color: #15803d;
	}

	.error-banner {
		background: #fee2e2;
		color: #b91c1c;
	}

	.warning-banner {
		background: #fff7ed;
		color: #c2410c;
	}

	.export-dialog {
		position: fixed;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 50;
	}

	.export-card {
		max-width: 640px;
		width: calc(100% - 2rem);
		max-height: 80vh;
		overflow: hidden;
	}

	.export-card-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.export-card .export-text {
		margin: 0 0 0.75rem;
		padding: 0.9rem;
		border-radius: 0.85rem;
		background: #1f2937;
		color: #f9fafb;
		font-family: 'Roboto Mono', 'Noto Sans JP', monospace;
		font-size: 0.95rem;
		white-space: pre-wrap;
		word-break: break-word;
		max-height: 40vh;
		overflow: auto;
	}

	.copy-button {
		border: none;
		background: #4c1d95;
		color: #fff;
		padding: 0.5rem 1.2rem;
		border-radius: 999px;
		font-weight: 600;
		cursor: pointer;
	}

	.copy-button:hover {
		background: #5b21b6;
	}

	.app-menu {
		position: absolute;
		top: 48px;
		right: 0;
		background: #fff;
		box-shadow: 0 8px 20px rgba(15, 23, 42, 0.15);
		border-radius: 0.75rem;
		padding: 0.5rem;
		z-index: 10;
		display: flex;
		flex-direction: column;
		min-width: 160px;
	}

	.app-menu button {
		background: none;
		border: none;
		padding: 0.5rem 0.75rem;
		text-align: left;
		border-radius: 0.5rem;
		font-size: 0.95rem;
		cursor: pointer;
	}

	.app-menu button:hover {
		background: #f3f4f6;
	}

	.menu-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.2);
		border: none;
		padding: 0;
		margin: 0;
		cursor: pointer;
	}
</style>
