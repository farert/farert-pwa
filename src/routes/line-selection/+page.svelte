<script lang="ts">
import { goto } from '$app/navigation';
import { base } from '$app/paths';
import { onMount } from 'svelte';
import { initFarert, getLinesByStation, getLinesByCompany, getLinesByPrefect } from '$lib/wasm';
import {
	extractLinesFromPrefecturePayload,
	toWasmPrefecture
} from '$lib/utils/prefectureSelection';
import { observeWideScreenViewport } from '$lib/utils/responsiveLayout';
import RouteStationSelectPage from '../route-station-select/+page.svelte';

type ScreenSource = 'main' | 'start' | 'destination';

interface LineSelectionParams {
	from: ScreenSource;
	station?: string;
	line?: string;
	prefecture?: string;
	group?: string;
}

let loading = $state(true);
let errorMessage = $state('');
let lines = $state<string[]>([]);
let params = $state<LineSelectionParams>({ from: 'main' });
let listTitle = $state('');
let selectedLine = $state('');
let splitViewEnabled = $state(false);
let { presetParams = null } = $props<{ presetParams?: Partial<LineSelectionParams> | null }>();

onMount(() => {
	const stopObservingViewport = observeWideScreenViewport((isWide) => {
		splitViewEnabled = isWide;
	});

	(async () => {
		try {
			await initFarert();
			const resolved = resolveParams();
			params = resolved;
			await loadLines(resolved);
		} catch (err) {
			console.error('路線一覧の初期化に失敗しました', err);
			errorMessage = '路線一覧の初期化に失敗しました。';
			lines = [];
		} finally {
			loading = false;
		}
	})();

	return () => {
		stopObservingViewport();
	};
});

