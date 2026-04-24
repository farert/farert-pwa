import LZString from 'lz-string';
import { Farert } from '$lib/wasm';
import type { FaretClass } from '$lib/wasm/types';
import { getSerializedRouteScript } from './routeScriptPersistence';

export type FarertConstructor = new () => FaretClass;

/**
 * ルートをURLクエリで扱える圧縮文字列に変換する
 *
 * @param route 対象となるFarertインスタンス
 * @param segmentCount 末尾から含める区間数。-1の場合は全区間
 * @param ctor Farert互換コンストラクタ（テスト用）
 */
export function compressRouteForUrl(
	route: FaretClass,
	segmentCount = -1,
	_ctor?: FarertConstructor
): string {
	if (!route) {
		throw new Error('routeが指定されていません');
	}

	const serialized = getSerializedRouteScript(route);
	const script = selectRouteScript(serialized, segmentCount);

	if (!script || script.trim() === '') {
		throw new Error('経路スクリプトが空です');
	}

	return LZString.compressToEncodedURIComponent(script);
}

/**
 * 圧縮されたクエリ文字列からFarertインスタンスを復元する
 *
 * @param compressed 圧縮済み文字列
 * @param ctor Farert互換コンストラクタ（テスト用）
 */
export function decompressRouteFromUrl(
	compressed: string,
	ctor?: FarertConstructor
): FaretClass | null {
	try {
		if (!compressed || compressed.trim() === '') {
			console.error('[URL_ROUTE] 圧縮データが空です');
			return null;
		}

		const RouteCtor = ctor ?? Farert;

		const script = LZString.decompressFromEncodedURIComponent(compressed);
		if (!script) {
			console.error('[URL_ROUTE] ルートの伸長に失敗しました。圧縮データ:', compressed.substring(0, 50));
			return null;
		}

		const route = new RouteCtor();
		const restored = restoreRouteFromScript(route, script);
		if (!restored) {
			console.error('[URL_ROUTE] route.buildRouteが失敗しました。スクリプト:', script);
			return null;
		}

		return route;
	} catch (error) {
		console.error('[URL_ROUTE] 圧縮データからの復元でエラーが発生しました', error);
		return null;
	}
}

function isSuccessfulBuild(result: unknown): boolean {
	const successCodes = new Set([0, 1, 4, 5]);

	if (typeof result === 'number') {
		return successCodes.has(result);
	}

	if (typeof result === 'string') {
		const trimmed = result.trim();
		if (!trimmed) return false;
		const sanitized = trimmed.replace(/\0/g, '');

		const numeric = Number(sanitized);
		if (!Number.isNaN(numeric)) {
			return successCodes.has(numeric);
		}

		try {
			const parsed = JSON.parse(sanitized) as { rc?: number };
			return typeof parsed.rc === 'number' ? successCodes.has(parsed.rc) : false;
		} catch (err) {
			console.warn('[URL_ROUTE] buildRoute結果の解析に失敗しました', err);
			const match = sanitized.match(/"rc"\s*:\s*(-?\d+)/);
			if (match && match[1] !== undefined) {
				return successCodes.has(Number(match[1]));
			}
			return false;
		}
	}

	return result === undefined || result === null;
}

interface ShareUrlOptions {
	/** 明示的に指定するベースURL（未指定ならwindow.origin） */
	baseUrl?: string;
	/** SvelteKit の base path */
	basePath?: string;
	/** Farert互換コンストラクタ（テスト用） */
	ctor?: FarertConstructor;
}

/**
 * 詳細画面遷移・共有用URLを生成する
 *
 * @param route 基準となる経路
 * @param segmentCount 末尾から含める区間数。-1の場合は全区間
 * @param options baseUrlとFarertコンストラクタのオプション
 */
export function generateShareUrl(
	route: FaretClass,
	segmentCount = -1,
	options?: ShareUrlOptions
): string {
	const compressed = compressRouteForUrl(route, segmentCount, options?.ctor);
	const origin =
		options?.baseUrl ??
		(typeof window !== 'undefined' && window.location?.origin ? window.location.origin : '');

	const normalizedOrigin = origin.endsWith('/') ? origin.slice(0, -1) : origin;
	const normalizedBase = normalizeBasePath(options?.basePath);
	return `${normalizedOrigin}${normalizedBase}/detail?r=${compressed}`;
}

function normalizeBasePath(path: string | undefined): string {
	if (!path) return '';
	const prefixed = path.startsWith('/') ? path : `/${path}`;
	if (prefixed === '/') return '';
	return prefixed.endsWith('/') ? prefixed.slice(0, -1) : prefixed;
}

export function restoreRouteFromScript(route: FaretClass, script: string): boolean {
	return restoreRouteStrict(route, script);
}

function selectRouteScript(routeScript: string, segmentCount: number): string {
	if (segmentCount < 0) {
		return routeScript;
	}

	const tokens = routeScript.split(',');
	const sliceLength = Math.min(tokens.length, 1 + segmentCount * 2);
	return tokens.slice(0, sliceLength).join(',');
}

function restoreRouteStrict(route: FaretClass, script: string): boolean {
	try {
		route.removeAll?.();
	} catch (err) {
		console.warn('[URL_ROUTE] route.removeAllに失敗しました', err);
	}

	const buildResult = route.buildRoute(script);
	if (!isSuccessfulBuild(buildResult)) {
		console.error('[URL_ROUTE] route.buildRouteが失敗しました:', buildResult, 'スクリプト:', script);
		return false;
	}

	// buildRoute が成功した時点で、WASM 側の正規化結果を正本として採用する。
	// 省略表記や同名駅の解決で routeScript() が入力と一致しないことがある。
	return route.getRouteCount() > 0;
}

function rebuildByAddRoute(route: FaretClass, script: string): boolean {
	const tokens = tokenizeRouteScript(script);
	if (!tokens.length || tokens.length % 2 === 0) {
		return false;
	}

	try {
		route.removeAll?.();
	} catch (err) {
		console.warn('[URL_ROUTE] route.removeAllに失敗しました', err);
	}

	const startResult = route.addStartRoute(tokens[0] ?? '');
	if (!isSuccessfulBuild(startResult)) {
		return false;
	}

	for (let i = 1; i < tokens.length; i += 2) {
		const line = tokens[i];
		const station = tokens[i + 1];
		if (!line || !station) return false;
		const addResult = route.addRoute(line, station);
		if (!isSuccessfulBuild(addResult)) {
			return false;
		}
	}

	if (isSameRouteScript(route.routeScript(), script)) {
		return true;
	}

	// WASM側で括弧付き正式名へ正規化される場合は、再構築完了を成功とみなす。
	return route.getRouteCount() > 0;
}

function isSameRouteScript(actual: string, expected: string): boolean {
	const actualTokens = tokenizeRouteScript(actual);
	const expectedTokens = tokenizeRouteScript(expected);
	if (actualTokens.length !== expectedTokens.length) {
		return false;
	}
	return actualTokens.every((token, index) => token === expectedTokens[index]);
}

function tokenizeRouteScript(script: string): string[] {
	return (script ?? '')
		.split(/[,\s]+/)
		.map((token) => token.trim())
		.filter((token) => token.length > 0);
}
