# 画面遷移フロー＆IO定義

## 画面一覧とルーティング

```
/ (メイン画面)
/station-select (発駅選択)
/line-select (路線選択)
/station-list (駅一覧)
/route-add (経路追加 - 路線選択)
/route-station-select (経路追加 - 駅選択)
/detail (詳細画面)
/save (保存画面)
/version (バージョン情報)
```

## 画面遷移図

```
メイン画面 (/)
  ├─> 発駅選択 (/station-select?type=start)
  │     └─> 路線選択 (/line-select?group=xxx)
  │           └─> 駅一覧 (/station-list?line=xxx)
  │                 └─> メイン画面に戻る
  │
  ├─> 経路追加 (/route-add?from=xxx)
  │     ├─> 最短経路: 発駅選択 (/station-select?type=destination)
  │     │     └─> メイン画面に戻る
  │     │
  │     └─> 路線選択 (/route-add?from=xxx&line=xxx)
  │           └─> 駅選択 (/route-station-select?line=xxx&mode=branch)
  │                 └─> メイン画面に戻る
  │
  ├─> 詳細画面 (/detail?index=xxx)
  │
  ├─> 保存画面 (/save)
  │     └─> メイン画面に戻る
  │
  ├─> ドロワー
  │     └─> 経路選択 → メイン画面を更新
  │
  └─> バージョン情報 (/version)
        └─> メイン画面に戻る
```

---

## 各画面のIO定義

### 1. メイン画面 (/)

#### Input
- **グローバル状態**: `currentRoute: Route | null`
- **URLパラメータ**: なし

#### Output
- **状態更新**: `currentRoute`の更新
- **画面遷移**:
  - `/station-select?type=start` - 発駅選択
  - `/route-add?from={stationId}` - 経路追加
  - `/detail?index={n}` - 詳細画面
  - `/save` - 保存画面
  - `/version` - バージョン情報

#### 状態管理
- `currentRoute`の変更を監視
- 変更時にlocalStorageに保存
- 変更時にWASMで運賃計算(`calculateFare`)

#### WASM呼び出し
- `calculateFare(route)` - 経路変更時

---

### 2. 発駅選択画面 (/station-select)

#### Input
- **URLパラメータ**:
  - `type: 'start' | 'destination'` - 発駅選択か着駅選択(最短経路)か
- **グローバル状態**:
  - `stationHistory: Station[]` - 履歴タブ用

#### Output
- **戻り値**: `Station` - 選択された駅
- **状態更新**:
  - `currentRoute`の更新（発駅選択時は既存経路をクリア）
  - `stationHistory`に追加
- **画面遷移**:
  - `/` - メイン画面へ戻る
  - `/line-select?group={group}` - グループ選択時
  - `/line-select?prefecture={prefecture}` - 都道府県選択時

#### 状態管理
- 選択した駅を`stationHistory`の先頭に追加
- 最大100件まで保持

#### WASM呼び出し
- `getJRGroups()` - グループタブ表示時
- `getPrefectures()` - 都道府県タブ表示時
- `searchStations(query)` - 検索バー入力時

---

### 3. 路線選択画面 (/line-select)

#### Input
- **URLパラメータ**:
  - `group: JRGroup` - JRグループ（グループから選択時）
  - `prefecture: string` - 都道府県（都道府県から選択時）

#### Output
- **戻り値**: `Line` - 選択された路線
- **画面遷移**:
  - `/station-list?line={lineId}` - 駅一覧へ

#### WASM呼び出し
- `getLinesByGroup(group)` - グループ指定時
- `getLinesByPrefecture(prefecture)` - 都道府県指定時

---

### 4. 駅一覧画面 (/station-list)

#### Input
- **URLパラメータ**:
  - `line: number` - 路線ID
  - `context: 'start' | 'destination'` - 発駅選択か着駅選択か

#### Output
- **戻り値**: `Station` - 選択された駅
- **状態更新**:
  - `currentRoute`の発駅を設定（`context=start`時）
  - `stationHistory`に追加
- **画面遷移**: `/` - メイン画面へ戻る

#### WASM呼び出し
- `getStationsByLine(lineId)` - 駅一覧取得

---

### 5. 経路追加画面 (/route-add)

#### Input
- **URLパラメータ**:
  - `from: number` - 前の経路の着駅ID
- **グローバル状態**:
  - `currentRoute: Route`

#### Output
- **戻り値**: `RouteSegment` - 追加する経路セグメント
- **状態更新**:
  - `currentRoute.segments`に追加
- **画面遷移**:
  - `/station-select?type=destination` - 最短経路選択時
  - `/route-station-select?line={lineId}&from={stationId}` - 路線選択時

#### WASM呼び出し
- `getStationById(stationId)` - 駅情報取得（駅の所属路線リスト表示用）

---

### 6. 駅選択画面（経路追加用） (/route-station-select)

#### Input
- **URLパラメータ**:
  - `line: number` - 路線ID
  - `from: number` - 前の経路の着駅ID（発駅として反転表示）
  - `mode: 'branch' | 'destination'` - 分岐駅選択か着駅選択か

#### Output
- **戻り値**: `{ station: Station, line: Line }` - 選択された駅と路線
- **状態更新**:
  - `currentRoute.segments`に追加
- **画面遷移**: `/` - メイン画面へ戻る

#### WASM呼び出し
- `getStationsByLine(lineId)` - 駅一覧取得

---

### 7. 詳細画面 (/detail)

#### Input
- **URLパラメータ**:
  - `index?: number` - 経路のインデックス（未指定時は全経路）
