# データモデル定義

## コアデータ型

### 経路オブジェクト（Farert）

アプリケーション内では **WASM の `Farert` クラス** をそのまま使用します。

```typescript
import { Farert } from 'farert-wasm';

// 経路の作成
const route = new Farert();
route.addStartRoute("東京");
route.addRoute("東海道線", "熱海");
route.addRoute("身延線", "甲府");

// 運賃計算
const fareInfo = JSON.parse(route.getFareInfoObjectJson());

// 文字列化（保存・共有用）
const routeScript = route.routeScript();
// → "東京,東海道線,熱海,身延線,甲府"

// 復元
const restoredRoute = new Farert();
restoredRoute.buildRoute(routeScript);
```

### 駅（Station）

WASM APIでは駅名（文字列）で操作します。駅情報が必要な場合：

```typescript
const stationName = "東京";
const kana = getKanaByStation(stationName);        // "とうきょう"
const prefecture = getPrefectureByStation(stationName); // "東京都"
const lines = JSON.parse(getLinesByStation(stationName)); // ["東海道線", "中央線", ...]
```

### 路線（Line）

WASM APIでは路線名（文字列）で操作します。

```typescript
const lineName = "東海道線";
const stations = JSON.parse(getStationsByLine(lineName));
```

### JRグループ

```typescript
// WASM API
const companies = JSON.parse(getCompanys());
// → ["JR北海道", "JR東日本", "JR東海", "JR西日本", "JR四国", "JR九州"]

const lines = JSON.parse(getLinesByCompany("JR東日本"));
```

### 運賃情報（FareInfo）

WASMモジュールの`getFareInfoObjectJson()`から返されるJSONオブジェクトの仕様です。`azusa.cpp`の解析に基づき、以下のインターフェースとして定義されます。

```typescript
interface FareInfo {
  // --- 計算結果ステータス ---
  fareResultCode: 0 | 1 | -2; // 0: 成功, 1: KOKURA-pending, -2: 失敗/空

  // --- 経路のキロ程 ---
  totalSalesKm: number;          // 営業キロ合計
  jrSalesKm: number;             // JR営業キロ
  jrCalcKm: number;              // JR計算キロ
  companySalesKm: number;        // 会社線営業キロ
  brtSalesKm: number;            // BRT営業キロ
  salesKmForHokkaido: number;    // 北海道内の営業キロ
  calcKmForHokkaido: number;     // 北海道内の計算キロ
  salesKmForShikoku: number;     // 四国内の営業キロ
  calcKmForShikoku: number;      // 四国内の計算キロ
  salesKmForKyusyu: number;      // 九州内の営業キロ
  calcKmForKyusyu: number;       // 九州内の計算キロ

  // --- 基本運賃 ---
  fare: number;                  // 表示運賃（各種割引適用後）
  fareForCompanyline: number;    // 会社線運賃
  fareForBRT: number;            // BRT運賃
  fareForIC: number;             // ICカード運賃

  // --- 有効日数 ---
  ticketAvailDays: number;       // 有効日数

  // --- 割引・割増運賃 ---
  childFare: number;             // 小児運賃
  roundtripChildFare: number;    // 小児往復運賃

  academicFare: number;          // 学割運賃
  isAcademicFare: boolean;       // 学割が適用可能か
  roundtripAcademicFare: number; // 学割往復運賃

  roundTripFareWithCompanyLine: number; // 会社線運賃を含む往復運賃
  isRoundtripDiscount: boolean;  // 往復割引が適用されているか

  stockDiscounts: {              // 株主優待割引の配列
    rule114StockFare?: number;
    stockDiscountFare: number;
    stockDiscountTitle: string;
  }[];

  // --- 規程114条関連 ---
  isRule114Applied: boolean;     // 規程114条が適用されたか
  rule114SalesKm: number;        // 規程114条適用時の営業キロ
  rule114CalcKm: number;         // 規程114条適用時の計算キロ
  rule114ApplyTerminal: string;  // 規程114条適用時の計算駅
  farePriorRule114: number;      // 規程114条適用前の運賃
  roundTripFareWithCompanyLinePriorRule114?: number; // 規程114条適用前の会社線運賃を含む往復運賃

  // --- 各種フラグ ---
  isMeihanCityStartTerminalEnable: boolean; // 名阪地区都区市内発着選択（大高-杉本町)
  isMeihanCityStart: boolean;    // 発駅を都区市内に
  isMeihanCityTerminal: boolean; // 着駅を都区市内に
  isRuleAppliedEnable: boolean;  // 特例有効か？
  isRuleApplied: boolean;        // 特例適用
  isJRCentralStockEnable: boolean; // JR東海株主優待が利用可能か
  isJRCentralStock: boolean;     // JR東海株主優待が適用されたか
  isEnableLongRoute: boolean;    // 大都市近郊区間 遠回り 有効か
  isLongRoute: boolean;          // 大都市近郊区間 遠回り
  isRule115specificTerm: boolean; // 規程115条関連
  isEnableRule115: boolean;      // 規程115条関連
  isResultCompanyBeginEnd: boolean; // 会社線発着か
  isResultCompanyMultipassed: boolean; // 複数の会社線を跨いでいるか
  isEnableTokaiStockSelect: boolean; //JR東海株主優待適用可否
  isBeginInCity: boolean;        // 発駅が都区市内か
  isEndInCity: boolean;          // 着駅が都区市内か
  isSpecificFare: boolean;       // 特定特別運賃
  isRoundtrip: boolean;          // 往復か
  isBRTdiscount: boolean;        // BRT割引が適用されているか
  isFareOptEnabled: boolean;     // オプションメニューが有効か

  // --- 駅ID ---
  beginStation: string;        // 発駅(86/87適用後)
  endStation: string;          // 着駅(86/87適用後)

  // --- 経路文字列 ---
  routeList: string;             // 経路文字列
  routeListForTOICA: string;     // TOICA用計算経路文字列

  // --- 表示メッセージ ---
  messages: string[];            // 運賃計算に関する注記メッセージの配列
}
```

