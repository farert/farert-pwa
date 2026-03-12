<script lang="ts">
import { goto } from '$app/navigation';
import { base } from '$app/paths';
import { onMount } from 'svelte';
import FareSummaryCard from '$lib/components/FareSummaryCard.svelte';
import DrawerNavigation from '$lib/components/DrawerNavigation.svelte';
import { initFarert, Farert } from '$lib/wasm';
import type { FaretClass } from '$lib/wasm/types';
	import { FareType, type FareInfo, type TicketHolderItem } from '$lib/types';
	import { initStores, mainRoute, mainScreenErrorMessage, ticketHolder } from '$lib/stores';
	import { generateShareUrl, compressRouteForUrl } from '$lib/utils/urlRoute';

	interface RouteSegment {
		id: number;
		line: string;
		station: string;
	}

	const OSAKA_LOOP_LINE = '大阪環状線';

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
let showFareSummary = $state(false);
let appMenuOpen = $state(false);
let hasOsakakanOption = $state(false);
let hasKokuraOption = $state(false);
let osakaDetourSelected = $state(false);
let treatKokuraAsSame = $state(true);
let drawerOpen = $state(false);
let holderItems = $state<TicketHolderItem[]>([]);
let holderView = $state<
	{
		key: string;
		item: TicketHolderItem;
		title: string;
		fareText: string;
		kmText: string;
		fareValue: number;
		kmValue: number;
	}[]
>([]);
let info = $state('');
let theme = $state<'light' | 'dark'>('light');
let currentRouteScript = $state('');
let confirmDialogOpen = $state(false);
let confirmDialogMessage = $state('');
let confirmResolver: ((result: boolean) => void) | null = null;
const osakaMenuLabel = $derived(
	osakaDetourSelected ? '大阪環状線近回り' : '大阪環状線遠回り'
);
const kokuraMenuLabel = $derived(
	treatKokuraAsSame
		? '小倉-博多間新幹線在来線別線扱い（無効）'
		: '小倉-博多間新幹線在来線別線扱い（有効）'
);
const canAddToHolder = $derived(() => {
	const script = route ? safeRouteScript(route) : currentRouteScript;
	const count = resolveRouteCount(route, script);
	return Boolean(script) && count > 1;
});

	function isBuildSuccess(result: unknown): boolean {
		if (typeof result === 'number') return result >= 0;
		if (typeof result === 'string') {
			const trimmed = result.trim().replace(/\0/g, '');
			const numeric = Number(trimmed);
			if (!Number.isNaN(numeric)) return numeric >= 0;
			try {
				const parsed = JSON.parse(trimmed) as { rc?: number };
				return typeof parsed.rc === 'number' ? parsed.rc >= 0 : false;
			} catch {
				const match = trimmed.match(/"rc"\s*:\s*(-?\d+)/);
				return match ? Number(match[1]) >= 0 : false;
			}
		}
		return false;
	}

