<script lang="ts">
import { goto } from '$app/navigation';
import { base } from '$app/paths';
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
	secondaryLabel?: string;
	secondaryValue?: string;
	layout?: 'pair' | 'grid';
	hideSecondaryLabel?: boolean;
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

const routeTitle = $derived(
	startStation && endStation ? `${startStation} → ${endStation}` : '経路詳細'
);
const routeIntervalTitle = $derived(resolveRouteTitle());
const routeHeaderTitle = $derived(
	startStation && endStation ? `${startStation} → ${endStation}` : '発駅未設定 → 到着駅未設定'
);
const kilometerRows = $derived(buildKilometerRows(fareInfo));
const fareRows = $derived(buildFareRows(fareInfo));
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

function toBoolean(value: unknown, fallback: boolean = false): boolean {
	if (value === undefined || value === null) {
		return fallback;
	}
	if (typeof value === 'boolean') return value;
	if (typeof value === 'number') return value !== 0;
	if (typeof value === 'string') {
		const normalized = value.trim().toLowerCase();
		if (normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on') {
			return true;
		}
		if (normalized === 'false' || normalized === '0' || normalized === 'no' || normalized === 'off') {
			return false;
		}
	}
	return Boolean(value);
}

function pickBoolean(
	obj: unknown,
	keys: string[],
	fallback: boolean = false
): boolean {
	if (!obj || typeof obj !== 'object') {
		return fallback;
	}
	const source = obj as Record<string, unknown>;
	for (const key of keys) {
		if (Object.prototype.hasOwnProperty.call(source, key)) {
			return toBoolean(source[key], fallback);
		}
	}
	return fallback;
}

type FareOptionMenuItem = {
	label: string;
	state: boolean;
	setOption: () => void;
	clearOption: () => void;
};
let fareOptionMenus = $state<FareOptionMenuItem[]>([]);

