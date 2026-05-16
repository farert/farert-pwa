/**
 * Service Worker が返すレスポンス種別を判定するユーティリティです。
 * ネットワーク応答のキャッシュ可否とシェルフォールバック条件を扱います。
 */
export function shouldCacheNetworkResponse(status: number): boolean {
	return status === 200;
}

/**
 * `isDocumentRequest` の判定結果を返します。
 *
 * @param requestMode 処理に必要な入力値です。
 * @param requestDestination 処理に必要な入力値です。
 * @param acceptHeader 処理に必要な入力値です。
 * @returns 判定結果を返します。
 */
function isDocumentRequest(
	requestMode: RequestMode,
	requestDestination?: RequestDestination,
	acceptHeader?: string | null
): boolean {
	if (requestMode === 'navigate') {
		return true;
	}

	if (requestDestination === 'document') {
		return true;
	}

	return Boolean(acceptHeader?.includes('text/html'));
}

/**
 * `shouldServeShellFallback` の判定結果を返します。
 *
 * @param requestMode 処理に必要な入力値です。
 * @param status 処理対象の値です。
 * @param requestDestination 処理に必要な入力値です。
 * @param acceptHeader 処理に必要な入力値です。
 * @returns 判定結果を返します。
 */
export function shouldServeShellFallback(
	requestMode: RequestMode,
	status?: number,
	requestDestination?: RequestDestination,
	acceptHeader?: string | null
): boolean {
	if (!isDocumentRequest(requestMode, requestDestination, acceptHeader)) {
		return false;
	}

	if (status === undefined) {
		return true;
	}

	return status >= 400;
}