function parseFareInfoJson(raw: unknown): FareInfo | null {
	if (typeof raw !== 'string') return null;
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

	const tryParse = (text: string): FareInfo | null => {
		try {
			const parsed = JSON.parse(text) as FareInfo;
			const normalized = normalizeKilometers(parsed);
			normalized.messages = Array.isArray(normalized.messages) ? [...normalized.messages] : [];
			return normalized;
		} catch (err) {
			return null;
		}
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
		const parsed = tryParse(candidate);
		if (parsed) return parsed;
	}

	return null;
}

	onMount(() => {
		let unsubscribe: (() => void) | null = null;
		let unsubscribeHolder: (() => void) | null = null;
		let unsubscribeMainError: (() => void) | null = null;

		(async () => {
			try {
				const initialTheme = resolveTheme();
				applyTheme(initialTheme);
				await initFarert();
				initStores(Farert);
				unsubscribe = mainRoute.subscribe((value) => {
					route = value;
					refreshRouteState(value);
				});
				unsubscribeMainError = mainScreenErrorMessage.subscribe((message) => {
					if (!message) return;
					error = message;
					mainScreenErrorMessage.set('');
				});
				unsubscribeHolder = ticketHolder.subscribe((value) => {
					holderItems = [...value].sort((a, b) => a.order - b.order);
					updateHolderView();
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
			unsubscribeHolder?.();
			unsubscribeMainError?.();
		};
	});

	function resolveTheme(): 'light' | 'dark' {
		if (typeof localStorage !== 'undefined') {
			const stored = localStorage.getItem('theme');
			if (stored === 'dark' || stored === 'light') return stored;
		}
		if (typeof window !== 'undefined' && window.matchMedia) {
			return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
		}
		return 'light';
	}

	function applyTheme(next: 'light' | 'dark'): void {
		theme = next;
		if (typeof document !== 'undefined') {
			document.documentElement.setAttribute('data-theme', next);
		}
		if (typeof localStorage !== 'undefined') {
			localStorage.setItem('theme', next);
		}
	}

	function toggleTheme(): void {
		applyTheme(theme === 'light' ? 'dark' : 'light');
	}

	function refreshRouteState(current: FaretClass | null) {
		if (!current) {
			resetView();
			return;
		}

		const script = safeRouteScript(current);
		if (!script) {
			resetView();
			return;
		}
		currentRouteScript = script;

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
		const routeCount = current.getRouteCount ? current.getRouteCount() : parsedSegments.length;
		showFareSummary = routeCount >= 2;
	} catch (err) {
		console.warn('経路本数の取得に失敗しました', err);
		showFareSummary = parsedSegments.length > 0;
	}

	try {
		const raw = current.getFareInfoObjectJson ? current.getFareInfoObjectJson() : '';
		fareInfo = parseFareInfoJson(raw);
		if (!fareInfo && raw.trim()) {
			console.warn('運賃情報の復元に失敗しました（修復不可）');
		}
	} catch (err) {
		console.warn('運賃情報の取得に失敗しました', err);
		fareInfo = null;
	}

	try {
		detailLink = generateShareUrl(current, -1, { basePath: base });
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
	updateOptionAvailability(fareInfo);
}

function resetView() {
	currentRouteScript = '';
	startStation = '';
	segments = [];
	fareInfo = null;
	detailLink = '';
	canUndo = false;
	canReverse = false;
	optionEnabled = true;
	hasOsakakanOption = false;
	hasKokuraOption = true;
	osakaDetourSelected = false;
	treatKokuraAsSame = true;
	appMenuOpen = false;
	showFareSummary = false;
}

function updateOptionAvailability(_info: FareInfo | null) {
	const tokens = currentRouteScript
		.split(',')
		.map((token) => token.trim())
		.filter(Boolean);
	const lineTokens = tokens.filter((_, index) => index > 0 && index % 2 === 1);
	const hasRouteScriptOsaka = lineTokens.some(
		(line) => line === OSAKA_LOOP_LINE || line === `r${OSAKA_LOOP_LINE}` || line.includes(OSAKA_LOOP_LINE)
	);
	const hasRdetourOsaka = segments.some(
		(segment) => segment.line === `r${OSAKA_LOOP_LINE}` || segment.line.includes(`r${OSAKA_LOOP_LINE}`)
	);
	const hasOsakaLoop = segments.some(
		(segment) => segment.line === OSAKA_LOOP_LINE || segment.line.includes(OSAKA_LOOP_LINE)
	);
	hasOsakakanOption = hasOsakaLoop || hasRdetourOsaka || hasRouteScriptOsaka;
	hasKokuraOption = true;
	optionEnabled = true;
}

	function ensureRoute(): FaretClass {
		if (route) return route;
		const next = new Farert();
		route = next;
		mainRoute.set(next);
		return next;
	}

	function openDrawer() {
		drawerOpen = !drawerOpen;
	}

	function openVersionInfo() {
		goto(`${base}/version`);
	}

	function toggleAppMenu() {
		appMenuOpen = !appMenuOpen;
		if (!appMenuOpen) return;
		if (!optionEnabled) {
			return;
		}
	}

	function closeMenus() {
		appMenuOpen = false;
	}

	function handleVersionMenuSelection() {
		closeMenus();
		openVersionInfo();
	}

	function openTerminalSelection() {
		goto(`${base}/terminal-selection`);
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
		goto(`${base}/line-selection?${params.toString()}`);
	}

	function openSegmentDetail(segmentIndex: number) {
		if (!route) return;
		try {
			const compressed = compressRouteForUrl(route, segmentIndex + 1);
			goto(`${base}/detail?r=${compressed}`);
		} catch (err) {
			error = `詳細画面を開けませんでした: ${err}`;
		}
	}

	function openFullDetail() {
		if (!route) return;
		try {
			const compressed = compressRouteForUrl(route);
			goto(`${base}/detail?r=${compressed}`);
		} catch (err) {
			error = `詳細画面を開けませんでした: ${err}`;
		}
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
		if (!isBuildSuccess(result)) {
			error = '経路の反転に失敗しました。';
			return;
		}
		mainRoute.set(route);
		refreshRouteState(route);
	}

	function openOptions() {
		appMenuOpen = true;
	}

	function openSave() {
		goto(`${base}/save`);
	}

	function toggleKokuraHakataLink() {
		if (!hasKokuraOption) return;
		const next = !treatKokuraAsSame;
		treatKokuraAsSame = next;
		if (!route) return;
		try {
			route.setNotSameKokuraHakataShinZai(!next);
			mainRoute.set(route);
			appMenuOpen = false;
		} catch (err) {
			console.error('小倉-博多オプションの切り替えに失敗しました', err);
		}
	}

	function parseFareForHolder(info: FareInfo | null, fareType: FareType): number {
		if (!info) return 0;
		switch (fareType) {
			case FareType.CHILD:
				return info.childFare ?? 0;
			case FareType.ROUND_TRIP:
				return info.roundTripFareWithCompanyLine ?? 0;
			case FareType.STOCK_DISCOUNT:
				return info.stockDiscounts?.[0]?.stockDiscountFare ?? 0;
			case FareType.STOCK_DISCOUNT_X2:
				return (info.stockDiscounts?.[0]?.stockDiscountFare ?? 0) * 2;
			case FareType.STUDENT:
				return info.academicFare ?? 0;
			case FareType.STUDENT_ROUND_TRIP:
				return info.roundtripAcademicFare ?? 0;
			case FareType.DISABLED:
				return 0;
			case FareType.NORMAL:
			default:
				return info.fare ?? 0;
		}
	}

	function deriveTitle(script: string): string {
		const tokens = script.split(',').map((t) => t.trim()).filter(Boolean);
		if (tokens.length >= 3) {
			const from = tokens[0];
			const to = tokens[tokens.length - 1];
			return `${from} - ${to}`;
		}
		return script || '経路';
	}

	function formatFare(value: number | null | undefined): string {
		if (typeof value !== 'number' || Number.isNaN(value)) return '—';
		return `¥${value.toLocaleString('ja-JP')}`;
	}

	function formatKm(value: number | null | undefined): string {
		if (typeof value !== 'number' || Number.isNaN(value)) return '— km';
		return `${value.toFixed(1)}km`;
	}

function updateHolderView(): void {
		const views: {
			key: string;
			item: TicketHolderItem;
			title: string;
			fareText: string;
			kmText: string;
			fareValue: number;
			kmValue: number;
		}[] = [];
		for (const [index, item] of holderItems.entries()) {
			let fare = 0;
			let km = 0;
			try {
				const tmp = new Farert();
				const rc = tmp.buildRoute(item.routeScript);
				if (isBuildSuccess(rc)) {
					try {
						tmp.showFare?.();
					} catch (err) {
						console.warn('きっぷホルダ項目の運賃計算に失敗しました', err);
					}
					const info = parseFareInfoJson(tmp.getFareInfoObjectJson());
					fare = parseFareForHolder(info, item.fareType);
					km = info?.totalSalesKm ?? 0;
				}
			} catch (err) {
				console.warn('きっぷホルダ項目の計算に失敗しました', err);
			}
			views.push({
				key: String(item.order),
				item,
				title: deriveTitle(item.routeScript),
				fareText: formatFare(fare),
				kmText: formatKm(km),
				fareValue: fare,
				kmValue: km
			});
		}
		holderView = views;
	}

	function handleHolderDelete(order: number): void {
		if (!Number.isFinite(order)) return;
		ticketHolder.update((list) => list.filter((item) => item.order !== order));
	}

	function handleHolderFareChange(order: number, fareType: FareType): void {
		if (!Number.isFinite(order)) return;
		ticketHolder.update((list) =>
			list.map((item) => (item.order === order ? { ...item, fareType } : item))
		);
		updateHolderView();
	}

	function handleHolderMove(
		fromOrder: number,
		toOrder: number,
		insertBefore = true
	): void {
		if (!Number.isFinite(fromOrder) || !Number.isFinite(toOrder)) return;
		if (fromOrder <= 0 || toOrder <= 0) return;
		ticketHolder.update((list) => {
			const sorted = [...list].sort((a, b) => a.order - b.order);
			const fromIndex = sorted.findIndex((item) => item.order === fromOrder);
			const toIndex = sorted.findIndex((item) => item.order === toOrder);
			if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return sorted;
			const nextItems = [...sorted];
			const [moved] = nextItems.splice(fromIndex, 1);
			let insertIndex = toIndex;
			if (fromIndex < toIndex) {
				insertIndex += insertBefore ? -1 : 0;
			} else {
				insertIndex += insertBefore ? 0 : 1;
			}
			insertIndex = Math.max(0, Math.min(nextItems.length, insertIndex));
			nextItems.splice(insertIndex, 0, moved);
			return nextItems.map((item, index) => ({
				...item,
				order: index + 1
			}));
		});
	}

	async function handleHolderSelect(drawerItem: { item: TicketHolderItem }): Promise<void> {
		const script = drawerItem.item.routeScript;
		if (!script) return;
		if (shouldConfirmRouteOverwrite(script) && !(await confirmRouteOverwrite())) {
			return;
		}
		try {
			const next = new Farert();
			const rc = next.buildRoute(script);
			if (!isBuildSuccess(rc)) {
				error = `きっぷホルダの経路復元に失敗しました (コード: ${rc})`;
				return;
			}
			mainRoute.set(next);
			refreshRouteState(next);
			drawerOpen = false;
		} catch (err) {
			console.error('きっぷホルダの適用に失敗しました', err);
			error = 'きっぷホルダの適用に失敗しました。';
		}
	}

	function safeRouteScript(target: FaretClass | null): string {
		try {
			return target?.routeScript()?.trim() ?? '';
		} catch (err) {
			console.warn('経路スクリプト取得に失敗しました', err);
			return '';
		}
	}

	function shouldConfirmRouteOverwrite(nextScript: string): boolean {
		const currentScript = safeRouteScript(route);
		if (!currentScript || currentScript === nextScript) return false;
		const count = resolveRouteCount(route, currentScript);
		return count >= 2;
	}

	function confirmRouteOverwrite(): Promise<boolean> {
		return openConfirmDialog('経路が消去されますがよろしいですか？');
	}

	function openConfirmDialog(message: string): Promise<boolean> {
		if (confirmResolver) {
			confirmResolver(false);
			confirmResolver = null;
		}
		confirmDialogMessage = message;
		confirmDialogOpen = true;
		return new Promise((resolve) => {
			confirmResolver = resolve;
		});
	}

	function resolveConfirmDialog(result: boolean): void {
		confirmDialogOpen = false;
		confirmDialogMessage = '';
		const resolver = confirmResolver;
		confirmResolver = null;
		resolver?.(result);
	}

	function resolveRouteCount(target: FaretClass | null, script: string): number {
		try {
			if (target?.getRouteCount) return target.getRouteCount();
		} catch (err) {
			console.warn('経路本数取得に失敗しました', err);
		}
		const tokens = script ? script.split(',').filter(Boolean) : [];
		return Math.max(0, (tokens.length - 1) / 2);
	}

	function handleAddToHolder(): void {
		const script = route ? route.routeScript() : currentRouteScript;
		if (!script) {
			error = '追加する経路がありません。';
			return;
		}
		const count = resolveRouteCount(route, script);
		if (count <= 1) {
			error = '2区間以上の経路のみ追加できます。';
			return;
		}
		const nextOrder = holderItems.length ? Math.max(...holderItems.map((i) => i.order)) + 1 : 1;
		const newItem: TicketHolderItem = {
			order: nextOrder,
			routeScript: script,
			fareType: FareType.NORMAL
		};
		ticketHolder.update((list) => [...list, newItem]);
		updateHolderView();
		info = 'きっぷホルダに追加しました。';
	}

	async function handleShareHolder(): Promise<void> {
		const text = holderItems.map((item) => item.routeScript).join('\n');
		if (!text) return;
		try {
			if (navigator.share) {
				await navigator.share({ text });
				info = 'きっぷホルダを共有しました。';
				return;
			}
		} catch (err) {
			console.warn('きっぷホルダ共有に失敗しました', err);
		}
		try {
			await navigator.clipboard.writeText(text);
			info = 'きっぷホルダをコピーしました。';
		} catch (err) {
			console.error('きっぷホルダのコピーに失敗しました', err);
			error = 'きっぷホルダのコピーに失敗しました。';
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
			appMenuOpen = false;
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
		<img src="{base}/trade-icon.png" alt="" class="title-icon tall" />
		<div class="title-text">
			<h1>経路運賃営業キロ計算</h1>
			<p>Farert</p>
		</div>
	</div>
	<div class="menu-container">
		<button
			type="button"
			class="icon-button"
			aria-label={theme === 'dark' ? 'ライトモードに切り替え' : 'ダークモードに切り替え'}
			onclick={toggleTheme}
			data-testid="theme-toggle"
		>
			<span class="material-symbols-rounded icon-button-symbol" aria-hidden="true">
				{theme === 'dark' ? 'light_mode' : 'dark_mode'}
			</span>
		</button>
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
				{#if optionEnabled}
					<hr class="menu-divider" />
					<div class="menu-section-title">経路オプション</div>
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
				{/if}
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
		{#if info}
			<p class="info-banner success" role="status">{info}</p>
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
			{#if segments.length === 0}
				<p class="placeholder">区間が追加されていません</p>
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
		</button>

		{#if showFareSummary}
			<FareSummaryCard
				fareInfo={fareInfo}
				detailEnabled={Boolean(detailLink)}
				onDetailClick={openFullDetail}
			/>
		{/if}

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
			<button type="button" onclick={openSave} aria-label="保存">
				<span class="material-symbols-rounded bottom-nav-icon" aria-hidden="true">save</span>
			</button>
		</nav>

	{/if}

	{#if appMenuOpen}
		<button
			type="button"
			class="menu-overlay dim"
			aria-label="メニューを閉じる"
			onclick={closeMenus}
		></button>
	{/if}

	{#if confirmDialogOpen}
		<div class="confirm-overlay" role="dialog" aria-modal="true" aria-label="確認ダイアログ">
			<section class="confirm-card">
				<h3>確認</h3>
				<p>{confirmDialogMessage}</p>
				<div class="confirm-actions">
					<button type="button" class="confirm-primary" onclick={() => resolveConfirmDialog(true)}>
						はい
					</button>
					<button
						type="button"
						class="confirm-secondary"
						onclick={() => resolveConfirmDialog(false)}
					>
						いいえ
					</button>
				</div>
			</section>
		</div>
	{/if}

	<DrawerNavigation
		isOpen={drawerOpen}
		items={holderView}
		canAdd={canAddToHolder}
		onClose={() => (drawerOpen = false)}
		onShare={handleShareHolder}
		onAddToHolder={handleAddToHolder}
		onItemClick={handleHolderSelect}
		onItemDelete={handleHolderDelete}
		onFareTypeChange={handleHolderFareChange}
		onMoveItem={handleHolderMove}
	/>
</div>

<style>
	:global(:root) {
		--bg: #f4f5f7;
		--text-main: #0f172a;
		--text-sub: #6b7280;
		--title-color: #1f2937;
		--subtitle-color: #9ca3af;
		--card-bg: #ffffff;
		--card-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
		--info-bg: #eff6ff;
		--info-text: #1d4ed8;
		--error-bg: #fee2e2;
		--error-text: #b91c1c;
		--icon-bg: #f3e8ff;
		--icon-fg: #6b21a8;
		--nav-btn-bg: #ede9fe;
		--nav-btn-text: #4c1d95;
		--station-grad-start: #6b21a8;
		--station-grad-end: #a855f7;
		--menu-bg: #ffffff;
		--menu-shadow: 0 8px 20px rgba(15, 23, 42, 0.18);
		--overlay-dim: rgba(15, 23, 42, 0.2);
	}

	:global([data-theme='dark']) {
		--bg: #0f172a;
		--text-main: #e5e7eb;
		--text-sub: #cbd5e1;
		--title-color: #e5e7eb;
		--subtitle-color: #c7d2fe;
		--card-bg: #111827;
		--card-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
		--info-bg: #1f2937;
		--info-text: #c7d2fe;
		--error-bg: #3f1d2e;
		--error-text: #fecdd3;
		--icon-bg: rgba(255, 255, 255, 0.08);
		--icon-fg: #e0e7ff;
		--nav-btn-bg: #312e81;
		--nav-btn-text: #c4b5fd;
		--station-grad-start: #5b21b6;
		--station-grad-end: #6d28d9;
		--menu-bg: #1f2937;
		--menu-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
		--overlay-dim: rgba(15, 23, 42, 0.5);
	}

	:global(body) {
		background: var(--bg);
		color: var(--text-main);
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
		padding-bottom: calc(5.5rem + env(safe-area-inset-bottom));
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		color: var(--text-main);
		min-height: 100vh;
	}

	.top-bar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.5rem 0;
		color: var(--text-main);
	}

	.icon-button {
		width: 48px;
		height: 48px;
		border-radius: 50%;
		border: none;
		background: var(--icon-bg);
		color: var(--icon-fg);
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		justify-content: center;
	}

	.icon-button-symbol {
		font-size: 1.7rem;
	}

	.title h1 {
		margin: 0;
		font-size: 1.4rem;
		color: var(--title-color);
	}

	.title-row {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}

	.title {
		flex: 1;
		display: flex;
		align-items: center;
		gap: 0.6rem;
		justify-content: center;
		text-align: center;
	}

	.title-icon {
		width: 64px;
		height: 64px;
		object-fit: contain;
	}

	.title-text {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
		align-items: flex-start;
	}

	.title p {
		margin: 0;
		color: var(--subtitle-color);
		font-size: 0.9rem;
	}

	.info-banner,
	.error-banner {
		padding: 1rem;
		border-radius: 0.75rem;
	}

	.info-banner {
		background: var(--info-bg);
		color: var(--info-text);
	}

	.error-banner {
		background: var(--error-bg);
		color: var(--error-text);
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.5rem;
	}

	.card {
		background: var(--card-bg);
		border-radius: 1rem;
		padding: 1rem 1.25rem;
		box-shadow: var(--card-shadow);
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
		background: linear-gradient(135deg, var(--station-grad-start), var(--station-grad-end));
		color: #fff;
		position: sticky;
		top: 0.75rem;
		z-index: 12;
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
		color: var(--text-sub);
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
		color: var(--text-main);
	}

	.route-station {
		margin: 0;
		color: var(--text-sub);
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

	.add-route-card:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.menu-container {
		position: relative;
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}

	.app-menu {
		position: absolute;
		top: calc(100% + 0.25rem);
		right: 0;
		background: var(--menu-bg);
		border-radius: 0.75rem;
		box-shadow: var(--menu-shadow);
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
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		background: var(--menu-bg);
		border-top: 1px solid color-mix(in srgb, var(--text-sub) 20%, transparent);
		padding: 0.5rem 0.75rem max(0.5rem, env(safe-area-inset-bottom, 0));
		z-index: 28;
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 0.75rem;
		margin-top: 0;
	}

	.bottom-nav button {
		border: none;
		border-radius: 0.75rem;
		padding: 0.75rem;
		background: var(--nav-btn-bg);
		color: var(--nav-btn-text);
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

	.menu-section-title {
		padding: 0.2rem 1rem 0.2rem;
		font-size: 0.78rem;
		font-weight: 700;
		color: var(--text-sub);
		letter-spacing: 0.02em;
	}

	.menu-divider {
		border: none;
		height: 1px;
		margin: 0.2rem 0.35rem;
		background: color-mix(in srgb, var(--text-sub) 25%, transparent);
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
		background: var(--overlay-dim);
	}

	.confirm-overlay {
		position: fixed;
		inset: 0;
		display: grid;
		place-items: center;
		background: rgba(2, 6, 23, 0.45);
		backdrop-filter: blur(2px);
		z-index: 60;
	}

	.confirm-card {
		width: min(420px, calc(100% - 2rem));
		background: var(--card-bg);
		border-radius: 1rem;
		padding: 1rem;
		box-shadow: 0 24px 40px rgba(15, 23, 42, 0.35);
	}

	.confirm-card h3 {
		margin: 0 0 0.5rem;
		font-size: 1.05rem;
		color: var(--title-color);
	}

	.confirm-card p {
		margin: 0;
		color: var(--text-main);
	}

	.confirm-actions {
		margin-top: 1rem;
		display: flex;
		justify-content: flex-end;
		gap: 0.5rem;
	}

	.confirm-actions button {
		border: none;
		border-radius: 0.65rem;
		padding: 0.5rem 0.95rem;
		font-weight: 700;
		cursor: pointer;
	}

	.confirm-primary {
		background: #2563eb;
		color: #fff;
	}

	.confirm-secondary {
		background: #e5e7eb;
		color: #1f2937;
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
