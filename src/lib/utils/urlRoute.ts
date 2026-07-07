/**
 * 経路文字列の URL 圧縮共有を扱うユーティリティです。
 * routeScript の正規化、圧縮、伸長、復元を提供します。
 */
import LZString from 'lz-string';
import { Farert } from '$lib/wasm';
import type { FaretClass } from '$lib/wasm/types';
import { getSerializedRouteScript } from './routeScriptPersistence';
import { isBuildRouteSuccess } from './routeResult';
import { normalizeBasePath } from './basePath';

export type FarertConstructor = new () => FaretClass;

/**
 * `normalizeRouteScript` を正規化します。
 *
 * @param script 処理対象の文字列です。
 * @returns 文字列結果を返します。
 */
export function normalizeRouteScript(script: string): string {
	return (script ?? '')
		.replace(/\uFF0C+/gu, ',')
		.replace(/\u3000+/gu, ' ')
		.trim();
}

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
	// ctor is kept so tests can keep injecting a Farert-compatible constructor.
	void _ctor;
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
			console.error(
				'[URL_ROUTE] ルートの伸長に失敗しました。圧縮データ:',
				compressed.substring(0, 50)
			);
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

/**
 * `restoreRouteFromScript` を処理します。
 *
 * @param route 対象の経路または経路文字列です。
 * @param script 処理対象の文字列です。
 * @returns 判定結果を返します。
 */
export function restoreRouteFromScript(route: FaretClass, script: string): boolean {
	return restoreRouteStrict(route, normalizeRouteScript(script));
}

/**
 * `selectRouteScript` を処理します。
 *
 * @param routeScript 対象の経路または経路文字列です。
 * @param segmentCount 処理に必要な入力値です。
 * @returns 文字列結果を返します。
 */
function selectRouteScript(routeScript: string, segmentCount: number): string {
	if (segmentCount < 0) {
		return routeScript;
	}

	const tokens = routeScript.split(',');
	const sliceLength = Math.min(tokens.length, 1 + segmentCount * 2);
	return tokens.slice(0, sliceLength).join(',');
}

/**
 * `restoreRouteStrict` を処理します。
 *
 * @param route 対象の経路または経路文字列です。
 * @param script 処理対象の文字列です。
 * @returns 判定結果を返します。
 */
function restoreRouteStrict(route: FaretClass, script: string): boolean {
	try {
		route.removeAll?.();
	} catch (err) {
		console.warn('[URL_ROUTE] route.removeAllに失敗しました', err);
	}

	const buildResult = route.buildRoute(script);
	if (!isBuildRouteSuccess(buildResult)) {
		console.error(
			'[URL_ROUTE] route.buildRouteが失敗しました:',
			buildResult,
			'スクリプト:',
			script
		);
		return false;
	}

	// buildRoute が成功した時点で、WASM 側の正規化結果を正本として採用する。
	// 省略表記や同名駅の解決で routeScript() が入力と一致しないことがある。
	return route.getRouteCount() > 0;
}
