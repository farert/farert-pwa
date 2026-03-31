<script lang="ts">
import { goto } from '$app/navigation';
import { base } from '$app/paths';
import { onMount } from 'svelte';
import { get } from 'svelte/store';
import {
	initFarert,
	getBranchStationsByLine,
	getStationsByLine,
	getKanaByStation,
	getLinesByStation,
	executeSql
} from '$lib/wasm';
import { mainRoute } from '$lib/stores';
import { scrollPageToBottom, scrollPageToTop } from '$lib/utils/responsiveLayout';
import type { FaretClass } from '$lib/wasm/types';

type ScreenMode = 'branch' | 'destination';
type ScreenSource = 'main' | 'start' | 'destination';

interface StationSelectionParams {
	from: ScreenSource;
	station?: string;
	line?: string;
	prefecture?: string;
	group?: string;
}
interface StationMetaInfo {
	name: string;
	kana: string;
	lines: string[];
}

let loading = $state(true);
let errorMessage = $state('');
let params = $state<StationSelectionParams>({ from: 'main' });
let mode = $state<ScreenMode>('branch');
let branchStations = $state<string[]>([]);
let destinationStations = $state<string[]>([]);
let stationDetails = $state<Record<string, StationMetaInfo>>({});
let routeRef = $state<FaretClass | null>(null);
let {
	presetParams = null,
	embedded = false
} = $props<{ presetParams?: Partial<StationSelectionParams> | null; embedded?: boolean }>();

onMount(() => {
	const unsubscribe = mainRoute.subscribe((value) => {
		routeRef = value;
	});

	(async () => {
		try {
			await initFarert();
			const resolved = resolveParams();
			params = resolved;
			await loadStations(resolved);
		} catch (err) {
			console.error('駅一覧の初期化に失敗しました', err);
			errorMessage = '駅一覧の初期化に失敗しました。';
		} finally {
			loading = false;
		}
	})();

	return () => {
		unsubscribe();
	};
});

function resolveParams(): StationSelectionParams {
	if (presetParams) {
		return {
			from: presetParams.from ?? 'main',
			station: presetParams.station,
			line: presetParams.line,
			prefecture: presetParams.prefecture,
			group: presetParams.group
		};
	}

	if (typeof window === 'undefined') {
		return { from: 'main' };
	}

	const search = new URLSearchParams(window.location.search);
	const fromParam = search.get('from');
	const from: ScreenSource = fromParam === 'start' || fromParam === 'destination' ? fromParam : 'main';

	return {
		from,
		station: search.get('station') ?? undefined,
		line: search.get('line') ?? undefined,
		prefecture: search.get('prefecture') ?? undefined,
		group: search.get('group') ?? undefined
	};
}

function loadStations(context: StationSelectionParams): void {
	try {
		if (!context.line) {
			throw new Error('line parameter is required');
		}

		destinationStations = parseList(getStationsByLine(context.line));

		if (context.from === 'main' && context.station) {
			const startStation = routeRef?.departureStationName?.().trim() ?? '';
			const branchBaseStation = startStation || context.station;
			const rawBranches = parseList(
				getBranchStationsByLine(context.line, branchBaseStation)
			);
			const seen = new Set<string>();
			const deduped = rawBranches.filter((name) => {
				if (!name || name === context.station || seen.has(name)) return false;
				seen.add(name);
				return true;
			});
			const candidates = [context.station, ...deduped];
			if (startStation && destinationStations.includes(startStation)) {
				candidates.push(startStation);
			}
			branchStations = sortStationsByLineOrder(candidates, destinationStations);
		} else {
			branchStations = destinationStations;
		}
		stationDetails = buildStationDetails([...new Set([...branchStations, ...destinationStations])], context.line);
		errorMessage = '';
	} catch (err) {
		console.error('駅リストの取得に失敗しました', err);
		errorMessage = '駅リストの取得に失敗しました。';
		branchStations = [];
		destinationStations = [];
	}
}

