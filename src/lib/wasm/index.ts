/**
 * FARERT WASM Wrapper for PWA
 * JR運賃計算WASMモジュールのTypeScriptラッパー
 */

import type { FaretModule, FaretClass, SqlResult, DatabaseInfo } from './types';

// グローバル型定義
declare global {
	interface Window {
		__createFaretModule?: any;
	}
}

// グローバルWASMモジュール
let wasmModule: FaretModule | null = null;
let initPromise: Promise<FaretModule> | null = null;

/**
 * FARERT WASMモジュールを初期化
 * すべてのFARET機能を使用する前に呼び出す必要があります
 */
export async function initFarert(): Promise<void> {
	if (wasmModule) {
		return; // すでに初期化済み
	}

	if (initPromise) {
		await initPromise;
		return;
	}

	initPromise = (async () => {
		try {
			console.log('[FARERT] 初期化開始...');

			// app.htmlで読み込まれたモジュールファクトリを取得
			const createFaretModule = await new Promise<any>((resolve, reject) => {
				console.log('[FARERT] モジュールファクトリを取得中...');

				// すでにロード済みかチェック
				if (window.__createFaretModule) {
					console.log('[FARERT] モジュールファクトリ取得成功 (即座)');
					resolve(window.__createFaretModule);
					return;
				}

				console.log('[FARERT] モジュールファクトリ待機中...');

				// ロードされるまで待つ
				let attempts = 0;
				const checkModule = setInterval(() => {
					attempts++;
					if (window.__createFaretModule) {
						console.log(`[FARERT] モジュールファクトリ取得成功 (${attempts * 50}ms後)`);
						clearInterval(checkModule);
						resolve(window.__createFaretModule);
					} else if (attempts % 20 === 0) {
						console.log(`[FARERT] まだ待機中... (${attempts * 50}ms)`);
					}
				}, 50);

				// タイムアウト設定（10秒）
				setTimeout(() => {
					clearInterval(checkModule);
					console.error('[FARERT] タイムアウト: farert.jsがロードされませんでした');
					reject(new Error('Timeout: farert.js not loaded. Check app.html script tag.'));
				}, 10000);
			});

			console.log('[FARERT] モジュールファクトリを実行中...');

			// モジュールファクトリを実行
			const module = await createFaretModule({
				locateFile: (path: string) => {
					// Github Pagesなどのbase pathに対応
					const base = import.meta.env.BASE_URL || '/';
					const fullPath = path.endsWith('.wasm') || path.endsWith('.data') ? `${base}${path}` : path;
					console.log(`[FARERT] ファイル位置: ${path} -> ${fullPath}`);
					return fullPath;
				},
				print: (text: string) => console.log('[FARERT WASM]', text),
				printErr: (text: string) => console.error('[FARERT WASM ERROR]', text)
			});

			console.log('[FARERT] モジュール初期化完了');

			wasmModule = module as FaretModule;

			// 初期化時に自動的にデータベースを開く
			console.log('[FARERT] データベースを開いています...');
			const dbStatus = wasmModule.openDatabase();
			console.log('[FARERT] データベース初期化完了:', dbStatus);

			return wasmModule;
		} catch (error) {
			console.error('[FARERT] 初期化エラー:', error);
			initPromise = null;
			throw new Error(`FARERT WASMの初期化に失敗しました: ${error}`);
		}
	})();

	await initPromise;
}

/**
 * 初期化されたWASMモジュールを取得
 * @throws 初期化されていない場合はエラー
 */
function getModule(): FaretModule {
	if (!wasmModule) {
		throw new Error('FARERT WASMが初期化されていません。先にinitFarert()を呼び出してください。');
	}
	return wasmModule;
}

/**
 * Farertクラスラッパー
 * 経路計算と運賃情報の主要インターフェース
 */
export class Farert {
	private instance: FaretClass;

	constructor() {
		const module = getModule();
		this.instance = new module.Farert();
	}

	// 経路構築メソッド
	addStartRoute(station: string): number {
		return this.instance.addStartRoute(station);
	}

	addRoute(line: string, station: string): number {
		return this.instance.addRoute(line, station);
	}

	autoRoute(useBulletTrain: number, destinationStation: string): number {
		return this.instance.autoRoute(useBulletTrain, destinationStation);
	}

	getRouteCount(): number {
		return this.instance.getRouteCount();
	}

	departureStationName(): string {
		return this.instance.departureStationName();
	}

