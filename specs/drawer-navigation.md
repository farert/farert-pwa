# きっぷホルダ仕様

## 対象
- コンポーネント: `src/lib/components/DrawerNavigation.svelte`
- 呼び出し元: `src/routes/+page.svelte`

## 役割
- メイン画面の補助導線として、複数経路の一時保持・比較・再選択を行う。
- 保存画面のような永続管理ではなく、「いま切り替えて見たい経路群」を素早く扱うための作業領域である。
- SwiftUI 版では `TicketHolderDrawer` + `TicketHolderList` + `TicketHolderRow` に自然分解できる。

## 入力
- `isOpen`
- `isEditing`
- `items`
- `canAdd`
- `onClose`
- `onToggleEdit`
- `onItemClick`
- `onItemDelete`
- `onFareTypeChange`
- `onMoveItem`
- `onAddToHolder`
- `onShare`

## 表示構成

### ヘッダー
- アイコン
- タイトル `きっぷホルダ`

### 集計部
- 総運賃
- 総営業キロ

### 操作部
- 共有ボタン
- 編集 / 完了トグル
- 追加ボタン

### リスト部
- `TicketHolderCard` の縦並び
- 空の場合はプレースホルダを表示

## アイテムモデル
- 各行は `TicketHolderItem` を基底にしつつ、表示用に以下を加えた派生データで描画する。
  - `key`
  - `title`
  - `fareText`
  - `kmText`
  - `fareValue`
  - `kmValue`

SwiftUI 版ではこれを `TicketHolderRowViewData` として切り出すと扱いやすい。

## 集計ロジック
- 総運賃は `items[].fareValue` の合計。
- 総営業キロは `items[].kmValue` の合計。
- `DISABLED` 相当の項目は親で 0 として整形してから渡す。
- 集計はドロワー側で再計算してよいが、元になる運賃計算は親画面で済ませる。

## 主要ユースケース

### 1. 現在経路をホルダへ追加
- 追加ボタン押下で `onAddToHolder` を呼ぶ。
- `canAdd=false` のときは無効化する。
- 同一 `routeScript` の重複追加も許容する。

### 2. ホルダ経路を選択
- 行タップで `onItemClick(item)` を呼ぶ。
- 実際の `mainRoute` 差し替えや上書き確認は親画面の責務。

### 3. 運賃種別を切り替える
- 行内 `FarePicker` 変更時に `onFareTypeChange(order, fareType)` を呼ぶ。
- 切替後の行表示値・集計値は親側で再導出する。

### 4. 編集モードで削除する
- 編集モード時のみ削除ボタンを表示する。
- 削除押下で `onItemDelete(order)` を呼ぶ。
- 確認ダイアログはドロワー側では持たない。

### 5. 並べ替える
- PC では drag and drop
- モバイルでは touch 操作
- ドロップ先は `before` / `after` の位置情報を持つ
- 並べ替え確定時に `onMoveItem(fromOrder, toOrder, insertBefore)` を呼ぶ

### 6. 共有する
- `routeScript` を改行区切りで連結したテキストを共有対象とする。
- 総運賃や総キロは共有本文に含めない。

## 親画面に残す責務
- `mainRoute` をホルダへ追加可能かの判定
- ホルダ選択時の経路上書き確認
- `Farert` を使った運賃・キロの再計算
- 永続化
- 共有 API への接続

## 行コンポーネントとの責務分担
- `DrawerNavigation`
  - リスト全体
  - 集計表示
  - 並べ替え状態
  - 全体アクション
- `TicketHolderCard`
  - 1 行表示
  - 行選択
  - 運賃種別 UI
  - 削除ボタン
  - ドラッグハンドル

## SwiftUI 移植向けメモ
- `DrawerNavigation` は `sheet` / `side panel` / `NavigationSplitView` のいずれにも読み替え可能。
- 並べ替えは iOS では `List.onMove`、macOS/iPadOS ではドラッグ対応に置き換えられる。
- `isOpen` と `isEditing` は ViewState、`items` は Repository 派生の表示モデルとして分離するのがよい。