function buildFareOptionMenus(info: FareInfo | null, route: FaretClass | null): FareOptionMenuItem[] {
	if (!route || !info) return [];

	const isFareOptEnabled = pickBoolean(info, ['isFareOptEnabled'], true);
	const isMeihanCityStartTerminalEnable = pickBoolean(
		info,
		[
			'isMeihanCityStartTerminalEnable',
			'isMeihanCityStartTerminal',
			'isMeihanCityEnable',
			'isMeihanCityStart',
			'isMeihanCity'
		],
		false
	);
	const isRuleAppliedEnable = pickBoolean(info, ['isRuleAppliedEnable', 'isRuleApplied'], false);
	const isEnableLongRoute = pickBoolean(info, ['isEnableLongRoute'], false);
	const isEnableRule115 = pickBoolean(info, ['isEnableRule115', 'enableRule115'], false);
	const isJRCentralStockEnable = pickBoolean(
		info,
		['isJRCentralStockEnable', 'isEnableTokaiStockSelect'],
		false
	);
	const isRuleApplied = pickBoolean(info, ['isRuleApplied'], false);
	const isMeihanCityTerminal = pickBoolean(
		info,
		['isMeihanCityTerminal', 'isMeihanCityEnd', 'isArrivalAsCity', 'isMeihanCityAsArrival'],
		false
	);
	const isLongRoute = pickBoolean(info, ['isLongRoute'], false);
	const isRule115specificTerm = pickBoolean(info, ['isRule115specificTerm', 'rule115SpecificTerm'], false);
	const isJRCentralStock = pickBoolean(info, ['isJRCentralStock'], false);

	if (!isFareOptEnabled) return [];

	const options: FareOptionMenuItem[] = [];
	if (isRuleAppliedEnable) {
		options.push({
			label: isRuleApplied ? '特例を適用しない' : '特例を適用する',
			state: isRuleApplied,
			setOption: () => route.setNoRule(false),
			clearOption: () => route.setNoRule(true)
		});
	}
	if (isMeihanCityStartTerminalEnable) {
		options.push({
			label: isMeihanCityTerminal ? '着駅を単駅指定' : '発駅を単駅指定',
			state: isMeihanCityTerminal,
			setOption: () => route.setArrivalAsCity(),
			clearOption: () => route.setStartAsCity()
		});
	}
	if (isEnableLongRoute) {
		options.push({
			label: isLongRoute ? '最安経路で運賃計算' : '指定した経路で運賃計算',
			state: isLongRoute,
			setOption: () => route.setLongRoute(false),
			clearOption: () => route.setLongRoute(true)
		});
	}
	if (isEnableRule115) {
		options.push({
			label: isRule115specificTerm
				? '旅客営業取扱基準規程115条(単駅最安)'
				: '旅客営業取扱基準規程115条(特定都区市内発着)',
			state: isRule115specificTerm,
			setOption: () => route.setSpecificTermRule115(true),
			clearOption: () => route.setSpecificTermRule115(false)
		});
	}
	if (isJRCentralStockEnable) {
		options.push({
			label: isJRCentralStock ? 'JR東海株主優待券を適用しない' : 'JR東海株主優待券を適用する',
			state: isJRCentralStock,
			setOption: () => route.setJrTokaiStockApply(true),
			clearOption: () => route.setJrTokaiStockApply(false)
		});
	}

	console.log(
		'[debug] fareOptionMenus',
		options.map((option) => option.label)
	);
	if (typeof window !== 'undefined') {
		(window as Window & { __fareOptionMenusDebug?: string[] }).__fareOptionMenusDebug = options.map(
			(option) => option.label
		);
	}

	return options;
}

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
			refreshResult(route);
			shareUrl = buildShareUrl(encoded);
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

	const normalizeKilometers = (info: FareInfo): FareInfo => {
		const kmKeys: Array<keyof FareInfo> = [
			'totalSalesKm',
			'jrSalesKm',
			'jrCalcKm',
			'companySalesKm',
			'brtSalesKm',
			'salesKmForHokkaido',
			'calcKmForHokkaido',
			'salesKmForEast',
			'calcKmForEast',
			'salesKmForShikoku',
			'calcKmForShikoku',
			'salesKmForKyusyu',
			'calcKmForKyusyu',
			'rule114SalesKm',
			'rule114CalcKm'
		];
		const kmValues = kmKeys
			.map((key) => info[key])
			.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
		if (!kmValues.length) return info;
		if (!kmValues.every((value) => Number.isInteger(value))) return info;
		const normalized = { ...info } as FareInfo;
		for (const key of kmKeys) {
			const value = normalized[key];
			if (typeof value === 'number' && Number.isFinite(value)) {
				(normalized as Record<string, unknown>)[key] = value / 10;
			}
		}
		return normalized;
	};
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
			const normalized = normalizeKilometers(parsed);
			normalized.messages = Array.isArray(normalized.messages) ? [...normalized.messages] : [];
			return normalized;
		} catch (repairErr) {
			continue;
		}
	}
	console.warn('運賃情報の復元に失敗しました（修復不可）');
	return null;
}

function buildFareExportString(route: FaretClass): string {
	try {
		const fareText = route.showFare ? route.showFare() : '';
		const fareTextValue = typeof fareText === 'string' ? fareText : '';
		const routeText = route.routeScript ? route.routeScript() : '';
		return `${fareTextValue}[指定経路]\n${routeText}`;
	} catch (err) {
		console.warn('結果エクスポート文字列の生成に失敗しました', err);
		return '';
	}
}

function refreshResult(route: FaretClass): void {
	startStation = safeStationName(() => route.departureStationName());
	endStation = safeStationName(() => route.arrivevalStationName());
	routeSegments = parseRouteSegments(route);
	const parsedFareInfo = parseFareInfo(route);
	fareInfo = parsedFareInfo;
	fareOptionMenus = buildFareOptionMenus(parsedFareInfo, route);
	fareExportText = buildFareExportString(route);
	console.log('[debug] fareInfo', parsedFareInfo);
	if (typeof window !== 'undefined') {
		(window as Window & { __fareInfoDebug?: typeof parsedFareInfo }).__fareInfoDebug = parsedFareInfo;
	}
}

function buildShareUrl(token: string): string {
	if (!token) return '';
	const origin =
		typeof window !== 'undefined' && window.location?.origin ? window.location.origin : '';
	const normalizedOrigin = origin.endsWith('/') ? origin.slice(0, -1) : origin;
	const normalizedBase = normalizeBasePath(base);
	return `${normalizedOrigin}${normalizedBase}/detail?r=${token}`;
}