function parseList(raw: string): string[] {
	try {
		if (!raw) return [];
		const parsed = JSON.parse(raw);
		if (Array.isArray(parsed)) {
			return parsed.filter((name): name is string => Boolean(name?.trim())).map((name) => name.trim());
		}
		if (parsed && typeof parsed === 'object' && Object.keys(parsed).length === 0) {
			return [];
		}
		if (parsed && typeof parsed === 'object') {
			const firstArrayKey = Object.keys(parsed).find((key) => Array.isArray((parsed as Record<string, unknown>)[key]));
			if (firstArrayKey) {
				return ((parsed as Record<string, string[]>)[firstArrayKey] ?? []).map((name) => name?.trim()).filter((name): name is string => Boolean(name));
			}
		}
	} catch (err) {
		console.warn('駅リストの解析に失敗しました', err);
	}
	return [];
}

function sortStationsByLineOrder(stations: string[], lineStations: string[]): string[] {
	const uniqueStations = [...new Set(stations.filter((station) => station.trim().length > 0))];
	const orderMap = new Map<string, number>();
	lineStations.forEach((station, index) => {
		if (!orderMap.has(station)) {
			orderMap.set(station, index);
		}
	});

	return uniqueStations.sort((left, right) => {
		const leftIndex = orderMap.get(left);
		const rightIndex = orderMap.get(right);
		if (leftIndex !== undefined && rightIndex !== undefined) {
			return leftIndex - rightIndex;
		}
		if (leftIndex !== undefined) return -1;
		if (rightIndex !== undefined) return 1;
		return left.localeCompare(right, 'ja');
	});
}

function buildStationDetails(stations: string[], lineName: string): Record<string, StationMetaInfo> {
	const info: Record<string, StationMetaInfo> = {};
	const stationNameMap = resolveDisplayNames(stations, lineName);

	for (const station of stations) {
		let kana = '';
		let lines: string[] = [];
		const displayName = stationNameMap[station] ?? station;
		const normalized = normalizeStationName(displayName);

		try {
			kana = getKanaByStation(displayName);
		} catch (err) {
			console.warn('かな情報の取得に失敗しました', station, err);
		}
		if (!kana && normalized !== displayName) {
			try {
				kana = getKanaByStation(normalized);
			} catch (err) {
				console.warn('かな情報の再取得に失敗しました', station, err);
			}
		}
		try {
			lines = parseList(getLinesByStation(station));
		} catch (err) {
			console.warn('所属路線情報の取得に失敗しました', station, err);
		}
		info[station] = { name: displayName, kana, lines };
	}
	return info;
}

function normalizeStationName(raw: string): string {
	const trimmed = raw.trim();
	return trimmed.replace(/[（(][^（）()]*[）)]$/g, '').trim();
}

function hasSamenameSuffix(raw: string): boolean {
	return /[（(][^（）()]*[）)]$/.test(raw.trim());
}

function formatSamenameSuffix(raw: string): string {
	const trimmed = raw.trim();
	if (!trimmed) return '';
	return trimmed.startsWith('(') || trimmed.startsWith('（') ? trimmed : `(${trimmed})`;
}

function resolveDisplayNames(stations: string[], lineName: string): Record<string, string> {
	const map: Record<string, string> = {};
	const stationBaseNames = [...new Set(stations.map((station) => normalizeStationName(station)))];
	const sameNameByBase = resolveSameNameSuffix(stationBaseNames, lineName);

	for (const station of stations) {
		if (map[station] !== undefined) {
			continue;
		}
		if (hasSamenameSuffix(station)) {
			map[station] = station;
			continue;
		}
		const base = normalizeStationName(station);
		const suffix = sameNameByBase[base] ?? '';
		map[station] = suffix ? `${base}${suffix}` : station;
	}
	return map;
}

