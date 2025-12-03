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

WASMモジュールから返されるデータ構造：

- FareInfo オブジェクト
- FareInfo は、WASMの getFareInfoObjectJson() で得る。

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