function normalizeBasePath(path: string): string {
	if (!path) return '';
	const prefixed = path.startsWith('/') ? path : `/${path}`;
	if (prefixed === '/') return '';
	return prefixed.endsWith('/') ? prefixed.slice(0, -1) : prefixed;
}

function safeStationName(resolver: () => string): string {
	try {
		return resolver()?.trim() ?? '';
	} catch (err) {
		console.warn('駅名の取得に失敗しました', err);
		return '';
	}
}

function resolveRouteTitle(): string {
	const begin = (fareInfo?.beginStation ?? '').trim();
	const end = (fareInfo?.endStation ?? '').trim();
	if (begin || end) {
		const from = begin || '発駅未設定';
		const to = end || '到着駅未設定';
		return `${from} → ${to}`;
	}
	if (startStation && endStation) {
		return `${startStation} → ${endStation}`;
	}
	return '経路詳細';
}

function formatCurrency(value?: number | null): string {
	if (typeof value !== 'number' || Number.isNaN(value)) return '¥—';
	return `¥${value.toLocaleString('ja-JP')}`;
}

function formatKilometer(value?: number | null): string {
	if (typeof value !== 'number' || Number.isNaN(value)) return '— km';
	return `${value.toLocaleString('ja-JP', {
		minimumFractionDigits: 1,
		maximumFractionDigits: 1
	})}km`;
}

