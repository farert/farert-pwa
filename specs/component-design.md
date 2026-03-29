# コンポーネント設計

## 現行の主要コンポーネント

### 共通
- `DrawerNavigation.svelte`
- `TicketHolderCard.svelte`
- `FarePicker.svelte`
- `FareSummaryCard.svelte`
- `SavedRouteCard.svelte`

### 画面実装内で完結しているもの
- メイン画面の上部バー、発駅カード、区間カード、下部ナビ
- 詳細画面のメトリクスカード、共有ボタン群
- 保存画面のモーダル
- 発着駅選択のタブ、検索バー、履歴スワイプ UI

## コンポーネント責務

### `DrawerNavigation`
- 開閉状態表示
- 合計運賃・キロ集計
- 共有、編集切替、追加
- 並べ替え制御

### `TicketHolderCard`
- 1 件分の route 表示
- 運賃種別の選択
- 編集時削除
- 並べ替えハンドル

### `FarePicker`
- `FareType` 選択だけを担当

### `FareSummaryCard`
- メイン画面の簡易運賃サマリー

### `SavedRouteCard`
- 保存済み経路または現在経路の表示
- スワイプまたは編集時削除ボタン

## 設計方針
- 画面固有ロジックは `src/routes` 側に残す。
- 再利用価値が明確な UI のみ `src/lib/components` に切り出す。
- ルーティング依存の状態遷移はコンポーネントに閉じ込めない。
