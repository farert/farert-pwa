import LZString from 'lz-string';
import { Farert } from '$lib/wasm';
import type { FaretClass } from '$lib/wasm/types';

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
	ctor?: FarertConstructor
): string {
	if (!route) {
		throw new Error('routeが指定されていません');
	}

	const RouteCtor = ctor ?? Farert;

	let script = route.routeScript();
	if (segmentCount >= 0) {
		const clone = new RouteCtor();
		clone.assign(route, segmentCount);
		script = clone.routeScript();
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
		const RouteCtor = ctor ?? Farert;

		const script = LZString.decompressFromEncodedURIComponent(compressed);
		if (!script) {
			console.error('[URL_ROUTE] ルートの伸長に失敗しました');
			return null;
		}

		const route = new RouteCtor();
		const buildResult = route.buildRoute(script);
		if (!isSuccessfulBuild(buildResult)) {
			console.error('[URL_ROUTE] route.buildRouteが失敗しました:', buildResult);
			return null;
		}

		return route;
	} catch (error) {
		console.error('[URL_ROUTE] 圧縮データからの復元でエラーが発生しました', error);
		return null;
	}
}

function isSuccessfulBuild(result: unknown): boolean {
	if (typeof result === 'number') {
		return result === 0;
	}

	if (typeof result === 'string') {
		const trimmed = result.trim();
		if (!trimmed) return false;
		if (trimmed === '0') return true;
		try {
			const parsed = JSON.parse(trimmed) as { rc?: number };
			return typeof parsed.rc === 'number' ? parsed.rc === 0 : false;
		} catch (err) {
			console.warn('[URL_ROUTE] buildRoute結果の解析に失敗しました', err);
			return false;
		}
	}

	return result === undefined || result === null;
}

interface ShareUrlOptions {
	/** 明示的に指定するベースURL（未指定ならwindow.origin） */
	baseUrl?: string;
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
	return `${normalizedOrigin}/detail?r=${compressed}`;
}
