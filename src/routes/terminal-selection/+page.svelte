<script lang="ts">
import { goto } from '$app/navigation';
import { base } from '$app/paths';
import { onMount } from 'svelte';
import {
	initFarert,
	Farert,
	getCompanys,
	getPrefects,
	getLinesByCompany,
	getLinesByPrefect,
	getStationsByCompanyAndLine,
	getStationsByPrefectureAndLine,
	getStationsByLine,
	searchStationByKeyword,
	getKanaByStation,
	getPrefectureByStation
} from '$lib/wasm';
import { addToStationHistory, mainRoute, stationHistory } from '$lib/stores';
import type { FaretClass } from '$lib/wasm/types';

type Tab = 'group' | 'prefecture' | 'history';
type Stage = 'root' | 'lines' | 'stations';
type SelectionBase = 'group' | 'prefecture';

interface SearchResultItem {
	name: string;
	kana: string;
	prefecture: string;
}

const START_SCREEN_TITLE = '発駅選択';
const DESTINATION_SCREEN_TITLE = '着駅指定（最短経路）';
const PREFECTURE_FALLBACK = [
	'北海道',
	'青森県',
	'秋田県',
	'岩手県',
	'山形県',
	'宮城県',
	'福島県',
	'新潟県',
	'栃木県',
	'群馬県',
	'茨城県',
	'千葉県',
	'埼玉県',
	'東京都',
	'神奈川県',
	'静岡県',
	'山梨県',
	'長野県',
	'岐阜県',
	'富山県',
	'福井県',
	'石川県',
	'愛知県',
	'三重県',
	'滋賀県',
	'京都府',
	'大阪府',
	'和歌山県',
	'奈良県',
	'兵庫県',
	'鳥取県',
	'島根県',
	'岡山県',
	'広島県',
	'山口県',
	'香川県',
	'徳島県',
	'愛媛県',
	'高知県',
	'福岡県',
	'佐賀県',
	'長崎県',
	'大分県',
	'熊本県',
	'宮崎県',
	'鹿児島県'
];

let tab = $state<Tab>('group');
let stage = $state<Stage>('root');
let selectionBase = $state<SelectionBase>('group');
let loading = $state(true);
let panelLoading = $state(false);
let searchLoading = $state(false);
let errorMessage = $state('');
let searchQuery = $state('');
let searchMode = $state(false);
let searchResults = $state<SearchResultItem[]>([]);
let companies = $state<string[]>([]);
let prefectures = $state<string[]>([]);
let lines = $state<string[]>([]);
let stations = $state<string[]>([]);
let selectedCompany = $state('');
let selectedPrefecture = $state('');
let selectedLine = $state('');
let historyItems = $state<string[]>([]);
let historySwipeOffsets = $state<Record<string, number>>({});
let activeSwipeStation = $state<string | null>(null);
let swipeSession: { station: string; startX: number; pointerId: number; initialOffset: number } | null = null;
let routeRef = $state<FaretClass | null>(null);
let initialFetchDone = $state(false);
let searchToken = 0;
const linePrefectureCache = new Map<string, Set<string>>();
let screenMode = $state<'start' | 'destination'>('start');
const screenTitle = $derived(
	screenMode === 'destination' ? DESTINATION_SCREEN_TITLE : START_SCREEN_TITLE
);
let { initialMode = '' } = $props<{ initialMode?: 'start' | 'destination' }>();
let autoRouteDialogOpen = $state(false);
let pendingDestinationStation = $state('');

interface ParseListOptions {
	suppressError?: boolean;
	onError?: (err: unknown) => void;
}

onMount(() => {
	const unsubRoute = mainRoute.subscribe((value) => {
		routeRef = value;
	});
	const unsubHistory = stationHistory.subscribe((value) => {
		historyItems = value;
		historySwipeOffsets = Object.fromEntries(
			Object.entries(historySwipeOffsets).filter(([station]) => value.includes(station))
		);
	});

	if (initialMode === 'destination') {
		screenMode = 'destination';
	} else if (typeof window !== 'undefined') {
		const params = new URLSearchParams(window.location.search);
		if (params.get('mode') === 'destination') {
			screenMode = 'destination';
		}
	}

	(async () => {
		try {
			await initFarert();
			await loadInitialLists();
			tab = 'group';
			selectionBase = 'group';
		} catch (err) {
			handleError('初期データの取得に失敗しました', err);
		} finally {
			loading = false;
			initialFetchDone = true;
		}
	})();

	return () => {
		unsubRoute?.();
		unsubHistory?.();
	};
});