function resolveSameNameSuffix(stationNames: string[], lineName: string): Record<string, string> {
	const result: Record<string, string> = {};
	if (typeof executeSql !== 'function') {
		return result;
	}

	const query = (name: string, useLineFilter: boolean): string => {
		const escapedName = name.replace(/'/g, "''");
		const escapedLine = lineName.replace(/'/g, "''");
		const lineClause = useLineFilter ? ` and ln.name='${escapedLine}'` : '';
		return (
			`select distinct t.samename from t_station t`
			+ ` left join t_lines l on t.rowid=l.station_id`
			+ ` left join t_line ln on ln.rowid=l.line_id`
			+ ` where t.name='${escapedName}'${lineClause}`
			+ ` and t.samename<>'' and (t.sflg&(1<<18))=0`
		);
	};

	const parse = (payload: string): string[] => {
		try {
			const parsed = JSON.parse(payload) as {
				rows?: Array<[string]>;
			};
			const rows = parsed.rows;
			if (!Array.isArray(rows)) return [];
			return rows.map((row) => {
				const value = row?.[0];
				return typeof value === 'string' ? value : '';
			});
		} catch {
			return [];
		}
	};

	for (const station of stationNames) {
		try {
		const response = executeSql(query(station, true));
		const values = parse(response).filter((value) => value.length > 0);
		const suffix = values[0] ?? '';
		if (suffix) {
			result[station] = formatSamenameSuffix(suffix);
		}
		} catch {
			try {
				const fallback = executeSql(query(station, false));
				const values = parse(fallback).filter((value) => value.length > 0);
				const suffix = values[0] ?? '';
				if (suffix) {
					result[station] = formatSamenameSuffix(suffix);
				}
			} catch {
				// SQLクエリ失敗時は無視
			}
		}
	}

	return result;
}

function toggleMode(): void {
	mode = mode === 'branch' ? 'destination' : 'branch';
}

function goBack(): void {
	if (typeof window !== 'undefined' && window.history.length > 1) {
		window.history.back();
		return;
	}
	goto(`${base}/`);
}

function isDisabledStation(name: string): boolean {
	if (!params.station) return false;
	return normalizeStationName(params.station) === normalizeStationName(name);
}

function handleSelectStation(name: string): void {
	const selected = stationDetails[name]?.name ?? name;
	if (!params.line) {
		errorMessage = '路線情報が不足しています。';
		return;
	}
	if (isDisabledStation(name)) {
		return;
	}

	if (params.from === 'main') {
		const route = routeRef ?? get(mainRoute);
		if (!route) {
			errorMessage = '発駅が設定されていません。';
			return;
		}
		const result = route.addRoute(params.line, selected);
		if (result === -1) {
			errorMessage = '経路が重複しています';
			return;
		}
		if (result < 0) {
			errorMessage = '経路の追加に失敗しました。';
			return;
		}
		mainRoute.set(route);
		goto(`${base}/`);
		return;
	}

	const search = new URLSearchParams();
		search.set('from', params.from);
		search.set('station', selected);
		search.set('line', params.line);
	if (params.prefecture) search.set('prefecture', params.prefecture);
	if (params.group) search.set('group', params.group);
	goto(`${base}/terminal-selection?${search.toString()}`);
}

const visibleStations = $derived(mode === 'branch' ? branchStations : destinationStations);
const headerTitle = $derived(
	params.from === 'main'
		? mode === 'branch'
			? '分岐駅選択'
			: '着駅選択'
		: params.from === 'start'
			? '発駅指定'
			: '着駅指定'
);

function isStartStation(name: string): boolean {
	const departure = routeRef?.departureStationName?.().trim() ?? '';
	return Boolean(departure) && normalizeStationName(departure) === normalizeStationName(name);
}

function stationMeta(name: string): string {
	const kana = stationDetails[name]?.kana ?? '';
	const selectedLine = (params.line ?? '').trim();
	const lines = (stationDetails[name]?.lines ?? []).filter((line) => line.trim() !== selectedLine);
	const metaParts: string[] = [];
	if (kana) {
		metaParts.push(`(${kana})`);
	}
	if (lines.length > 0) {
		metaParts.push(lines.join(' / '));
	}
	return metaParts.join(' / ');
}

function scrollToTop(): void {
	scrollPageToTop();
}

function scrollToBottom(): void {
	scrollPageToBottom();
}
</script>

<div class:embedded class="station-selection">
	<header class="toolbar">
		{#if !embedded}
			<button type="button" class="text-button" onclick={goBack}>戻る</button>
		{:else}
			<span class="toolbar-spacer" aria-hidden="true"></span>
		{/if}
		<h1>{headerTitle}{#if params.line} - {params.line}{/if}</h1>
		{#if params.from === 'main'}
			<button type="button" class="text-button" onclick={toggleMode}>
				{mode === 'branch' ? '着駅選択' : '分岐駅選択'}
			</button>
		{:else}
			<span class="toolbar-spacer" aria-hidden="true"></span>
		{/if}
	</header>

	{#if loading}
		<p class="info">駅データを読み込み中です...</p>
	{:else if errorMessage}
		<div class="error-card">
			<p>{errorMessage}</p>
		</div>
	{:else}
		<section class="station-section">
			<div class="station-panel-stage">
				<div class="station-panel">
					{#if visibleStations.length === 0}
						<p class="placeholder">駅が見つかりませんでした。</p>
					{:else}
						<ul class="station-list" data-testid="station-list">
							{#each visibleStations as station (station)}
								<li>
									<button
										type="button"
										data-testid={`station-option-${station}`}
										class:disabled={isDisabledStation(station)}
										disabled={isDisabledStation(station)}
										aria-disabled={isDisabledStation(station)}
										onclick={() => handleSelectStation(station)}
									>
										<span class="station-name">
											{#if params.from === 'main' && isStartStation(station)}
												<span class="station-prefix">&lt;発駅&gt;</span>
											{/if}
											{stationDetails[station]?.name ?? station}
										</span>
										{#if stationMeta(station)}
											<span class="station-meta">{stationMeta(station)}</span>
										{/if}
									</button>
								</li>
							{/each}
						</ul>
					{/if}
				</div>
			</div>
		</section>
	{/if}

	<div class:embedded class="floating-scroll-buttons" aria-label="スクロール操作">
		<button type="button" class="floating-scroll-button" aria-label="一覧の先頭へスクロール" onclick={scrollToTop}>
			<span class="material-symbols-rounded" aria-hidden="true">vertical_align_top</span>
		</button>
		<button type="button" class="floating-scroll-button" aria-label="一覧の末尾へスクロール" onclick={scrollToBottom}>
			<span class="material-symbols-rounded" aria-hidden="true">vertical_align_bottom</span>
		</button>
	</div>
</div>

<style>
	.station-selection {
		min-height: 100vh;
		padding: 1rem;
		padding-bottom: 6.5rem;
		background: var(--page-bg);
		font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
	}

	.station-selection.embedded {
		min-height: auto;
		padding: 0;
		padding-bottom: 0;
		background: transparent;
	}

	.toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	.toolbar h1 {
		font-size: 1.1rem;
		font-weight: 600;
		color: var(--text-main);
		margin: 0;
	}

	.text-button {
		background: none;
		border: none;
		color: var(--link);
		font-weight: 600;
		cursor: pointer;
		padding: 0.25rem 0.5rem;
	}

	.toolbar-spacer {
		width: 4rem;
	}

	.info,
	.placeholder {
		color: var(--text-sub);
		text-align: center;
		margin-top: 2rem;
	}

	.error-card {
		background: var(--error-bg);
		color: var(--error-text);
		padding: 1rem;
		border-radius: 0.75rem;
	}

	.station-section {
		background: var(--card-bg);
		border-radius: 0.75rem;
		padding: 1rem;
		box-shadow: var(--card-shadow);
	}

	.station-selection.embedded .station-section {
		padding: 0;
		box-shadow: none;
		background: transparent;
	}

	.station-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.station-list button {
		width: 100%;
		border: 1px solid var(--border-color);
		border-radius: 0.75rem;
		padding: 0.75rem 1rem;
		background: var(--card-bg);
		text-align: left;
		cursor: pointer;
		transition: background 0.2s;
		position: relative;
		z-index: 1;
	}

	.station-list button:hover:not(:disabled) {
		background: var(--list-item-bg);
	}

	.station-list button.disabled {
		background: var(--list-item-bg);
		color: var(--subtitle-color);
		cursor: not-allowed;
	}

	.station-name {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-weight: 600;
		color: var(--text-main);
	}

	.station-prefix {
		font-size: 0.78rem;
		font-weight: 700;
		color: var(--link);
	}

	.station-meta {
		font-size: 0.85rem;
		color: var(--text-sub);
	}

	.floating-scroll-buttons {
		position: fixed;
		right: max(1rem, env(safe-area-inset-right, 0.75rem));
		bottom: max(1rem, env(safe-area-inset-bottom, 0.75rem));
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		z-index: 30;
	}

	.floating-scroll-buttons.embedded {
		right: max(1rem, env(safe-area-inset-right, 0.75rem));
		bottom: max(1rem, env(safe-area-inset-bottom, 0.75rem));
	}

	.floating-scroll-button {
		width: 3.25rem;
		height: 3.25rem;
		border: none;
		border-radius: 999px;
		background: linear-gradient(135deg, #7e22ce, #5b21b6);
		color: #fff;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 12px 28px rgba(91, 33, 182, 0.32);
		cursor: pointer;
	}

	.floating-scroll-button .material-symbols-rounded {
		font-size: 1.5rem;
	}
</style>
