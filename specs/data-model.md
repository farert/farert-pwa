# データモデル定義

## コアデータ型

### 駅（Station）

```typescript
interface Station {
  name: string;         // 駅名（例: "東京"）
  kana: string;         // ひらがな（例: "とうきょう"）
  prefecture: string;   // 都道府県（例: "東京都"）
}
```

### 路線（Line）

```typescript
interface Line {
  name: string;         // 路線名（例: "東海道線"）
  group: JRGroup;       // JRグループ
}

enum JRGroup {
  HOKKAIDO = "JR北海道",
  EAST = "JR東日本",
  CENTRAL = "JR東海",
  WEST = "JR西日本",
  SHIKOKU = "JR四国",
  KYUSHU = "JR九州"
}
```

### 経路セグメント（RouteSegment）

```typescript
interface RouteSegment {
  line: Line;              // 路線
  arrivalStation: Station; // 着駅（このセグメントの終点）
}
```

### 経路（Route）

```typescript
interface Route {
  startStation: Station;      // 発駅
  segments: RouteSegment[];   // 経路セグメントの配列

  // 計算結果（キャッシュ）
  fareInfo?: FareInfo;

  // オプション設定
  options?: RouteOptions;
}

interface RouteOptions {
  // 大阪環状線オプション（該当経路のみ）
  osakakanDetour?: boolean;  // true: 遠回り, false: 近回り

  // 小倉-博多間オプション（該当経路のみ）
  kokuraHakataSepalateLine?: boolean; // true: 別線扱い, false: 同一線
}
```

### 運賃情報（FareInfo）

WASMモジュールから返されるデータ構造：

```typescript
interface FareInfo {
  result: number;  // 0: 正常, 1: 不完全, 2: 会社線のみ, その他: エラー

  // 区間
  beginStationId: number;
  endStationId: number;

  // キロ程
  totalSalesKm: number;      // 営業キロ合計
  jrSalesKm: number;         // JR線営業キロ
  jrCalcKm: number;          // JR線計算キロ
  companySalesKm: number;    // 会社線営業キロ
  brtSalesKm: number;        // BRT線営業キロ

  // JR各社別キロ程
  salesKmForHokkaido: number;
  calcKmForHokkaido: number;
  salesKmForKyusyu: number;
  calcKmForKyusyu: number;
  salesKmForShikoku: number;
  calcKmForShikoku: number;

  // 規程114条
  isRule114Applied: boolean;
  rule114_salesKm: number;
  rule114_calcKm: number;

  // 運賃
  fare: number;                        // 普通運賃
  fareForIC: number;                   // IC運賃
  fareForCompanyline: number;          // 会社線運賃
  fareForBRT: number;                  // BRT運賃

  // 往復運賃
  isRoundtrip: boolean;                // 往復割引適用可能か（片道601km以上）
  isRoundtripDiscount: boolean;        // 往復割引が適用されるか
  roundTripFareWithCompanyLine: number;
  roundTripFareWithCompanyLinePriorRule114: number;

  // 規程114条適用前運賃
  farePriorRule114: number;

  // 株主優待運賃
  availCountForFareOfStockDiscount: number; // 利用可能な株主優待数
  // fareForStockDiscount(index): メソッドでアクセス

  // 小児運賃
  childFare: number;
  roundtripChildFare: number;

  // 学割運賃（片道101km以上で有効）
  isAcademicFare: boolean;
  academicFare: number;
  roundtripAcademicFare: number;

  // 有効日数
  ticketAvailDays: number;

  // 都区市内発着
  isBeginInCity: boolean;  // 発駅が都区市内駅か
  isEndInCity: boolean;    // 着駅が都区市内駅か

  // 経路リスト
  routeList: string;           // 経路表示文字列
  routeListForTOICA: string;   // IC運賃計算経路（異なる場合のみ）

  // 備考メッセージ
  resultMessage: string;  // 改行区切りのメッセージ

  // オプション有効フラグ
  isFareOptEnabled: boolean;              // オプションメニュー有効か
  isRuleAppliedEnable: boolean;           // 特例適用オプション有効か
  isRuleApplied: boolean;                 // 特例適用中か
  isMeihanCityStartTerminalEnable: boolean; // 名阪都区市内発着オプション有効か
  isMeihanCityTerminal: boolean;          // 都区市内発着か
  isEnableLongRoute: boolean;             // 長距離経路オプション有効か
  isLongRoute: boolean;                   // 指定経路で計算中か
  isEnableRule115: boolean;               // 規程115条オプション有効か
  isRule115specificTerm: boolean;         // 規程115条特定都区市内発着か
}
```

### 運賃タイプ（FareType）

**<きっぷホルダー>** の運賃ピッカー用：

```typescript
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

### きっぷホルダアイテム（TicketHolderItem）

```typescript
interface TicketHolderItem {
  id: string;           // 一意のID（UUID）
  route: Route;         // 経路
  fareType: FareType;   // 運賃タイプ
  order: number;        // 表示順序
}
```

## 永続化データ構造

### localStorage スキーマ

```typescript
interface AppStorage {
  // 現在の経路
  currentRoute: Route | null;

  // 保持経路リスト
  savedRoutes: Route[];

  // きっぷホルダリスト
  ticketHolder: TicketHolderItem[];

  // 駅選択履歴（最近使った駅）
  stationHistory: Station[];  // 最大100件程度
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

## WASM API インターフェース（スタブ）

初期実装ではスタブを使用し、後でWASM実装に置き換え：

```typescript
interface WasmAPI {
  // データベース情報
  databaseVersion(): DbSys;

  // グループ・都道府県リスト
  getJRGroups(): JRGroup[];
  getPrefectures(): string[];  // 46都道府県（沖縄除く）

  // 路線リスト
  getLinesByGroup(group: JRGroup): Line[];
  getLinesByPrefecture(prefecture: string): Line[];

  // 駅リスト
  getStationsByLine(lineId: number): Station[];

  // 駅検索
  searchStations(query: string): Station[];

  // 経路計算
  calculateFare(route: Route): FareInfo;

  // 最短経路自動計算
  autoRoute(fromStationId: number, toStationId: number): Route | null;
}

interface DbSys {
  name: string;        // データベース名称
  create_date: string; // 作成日
  tax: number;         // 消費税率
}
```

## 経路の文字列表現

保存・共有用の文字列フォーマット：
スペース区切り

```
発駅名 路線名 着駅名 路線名 着駅名,...
例: 東京 東海道線 熱海 東海道線 静岡 身延線 甲府
```