### 運賃タイプ（FareType）

**<きっぷホルダー>** の運賃ピッカーで使用する運賃種別です。

**[運賃種別]** 以下はコード上でのキーとUI上の表示ラベルの対応です。

```typescript
// enumのキーは英語、値はUI表示用の日本語ラベルとする想定
enum FareType {
  NORMAL = "普通運賃",
  CHILD = "小児運賃",
  ROUND_TRIP = "往復",
  STOCK_DISCOUNT = "株割",
  STOCK_DISCOUNT_X2 = "株割x2",
  STUDENT = "学割",
  STUDENT_ROUND_TRIP = "学割往復",
  DISABLED = "無効"
}
```

このenumはフロントエンドの状態管理でのみ使用し、WASMに直接渡すものではありません。WASMの運賃種別計算は、`Farert`オブジェクトの各種`set...`メソッド（例: `setAcademicFare(true)`）を通じて行います。

### きっぷホルダアイテム（TicketHolderItem）

```typescript
interface TicketHolderItem {
  order: number;        // 並べ替え順（一意、表示順序）
  routeScript: string;  // 経路（routeScript() の文字列形式）
  fareType: FareType;   // 運賃タイプ
}

// 使用例
const item: TicketHolderItem = {
  order: 1,
  routeScript: mainRoute.routeScript(), // "東京,東海道線,熱海"
  fareType: FareType.NORMAL,
};

// 復元
const route = new Farert();
// buildRoute()はカンマ区切り、スペース区切りの両方を受け付けます。
route.buildRoute(item.routeScript);
const fareInfo = JSON.parse(route.getFareInfoObjectJson());
```

## 永続化データ構造

### localStorage スキーマ

```typescript
interface AppStorage {
  // 現在の経路（文字列形式）
  currentRoute: string | null;  // routeScript() の文字列

  // 保持経路リスト（文字列配列）
  savedRoutes: string[];  // routeScript() の文字列配列

  // きっぷホルダリスト
  ticketHolder: TicketHolderItem[];

  // 駅選択履歴（最近使った駅名）
  stationHistory: string[];  // 最大100件程度
}

// 例
{
  "currentRoute": "東京,東海道線,熱海,身延線,甲府",
  "savedRoutes": [
    "東京,東海道線,新大阪",
    "札幌,函館本線,小樽"
  ],
  "ticketHolder": [
    {
      "order": 1,
      "routeScript": "東京,東海道線,熱海",
      "fareType": "NORMAL"
    }
  ],
  "stationHistory": ["東京", "熱海", "甲府"]
}
```

### 保存形式

```typescript
// localStorage keys
const STORAGE_KEYS = {
  CURRENT_ROUTE: 'farert_current_route',
  SAVED_ROUTES: 'farert_saved_routes',
  TICKET_HOLDER: 'farert_ticket_holder',
  STATION_HISTORY: 'farert_station_history'
} as const;
```

## WASM API インターフェース

../farert-wasm/docs/API.md を参照

## 経路の文字列表現（routeScript形式）

### フォーマット

WASM の `routeScript()` が返す形式：**カンマ区切り**

```
発駅名,路線名,着駅名,路線名,着駅名,...
```

### 例

```
東京,東海道線,熱海,身延線,甲府
```

### 構造

発駅,路線,着駅,路線,着駅,...
と、カンマで区切られた文字列です。

- 奇数個のフィールド
- 最初の1つが発駅
- 以降は「路線,着駅」のペアの繰り返し

### 変換

```typescript
// オブジェクト → 文字列
const routeStr = route.routeScript();

// 文字列 → オブジェクト
const route = new Farert();
route.buildRoute(routeStr);
```