async function loadInitialLists(): Promise<void> {
	companies = parseList(getCompanys(), 'JRグループの取得に失敗しました', 'companies');
	const prefectList = parseList(getPrefects(), '都道府県一覧の取得に失敗しました', [
		'prefectures',
		'prefects'
	]);
	prefectures = normalizePrefectures(prefectList);
}

function parseList(
	payload: string,
	errorLabel: string,
	keyHints?: string | string[],
	options?: ParseListOptions
): string[] {
	try {
		if (!payload) return [];
		const parsed = JSON.parse(payload);
		if (Array.isArray(parsed)) {
			return dedupe(normalizeStringList(parsed));
		}
		const hints = Array.isArray(keyHints) ? keyHints : keyHints ? [keyHints] : [];
		for (const hint of hints) {
			if (hint && Array.isArray((parsed as Record<string, unknown>)[hint])) {
				return dedupe(normalizeStringList((parsed as Record<string, unknown>)[hint]));
			}
		}
		const firstArrayKey = Object.keys(parsed ?? {}).find((key) =>
			Array.isArray((parsed as Record<string, unknown>)[key])
		);
		if (firstArrayKey && Array.isArray((parsed as Record<string, unknown>)[firstArrayKey])) {
			return dedupe(normalizeStringList((parsed as Record<string, unknown>)[firstArrayKey]));
		}
		const values = Object.values(parsed ?? {});
		const firstArray = values.find((value) => Array.isArray(value));
		if (Array.isArray(firstArray)) {
			return dedupe(normalizeStringList(firstArray));
		}
		throw new Error('一覧形式ではありません');
	} catch (err) {
		options?.onError?.(err);
		if (!options?.suppressError) {
			handleError(errorLabel, err);
		}
		return [];
	}
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
		if (!value || seen.has(value)) continue;
		seen.add(value);
		result.push(value);
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

function toWasmPrefecture(prefecture: string): string {
	const trimmed = prefecture?.trim() ?? '';
	if (!trimmed) return '';
	const normalized = normalizePrefectureToken(trimmed);
	return normalized || trimmed;
}

function matchesPrefectureLabel(label: string, lookup: PrefectureLookup): boolean {
	const trimmed = label?.trim() ?? '';
	if (!trimmed) return false;
	if (lookup.aliases.has(trimmed)) return true;
	const normalized = normalizePrefectureToken(trimmed);
	return normalized ? lookup.aliases.has(normalized) : false;
}

function normalizePrefectures(list: string[]): string[] {
	const normalized = Array.from(
		new Set(
			(list ?? []).map((name) => name?.trim()).filter((name): name is string => Boolean(name))
		)
	);
	if (normalized.length >= PREFECTURE_FALLBACK.length && normalized.includes('北海道')) {
		return normalized;
	}
	return PREFECTURE_FALLBACK;
}

function handleError(message: string, err: unknown): void {
	console.error('[TERMINAL_SELECTION]', message, err);
	errorMessage = `${message}: ${(err as Error)?.message ?? err}`;
}

function resetSelections(): void {
	stage = 'root';
	lines = [];
	stations = [];
	selectedLine = '';
	selectedCompany = '';
	selectedPrefecture = '';
	panelLoading = false;
}

function resetToInitialState(): void {
	clearSearch();
	resetSelections();
	tab = 'group';
	selectionBase = 'group';
	errorMessage = '';
}

function selectTab(next: Tab): void {
	if (tab === next) return;
	tab = next;
	searchMode = false;
	searchQuery = '';
	searchResults = [];
	resetSelections();
	if (next === 'prefecture') {
		selectionBase = 'prefecture';
	} else if (next === 'group') {
		selectionBase = 'group';
	} else {
		selectionBase = 'group';
	}
}

function getListTitle(): string {
	if (searchMode && searchQuery.trim().length > 0) {
		return `一致件数: ${searchResults.length}件`;
	}
	if (stage === 'lines') {
		if (selectionBase === 'group' && selectedCompany) {
			return `${selectedCompany}`;
		}
		if (selectionBase === 'prefecture' && selectedPrefecture) {
			return `${selectedPrefecture}`;
		}
		return '路線一覧';
	}
	if (stage === 'stations') {
		const base = selectionBase === 'prefecture' ? selectedPrefecture : selectedCompany;
		if (base && selectedLine) {
			return `${base}ー${selectedLine}`;
		}
		return selectedLine || '駅一覧';
	}
	switch (tab) {
		case 'prefecture':
			return '都道府県';
		case 'history':
			return '履歴';
		default:
			return 'JRグループ';
	}
}

function clearError(): void {
	errorMessage = '';
}

function clearSearch(): void {
	searchQuery = '';
	searchMode = false;
	searchResults = [];
	searchLoading = false;
}

function handleBack(): void {
	if (searchMode) {
		clearSearch();
		return;
	}
	if (stage === 'stations') {
		stage = 'lines';
		stations = [];
		selectedLine = '';
		return;
	}
	if (stage === 'lines') {
		stage = 'root';
		lines = [];
		return;
	}
	resetToInitialState();
	goto(`${base}/`);
}

async function openLinesFromGroup(company: string): Promise<void> {
	selectionBase = 'group';
	selectedCompany = company;
	await loadLines(() => getLinesByCompany(company));
}

async function openLinesFromPrefecture(prefecture: string): Promise<void> {
	selectionBase = 'prefecture';
	selectedPrefecture = prefecture;
	await loadLines(() => fetchPrefectureLines(prefecture));
}

function fetchPrefectureLines(prefecture: string): string {
	const normalized = toWasmPrefecture(prefecture);
	const normalizedPayload = getLinesByPrefect(normalized);
	if (normalized === prefecture || prefecturePayloadHasLines(normalizedPayload, prefecture)) {
		return normalizedPayload;
	}
	return getLinesByPrefect(prefecture);
}

function prefecturePayloadHasLines(payload: string, prefecture: string): boolean {
	return extractLinesFromPrefecturePayload(payload, prefecture).length > 0;
}

async function loadLines(fetcher: () => string): Promise<void> {
	stage = 'lines';
	panelLoading = true;
	clearSearch();
	try {
		const payload = fetcher();
		let fetchedLines = parseList(payload, '路線一覧の取得に失敗しました', 'lines');
		if (selectionBase === 'prefecture' && selectedPrefecture) {
			const structured = extractLinesFromPrefecturePayload(payload, selectedPrefecture);
			if (structured.length > 0) {
				fetchedLines = structured;
			} else {
				fetchedLines = filterLinesByPrefecture(fetchedLines, selectedPrefecture);
			}
		}
		lines = fetchedLines;
		stations = [];
		selectedLine = '';
	} finally {
		panelLoading = false;
	}
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
		console.warn('[TERMINAL_SELECTION] 都道府県別路線リストの解析に失敗しました', err);
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

function filterLinesByPrefecture(lineList: string[], prefecture: string): string[] {
	const filtered: string[] = [];
	for (const line of lineList) {
		if (lineBelongsToPrefecture(line, prefecture)) {
			filtered.push(line);
		}
	}
	return filtered;
}

function lineBelongsToPrefecture(line: string, prefecture: string): boolean {
	const normalizedPref = toWasmPrefecture(prefecture);
	const cached = linePrefectureCache.get(line);
	if (cached?.has(normalizedPref)) {
		return true;
	}
	const prefSet = cached ?? new Set<string>();
	let found = false;
	let parseFailed = false;
	let stationsPayload = '';
	try {
		stationsPayload = getStationsByLine(line);
		const stationList = parseList(
			stationsPayload,
			'駅一覧の取得に失敗しました',
			'stations',
			{
				suppressError: true,
				onError: () => {
					parseFailed = true;
				}
			}
		);
		for (const station of stationList) {
			const stationPref = (getPrefectureByStation(station) ?? '').trim();
			const normalizedStationPref = toWasmPrefecture(stationPref);
			if (normalizedStationPref) {
				prefSet.add(normalizedStationPref);
			}
			if (normalizedStationPref === normalizedPref) {
				found = true;
			}
		}
	} catch (err) {
		console.warn('[TERMINAL_SELECTION] 路線フィルタリングに失敗しました', err);
	}
	if (!cached) {
		linePrefectureCache.set(line, prefSet);
	}
	if (!found) {
		try {
			const fallbackStations = resolveStationsByPrefecture(line, prefecture);
			if (fallbackStations.length > 0) {
				prefSet.add(normalizedPref);
				return true;
			}
		} catch (err) {
			console.warn('[TERMINAL_SELECTION] 路線フォールバック判定に失敗しました', err);
		}
		if (parseFailed) {
			parseList(stationsPayload, '駅一覧の取得に失敗しました', 'stations');
		}
	}
	return found;
}

function resolveStationsByPrefecture(line: string, prefecture: string): string[] {
	const payload = getStationsByPrefectureAndLine(toWasmPrefecture(prefecture), line);
	let parseFailed = false;
	const stationsFromPrefecture = parseList(
		payload,
		'駅一覧の取得に失敗しました',
		'stations',
		{
			suppressError: true,
			onError: () => {
				parseFailed = true;
			}
		}
	);
	if (stationsFromPrefecture.length > 0) {
		return stationsFromPrefecture;
	}
	const stationsFromLine = parseList(
		getStationsByLine(line),
		'駅一覧の取得に失敗しました',
		'stations',
		{
			suppressError: true
		}
	);
	const filteredStations = filterStationsByPrefecture(stationsFromLine, prefecture);
	if (filteredStations.length > 0) {
		return filteredStations;
	}
	if (parseFailed) {
		parseList(payload, '駅一覧の取得に失敗しました', 'stations');
	}
	return [];
}

function filterStationsByPrefecture(stationList: string[], prefecture: string): string[] {
	const normalizedPref = toWasmPrefecture(prefecture);
	if (!normalizedPref) {
		return [];
	}
	const matched: string[] = [];
	for (const station of stationList) {
		try {
			const stationPref = (getPrefectureByStation(station) ?? '').trim();
			const normalizedStationPref = toWasmPrefecture(stationPref);
			if (normalizedStationPref === normalizedPref) {
				matched.push(station);
			}
		} catch (err) {
			console.warn('[TERMINAL_SELECTION] 駅の都道府県判定に失敗しました', err);
		}
	}
	return matched;
}

async function openStations(line: string): Promise<void> {
	selectedLine = line;
	stage = 'stations';
	panelLoading = true;
	try {
		if (selectionBase === 'group' && selectedCompany) {
			stations = parseList(
				getStationsByCompanyAndLine(selectedCompany, line),
				'駅一覧の取得に失敗しました',
				'stations'
			);
		} else if (selectionBase === 'prefecture' && selectedPrefecture) {
			stations = resolveStationsByPrefecture(line, selectedPrefecture);
		} else {
			stations = [];
		}
	} finally {
		panelLoading = false;
	}
}

async function handleStationSelect(station: string): Promise<void> {
	if (!station) return;
	if (screenMode === 'destination') {
		pendingDestinationStation = station;
		autoRouteDialogOpen = true;
		return;
	}
	panelLoading = true;
	try {
		let route = routeRef;
		if (!route) {
			route = new Farert();
		}
		route.removeAll();
		const result = route.addStartRoute(station);
		if (result < 0) {
			handleError('発駅の設定に失敗しました', new Error(`addStartRoute rc=${result}`));
			return;
		}
		mainRoute.set(route);
		routeRef = route;
		addToStationHistory(station);
		await goto(`${base}/`);
	} catch (err) {
		handleError('発駅の設定に失敗しました', err);
	} finally {
		panelLoading = false;
	}
}

function cancelAutoRouteDialog(): void {
	pendingDestinationStation = '';
	autoRouteDialogOpen = false;
}

function confirmAutoRoute(useBulletTrain: boolean): void {
	const destination = pendingDestinationStation;
	if (!destination) {
		autoRouteDialogOpen = false;
		return;
	}
	autoRouteDialogOpen = false;
	pendingDestinationStation = '';
	executeAutoRoute(useBulletTrain, destination);
}

async function executeAutoRoute(useBulletTrain: boolean, destination: string): Promise<void> {
	const route = routeRef;
	if (!route) {
		errorMessage = '先に発駅を設定してください。';
		return;
	}
	const start = (route.departureStationName?.() ?? '').trim();
	if (!start) {
		errorMessage = '先に発駅を設定してください。';
		return;
	}
	panelLoading = true;
	try {
		route.removeAll();
		const addResult = route.addStartRoute(start);
		if (addResult < 0) {
			handleError('発駅の再設定に失敗しました', new Error(`addStartRoute rc=${addResult}`));
			return;
		}
		const autoRouteResult = route.autoRoute(useBulletTrain ? 1 : 0, destination);
		if (autoRouteResult !== 0) {
			handleError('最短経路の計算に失敗しました', new Error(`autoRoute rc=${autoRouteResult}`));
			return;
		}
		mainRoute.set(route);
		await goto(`${base}/`);
	} catch (err) {
		handleError('最短経路の計算に失敗しました', err);
	} finally {
		panelLoading = false;
	}
}

function removeHistoryItem(station: string): void {
	if (!station) return;
	updateSwipeOffset(station, 0);
	stationHistory.update((items) => items.filter((item) => item !== station));
}

function handleHistorySelect(station: string): void {
	resetSwipe(station);
	handleStationSelect(station);
}

function handleHistoryKeydown(station: string, event: KeyboardEvent): void {
	if (event.key === 'Delete' || event.key === 'Backspace') {
		updateSwipeOffset(station, -MAX_SWIPE_DISTANCE);
		activeSwipeStation = station;
		event.preventDefault();
		return;
	}
	if (event.key === 'Escape') {
		updateSwipeOffset(station, 0);
		activeSwipeStation = null;
	}
}


function handleSearchInput(value: string): void {
	searchQuery = value;
	const keyword = value.trim();
	searchMode = keyword.length > 0;
	if (!searchMode) {
		searchResults = [];
		searchLoading = false;
		return;
	}
	performSearch(keyword);
}

async function performSearch(keyword: string): Promise<void> {
	const token = ++searchToken;
	searchLoading = true;
	try {
		const results = parseList(searchStationByKeyword(keyword), '駅検索に失敗しました', 'stations');
		const enriched: SearchResultItem[] = [];
		for (const station of results.slice(0, 50)) {
			let kana = '';
			let prefecture = '';
			try {
				kana = getKanaByStation(station) ?? '';
				prefecture = getPrefectureByStation(station) ?? '';
			} catch (err) {
				console.warn('[TERMINAL_SELECTION] 駅メタデータ取得失敗', err);
			}
			enriched.push({ name: station, kana, prefecture });
		}
		if (token === searchToken) {
			searchResults = enriched;
		}
	} finally {
		if (token === searchToken) {
			searchLoading = false;
		}
	}
}

const MAX_SWIPE_DISTANCE = 110;
const OPEN_THRESHOLD = 50;

function updateSwipeOffset(station: string, offset: number): void {
	historySwipeOffsets = { ...historySwipeOffsets, [station]: offset };
}

function getSwipeOffset(station: string): number {
	return historySwipeOffsets[station] ?? 0;
}

function resetSwipe(station: string): void {
	if (historySwipeOffsets[station]) {
		const clone = { ...historySwipeOffsets };
		delete clone[station];
		historySwipeOffsets = clone;
	}
	if (activeSwipeStation === station) {
		activeSwipeStation = null;
	}
}

function handleSwipeStart(station: string, event: PointerEvent): void {
	if (!event.isPrimary) return;
	const target = event.currentTarget as HTMLElement | null;
	if (target) {
		target.setPointerCapture(event.pointerId);
	}
	swipeSession = {
		station,
		startX: event.clientX,
		pointerId: event.pointerId,
		initialOffset: getSwipeOffset(station)
	};
	activeSwipeStation = station;
}

function handleSwipeMove(station: string, event: PointerEvent): void {
	if (!swipeSession || swipeSession.station !== station) return;
	const delta = event.clientX - swipeSession.startX;
	const offset = clampOffset(swipeSession.initialOffset + delta);
	updateSwipeOffset(station, offset);
	event.preventDefault();
}

function handleSwipeEnd(station: string, event: PointerEvent): void {
	if (!swipeSession || swipeSession.station !== station) return;
	const target = event.currentTarget as HTMLElement | null;
	if (target) {
		target.releasePointerCapture(swipeSession.pointerId);
	}
	const current = getSwipeOffset(station);
	const shouldOpen = Math.abs(current) > OPEN_THRESHOLD;
	updateSwipeOffset(station, shouldOpen ? -MAX_SWIPE_DISTANCE : 0);
	if (!shouldOpen) {
		activeSwipeStation = null;
	}
	swipeSession = null;
}

function handleSwipeCancel(station: string, event: PointerEvent): void {
	if (!swipeSession || swipeSession.station !== station) return;
	const target = event.currentTarget as HTMLElement | null;
	if (target) {
		target.releasePointerCapture(swipeSession.pointerId);
	}
	updateSwipeOffset(station, 0);
	activeSwipeStation = null;
	swipeSession = null;
}

function clampOffset(offset: number): number {
	return Math.min(0, Math.max(-MAX_SWIPE_DISTANCE, offset));
}

const historyEmptyMessage = '履歴がまだありません';

function showCompanies(): boolean {
	return tab === 'group' && stage === 'root';
}

function showPrefectures(): boolean {
	return tab === 'prefecture' && stage === 'root';
}

function showHistory(): boolean {
	return tab === 'history' && stage === 'root';
}
</script>

<div class="terminal-page">
	<header class="app-bar">
		<button type="button" class="nav-button" aria-label="前の画面に戻る" onclick={handleBack}>
			<span class="material-symbols-rounded nav-button-icon" aria-hidden="true">arrow_back</span>
		</button>
		<div class="title">
		<h1>{screenTitle}</h1>
			<p>発駅を選択してください</p>
		</div>
	</header>

	{#if stage === 'root'}
		<div class="tab-row" role="tablist" data-testid="terminal-tabs">
			<div class="tabs">
				<button
					type="button"
					role="tab"
					class:active={tab === 'group'}
					aria-selected={tab === 'group'}
					aria-label="グループ"
					onclick={() => selectTab('group')}
				>
					グループ
				</button>
				<button
					type="button"
					role="tab"
					class:active={tab === 'prefecture'}
					aria-selected={tab === 'prefecture'}
					aria-label="都道府県"
					onclick={() => selectTab('prefecture')}
				>
					都道府県
				</button>
				<button
					type="button"
					role="tab"
					class:active={tab === 'history'}
					aria-selected={tab === 'history'}
					aria-label="履歴"
					onclick={() => selectTab('history')}
				>
					履歴
				</button>
			</div>
		</div>

		<div class="search-bar" data-testid="terminal-search">
			<span aria-hidden="true">🔍</span>
			<input
				type="text"
				placeholder="駅名を検索"
				value={searchQuery}
				oninput={(event) => handleSearchInput((event.target as HTMLInputElement).value)}
			/>
			{#if searchMode}
				<button type="button" aria-label="検索をクリア" class="clear-button" onclick={clearSearch}>
					✕
				</button>
			{/if}
		</div>
	{/if}

	{#if errorMessage}
		<div class="error-banner" role="alert">
			<p>{errorMessage}</p>
			<button type="button" class="text-button" onclick={clearError}>
				閉じる
			</button>
		</div>
	{/if}

	<p class="list-title">{getListTitle()}</p>

	<section class="list-panel" aria-busy={loading || panelLoading || searchLoading}>
		{#if loading && !initialFetchDone}
			<p class="placeholder">一覧を読み込み中...</p>
		{:else if searchMode}
			{#if searchLoading}
				<p class="placeholder">検索中...</p>
			{:else if searchResults.length === 0}
				<p class="placeholder">該当する駅がありません</p>
			{:else}
				<ul>
					{#each searchResults as result}
						<li>
							<button
								type="button"
								class="list-item station"
								aria-label={result.name}
								onclick={() => handleStationSelect(result.name)}
							>
								<span class="primary">{result.name}</span>
								<span class="secondary">{result.kana} ({result.prefecture || '不明'})</span>
							</button>
						</li>
					{/each}
				</ul>
			{/if}
		{:else if stage === 'stations'}
			{#if panelLoading}
				<p class="placeholder">駅を読み込み中...</p>
			{:else if stations.length === 0}
				<p class="placeholder">駅が見つかりません</p>
			{:else}
				<ul>
					{#each stations as station}
						<li>
								<button
									type="button"
									class="list-item station"
									aria-label={station}
									onclick={() => handleStationSelect(station)}
								>
									<span class="primary">{station}</span>
								</button>
						</li>
					{/each}
				</ul>
			{/if}
		{:else if stage === 'lines'}
			{#if panelLoading}
				<p class="placeholder">路線を読み込み中...</p>
			{:else if lines.length === 0}
				<p class="placeholder">路線が見つかりません</p>
			{:else}
				<ul>
					{#each lines as line}
						<li>
							<button
								type="button"
								class="list-item"
								aria-label={line}
								onclick={() => openStations(line)}
							>
								<span class="primary">{line}</span>
							</button>
						</li>
					{/each}
				</ul>
			{/if}
		{:else if showCompanies()}
			{#if companies.length === 0}
				<p class="placeholder">JRグループ情報がありません</p>
			{:else}
				<ul>
					{#each companies as company}
						<li>
							<button
								type="button"
								class="list-item"
								aria-label={company}
								onclick={() => openLinesFromGroup(company)}
							>
								<span class="primary">{company}</span>
							</button>
						</li>
					{/each}
				</ul>
			{/if}
		{:else if showPrefectures()}
			{#if prefectures.length === 0}
				<p class="placeholder">都道府県情報がありません</p>
			{:else}
				<ul>
					{#each prefectures as prefecture}
						<li>
							<button
								type="button"
								class="list-item"
								aria-label={prefecture}
								onclick={() => openLinesFromPrefecture(prefecture)}
							>
								<span class="primary">{prefecture}</span>
							</button>
						</li>
					{/each}
				</ul>
			{/if}
		{:else if showHistory()}
			{#if historyItems.length === 0}
				<p class="placeholder">{historyEmptyMessage}</p>
			{:else}
				<ul>
					{#each historyItems as item}
						<li
							class="history-item"
							data-history-item={item}
							onpointerdown={(event) => handleSwipeStart(item, event)}
							onpointermove={(event) => handleSwipeMove(item, event)}
							onpointerup={(event) => handleSwipeEnd(item, event)}
							onpointercancel={(event) => handleSwipeCancel(item, event)}
						>
							<div class="history-delete-zone" aria-hidden={getSwipeOffset(item) === 0}>
								<button
									type="button"
									class="history-delete"
									aria-label={`${item}を削除`}
									onclick={() => removeHistoryItem(item)}
								>
									削除
								</button>
							</div>
							<div
								class="history-content"
								style={`transform: translateX(${getSwipeOffset(item)}px); transition: ${
									activeSwipeStation === item ? 'none' : 'transform 0.2s ease'
								}; pointer-events: ${getSwipeOffset(item) === 0 ? 'auto' : 'none'};`}
							>
								<button
									type="button"
									class="list-item station"
									aria-label={item}
									onclick={() => handleHistorySelect(item)}
									onkeydown={(event) => handleHistoryKeydown(item, event)}
								>
									<span class="primary">{item}</span>
								</button>
							</div>
						</li>
					{/each}
				</ul>
			{/if}
	{/if}
	</section>

	{#if autoRouteDialogOpen}
		<div class="dialog-backdrop" role="dialog" aria-modal="true">
			<div class="dialog-card">
				<h2>新幹線を利用しますか？</h2>
				<p>選択した着駅: {pendingDestinationStation}</p>
				<div class="dialog-actions">
					<button type="button" onclick={() => confirmAutoRoute(true)}>
						新幹線を使う
					</button>
					<button type="button" onclick={() => confirmAutoRoute(false)}>
						在来線のみ
					</button>
					<button type="button" class="secondary" onclick={cancelAutoRouteDialog}>
						キャンセル
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	:global(body) {
		background: #f3f4f6;
		font-family: 'Noto Sans JP', system-ui, sans-serif;
	}

	.terminal-page {
		max-width: 720px;
		margin: 0 auto;
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.app-bar {
		display: flex;
		align-items: center;
		gap: 1rem;
		background: #1976d2;
		color: #fff;
		padding: 0.75rem 1rem;
		border-radius: 0.75rem;
		box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
	}

	.title h1 {
		margin: 0;
		font-size: 1.3rem;
	}

	.title p {
		margin: 0;
		font-size: 0.85rem;
	}

	.nav-button {
		background: #1565c0;
		color: #fff;
		border: none;
		border-radius: 999px;
		width: 48px;
		height: 48px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
	}

	.nav-button-icon {
		font-size: 1.5rem;
	}

	.tab-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		background: #fff;
		border-radius: 999px;
		padding: 0.25rem 0.5rem;
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
	}

	.tabs {
		display: flex;
		gap: 0.25rem;
		flex: 1;
	}

	.tabs button {
		flex: 1;
		border: none;
		background: transparent;
		padding: 0.5rem 0;
		border-radius: 999px;
		cursor: pointer;
		font-weight: 600;
		color: #4b5563;
	}

	.tabs button.active {
		background: #1976d2;
		color: #fff;
	}

	.search-bar {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		background: #fff;
		padding: 0.5rem 0.75rem;
		border-radius: 0.75rem;
		box-shadow: inset 0 0 0 1px #e5e7eb;
	}

	.search-bar input {
		flex: 1;
		border: none;
		outline: none;
		font-size: 1rem;
	}

	.clear-button {
		border: none;
		background: transparent;
		cursor: pointer;
		font-size: 1.1rem;
	}

	.error-banner {
		display: flex;
		justify-content: space-between;
		align-items: center;
		background: #fee2e2;
		color: #991b1b;
		border-radius: 0.75rem;
		padding: 0.75rem 1rem;
	}

	.text-button {
		background: transparent;
		border: none;
		color: inherit;
		cursor: pointer;
		font-weight: 600;
	}

	.list-title {
		margin: 0;
		font-size: 0.9rem;
		color: #6b7280;
		padding-left: 0.25rem;
	}

	.dialog-backdrop {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.45);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
	}

	.dialog-card {
		background: #fff;
		border-radius: 1rem;
		padding: 1.25rem;
		max-width: 320px;
		width: calc(100% - 2rem);
		box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
		text-align: center;
	}

	.dialog-card h2 {
		margin-top: 0;
		margin-bottom: 0.5rem;
	}

	.dialog-actions {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-top: 1rem;
	}

	.dialog-actions button {
		padding: 0.6rem 1rem;
		border: none;
		border-radius: 999px;
		cursor: pointer;
		font-weight: 600;
	}

	.dialog-actions button:first-child {
		background: #2563eb;
		color: #fff;
	}

	.dialog-actions button:nth-child(2) {
		background: #10b981;
		color: #fff;
	}

	.dialog-actions button.secondary {
		background: #e5e7eb;
		color: #111827;
	}

	.list-panel {
		background: #fff;
		border-radius: 1rem;
		padding: 0.5rem;
		min-height: 320px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
	}

	.list-panel ul {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.list-item {
		width: 100%;
		text-align: left;
		border: none;
		background: #f9fafb;
		border-radius: 0.9rem;
		padding: 0.75rem 1rem;
		cursor: pointer;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.list-item.station {
		background: #eef2ff;
	}

	.primary {
		font-weight: 600;
		color: #111827;
	}

	.secondary {
		font-size: 0.85rem;
		color: #6b7280;
	}

	.placeholder {
		color: #9ca3af;
		text-align: center;
		padding: 2rem 0;
	}

	.history-item {
		position: relative;
		overflow: hidden;
		touch-action: pan-y;
	}

	.history-content {
		position: relative;
		z-index: 2;
	}

	.history-delete-zone {
		position: absolute;
		top: 0;
		right: 0;
		bottom: 0;
		width: 110px;
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1;
	}

	.history-delete {
		width: 100%;
		height: 100%;
		border: none;
		background: #dc2626;
		color: #fff;
		font-weight: 700;
		cursor: pointer;
	}

</style>
