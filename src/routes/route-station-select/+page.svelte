<script lang="ts">
import { goto } from '$app/navigation';
import { base } from '$app/paths';
import { onMount } from 'svelte';
import { initFarert, getBranchStationsByLine, getStationsByLine, getKanaByStation } from '$lib/wasm';
import { mainRoute } from '$lib/stores';
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

let loading = $state(true);
let errorMessage = $state('');
let params = $state<StationSelectionParams>({ from: 'main' });
let mode = $state<ScreenMode>('branch');
let branchStations = $state<string[]>([]);
let destinationStations = $state<string[]>([]);
let stationDetails = $state<Record<string, { kana: string }>>({});
let routeRef = $state<FaretClass | null>(null);
let { presetParams = null } = $props<{ presetParams?: Partial<StationSelectionParams> | null }>();

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

	return () => unsubscribe();
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

		if (context.from === 'main' && context.station) {
			const rawBranches = parseList(
				getBranchStationsByLine(context.line, context.station)
			);
			const seen = new Set<string>();
			const deduped = rawBranches.filter((name) => {
				if (!name || name === context.station || seen.has(name)) return false;
				seen.add(name);
				return true;
			});
			branchStations = [context.station, ...deduped];
		} else {
			branchStations = parseList(getStationsByLine(context.line));
		}

		destinationStations = parseList(getStationsByLine(context.line));
		stationDetails = buildStationDetails([...new Set([...branchStations, ...destinationStations])]);
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

function buildStationDetails(stations: string[]): Record<string, { kana: string }> {
	const info: Record<string, { kana: string }> = {};
	for (const station of stations) {
		try {
			info[station] = { kana: getKanaByStation(station) };
		} catch (err) {
			console.warn('かな情報の取得に失敗しました', station, err);
			info[station] = { kana: '' };
		}
	}
	return info;
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
	return Boolean(params.station && params.station === name);
}

function handleSelectStation(name: string): void {
	if (!params.line) {
		errorMessage = '路線情報が不足しています。';
		return;
	}
	if (isDisabledStation(name)) {
		return;
	}

	if (params.from === 'main') {
		const route = routeRef;
		if (!route) {
			errorMessage = '発駅が設定されていません。';
			return;
		}
		const result = route.addRoute(params.line, name);
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
	search.set('station', name);
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

function stationKana(name: string): string {
	return stationDetails[name]?.kana ?? '';
}
</script>

<div class="station-selection">
	<header class="toolbar">
		<button type="button" class="text-button" onclick={goBack}>戻る</button>
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
			{#if visibleStations.length === 0}
				<p class="placeholder">駅が見つかりませんでした。</p>
			{:else}
				<ul class="station-list">
					{#each visibleStations as station (station)}
						<li>
							<button
								type="button"
								class:disabled={isDisabledStation(station)}
								disabled={isDisabledStation(station)}
								aria-disabled={isDisabledStation(station)}
								onclick={() => handleSelectStation(station)}
							>
								<span class="station-name">{station}</span>
								{#if stationKana(station)}
									<span class="station-meta">({stationKana(station)})</span>
								{/if}
							</button>
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	{/if}
</div>

<style>
	.station-selection {
		min-height: 100vh;
		padding: 1rem;
		background: #f8fafc;
		font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
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
		color: #1f2937;
		margin: 0;
	}

	.text-button {
		background: none;
		border: none;
		color: #2563eb;
		font-weight: 600;
		cursor: pointer;
		padding: 0.25rem 0.5rem;
	}

	.toolbar-spacer {
		width: 4rem;
	}

	.info,
	.placeholder {
		color: #475569;
		text-align: center;
		margin-top: 2rem;
	}

	.error-card {
		background: #fee2e2;
		color: #991b1b;
		padding: 1rem;
		border-radius: 0.75rem;
	}

	.station-section {
		background: #fff;
		border-radius: 0.75rem;
		padding: 1rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
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
		border: 1px solid #e2e8f0;
		border-radius: 0.75rem;
		padding: 0.75rem 1rem;
		background: #fff;
		text-align: left;
		cursor: pointer;
		transition: background 0.2s;
	}

	.station-list button:hover:not(:disabled) {
		background: #f1f5f9;
	}

	.station-list button.disabled {
		background: #f1f5f9;
		color: #94a3b8;
		cursor: not-allowed;
	}

	.station-name {
		display: block;
		font-weight: 600;
		color: #0f172a;
	}

	.station-meta {
		font-size: 0.85rem;
		color: #64748b;
	}
</style>
