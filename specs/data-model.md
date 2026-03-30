# データモデル

## 目的
- PWA 実装で扱う主要データを整理する。
- SwiftUI 版で Entity / Repository / ViewState へ分けて再構成しやすいように、永続化表現と画面表示表現を区別して記述する。

## コアエンティティ

### `Farert`
- WASM ラッパー `src/lib/wasm/index.ts` の `Farert` を使う。
- 画面間で受け回す「編集中経路」の中心オブジェクト。
- 主な API:
  - `addStartRoute(station)`
  - `addRoute(line, station)`
  - `autoRoute(useBulletTrain, destination)`
  - `removeTail()`
  - `removeAll()`
  - `reverse()`
  - `buildRoute(routeScript)`
  - `routeScript()`
  - `getFareInfoObjectJson()`
  - `getRoutesJson()`

#### 設計上の位置づけ
- PWA では `mainRoute` が `Farert` インスタンスを直接保持する。
- SwiftUI 版では `Farert` をそのまま State に持つか、`RouteSession` の内部へ閉じ込めるかを選べる。

### `routeScript`
- 経路の永続化・共有用の正本文字列表現。
- 形式:
  - `発駅,路線,着駅,路線,着駅,...`
- 特徴:
  - 奇数個のトークン列
  - 先頭 1 要素が発駅
  - 以降は `路線,着駅` のペア

#### 利用箇所
- `mainRoute` の永続化
- `savedRoutes`
- `ticketHolder`
- URL 共有
- インポート / エクスポート

## 補助エンティティ

### `FareType`
- きっぷホルダで表示用運賃種別を切り替えるための UI 側 enum。
- 値:
  - `NORMAL`
  - `CHILD`
  - `ROUND_TRIP`
  - `STOCK_DISCOUNT`
  - `STOCK_DISCOUNT_X2`
  - `STUDENT`
  - `STUDENT_ROUND_TRIP`
  - `DISABLED`

#### 注意
- WASM へ直接渡す enum ではない。
- View 表示上の「どの運賃をカードで見せるか」を指す。

### `TicketHolderItem`
```ts
interface TicketHolderItem {
  order: number;
  routeScript: string;
  fareType: FareType;
}
```

#### 意味
- `order`: 表示順
- `routeScript`: 経路の永続表現
- `fareType`: カードで採用する運賃種別

### `SavedRoute`
- `string`
- 実体は `routeScript`

### `StationHistory`
- `string[]`
- 実体は最近選択した駅名一覧

## 画面表示系モデル

### `FareInfo`
- 実型は `src/lib/types/index.ts` を正本とする。
- `getFareInfoObjectJson()` の JSON を復元して得る。

#### 主なカテゴリ
- 計算結果コード
  - `fareResultCode`
- キロ
  - `totalSalesKm`
  - `jrSalesKm`
  - `jrCalcKm`
  - `companySalesKm`
  - `brtSalesKm`
  - 地域別営業キロ / 計算キロ
- 運賃
  - `fare`
  - `fareForIC`
  - `fareForCompanyline`
  - `fareForBRT`
  - `childFare`
  - `academicFare`
  - `roundTripFareWithCompanyLine`
- 有効日数
  - `ticketAvailDays`
- 文字列表現
  - `routeList`
  - `routeListForTOICA`
- 注記
  - `messages`
- オプション可否 / 状態
  - `isFareOptEnabled`
  - `isRuleAppliedEnable`
  - `isMeihanCityStartTerminalEnable`
  - `isEnableLongRoute`
  - `isEnableRule115`
  - `isJRCentralStockEnable`

#### 正規化ルール
- km 系フィールドは WASM が 10 倍整数で返す場合があり、画面側で `/10` 正規化する。
- JSON の構造や数値形式に揺れがあるため、PWA 側で防御的に復元する。

### `RouteSegment`
- `getRoutesJson()` の結果から得る画面表示用区間。
- 最低限:
  - `line`
  - `station`

### `StationMetaInfo`
- 駅選択画面の表示用情報。
- 最低限:
  - `name`
  - `kana`
  - `lines`

## 状態コンテナ

### PWA の store
- `mainRoute: Writable<FaretClass | null>`
- `savedRoutes: Writable<string[]>`
- `ticketHolder: Writable<TicketHolderItem[]>`
- `stationHistory: Writable<string[]>`
- `mainScreenErrorMessage: Writable<string>`

### 役割分担
- `mainRoute`
  - 現在編集中のセッション状態
- `savedRoutes`
  - 永続化された経路一覧
- `ticketHolder`
  - 一時的に切り替えて見たい経路のコレクション
- `stationHistory`
  - 入力補助用の履歴
- `mainScreenErrorMessage`
  - 画面をまたぐ一時通知

## 永続化モデル

### localStorage キー
```ts
const STORAGE_KEYS = {
  CURRENT_ROUTE: 'farert_current_route',
  SAVED_ROUTES: 'farert_saved_routes',
  TICKET_HOLDER: 'farert_ticket_holder',
  STATION_HISTORY: 'farert_station_history'
} as const;
```

### 永続化方針
- `mainRoute` の実体をそのまま保存せず、`routeScript` として保存する。
- `savedRoutes` は `routeScript[]` として保存する。
- `ticketHolder` は `TicketHolderItem[]` として保存する。
- `stationHistory` は `string[]` として保存する。

### 重複判定
- 保存済み経路、きっぷホルダ、URL 共有はいずれも `routeScript` ベースで比較する。
- 文字列正規化後の完全一致を同一経路とみなす。

## SwiftUI 版への分解指針

### Entity
- `RouteScript`
- `TicketHolderItem`
- `StationHistoryEntry`

### Session / Domain Object
- `Farert` または `RouteSession`

### Repository
- `CurrentRouteRepository`
- `SavedRouteRepository`
- `TicketHolderRepository`
- `StationHistoryRepository`

### ViewState
- `FareInfoViewData`
- `RouteSegmentViewData`
- `StationCandidateViewData`

## 補足
- PWA は `Farert` を直接 UI の近くで扱うが、SwiftUI 版では View に直接露出させず ViewModel 内に閉じ込めてもよい。
- ただし、保存・共有・比較の正本が `routeScript` である点は維持したほうが移植コストが低い。