- **グローバル状態**:
  - `currentRoute: Route`

#### Output
- **状態更新**:
  - `currentRoute.options`の更新（オプション変更時）
- **画面遷移**: なし（モーダルまたはバック）

#### 状態管理
- オプション変更時に再計算

#### WASM呼び出し
- `calculateFare(route)` - オプション変更時

---

### 8. 保存画面 (/save)

#### Input
- **グローバル状態**:
  - `currentRoute: Route`
  - `savedRoutes: Route[]`
  - `ticketHolder: TicketHolderItem[]`

#### Output
- **状態更新**:
  - `savedRoutes`に追加（保存ボタン）
  - `currentRoute`を変更（経路選択時）
  - `savedRoutes`から削除（削除時）
- **画面遷移**: `/` - 経路選択時

#### 状態管理
- インポート/エクスポート時にJSON/テキスト変換

#### データ形式
```typescript
// エクスポート形式
interface ExportData {
  version: string;  // "1.0"
  routes: Route[];
}
```

---

### 9. バージョン情報画面 (/version)

#### Input
- なし

#### Output
- なし

#### WASM呼び出し
- `databaseVersion()` - 表示時

---

### 10. ドロワーナビゲーション（コンポーネント）

#### Input
- **グローバル状態**:
  - `ticketHolder: TicketHolderItem[]`

#### Output
- **状態更新**:
  - `ticketHolder`の順序変更（ドラッグ時）
  - `ticketHolder`の運賃タイプ変更（ピッカー選択時）
  - `ticketHolder`から削除（編集モード）
  - `currentRoute`を変更（経路選択時）
- **画面遷移**: なし（ドロワーを閉じる）

#### 状態管理
- 運賃タイプ変更時に総運賃を再計算
- 編集モード状態は内部状態（永続化不要）

---

## グローバル状態管理（Svelte Stores）

```typescript
// src/lib/stores/app.ts
import { writable } from 'svelte/store';

// 現在の経路
export const currentRoute = writable<Route | null>(null);

// 保持経路リスト
export const savedRoutes = writable<Route[]>([]);

// きっぷホルダリスト
export const ticketHolder = writable<TicketHolderItem[]>([]);

// 駅選択履歴
export const stationHistory = writable<Station[]>([]);

// localStorage同期
currentRoute.subscribe(value => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.CURRENT_ROUTE, JSON.stringify(value));
  }
});

savedRoutes.subscribe(value => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.SAVED_ROUTES, JSON.stringify(value));
  }
});

ticketHolder.subscribe(value => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.TICKET_HOLDER, JSON.stringify(value));
  }
});

stationHistory.subscribe(value => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.STATION_HISTORY, JSON.stringify(value));
  }
});
```

---

## 画面間データフローの例

### 例1: 新規経路作成フロー

```
1. メイン画面: ユーザーが「発駅を指定してください」をタップ
   ↓
2. 発駅選択画面: type=start で起動
   ↓
3. ユーザーがグループタブから「JR東日本」を選択
   ↓ WASM: getLinesByGroup('JR東日本')
4. 路線選択画面: group=JR東日本 で起動、路線リスト表示
   ↓
5. ユーザーが「東海道線」を選択
   ↓ WASM: getStationsByLine(東海道線ID)
6. 駅一覧画面: line=東海道線ID で起動、駅リスト表示
   ↓
7. ユーザーが「東京」を選択
   ↓ 状態更新: currentRoute = { startStation: 東京, segments: [] }
   ↓ localStorage保存
8. メイン画面に戻る: 1行目に「東京」、2行目に「追加」
```

### 例2: 経路追加フロー

```
1. メイン画面: ユーザーが「追加」行をタップ
   ↓
2. 経路追加画面: from=東京ID で起動
   ↓ WASM: getStationById(東京ID) で東京駅の所属路線を取得
   ↓ 路線リスト表示: 東海道線、中央線、...
3. ユーザーが「東海道線」を選択
   ↓ WASM: getStationsByLine(東海道線ID)
4. 駅選択画面: line=東海道線ID, from=東京ID, mode=branch で起動
   ↓ 東京駅を反転表示（選択不可）
5. ユーザーが「熱海」を選択
   ↓ 状態更新: currentRoute.segments.push({ line: 東海道線, arrivalStation: 熱海 })
   ↓ WASM: calculateFare(currentRoute)
   ↓ localStorage保存
6. メイン画面に戻る: 東京→熱海の経路と運賃が表示
```

### 例3: きっぷホルダから経路選択フロー

```
1. メイン画面: ユーザーがハンバーガーメニューをタップ
   ↓
2. ドロワーが開く: ticketHolder配列をカード表示
   ↓
3. ユーザーがカードをタップ
   ↓ 状態更新: currentRoute = 選択されたticketHolderItem.route
   ↓ WASM: calculateFare(currentRoute)
   ↓ localStorage保存
4. ドロワーを閉じる
   ↓
5. メイン画面: 選択した経路が表示される
```

---

## エラーハンドリング

### 不完全な経路の場合

```typescript
if (fareInfo.result === 1) {
  // メイン画面: 運賃行を非表示
  // 詳細画面: 「経路が不完全です」メッセージ
}
```

### 会社線のみの場合

```typescript
if (fareInfo.result === 2) {
  // 詳細画面: 「会社線のみ運賃は表示できません」メッセージ
}
```

### WASM呼び出しエラー

```typescript
try {
  const fareInfo = await wasm.calculateFare(route);
} catch (error) {
  console.error('運賃計算エラー:', error);
  // エラートーストまたはダイアログ表示
}
```
