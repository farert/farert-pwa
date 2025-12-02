/**
 * Farert PWA - データモデル型定義
 *
 * このファイルはアプリケーション全体で使用されるTypeScript型定義を提供します。
 * 仕様: specs/data-model.md
 */

/**
 * 運賃タイプ
 * きっぷホルダーの運賃ピッカーで使用
 */
export enum FareType {
	/** 普通運賃 */
	NORMAL = 'NORMAL',
	/** 小児運賃 */
	CHILD = 'CHILD',
	/** 往復 */
	ROUND_TRIP = 'ROUND_TRIP',
	/** 株割 */
	STOCK_DISCOUNT = 'STOCK_DISCOUNT',
	/** 株割x2 */
	STOCK_DISCOUNT_X2 = 'STOCK_DISCOUNT_X2',
	/** 学割 */
	STUDENT = 'STUDENT',
	/** 学割往復 */
	STUDENT_ROUND_TRIP = 'STUDENT_ROUND_TRIP',
	/** 無効 */
	DISABLED = 'DISABLED'
}

/**
 * 運賃タイプの表示名マッピング
 */
export const FareTypeLabels: Record<FareType, string> = {
	[FareType.NORMAL]: '普通運賃',
	[FareType.CHILD]: '小児運賃',
	[FareType.ROUND_TRIP]: '往復',
	[FareType.STOCK_DISCOUNT]: '株割',
	[FareType.STOCK_DISCOUNT_X2]: '株割x2',
	[FareType.STUDENT]: '学割',
	[FareType.STUDENT_ROUND_TRIP]: '学割往復',
	[FareType.DISABLED]: '無効'
};

/**
 * きっぷホルダアイテム
 * ドロワーナビゲーションで複数の経路を保持するためのデータ構造
 */
export interface TicketHolderItem {
	/** 並べ替え順（一意、表示順序） */
	order: number;
	/** 経路（routeScript() の文字列形式） */
	routeScript: string;
	/** 運賃タイプ */
	fareType: FareType;
}

/**
 * 保存された経路
 * 保存画面で管理される経路データ
 *
 * Note: 現在の仕様では文字列（routeScript）として保存されるため、
 * 型エイリアスとして定義
 */
export type SavedRoute = string;

/**
 * 駅選択履歴
 * 発駅選択画面の履歴タブで表示される駅名リスト
 * 最大100件まで保持
 */
export type StationHistory = string[];

/**
 * localStorageキー定数
 */
export const STORAGE_KEYS = {
	CURRENT_ROUTE: 'farert_current_route',
	SAVED_ROUTES: 'farert_saved_routes',
	TICKET_HOLDER: 'farert_ticket_holder',
	STATION_HISTORY: 'farert_station_history'
} as const;

/**
 * アプリケーション全体のストレージスキーマ
 */
export interface AppStorage {
	/** 現在の経路（routeScript 文字列形式） */
	currentRoute: string | null;
	/** 保存経路リスト（routeScript 文字列配列） */
	savedRoutes: SavedRoute[];
	/** きっぷホルダリスト */
	ticketHolder: TicketHolderItem[];
	/** 駅選択履歴（駅名文字列配列、最大100件） */
	stationHistory: StationHistory;
}

/**
 * エクスポート/インポート用データ形式
 * 保存画面のエクスポート機能で使用
 */
export interface ExportData {
	/** フォーマットバージョン */
	version: string;
	/** 保存された経路リスト */
	routes: SavedRoute[];
	/** エクスポート日時（ISO 8601形式） */
	exportedAt?: string;
}

/**
 * 運賃情報オブジェクト（WASM APIから返される）
 *
 * Note: 詳細な型定義はWASM APIドキュメント（../farert-wasm/docs/API.md）を参照
 * ここでは最小限の型定義を提供
 */
export interface FareInfo {
	/** 計算結果: 0=成功, 1=不完全な経路, 2=会社線のみ */
	result: number;
	/** 運賃（円） */
	fare?: number;
	/** 営業キロ */
	distance?: number;
	/** 有効日数 */
	validDays?: number;
	/** その他の詳細情報 */
	[key: string]: unknown;
}
