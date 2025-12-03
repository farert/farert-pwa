# **<きっぷホルダー>** 画面（ドロワーナビゲーション）の詳細仕様

`component-design.md`で定義されている`DrawerNavigation`コンポーネントを使用します。

## 呼び出し画面

- **<メイン>** 画面
  - `AppBar`の``[メニュー]``アイコン (`MenuIcon`)

## 入力パラメーター

- `isOpen: boolean` (ドロワーの開閉状態)
- `ticketHolderItems: TicketHolderItem[]` (表示するきっぷホルダアイテムのリスト)
- `onClose: () => void` (ドロワーを閉じるためのコールバック)
- `onItemClick: (item: TicketHolderItem) => void` (アイテムがクリックされた時のコールバック)
- `onItemDelete: (id: string) => void` (アイテムが削除された時のコールバック)
- `onFareTypeChange: (id: string, fareType: FareType) => void` (運賃タイプが変更された時のコールバック)
- `onAddToHolder: () => void` (きっぷホルダに追加するボタンがクリックされた時のコールバック)

## レイアウトと構成

`component-design.md`の`DrawerNavigation`コンポーネントの構造に準拠します。

### ドロワーヘッダー

-   左上: `FolderIcon` (MDIアイコン)
-   タイトル: 「きっぷホルダ」

### 集計表示部 (`drawer-summary`クラス)

-   総運賃: 全行の運賃合計 (`totalFare`) を表示（最大7桁、例：_¥999,000_）。運賃タイプが `DISABLED` の行は0円として計算します。
-   総営業キロ: 全行の営業キロ合計 (`totalKm`) を表示（最大6桁、例：_999.0km_）。

### 操作部

`component-design.md`の`DrawerNavigation`コンポーネント構造に沿って、以下のボタンが配置されます。

-   **共有ボタン** (`ShareIcon`): タップできっぷホルダ全体を共有します。共有形式については別途定義が必要です。
-   **追加ボタン** (`AddIcon` または `AddToHolderButton`): メイン画面の現在の経路をきっぷホルダに追加します。メイン画面の経路が空の場合は非表示です。同一経路の重複追加も可能です。

### リストエリア（スクロール可能）

`component-design.md`で定義されている`TicketHolderCard`コンポーネントを、`ticketHolderItems`の各アイテムに対して表示します。

#### `TicketHolderCard`コンポーネント

-   Props: `item: TicketHolderItem`
-   Events:
    -   `click`: カード全体がタップされた際、`onItemClick`を呼び出し、メイン画面がその経路表示に切り替わります。
    -   `delete`: `TicketHolderCard`内の削除ボタン(`DeleteIcon`)がクリックされた際、`onItemDelete`を呼び出します。確認ダイアログなしで即座に削除されます。
    -   `fareTypeChange`: `TicketHolderCard`内の`FarePicker`コンポーネントで運賃タイプが変更された際、`onFareTypeChange`を呼び出します。

#### `FarePicker`コンポーネント（`TicketHolderCard`内）

-   `component-design.md`の`FarePicker`を参照。
-   `FareType`enumに基づいて以下の選択肢を提供します。
    1.  普通運賃 (`NORMAL`)
    2.  小児運賃 (`CHILD`)
    3.  往復運賃 (`ROUND_TRIP`)
    4.  株割運賃 (`STOCK_DISCOUNT`)
    5.  株割x2運賃 (`STOCK_DISCOUNT_X2`)
    6.  学割運賃 (`STUDENT`)
    7.  学割往復 (`STUDENT_ROUND_TRIP`)
    8.  無効 (`DISABLED`)
-   デフォルト表示は「普通運賃」です。

### 並べ替え（ドラッグアンドドロップ）

`ui-guidelines.md`の「リストの並べ替え」セクションで詳細を定義しています。

-   並べ替えは、`TicketHolderCard`の右端に表示されるドラッグハンドル（横3本線アイコン、MDI: `drag-horizontal-variant`）を使用して行います。
-   ドラッグにより行の並び替えが可能です。
-   並べ替え順は `TicketHolderItem`の`order`フィールドで管理され、並べ替え後は自動的に`localStorage`に保存されます。

## 動作

-   `FarePicker`の選択を切り替えると、きっぷホルダ全体の総運賃と総営業キロが、選択された運賃タイプに基づいて再計算・更新されます。

## データ制約

-   最大営業キロ: 6桁
-   最大運賃: 7桁

## データソース

-   運賃タイプ変更による運賃計算には、`Farert`クラスの運賃設定関連メソッドと`getFareInfoObjectJson()`を使用します。
    -   例: `farert.setFareType(FareType.CHILD);`
    -   例: `JSON.parse(farert.getFareInfoObjectJson());`