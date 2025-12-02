/**
 * Farert PWA - localStorage永続化ヘルパー
 *
 * このファイルはlocalStorageの読み書き、およびエクスポート/インポート機能を提供します。
 *
 * 仕様: specs/data-model.md (永続化データ構造セクション)
 */

import type { ExportData, SavedRoute } from '$lib/types';

/**
 * エクスポートデータのバージョン
 */
const EXPORT_VERSION = '1.0';

/**
 * 保存経路をJSON形式でエクスポート
 *
 * エクスポートされたデータは保存画面からダウンロードまたは共有できます。
 *
 * @param routes - エクスポートする経路リスト
 * @returns エクスポートデータ（JSON文字列）
 */
export function exportRoutes(routes: SavedRoute[]): string {
	const data: ExportData = {
		version: EXPORT_VERSION,
		routes,
		exportedAt: new Date().toISOString()
	};

	return JSON.stringify(data, null, 2);
}

/**
 * JSON形式のデータから保存経路をインポート
 *
 * @param jsonString - インポートするJSON文字列
 * @returns インポートされた経路リスト
 * @throws バージョン不一致またはJSON解析エラー
 */
export function importRoutes(jsonString: string): SavedRoute[] {
	try {
		const data = JSON.parse(jsonString) as ExportData;

		// バージョンチェック
		if (!data.version) {
			throw new Error('バージョン情報がありません');
		}

		// 将来的なバージョン対応のため、メジャーバージョンのみチェック
		const importMajorVersion = data.version.split('.')[0];
		const currentMajorVersion = EXPORT_VERSION.split('.')[0];

		if (importMajorVersion !== currentMajorVersion) {
			throw new Error(
				`互換性のないバージョンです（インポートデータ: ${data.version}, 現在: ${EXPORT_VERSION}）`
			);
		}

		// 経路データの検証
		if (!Array.isArray(data.routes)) {
			throw new Error('経路データが不正です');
		}

		return data.routes;
	} catch (error) {
		if (error instanceof SyntaxError) {
			throw new Error('JSONの解析に失敗しました: ' + error.message);
		}
		throw error;
	}
}

/**
 * 経路をクリップボードにコピー（routeScript形式）
 *
 * @param routeScript - コピーする経路（routeScript形式）
 * @returns コピー成功時true
 */
export async function copyRouteToClipboard(routeScript: string): Promise<boolean> {
	try {
		if (typeof navigator === 'undefined' || !navigator.clipboard) {
			console.warn('[STORAGE] Clipboard API が利用できません');
			return false;
		}

		await navigator.clipboard.writeText(routeScript);
		console.log('[STORAGE] 経路をクリップボードにコピーしました:', routeScript);
		return true;
	} catch (error) {
		console.error('[STORAGE] クリップボードへのコピーに失敗しました:', error);
		return false;
	}
}

/**
 * クリップボードから経路をペースト（routeScript形式）
 *
 * @returns ペーストされた経路文字列、失敗時はnull
 */
export async function pasteRouteFromClipboard(): Promise<string | null> {
	try {
		if (typeof navigator === 'undefined' || !navigator.clipboard) {
			console.warn('[STORAGE] Clipboard API が利用できません');
			return null;
		}

		const text = await navigator.clipboard.readText();
		console.log('[STORAGE] クリップボードから経路をペーストしました:', text);
		return text;
	} catch (error) {
		console.error('[STORAGE] クリップボードからのペーストに失敗しました:', error);
		return null;
	}
}

/**
 * ファイルとしてエクスポートデータをダウンロード
 *
 * @param routes - エクスポートする経路リスト
 * @param filename - ダウンロードするファイル名（デフォルト: farert-routes.json）
 */
export function downloadRoutesAsFile(routes: SavedRoute[], filename = 'farert-routes.json'): void {
	try {
		const jsonString = exportRoutes(routes);
		const blob = new Blob([jsonString], { type: 'application/json' });
		const url = URL.createObjectURL(blob);

		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		a.click();

		// メモリリーク防止
		URL.revokeObjectURL(url);

		console.log('[STORAGE] 経路をファイルとしてダウンロードしました:', filename);
	} catch (error) {
		console.error('[STORAGE] ファイルのダウンロードに失敗しました:', error);
		throw error;
	}
}

/**
 * ファイルから経路データをインポート
 *
 * @param file - インポートするファイル
 * @returns インポートされた経路リスト
 */
export async function importRoutesFromFile(file: File): Promise<SavedRoute[]> {
	try {
		const text = await file.text();
		const routes = importRoutes(text);
		console.log('[STORAGE] ファイルから経路をインポートしました（件数:', routes.length, ')');
		return routes;
	} catch (error) {
		console.error('[STORAGE] ファイルのインポートに失敗しました:', error);
		throw error;
	}
}

/**
 * Web Share API を使って経路を共有
 *
 * @param routeScript - 共有する経路（routeScript形式）
 * @param title - 共有時のタイトル
 * @returns 共有成功時true
 */
export async function shareRoute(
	routeScript: string,
	title = 'Farert - JR運賃計算'
): Promise<boolean> {
	try {
		if (typeof navigator === 'undefined' || !navigator.share) {
			console.warn('[STORAGE] Web Share API が利用できません');
			return false;
		}

		await navigator.share({
			title,
			text: routeScript
		});

		console.log('[STORAGE] 経路を共有しました:', routeScript);
		return true;
	} catch (error) {
		// ユーザーがキャンセルした場合もエラーとして扱われる
		if ((error as Error).name === 'AbortError') {
			console.log('[STORAGE] 共有がキャンセルされました');
		} else {
			console.error('[STORAGE] 共有に失敗しました:', error);
		}
		return false;
	}
}
