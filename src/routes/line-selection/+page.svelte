<script lang="ts">
import { goto } from '$app/navigation';
import { base } from '$app/paths';
import { onMount } from 'svelte';
import { initFarert, getLinesByStation, getLinesByCompany, getLinesByPrefect } from '$lib/wasm';

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
let { presetParams = null } = $props<{ presetParams?: Partial<LineSelectionParams> | null }>();

onMount(() => {
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

type PrefectureLookup = {
	aliases: Set<string>;
};

function createPrefectureLookup(prefecture: string): PrefectureLookup {
	const aliases = new Set<string>();
	const trimmed = prefecture?.trim() ?? '';
	if (trimmed) {
		aliases.add(trimmed);
		const normalized = normalizePrefectureToken(trimmed);
		if (normalized && normalized !== trimmed) {
			aliases.add(normalized);
		}
	}
	return { aliases };
}

function normalizePrefectureToken(label: string): string {
	const trimmed = label?.trim() ?? '';
	if (!trimmed) return '';
	return trimmed.replace(/[都府県]$/u, '');
}

function matchesPrefectureLabel(label: string, lookup: PrefectureLookup): boolean {
	const trimmed = label?.trim() ?? '';
	if (!trimmed) return false;
	if (lookup.aliases.has(trimmed)) return true;
	const normalized = normalizePrefectureToken(trimmed);
	return normalized ? lookup.aliases.has(normalized) : false;
}

function toWasmPrefecture(prefecture: string): string {
	const trimmed = prefecture?.trim() ?? '';
	if (!trimmed) return '';
	const normalized = normalizePrefectureToken(trimmed);
	return normalized || trimmed;
}

function coerceLineList(value: unknown): string[] {
	if (!Array.isArray(value)) return [];
	const seen = new Set<string>();
	const result: string[] = [];
	for (const entry of value) {
		if (typeof entry !== 'string') continue;
		const trimmed = entry.trim();
		if (!trimmed || seen.has(trimmed)) continue;
		seen.add(trimmed);
		result.push(trimmed);
	}
	return result;
}

function extractPrefectureLabel(record: Record<string, unknown>): string {
	const candidates = ['prefecture', 'pref', 'prefName', 'name', 'title', 'label'];
	for (const key of candidates) {
		const value = record[key];
		if (typeof value === 'string' && value.trim()) {
			return value.trim();
		}
	}
	return '';
}

function extractLinesFromRecord(record: Record<string, unknown>): string[] {
	const keys = ['lines', 'list', 'routes', 'items', 'values'];
	for (const key of keys) {
		const lines = coerceLineList(record[key]);
		if (lines.length > 0) return lines;
	}
	return [];
}


function extractLinesFromPrefecturePayload(payload: string, prefecture: string): string[] {
	try {
		if (!payload) return [];
		const parsed = JSON.parse(payload);
		const lookup = createPrefectureLookup(prefecture);
		const lines = findLinesForPrefecture(parsed, lookup, true);
		return lines.length > 0 ? dedupe(lines) : [];
	} catch (err) {
		console.warn('[LINE_SELECTION] 都道府県別路線の解析に失敗しました', err);
		return [];
	}
}

function findLinesForPrefecture(
	node: unknown,
	lookup: PrefectureLookup,
	allowDirect: boolean
): string[] {
	if (!node) return [];
	if (typeof node === 'string') {
		return allowDirect ? (node.trim() ? [node.trim()] : []) : [];
	}
	if (Array.isArray(node)) {
		let sawNonString = false;
		for (const entry of node) {
			if (typeof entry !== 'string') {
				sawNonString = true;
			}
			const nested = findLinesForPrefecture(entry, lookup, allowDirect);
			if (nested.length > 0) return nested;
		}
		return !sawNonString && allowDirect ? coerceLineList(node) : [];
	}
	if (typeof node !== 'object') {
		return [];
	}
	const record = node as Record<string, unknown>;
	const label = extractPrefectureLabel(record);
	if (label && matchesPrefectureLabel(label, lookup)) {
		const fromRecord = extractLinesFromRecord(record);
		if (fromRecord.length > 0) {
			return fromRecord;
		}
	}
	const directValues: unknown[] = [];
	for (const alias of lookup.aliases) {
		if (!alias) continue;
		const direct = record[alias];
		if (direct !== undefined) {
			directValues.push(direct);
			const directLines = coerceLineList(direct);
			if (directLines.length > 0) {
				return directLines;
			}
		}
	}
	const nestedCandidates = [
		record.prefectures,
		record.prefects,
		record.items,
		record.children,
		record.groups,
		record.routes,
		record.categories
	];
	for (const candidate of nestedCandidates) {
		const nested = findLinesForPrefecture(candidate, lookup, false);
		if (nested.length > 0) return nested;
	}
	for (const value of Object.values(record)) {
		if (directValues.includes(value)) continue;
		if (nestedCandidates.includes(value)) continue;
		const nested = findLinesForPrefecture(value, lookup, false);
		if (nested.length > 0) return nested;
	}
	return [];
}

function goBack(): void {
	if (typeof window !== 'undefined' && window.history.length > 1) {
		window.history.back();
		return;
	}
	goto(`${base}/');
}

function handleAutoRoute(): void {
	goto(`${base}/terminal-selection?mode=destination');
}

function isDisabled(lineName: string): boolean {
	return Boolean(params.line && params.line === lineName);
}

function handleLineSelect(lineName: string): void {
	if (isDisabled(lineName)) return;
	const search = new URLSearchParams();
	search.set('from', params.from ?? 'main');
	search.set('line', lineName);
	if (params.station) search.set('station', params.station);
	if (params.prefecture) search.set('prefecture', params.prefecture);
	if (params.group) search.set('group', params.group);
	goto(`${base}/route-station-select?${search.toString()}`);
}
</script>

<div class="line-selection">
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
								class:selected={isDisabled(lineName)}
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
	{/if}
</div>

<style>
	.line-selection {
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

	.line-section {
		background: #fff;
		border-radius: 0.75rem;
		padding: 1rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
	}

	.list-title {
		font-weight: 600;
		color: #0f172a;
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
		border: 1px solid #e2e8f0;
		border-radius: 0.75rem;
		padding: 0.75rem;
		text-align: left;
		background: #fff;
		font-size: 1rem;
		font-weight: 600;
		color: #1f2937;
		cursor: pointer;
		transition: background 0.2s;
	}

	.line-list button:hover:not(:disabled) {
		background: #eef2ff;
	}

	.line-list button.selected {
		background: #e2e8f0;
		color: #94a3b8;
		cursor: not-allowed;
	}

	.line-list button:disabled {
		border-color: #cbd5f5;
	}
</style>
