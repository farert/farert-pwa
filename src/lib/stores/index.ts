/**
 * Farert PWA - グローバル状態管理（Svelte Stores）
 *
 * このファイルはアプリケーション全体で使用されるSvelteストアを提供します。
 * すべてのストアはlocalStorageと自動同期されます。
 *
 * 仕様: specs/screen-flow-and-io.md (グローバル状態管理セクション)
 */

import { get, writable, type Writable } from 'svelte/store';
import type { FaretClass } from '$lib/wasm/types';
import type { TicketHolderItem, SavedRoute, StationHistory } from '$lib/types';
import { STORAGE_KEYS } from '$lib/types';

/**
 * 現在の経路（WASM Farert オブジェクト）
 *
 * メイン画面で編集中の経路を保持します。
 * 変更時に自動的にlocalStorageに保存されます（routeScript形式）。
 */
export const mainRoute: Writable<FaretClass | null> = writable(null);

/**
 * 保存経路リスト（routeScript 文字列配列）
 *
 * 保存画面で管理される経路のリストです。
 * 各経路はrouteScript()形式の文字列として保存されます。
 */
export const savedRoutes: Writable<SavedRoute[]> = writable([]);

/**
 * きっぷホルダリスト
 *
 * ドロワーナビゲーションで表示される経路リストです。
 * 各アイテムは経路、運賃タイプ、並び順を保持します。
 */
export const ticketHolder: Writable<TicketHolderItem[]> = writable([]);

/**
 * 駅選択履歴（駅名文字列配列）
 *
 * 発駅選択画面の履歴タブで表示される駅名リストです。
 * 最大100件まで保持されます。
 */
export const stationHistory: Writable<StationHistory> = writable([]);

/**
 * localStorageへの自動同期を設定
 *
 * ブラウザ環境（window !== undefined）でのみ動作します。
 * SSR時は何もしません。
 */
let persistenceReady = false;

function persistSnapshot(force = false): void {
	if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
	if (!persistenceReady && !force) return;

	try {
		const route = get(mainRoute);
		if (route && typeof route.routeScript === 'function') {
			const routeStr = route.routeScript();
			localStorage.setItem(STORAGE_KEYS.CURRENT_ROUTE, routeStr);
		} else if (route === null) {
			localStorage.removeItem(STORAGE_KEYS.CURRENT_ROUTE);
		}
	} catch (error) {
		console.error('[STORE] mainRoute保存エラー:', error);
	}

	try {
		localStorage.setItem(STORAGE_KEYS.SAVED_ROUTES, JSON.stringify(get(savedRoutes)));
	} catch (error) {
		console.error('[STORE] savedRoutes保存エラー:', error);
	}

	try {
		localStorage.setItem(STORAGE_KEYS.TICKET_HOLDER, JSON.stringify(get(ticketHolder)));
	} catch (error) {
		console.error('[STORE] ticketHolder保存エラー:', error);
	}

	try {
		localStorage.setItem(STORAGE_KEYS.STATION_HISTORY, JSON.stringify(get(stationHistory)));
	} catch (error) {
		console.error('[STORE] stationHistory保存エラー:', error);
	}
}

if (typeof window !== 'undefined') {
	// 同期は初期化完了フラグが立ってから反映する（初期値で上書きしない）
	mainRoute.subscribe(() => persistSnapshot());
	savedRoutes.subscribe(() => persistSnapshot());
	ticketHolder.subscribe(() => persistSnapshot());
	stationHistory.subscribe(() => persistSnapshot());
}

/**
 * ストアをlocalStorageから初期化
 *
 * アプリケーション起動時に一度だけ呼び出してください。
 * WASM初期化後に呼び出す必要があります（Faretクラスを使用するため）。
 *
 * @param Farert - WASM モジュールのFaretクラス
 */
export function initStores(Farert: new () => FaretClass): void {
	if (typeof window === 'undefined') {
		console.warn('[STORE] SSR環境ではストアの初期化をスキップします');
		return;
	}

	console.log('[STORE] localStorageからストアを初期化中...');

	try {
		// 現在の経路を復元
		const currentRouteStr = localStorage.getItem(STORAGE_KEYS.CURRENT_ROUTE);
		if (currentRouteStr) {
			console.log('[STORE] 現在の経路を復元:', currentRouteStr);
			const route = new Farert();
			const buildResult = route.buildRoute(currentRouteStr);
			if (buildResult === 0) {
				mainRoute.set(route);
				console.log('[STORE] 現在の経路を復元しました');
			} else {
				console.warn('[STORE] 現在の経路の復元に失敗しました（buildRoute返り値:', buildResult, ')');
			}
		}

		// 保存経路リストを復元
		const savedRoutesStr = localStorage.getItem(STORAGE_KEYS.SAVED_ROUTES);
		if (savedRoutesStr) {
			const routes = JSON.parse(savedRoutesStr) as SavedRoute[];
			savedRoutes.set(routes);
			console.log('[STORE] 保存経路を復元しました（件数:', routes.length, ')');
		}

		// きっぷホルダを復元
		const ticketHolderStr = localStorage.getItem(STORAGE_KEYS.TICKET_HOLDER);
		if (ticketHolderStr) {
			const items = JSON.parse(ticketHolderStr) as TicketHolderItem[];
			ticketHolder.set(items);
			console.log('[STORE] きっぷホルダを復元しました（件数:', items.length, ')');
		}

		// 駅選択履歴を復元
		const historyStr = localStorage.getItem(STORAGE_KEYS.STATION_HISTORY);
		if (historyStr) {
			const history = JSON.parse(historyStr) as StationHistory;
			stationHistory.set(history);
			console.log('[STORE] 駅選択履歴を復元しました（件数:', history.length, ')');
		}

		console.log('[STORE] ストアの初期化が完了しました');
		persistenceReady = true;
		persistSnapshot(true);
	} catch (error) {
		console.error('[STORE] ストアの初期化中にエラーが発生しました:', error);
	}
}

/**
 * 駅選択履歴に駅を追加
 *
 * - 既に存在する場合は先頭に移動
 * - 最大100件まで保持（古いものから削除）
 *
 * @param stationName - 追加する駅名
 */
export function addToStationHistory(stationName: string): void {
	stationHistory.update((history) => {
		// 既存の同じ駅名を削除
		const filtered = history.filter((name) => name !== stationName);
		// 先頭に追加
		const updated = [stationName, ...filtered];
		// 最大100件まで保持
		return updated.slice(0, 100);
	});
}

/**
 * すべてのストアをクリア
 *
 * テストやデバッグ用です。本番環境では使用を推奨しません。
 */
export function clearAllStores(): void {
	if (typeof window === 'undefined') return;

	console.log('[STORE] すべてのストアをクリアします');
	mainRoute.set(null);
	savedRoutes.set([]);
	ticketHolder.set([]);
	stationHistory.set([]);

	// localStorageも削除
	localStorage.removeItem(STORAGE_KEYS.CURRENT_ROUTE);
	localStorage.removeItem(STORAGE_KEYS.SAVED_ROUTES);
	localStorage.removeItem(STORAGE_KEYS.TICKET_HOLDER);
	localStorage.removeItem(STORAGE_KEYS.STATION_HISTORY);

	console.log('[STORE] すべてのストアをクリアしました');
}