function resolveParams(): LineSelectionParams {
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

function loadLines(context: LineSelectionParams): void {
	try {
		let payload = '';
		if (context.station) {
			payload = getLinesByStation(context.station);
			listTitle = context.station;
	} else if (context.prefecture) {
		payload = fetchPrefectureLines(context.prefecture);
		listTitle = context.prefecture;
	} else if (context.group) {
			payload = getLinesByCompany(context.group);
			listTitle = context.group;
		} else {
			errorMessage = '表示対象の情報が不足しています。';
			lines = [];
			return;
		}
		let resolved = parseList(payload);
		if (context.prefecture) {
			const structured = extractLinesFromPrefecturePayload(payload, context.prefecture);
			if (structured.length > 0) {
				resolved = structured;
			}
		}
		lines = resolved;
		if (resolved.length === 0) {
			errorMessage = '該当する路線が見つかりませんでした。';
		} else {
			errorMessage = '';
		}
	} catch (err) {
		console.error('路線リストの取得に失敗しました', err);
		errorMessage = '路線リストの取得に失敗しました。';
		lines = [];
	}
}

function fetchPrefectureLines(prefecture: string): string {
	const normalized = toWasmPrefecture(prefecture);
	const normalizedPayload = getLinesByPrefect(normalized);
	if (normalized === prefecture || extractLinesFromPrefecturePayload(normalizedPayload, prefecture).length > 0) {
		return normalizedPayload;
	}
	return getLinesByPrefect(prefecture);
}

function parseList(raw: string): string[] {
	try {
		if (!raw) return [];
		const parsed = JSON.parse(raw);
		if (Array.isArray(parsed)) {
			return dedupe(normalizeStringList(parsed));
		}
		if (parsed && typeof parsed === 'object' && Object.keys(parsed).length === 0) {
			return [];
		}
		if (parsed && typeof parsed === 'object') {
			const firstArrayKey = Object.keys(parsed).find((key) => Array.isArray((parsed as Record<string, unknown>)[key]));
			if (firstArrayKey) {
				return dedupe(normalizeStringList((parsed as Record<string, unknown>)[firstArrayKey]));
			}
		}
	} catch (err) {
		console.warn('路線リストの解析に失敗しました', err);
	}
	return [];
}

function normalizeStringList(value: unknown): string[] {
	if (!Array.isArray(value)) return [];
	const result: string[] = [];
	for (const entry of value) {
		if (typeof entry !== 'string') continue;
		const trimmed = entry.trim();
		if (!trimmed) continue;
		result.push(trimmed);
	}
	return result;
}

function dedupe(values: string[]): string[] {
	const seen = new Set<string>();
	const result: string[] = [];
	for (const value of values) {
		if (typeof value !== 'string') continue;
		const trimmed = value.trim();
		if (!trimmed || seen.has(trimmed)) continue;
		seen.add(trimmed);
		result.push(trimmed);
	}
	return result;
}


function goBack(): void {
	if (typeof window !== 'undefined' && window.history.length > 1) {
		window.history.back();
		return;
	}
	goto(`${base}/`);
}

function handleAutoRoute(): void {
	goto(`${base}/terminal-selection?mode=destination`);
}

function isDisabled(lineName: string): boolean {
	return Boolean(params.line && params.line === lineName);
}

function handleLineSelect(lineName: string): void {
	if (isDisabled(lineName)) return;
	if (splitViewEnabled) {
		selectedLine = lineName;
		return;
	}
	const search = new URLSearchParams();
	search.set('from', params.from ?? 'main');
	search.set('line', lineName);
	if (params.station) search.set('station', params.station);
	if (params.prefecture) search.set('prefecture', params.prefecture);
	if (params.group) search.set('group', params.group);
	goto(`${base}/route-station-select?${search.toString()}`);
}
</script>

<div class:split-view={splitViewEnabled} class="line-selection">
	<header class="toolbar">
		<button type="button" class="text-button" onclick={goBack}>
			戻る
		</button>
		<h1>路線選択{#if listTitle} - {listTitle}{/if}</h1>
		{#if params.from === 'main'}
			<button type="button" class="text-button" onclick={handleAutoRoute}>
				最短経路
			</button>
		{:else}
			<span class="toolbar-spacer" aria-hidden="true"></span>
		{/if}
	</header>

	{#if loading}
		<p class="info">路線を読み込み中です...</p>
	{:else if errorMessage}
		<div class="error-card">
			<p>{errorMessage}</p>
		</div>
	{:else}
		<div class="content-layout">
			<section class="line-section">
				{#if listTitle}
					<p class="list-title">{listTitle}</p>
				{/if}

				{#if lines.length === 0}
					<p class="placeholder">路線が見つかりませんでした。</p>
				{:else}
					<ul class="line-list">
						{#each lines as lineName (lineName)}
							<li>
								<button
									type="button"
									class:selected={isDisabled(lineName) || (splitViewEnabled && selectedLine === lineName)}
									disabled={isDisabled(lineName)}
									aria-disabled={isDisabled(lineName)}
									onclick={() => handleLineSelect(lineName)}
								>
									{lineName}
								</button>
							</li>
						{/each}
					</ul>
				{/if}
			</section>

			{#if splitViewEnabled}
				<section class="station-pane">
					{#if selectedLine}
						{#key `${params.from}:${params.station ?? ''}:${params.prefecture ?? ''}:${params.group ?? ''}:${selectedLine}`}
							<RouteStationSelectPage
								embedded={true}
								presetParams={{
									from: params.from,
									station: params.station,
									line: selectedLine,
									prefecture: params.prefecture,
									group: params.group
								}}
							/>
						{/key}
					{:else}
						<div class="station-placeholder">
							<p>路線を選ぶと駅候補を表示します。</p>
						</div>
					{/if}
				</section>
			{/if}
		</div>
	{/if}
</div>

<style>
	.line-selection {
		min-height: 100vh;
		padding: 1rem;
		background: var(--page-bg);
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

	.line-section {
		background: var(--card-bg);
		border-radius: 0.75rem;
		padding: 1rem;
		box-shadow: var(--card-shadow);
	}

	.content-layout {
		display: block;
	}

	.line-selection.split-view .content-layout {
		display: grid;
		grid-template-columns: minmax(18rem, 26rem) minmax(0, 1fr);
		gap: 1rem;
		align-items: start;
	}

	.station-pane {
		background: var(--card-bg);
		border-radius: 0.75rem;
		padding: 1rem;
		box-shadow: var(--card-shadow);
		min-height: 24rem;
	}

	.station-placeholder {
		min-height: 100%;
		display: grid;
		place-items: center;
		color: var(--text-sub);
		text-align: center;
	}

	.list-title {
		font-weight: 600;
		color: var(--text-main);
		margin-bottom: 0.75rem;
	}

	.line-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.line-list button {
		width: 100%;
		border: 1px solid var(--border-color);
		border-radius: 0.75rem;
		padding: 0.75rem;
		text-align: left;
		background: var(--card-bg);
		font-size: 1rem;
		font-weight: 600;
		color: var(--text-main);
		cursor: pointer;
		transition: background 0.2s;
	}

	.line-list button:hover:not(:disabled) {
		background: var(--list-item-active);
	}

	.line-list button.selected {
		background: var(--secondary-btn-bg);
		color: var(--subtitle-color);
	}

	.line-list button:disabled {
		border-color: var(--border-color);
		cursor: not-allowed;
	}
</style>