function hasPositiveKilometer(value?: number | null): boolean {
	return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function kilometersMatch(left?: number | null, right?: number | null): boolean {
	return hasPositiveKilometer(left) && hasPositiveKilometer(right) && left === right;
}

function buildKilometerPairValue(primary?: number | null, secondary?: number | null): string {
	if (kilometersMatch(primary, secondary)) {
		return formatKilometer(primary);
	}
	return `${formatKilometer(primary)} / ${formatKilometer(secondary)}`;
}

function buildRegionKilometerRow(
	regionName: string,
	salesKm?: number | null,
	calcKm?: number | null
): MetricRow | null {
	if (!hasPositiveKilometer(salesKm) && !hasPositiveKilometer(calcKm)) {
		return null;
	}
	if (kilometersMatch(salesKm, calcKm) || !hasPositiveKilometer(calcKm)) {
		return { label: `${regionName} 営業キロ`, value: formatKilometer(salesKm) };
	}
	if (!hasPositiveKilometer(salesKm)) {
		return { label: `${regionName} 計算キロ`, value: formatKilometer(calcKm) };
	}
	return {
		label: `${regionName} 営業キロ/計算キロ`,
		value: buildKilometerPairValue(salesKm, calcKm)
	};
}

function formatRoundtripCompanyFare(info: FareInfo): string {
	return formatCurrency((info.fareForCompanyline ?? 0) * 2);
}

function formatFareWithICFare(fare?: number | null, icFare?: number | null): string {
	const baseFare = formatCurrency(fare);
	if ((icFare ?? 0) <= 0) return baseFare;
	return `${baseFare} (${formatCurrency(icFare)})`;
}

function buildInlineFareRow(
	label: string,
	value: string,
	secondaryLabel?: string,
	secondaryValue?: string,
	layout: 'pair' | 'grid' = 'pair',
	hideSecondaryLabel: boolean = false
): MetricRow {
	return {
		label,
		value,
		secondaryLabel,
		secondaryValue,
		layout,
		hideSecondaryLabel
	};
}

function formatValidDays(value?: number | null): string {
	if (typeof value !== 'number' || Number.isNaN(value)) return '— 日';
	return `${value}日間`;
}

function buildKilometerRows(info: FareInfo | null): MetricRow[] {
	if (!info) return [];
	const rows: MetricRow[] = [];
	const hasCompanyOrBrt = hasPositiveKilometer(info.companySalesKm) || hasPositiveKilometer(info.brtSalesKm);
	if (kilometersMatch(info.totalSalesKm, info.jrCalcKm)) {
		rows.push({ label: '営業キロ', value: formatKilometer(info.totalSalesKm) });
	} else {
		rows.push({
			label: hasCompanyOrBrt ? '営業キロ / 計算キロ(JR)' : '営業キロ / 計算キロ',
			value: buildKilometerPairValue(info.totalSalesKm, info.jrCalcKm)
		});
	}
	const hokkaidoRow = buildRegionKilometerRow(
		'JR北海道',
		info.salesKmForHokkaido,
		info.calcKmForHokkaido
	);
	if (hokkaidoRow) {
		rows.push(hokkaidoRow);
	}
	if (hasPositiveKilometer(info.companySalesKm)) {
		rows.push({
			label: 'JR線 / 会社線',
			value: `${formatKilometer(info.jrSalesKm)} / ${formatKilometer(info.companySalesKm)}`
		});
	} else if (hasPositiveKilometer(info.brtSalesKm)) {
		rows.push({ label: 'JR営業キロ', value: formatKilometer(info.jrSalesKm) });
	}
	if ((info.brtSalesKm ?? 0) > 0) {
		rows.push({ label: 'BRT営業キロ', value: formatKilometer(info.brtSalesKm) });
	}
	const regionMetrics = [
		buildRegionKilometerRow('JR東日本', info.salesKmForEast, info.calcKmForEast),
		buildRegionKilometerRow('JR四国', info.salesKmForShikoku, info.calcKmForShikoku),
		buildRegionKilometerRow('JR九州', info.salesKmForKyusyu, info.calcKmForKyusyu)
	];
	for (const metric of regionMetrics) {
		if (metric) {
			rows.push(metric);
		}
	}
	if (info.isRule114Applied) {
		rows.push({
			label: '規程114条適用 営業キロ / 計算キロ',
			value: `${formatKilometer(info.rule114SalesKm)} / ${formatKilometer(info.rule114CalcKm)}`,
			note: info.rule114ApplyTerminal ? `${info.rule114ApplyTerminal}で計算` : undefined
		});
	}
	return rows;
}

function buildFareRows(info: FareInfo | null): MetricRow[] {
	if (!info) return [];
	const rows: MetricRow[] = [];
	const normalFareLabel = (info.fareForIC ?? 0) > 0 ? '普通運賃（IC運賃）' : '普通運賃';
	const normalFareValue = formatFareWithICFare(info.fare, info.fareForIC);
	if ((info.fareForCompanyline ?? 0) > 0) {
		rows.push(
			buildInlineFareRow(
				normalFareLabel,
				normalFareValue,
				'うち会社線',
				formatCurrency(info.fareForCompanyline)
			)
		);
	} else {
		rows.push({ label: normalFareLabel, value: normalFareValue });
	}
	if ((info.fareForBRT ?? 0) > 0) {
		rows.push({ label: 'BRT運賃', value: formatCurrency(info.fareForBRT) });
	}
	if (info.isRoundtripDiscount || (info.roundTripFareWithCompanyLine ?? 0) > 0) {
		rows.push(
			buildInlineFareRow(
				'往復',
				formatCurrency(info.roundTripFareWithCompanyLine),
				'うち会社線',
				(info.fareForCompanyline ?? 0) > 0 ? formatRoundtripCompanyFare(info) : undefined,
				'pair',
				true
			)
		);
		if (info.isRoundtripDiscount) {
			rows[rows.length - 1].note = '往復割引適用';
		}
	}
	if ((info.childFare ?? 0) > 0 || (info.roundtripChildFare ?? 0) > 0) {
		rows.push(
			buildInlineFareRow(
				'小児運賃',
				formatCurrency(info.childFare),
				'往復',
				(info.roundtripChildFare ?? 0) > 0 ? formatCurrency(info.roundtripChildFare) : undefined,
				'pair'
			)
		);
	}
	if (
		info.isAcademicFare &&
		((info.academicFare ?? 0) > 0 || (info.roundtripAcademicFare ?? 0) > 0)
	) {
		rows.push(
			buildInlineFareRow(
				'学割運賃',
				formatCurrency(info.academicFare),
				'往復',
				(info.roundtripAcademicFare ?? 0) > 0
					? formatCurrency(info.roundtripAcademicFare)
					: undefined,
				'pair'
			)
		);
	}
	const stockDiscounts = Array.isArray(info.stockDiscounts) ? info.stockDiscounts : [];
	for (const stock of stockDiscounts) {
		if (!stock || typeof stock.stockDiscountFare !== 'number' || stock.stockDiscountFare <= 0) {
			continue;
		}
		const title = typeof stock.stockDiscountTitle === 'string' ? stock.stockDiscountTitle.trim() : '';
		rows.push({
			label: title ? `株主優待運賃（${title}）` : '株主優待運賃',
			value: formatCurrency(stock.stockDiscountFare),
			note:
				typeof stock.rule114StockFare === 'number' && stock.rule114StockFare > 0
					? `規程114条適用前: ${formatCurrency(stock.rule114StockFare)}`
					: undefined
		});
	}
	if (info.isRule114Applied && (info.farePriorRule114 ?? 0) > 0) {
		rows.push({ label: '規程114条適用前', value: formatCurrency(info.farePriorRule114) });
	}
	if (info.isRule114Applied && (info.roundTripFareWithCompanyLinePriorRule114 ?? 0) > 0) {
		rows.push({
			label: '規程114条適用前（往復運賃）',
			value: formatCurrency(info.roundTripFareWithCompanyLinePriorRule114)
		});
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
		return '発着駅の都区市内を除き途中下車できます';
	}
	return '途中下車できます';
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
	goto(`${base}/`);
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
	goto(`${base}/version`);
}

function applyFareOption(option: FareOptionMenuItem): void {
	const route = routeRef;
	if (!route) return;
	try {
		if (option.state) {
			option.clearOption();
		} else {
			option.setOption();
		}
		refreshResult(route);
		errorMessage = '';
	} catch (err) {
		console.warn('オプション設定の適用に失敗しました', err);
		errorMessage = 'オプション設定の適用に失敗しました。';
	}
	closeMenu();
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

async function openExportDialog(): Promise<void> {
	exportDialogOpen = Boolean(fareExportText);
	if (!exportDialogOpen) return;
	await copyFareExport();
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
			<p>運賃詳細</p>
			<h1>{routeHeaderTitle}</h1>
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
					{#each fareOptionMenus as option (option.label)}
						<button type="button" role="menuitem" onclick={() => applyFareOption(option)}>
							{option.label}
						</button>
					{/each}
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
				<p class="route-title">{routeIntervalTitle}</p>
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
								<li class={`metric-row ${row.layout ? `metric-row-${row.layout}` : ''}`}>
									{#if row.layout}
										<div class="metric-inline-block">
											<div
												class={`metric-inline-pair ${!row.secondaryValue ? 'metric-inline-pair-full' : ''}`}
											>
												<p class="metric-label">{row.label}</p>
												<p class="metric-value">{row.value}</p>
											</div>
											{#if row.secondaryValue}
												<div class="metric-inline-pair secondary">
													{#if row.hideSecondaryLabel}
														<span class="metric-label-spacer" aria-hidden="true"></span>
													{:else}
														<p class="metric-label">{row.secondaryLabel}</p>
													{/if}
													<p class="metric-value">{row.secondaryValue}</p>
												</div>
											{/if}
											{#if row.note}
												<p class="metric-note metric-inline-note">{row.note}</p>
											{/if}
										</div>
									{:else}
										<div>
											<p class="metric-label">{row.label}</p>
											{#if row.note}
												<p class="metric-note">{row.note}</p>
											{/if}
										</div>
										<p class="metric-value">{row.value}</p>
									{/if}
								</li>
							{/each}
						</ul>
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
		color: var(--text-sub);
		font-size: 0.95rem;
	}

	.title-group > h1 {
		margin: 0.1rem 0 0;
		font-size: 1.35rem;
		color: var(--text-main);
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
		background: var(--icon-bg);
		color: var(--icon-fg);
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
		background: var(--card-bg);
		border-radius: 1rem;
		padding: 1.25rem;
		box-shadow: var(--card-shadow);
	}

	.route-header-card .route-title {
		margin: 0.25rem 0 0;
		font-size: 1.3rem;
		font-weight: 700;
		color: var(--text-main);
	}

	.label {
		margin: 0;
		font-size: 0.85rem;
		color: var(--text-sub);
	}

	.metric-card h3,
	.fare-card h3,
	.note-card h3,
	.validity-card h3,
	.route-detail-card h3 {
		margin: 0 0 0.75rem;
		font-size: 1.05rem;
		color: var(--text-main);
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

	.metric-row-pair,
	.metric-row-grid {
		display: block;
	}

	.metric-inline-block {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.5rem 1rem;
		width: 100%;
	}

	.metric-inline-pair {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
		min-width: 0;
	}

	.metric-inline-pair-full {
		grid-column: 1 / -1;
		justify-content: space-between;
		width: 100%;
	}

	.metric-inline-pair-full .metric-value {
		margin-left: auto;
	}

	.metric-inline-pair.secondary {
		justify-content: flex-end;
	}

	.metric-inline-note {
		grid-column: 1 / -1;
	}

	.metric-label-spacer {
		display: inline-block;
		width: 4.75rem;
		flex: 0 0 auto;
	}

	.metric-label {
		margin: 0;
		font-size: 0.95rem;
		color: var(--text-main);
		font-weight: 600;
	}

	.metric-note {
		margin: 0.2rem 0 0;
		font-size: 0.85rem;
		color: var(--text-sub);
	}

	.metric-note.success {
		color: var(--success-text);
	}

	.metric-value {
		margin: 0;
		font-size: 1rem;
		font-weight: 700;
		color: var(--text-main);
		white-space: nowrap;
	}

	.metric-row-grid .metric-inline-pair {
		justify-content: flex-start;
	}

	.placeholder {
		margin: 0;
		color: var(--subtitle-color);
		font-size: 0.95rem;
	}

	.note-card ul {
		padding-left: 1.1rem;
		margin: 0;
		color: var(--text-main);
	}

	.validity-card .valid-days {
		margin: 0 0 0.25rem;
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--text-main);
	}

	.route-string {
		margin: 0 0 0.5rem;
		font-family: 'Roboto Mono', 'Noto Sans JP', monospace;
		font-size: 0.95rem;
		color: var(--text-main);
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
		background: var(--info-bg);
		color: var(--info-text);
	}

	.info-banner.success {
		background: var(--success-bg);
		color: var(--success-text);
	}

	.error-banner {
		background: var(--error-bg);
		color: var(--error-text);
	}

	.warning-banner {
		background: var(--warning-bg);
		color: var(--warning-text);
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
		max-height: min(90vh, 540px);
		overflow: hidden;
		display: flex;
		flex-direction: column;
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
		background: var(--code-bg);
		color: var(--code-text);
		font-family: 'Roboto Mono', 'Noto Sans JP', monospace;
		font-size: 0.95rem;
		white-space: pre-wrap;
		word-break: break-word;
		max-height: min(72vh, 420px);
		overflow: auto;
	}

	.copy-button {
		border: none;
		background: var(--nav-btn-bg);
		color: var(--nav-btn-text);
		padding: 0.5rem 1.2rem;
		border-radius: 999px;
		font-weight: 600;
		cursor: pointer;
	}

	.copy-button:hover {
		background: var(--station-grad-start);
		color: #fff;
	}

	.app-menu {
		position: absolute;
		top: 48px;
		right: 0;
		background: var(--menu-bg);
		box-shadow: var(--menu-shadow);
		border-radius: 0.75rem;
		padding: 0.5rem;
		z-index: 20;
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
		color: var(--text-main);
		background-color: transparent;
		cursor: pointer;
	}

	.app-menu button:hover {
		background: var(--list-item-bg);
	}

	.menu-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.2);
		border: none;
		padding: 0;
		margin: 0;
		cursor: pointer;
		z-index: 10;
	}

	@media (max-width: 640px) {
		.metric-row-grid .metric-inline-block {
			grid-template-columns: 1fr;
		}

		.metric-row-grid .metric-inline-pair.secondary {
			justify-content: flex-start;
		}

		.metric-row-grid .metric-label-spacer {
			display: none;
		}
	}
</style>
