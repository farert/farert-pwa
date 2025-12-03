# 画面遷移

## 各画面のIO定義

### 1. メイン画面 (/)

#### Input
- **グローバル状態**: `currentRoute: Route | null`
- **URLパラメータ**: なし

#### Output
- **状態更新**: `currentRoute`の更新
- **画面遷移**:
  - `/station-select?type=start` - 発駅選択
  - `/route-add?from={station}` - 経路追加
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
  - `/station-list?line={line}` - 駅選択へ

#### WASM呼び出し
- `getLinesByGroup(group)` - グループ指定時
- `getLinesByPrefecture(prefecture)` - 都道府県指定時

---

### 4. 駅選択画面 (/station-list)

#### Input
- **URLパラメータ**:
  - `line: string` - 路線
  - `context: 'start' | 'destination'` - 発駅選択か着駅選択か

#### Output
- **戻り値**: `Station` - 選択された駅
- **状態更新**:
  - `currentRoute`の発駅を設定（`context=start`時）
  - `stationHistory`に追加
- **画面遷移**: `/` - メイン画面へ戻る

#### WASM呼び出し
- `getStationsByLine(line)` - 駅一覧取得

---

### 5. 経路追加画面 (/route-add)

#### Input
- **URLパラメータ**:
  - `from: string` - 前の経路の着駅
- **グローバル状態**:
  - `currentRoute: Route`

#### Output
- **戻り値**: `RouteSegment` - 追加する経路セグメント
- **状態更新**:
  - `currentRoute.segments`に追加
- **画面遷移**:
  - `/station-select?type=destination` - 最短経路選択時
  - `/route-station-select?line={line}&from={station}` - 路線選択時

#### WASM呼び出し
- `getLinesByStation(station)` - 駅情報取得（駅の所属路線リスト表示用）

---

### 6. 駅選択画面（経路追加用） (/route-station-select)

#### Input
- **URLパラメータ**:
  - `line: string` - 路線
  - `from: string` - 前の経路の着駅（発駅として反転表示）
  - `mode: 'branch' | 'destination'` - 分岐駅選択か着駅選択か

#### Output
- **戻り値**: `{ station: Station, line: Line }` - 選択された駅と路線
- **状態更新**:
  - `currentRoute.segments`に追加
- **画面遷移**: `/` - メイン画面へ戻る

#### WASM呼び出し
- `getStationsByLine(line)` - 駅一覧取得

---

### 7. 詳細画面 (/detail)

#### Input
- **URLパラメータ**:
  - `r: string` - 圧縮された経路データ（LZ-string形式）
- **復元**:
  - URLパラメータから経路を解凍・復元

#### Output
- **画面遷移**: なし（バックボタンでメイン画面へ）
- **共有**: Web Share APIまたはクリップボードにURL共有

#### WASM呼び出し
- `decompressRouteFromUrl(compressed)` - 画面表示時
- `getFareInfoObjectJson()` - 運賃情報取得

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
```
// エクスポート形式 (複数行のテキスト)
// 各行が1つの経路スクリプト（カンマ区切り）を表します。
// 例:
// 東京,東海道線,熱海,身延線,甲府
// 札幌,函館本線,小樽
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

### 10. **<きっぷホルダー>**

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
import { Farert } from 'farert-wasm';

// 現在の経路（WASM Farert オブジェクト）
export const mainRoute = writable<Farert>(new Farert());

// 保持経路リスト（routeScript 文字列配列）
export const savedRoutes = writable<string[]>([]);

// きっぷホルダリスト
export const ticketHolder = writable<TicketHolderItem[]>([]);

// 駅選択履歴（駅名文字列配列）
export const stationHistory = writable<string[]>([]);

// localStorage同期
mainRoute.subscribe(value => {
  if (typeof window !== 'undefined' && value) {
    const routeStr = value.routeScript();
    localStorage.setItem(STORAGE_KEYS.CURRENT_ROUTE, routeStr);
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

// 初期化（localStorage から復元）
export function initStores() {
  if (typeof window !== 'undefined') {
    // 現在の経路を復元
    const currentRouteStr = localStorage.getItem(STORAGE_KEYS.CURRENT_ROUTE);
    if (currentRouteStr) {
      const route = new Farert();
      if (route.buildRoute(currentRouteStr) === 0) {
        mainRoute.set(route);
      }
    }

    // 保持経路を復元
    const savedRoutesStr = localStorage.getItem(STORAGE_KEYS.SAVED_ROUTES);
    if (savedRoutesStr) {
      savedRoutes.set(JSON.parse(savedRoutesStr));
    }

    // きっぷホルダを復元
    const ticketHolderStr = localStorage.getItem(STORAGE_KEYS.TICKET_HOLDER);
    if (ticketHolderStr) {
      ticketHolder.set(JSON.parse(ticketHolderStr));
    }

    // 駅履歴を復元
    const historyStr = localStorage.getItem(STORAGE_KEYS.STATION_HISTORY);
    if (historyStr) {
      stationHistory.set(JSON.parse(historyStr));
    }
  }
}
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
   ↓ WASM: getStationsByPrefectureAndLine("東京"、"東海道線")
6. 駅選択画面: line=東海道線 prefecture=東京 で起動、駅リスト表示
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
2. 経路追加画面: from=東京 で起動
   ↓ WASM: getLinesByStation(東京) で東京駅の所属路線を取得
   ↓ 路線リスト表示: 東海道線、中央線、...
3. ユーザーが「東海道線」を選択
   ↓ WASM: getBranchStationsByLine(東海道線, 東京)
4. 分岐駅選択画面: line=東海道線, from=東京, mode=branch で起動
   ↓ 東京駅を反転表示（選択不可）
4-2. ユーザーが「着駅指定」を選択: 駅選択画面: line=東海道線, from=東京, mode=station で起動
   ↓ WASM: getStationsByLine(東海道線)
5. ユーザーが「熱海」を選択
   ↓ 状態更新: currentRoute.segments.push({ line: 東海道線, arrivalStation: 熱海 })
   ↓ WASM: calculateFare(currentRoute)
   ↓ localStorage保存
6. メイン画面に戻る: 東京→熱海の経路と運賃が表示
```

### 例3: きっぷホルダから経路選択フロー

```
1. メイン画面: ユーザーが画面左端上部のハンバーガーメニューをタップ
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
　　メイン画面の経路がキップホルダにも保存ページにも保存されていない場合、
   "経路が保存されていません。上書きしてよろしいですか？" とダイアログ（はい、いいえ）を表示する。「はい」なら上書き、「いいえ」ならなにもせず、メイン画面の経路を保持
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