	arrivevalStationName(): string {
		return this.instance.arrivevalStationName();
	}

	buildRoute(routeStr: string): number {
		return this.instance.buildRoute(routeStr);
	}

	routeScript(): string {
		return this.instance.routeScript();
	}

	// 経路操作
	removeAll(): void {
		this.instance.removeAll();
	}

	removeTail(): void {
		this.instance.removeTail();
	}

	reverse(): number {
		return this.instance.reverse();
	}

	assign(sourceRoute: Farert, count: number): void {
		this.instance.assign(sourceRoute.instance, count);
	}

	// 経路設定
	typeOfPassedLine(offset: number): number {
		return this.instance.typeOfPassedLine(offset);
	}

	setDetour(enabled: boolean): number {
		return this.instance.setDetour(enabled);
	}

	setNoRule(noRule: boolean): void {
		this.instance.setNoRule(noRule);
	}

	// 運賃計算
	showFare(): string {
		return this.instance.showFare();
	}

	// 経路フラグ
	setLongRoute(flag: boolean): void {
		this.instance.setLongRoute(flag);
	}

	setJrTokaiStockApply(flag: boolean): void {
		this.instance.setJrTokaiStockApply(flag);
	}

	setStartAsCity(): void {
		this.instance.setStartAsCity();
	}

	setArrivalAsCity(): void {
		this.instance.setArrivalAsCity();
	}

	setSpecificTermRule115(flag: boolean): void {
		this.instance.setSpecificTermRule115(flag);
	}

	// 経路ステータスチェック
	isNotSameKokuraHakataShinZai(): boolean {
		return this.instance.isNotSameKokuraHakataShinZai();
	}

	isAvailableReverse(): boolean {
		return this.instance.isAvailableReverse();
	}

	isOsakakanDetourEnable(): boolean {
		return this.instance.isOsakakanDetourEnable();
	}

	isOsakakanDetour(): boolean {
		return this.instance.isOsakakanDetour();
	}

	setNotSameKokuraHakataShinZai(enabled: boolean): void {
		this.instance.setNotSameKokuraHakataShinZai(enabled);
	}

	// JSONシリアライゼーション
	getFareInfoObjectJson(): string {
		return this.instance.getFareInfoObjectJson();
	}

	getRoutesJson(): string {
		return this.instance.getRoutesJson();
	}

	getRouteRecord(index: number): string {
		return this.instance.getRouteRecord(index);
	}
}

// データベース操作
export function openDatabase(): string {
	return getModule().openDatabase();
}

export function closeDatabase(): void {
	getModule().closeDatabase();
}

export function databaseInfo(): string {
	return getModule().databaseInfo();
}

// UI Helper関数
export function getPrefects(): string {
	return getModule().getPrefects();
}

export function getCompanys(): string {
	return getModule().getCompanys();
}

export function getLinesByPrefect(prefecture: string): string {
	return getModule().getLinesByPrefect(prefecture);
}

export function getLinesByCompany(company: string): string {
	return getModule().getLinesByCompany(company);
}

export function getLinesByStation(station: string): string {
	return getModule().getLinesByStation(station);
}

export function getStationsByCompanyAndLine(jrgroup: string, lineName: string): string {
	return getModule().getStationsByCompanyAndLine(jrgroup, lineName);
}

export function getStationsByPrefectureAndLine(prefecture: string, lineName: string): string {
	return getModule().getStationsByPrefectureAndLine(prefecture, lineName);
}

export function getPrefectureByStation(stationName: string): string {
	return getModule().getPrefectureByStation(stationName);
}

export function getKanaByStation(stationName: string): string {
	return getModule().getKanaByStation(stationName);
}

export function searchStationByKeyword(keyword: string): string {
	return getModule().searchStationByKeyword(keyword);
}

export function getBranchStationsByLine(lineName: string, stationName: string): string {
	return getModule().getBranchStationsByLine(lineName, stationName);
}

export function getStationsByLine(lineName: string): string {
	return getModule().getStationsByLine(lineName);
}

export function getPrefectId(prefecture: string): number {
	return getModule().getPrefectId(prefecture);
}

export function getCompanyId(company: string): number {
	return getModule().getCompanyId(company);
}

// 開発者ツール
export function executeSql(sql: string): string {
	return getModule().executeSql(sql);
}

// 型をエクスポート
export type { FaretClass, FaretModule, SqlResult, DatabaseInfo } from './types';
