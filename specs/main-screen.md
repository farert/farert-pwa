# **<メイン>** 画面の詳細仕様

- **<メイン>** 画面は、初期表示の画面で、経路オブジェクトを1つもつ
- 経路は初期状態では空
- Webストレージに保存し、PWAで他アプリへ行く際は保存する
- 経路は、`routeScript()`でカンマ区切りの文字列で表現されますが、`buildRoute()`ではカンマまたはスペース区切りの文字列も受け付けます。
  その並びは `駅1,路線1,駅2,路線2,駅3,路線3,駅4,...` と、奇数個のフィールドで並びます。これを縦に並べると、駅1のみ発駅として独立し、以降は、路線 着駅 の繰り返しとなります。

## ヘッダー部

- ハンバーガーメニュー | タイトル | 3点メニュー
- ハンバーガーメニュー: きっぷホルダドロワーを開く
- 3点メニュー: オプションメニューを表示
  - バージョン情報
  - （その他の項目）

## メインコンテンツ部

経路の状況に応じて以下のコンポーネントが動的に表示されます。

1.  **StationCard (発駅表示)**
    -   `component-design.md`の`StationCard`を参照。
    -   経路の発駅が設定されている場合に表示されます。
    -   Props: `station`, `isStartStation={true}`
    -   タップ動作: **<発着駅選択>** 画面へ遷移し、発駅を変更します。選択後、既存の経路区間は全てクリアされ、`StationCard`と`AddRouteButton`のみの表示に戻ります。

2.  **RouteSegmentCard (経路区間表示)**
    -   `component-design.md`の`RouteSegmentCard`を参照。
    -   設定された経路の各区間（路線と着駅）に対して表示されます。
    -   Props: `segment`, `index`
    -   タップ動作: タップした区間を着駅とした **<詳細>** 画面へ遷移します。経路データを圧縮してURLパラメータで渡します（`/detail?r={compressed}`）。

3.  **AddRouteButton (経路追加ボタン)**
    -   `component-design.md`の`AddRouteButton`を参照。
    -   現在の経路の末尾に新しい区間を追加するために表示されます。
    -   タップ動作: **<路線選択>** 画面 → **<駅選択>** 画面 (経路追加用) の順で遷移し、路線と着駅を選択します。選択後、メイン画面の経路に新しい区間が追加されます。

4.  **FareSummaryCard (運賃サマリー)**
    -   `component-design.md`の`FareSummaryCard`を参照。
    -   経路が完成し、運賃情報が計算された場合に表示されます。
    -   Props: `fareInfo`
    -   タップ動作: 全経路の **<詳細>** 画面へ遷移します。経路データを圧縮してURLパラメータで渡します（`/detail?r={compressed}`）。

### 初期状態

-   `StationCard`に「発駅を指定してください」メッセージが表示され、`AddRouteButton`が表示されます。`FareSummaryCard`は非表示です。

### 動作例

-   **発駅指定時:** `StationCard`をタップし、**<発着駅選択>** 画面で発駅を選択します。選択後、メイン画面の`StationCard`に選択された発駅が表示され、`AddRouteButton`が常に表示されます。
-   **経路追加時:** `AddRouteButton`をタップし、**<路線選択>** 画面 → **<駅選択>** 画面 (経路追加用) の順で路線と着駅を選択します。選択後、メイン画面に`RouteSegmentCard`が追加され、運賃が再計算されて`FareSummaryCard`が表示されます。
-   **画面がいっぱいになっても`AddRouteButton`が隠れないようスクロール可能**とします。

## フッター部（BottomNavigation）

メイン画面下部には、`component-design.md`で定義された`BottomNavigation`コンポーネントが表示されます。

-   Props: `onBackClick`, `onReverseClick`, `onOptionClick`, `onSaveClick`
-   ボタン構成:
    1.  **戻る** (`UndoIcon`): 最後の経路区間を削除し、経路を再表示します。
    2.  **反転** (`SwapIcon`): 現在の経路を反転し、再表示します。
    3.  **オプション** (`SettingsIcon`): 経路オプションメニューを表示します。
    4.  **保存** (`SaveIcon`): **<保存>** 画面へ遷移します。

`ui-guidelines.md`の`BottomNavigation`セクションで定義されている有効/無効状態のロジックに従います。特に「オプション」ボタンは、経路に大阪環状線または小倉-博多間が含まれる場合にのみ有効化されます。

## データソース

- 運賃計算
  - `wasm.getFareInfoObjectJson() : FareInfo`
