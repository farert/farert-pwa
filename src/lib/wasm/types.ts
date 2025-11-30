/**
 * FARERT WASM TypeScript Type Definitions
 * 型定義: JR運賃計算WASM モジュール
 */

/**
 * Farertクラス: 経路計算と運賃情報
 */
export interface FaretClass {
	// Route building methods
	addStartRoute(station: string): number;
	addRoute(line: string, station: string): number;
	autoRoute(useBulletTrain: number, destinationStation: string): number;
	getRouteCount(): number;
	departureStationName(): string;
	arrivevalStationName(): string;
	buildRoute(routeStr: string): number;
	routeScript(): string;

	// Route manipulation
	removeAll(): void;
	removeTail(): void;
	reverse(): number;
	assign(sourceRoute: FaretClass, count: number): void;

	// Route configuration
	typeOfPassedLine(offset: number): number;
	setDetour(enabled: boolean): number;
	setNoRule(noRule: boolean): void;

	// Fare calculation
	showFare(): string;

	// Route flags
	setLongRoute(flag: boolean): void;
	setJrTokaiStockApply(flag: boolean): void;
	setStartAsCity(): void;
	setArrivalAsCity(): void;
	setSpecificTermRule115(flag: boolean): void;

	// Route status checks
	isNotSameKokuraHakataShinZai(): boolean;
	isAvailableReverse(): boolean;
	isOsakakanDetourEnable(): boolean;
	isOsakakanDetour(): boolean;
	setNotSameKokuraHakataShinZai(enabled: boolean): void;

	// JSON serialization
	getFareInfoObjectJson(): string;
	getRoutesJson(): string;
	getRouteRecord(index: number): string;
}

/**
 * EmscriptenモジュールインターフェースFARETモジュール拡張
 */
export interface FaretModule {
	Farert: new () => FaretClass;
	openDatabase: () => string;
	closeDatabase: () => void;
	databaseInfo: () => string;

	// UI Helper functions
	getPrefects: () => string;
	getCompanys: () => string;
	getLinesByPrefect: (prefecture: string) => string;
	getLinesByCompany: (company: string) => string;
	getLinesByStation: (station: string) => string;
	getStationsByCompanyAndLine: (jrgroup: string, lineName: string) => string;
	getStationsByPrefectureAndLine: (prefecture: string, lineName: string) => string;
	getPrefectureByStation: (stationName: string) => string;
	getKanaByStation: (stationName: string) => string;
	searchStationByKeyword: (keyword: string) => string;
	getBranchStationsByLine: (lineName: string, stationName: string) => string;
	getStationsByLine: (lineName: string) => string;
	getPrefectId: (prefecture: string) => number;
	getCompanyId: (company: string) => number;

	// Developer tools
	executeSql: (sql: string) => string;
}

/**
 * SQL実行結果の型
 */
export interface SqlResult {
	columns: string[];
	rows: unknown[][];
	rowCount: number;
	error?: string;
}

/**
 * データベース情報の型
 */
export interface DatabaseInfo {
	version: string;
	stationCount: number;
	lineCount: number;
}
