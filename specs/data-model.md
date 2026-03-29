# データモデル

## コア

### `Farert`
- WASM ラッパー `src/lib/wasm/index.ts` の `Farert` を使う。
- 経路編集の基底 API:
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

### `routeScript`
- 文字列表現は `発駅,路線,着駅,路線,着駅,...`
- 保存、共有、URL 圧縮の元データとして使う。

## TypeScript 型

### `FareType`
- `NORMAL`
- `CHILD`
- `ROUND_TRIP`
- `STOCK_DISCOUNT`
- `STOCK_DISCOUNT_X2`
- `STUDENT`
- `STUDENT_ROUND_TRIP`
- `DISABLED`

### `TicketHolderItem`
```ts
interface TicketHolderItem {
  order: number;
  routeScript: string;
  fareType: FareType;
}
```

### `SavedRoute`
- `string`

### `StationHistory`
- `string[]`

### `FareInfo`
- 実型は `src/lib/types/index.ts` を正本とする。
- 主な利用項目:
  - `fareResultCode`
  - 各種営業キロ・計算キロ
  - `fare`, `fareForIC`, `childFare`, `academicFare`
  - `ticketAvailDays`
  - `stockDiscounts`
  - `routeList`, `routeListForTOICA`
  - `messages`
  - 各種オプション可否フラグ

## ストア
- `mainRoute: Writable<FaretClass | null>`
- `savedRoutes: Writable<string[]>`
- `ticketHolder: Writable<TicketHolderItem[]>`
- `stationHistory: Writable<string[]>`
- `mainScreenErrorMessage: Writable<string>`

## 永続化キー
```ts
const STORAGE_KEYS = {
  CURRENT_ROUTE: 'farert_current_route',
  SAVED_ROUTES: 'farert_saved_routes',
  TICKET_HOLDER: 'farert_ticket_holder',
  STATION_HISTORY: 'farert_station_history'
} as const;
```

## 補足
- `mainRoute` の実体は `localStorage` に直接保存せず、`routeScript` に変換して保存する。
- きっぷホルダと保存済み経路は `routeScript` ベースで比較・重複排除する。
