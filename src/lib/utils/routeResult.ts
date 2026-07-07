/**
 * WASM 経路 API の戻り値（rc）を解析するユーティリティです。
 * number / 数値文字列 / JSON 文字列で返る戻り値を単一の構造体へ正規化します。
 */

/** buildRoute 等が返す構造化戻り値 */
export interface RouteOperationResult {
	rc: number;
	failItem?: string;
	offset?: number;
}

/** buildRoute の成功を示す rc 値 */
const BUILD_SUCCESS_CODES = new Set([0, 1, 4, 5]);

/** 経路が終端（これ以上区間を追加できない）であることを示す rc 値 */
const TERMINAL_CODES = new Set([0, 4, 5]);

/**
 * WASM API の戻り値を構造化された結果へ解析します。
 *
 * @param result - number / 文字列（数値・JSON）のいずれかの戻り値
 * @returns 解析結果。解析できない場合は null
 */
export function parseRouteOperationResult(result: unknown): RouteOperationResult | null {
	if (typeof result === 'number') {
		return { rc: result };
	}
	if (typeof result === 'string') {
		const trimmed = result.trim().replace(/\0/g, '');
		if (!trimmed) return null;
		const numeric = Number(trimmed);
		if (!Number.isNaN(numeric)) {
			return { rc: numeric };
		}
		try {
			const parsed = JSON.parse(trimmed) as Partial<RouteOperationResult>;
			if (typeof parsed?.rc === 'number') {
				return { rc: parsed.rc, failItem: parsed.failItem, offset: parsed.offset };
			}
			return null;
		} catch {
			const match = trimmed.match(/"rc"\s*:\s*(-?\d+)/);
			return match ? { rc: Number(match[1]) } : null;
		}
	}
	return null;
}

/**
 * WASM API の戻り値から rc 値のみを取り出します。
 *
 * @param result - 解析対象の戻り値
 * @returns rc 値。解析できない場合は null
 */
export function resolveRouteStatusCode(result: unknown): number | null {
	return parseRouteOperationResult(result)?.rc ?? null;
}

/**
 * buildRoute の戻り値が成功（0/1/4/5）かを判定します。
 *
 * @param result - buildRoute の戻り値
 * @returns 成功なら true。戻り値なし（void 実装）も成功として扱う
 */
export function isBuildRouteSuccess(result: unknown): boolean {
	if (result === undefined || result === null) {
		return true;
	}
	const rc = resolveRouteStatusCode(result);
	return rc !== null ? BUILD_SUCCESS_CODES.has(rc) : false;
}

/**
 * 経路操作の戻り値が成功（rc >= 0）かを判定します。
 *
 * @param result - addRoute / reverse / autoRoute 等の戻り値
 * @returns 成功なら true
 */
export function isRouteOperationSuccess(result: unknown): boolean {
	const rc = resolveRouteStatusCode(result);
	return rc !== null ? rc >= 0 : false;
}

/**
 * rc 値が経路の終端状態を示すかを判定します。
 *
 * @param statusCode - resolveRouteStatusCode で得た rc 値
 * @returns 終端なら true
 */
export function isTerminalStatusCode(statusCode: number | null): boolean {
	return statusCode !== null && TERMINAL_CODES.has(statusCode);
}
