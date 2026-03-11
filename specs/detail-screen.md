# 詳細画面（結果表示画面）の詳細仕様

詳細画面は、経路の計算結果（運賃、営業キロ、有効日数など）を詳細に表示する画面です。URLパラメータから圧縮された経路データを復元し、WASMモジュールで運賃計算を行い結果を表示します。

## 画面構成

`component-design.md`で定義されている以下のコンポーネントを使用して構成されます。

1.  **RouteHeader**:
    -   経路の起点と終点を表示します。
    -   Props: `startStation`, `endStation`

2.  **KilometerCard**:
    -   営業キロ、計算キロ、JR各社別キロ程などを表示します。
    -   Props: `fareInfo: FareInfo`
    -   表示される情報は`fareInfo`の内容に応じて動的に変化します（例: JR各社別キロ程、規程114条適用、JR線・会社線・BRT線の内訳など）。詳細は後述の「セクション2: キロ程」の内容に準じます。

3.  **FareCard**:
    -   普通運賃、往復運賃、小児運賃、学割運賃、株主優待割引運賃などを表示します。
    -   Props: `fareInfo: FareInfo`
    -   表示される情報は`fareInfo`の内容に応じて動的に変化します（例: 往復割引、各種割引運賃など）。詳細は後述の「セクション3: 運賃」の内容に準じます。

4.  **備考セクション**:
    -   特記事項がある場合にメッセージを表示します。

5.  **有効日数セクション**:
    -   有効日数と途中下車に関する情報を表示します。

6.  **経由セクション**:
    -   経路リストと、IC運賃計算経路を表示します。

これらのコンポーネントおよびセクションはスクロール可能な形式で表示されます。

## ナビゲーションバー

### タイトル
-   メインタイトル: 運賃詳細
-   サブタイトル（prompt）: 発駅名 → 着駅名
    -  例： 品川 →　名古屋
    - 発駅名 Props: `route departureStationName()`
    - 着駅名 Props: `route arrivevalStationName()`

### 右上ボタン

1.  `共有`ボタン (`ShareIcon`):
    -   タップでシステム共有シートを表示（Web Share API）。
    -   経路の詳細URLを共有（圧縮形式）。`url-routing.md`を参照。
    -   Web Share APIが利用できない場合はクリップボードにURLをコピーするフォールバックを提供します。

## セクション1: 区間 (RouteHeaderコンポーネント)

`RouteHeader`コンポーネントとして表示されます。

-   内容: 発駅 → 着駅（例: _東京 → 熱海_）
    - 発駅 Props: `fareInfo.beginStation`
    - 着駅 Props: `fareInfo.endStation`

## セクション2: キロ程 (KilometerCardコンポーネント)

`KilometerCard`コンポーネントとして表示されます。表示される詳細な内容は`fareInfo`オブジェクトに基づきます。

### タイトル
-   「キロ程」

### 表示項目例（条件付き表示）

-   **営業キロ・計算キロ**: `fareInfo.totalSalesKm`, `fareInfo.jrCalcKm`
-   **JR各社別キロ程**: `fareInfo`内の各JR会社の営業キロ・計算キロ (0でない場合)
-   **規程114条適用 営業キロ / 計算キロ**: `fareInfo.rule114SalesKm`, `fareInfo.rule114CalcKm` (適用される場合)
-   **JR線・会社線・BRT線の内訳**: `fareInfo.jrSalesKm`, `fareInfo.companySalesKm`, `fareInfo.brtSalesKm` (それぞれ0でない場合)

### キロ値のスケール補正

- WASM内部では営業キロ・計算キロが 10倍整数（0.1km単位）で返る場合がある
- PWAでは `FareInfo` の復元直後に km系フィールドを正規化（`/10`）してから表示する
- 対象:
  - `totalSalesKm`, `jrSalesKm`, `jrCalcKm`, `companySalesKm`, `brtSalesKm`
  - `salesKmForHokkaido`, `calcKmForHokkaido`, `salesKmForEast`, `calcKmForEast`
  - `salesKmForShikoku`, `calcKmForShikoku`, `salesKmForKyusyu`, `calcKmForKyusyu`
  - `rule114SalesKm`, `rule114CalcKm`
- 既に小数を含む場合（例: `218.3`）は補正しない

## セクション3: 運賃 (FareCardコンポーネント)

`FareCard`コンポーネントとして表示されます。表示される詳細な内容は`fareInfo`オブジェクトに基づきます。

### タイトル
-   「運賃」

### 表示項目例（条件付き表示）

-   **普通運賃**: `fareInfo.fare`。会社線運賃、IC運賃、BRT運賃の内訳 (`fareInfo.fareForCompanyline`, `fareInfo.fareForIC`, `fareInfo.fareForBRT`)
-   **往復運賃**: `fareInfo.roundTripFareWithCompanyLine`（`fareInfo.isRoundtripDiscount` が立っている場合、または値が正である場合）
-   **規程114条適用前運賃**: `fareInfo.farePriorRule114` (規程114条適用時)
-   **規程114条適用前（往復運賃）**: `fareInfo.roundTripFareWithCompanyLinePriorRule114` (規程114条適用時)
-   **株主優待割引運賃**: `fareInfo`内のJR各社別割引運賃 (利用可能な場合)
    - ラベル: `株主優待運賃（{stockDiscountTitle}）`
    - `rule114StockFare` がある場合は注記 `規程114条適用前: ¥...` を表示
-   **小児運賃**: `fareInfo.childFare`, `fareInfo.roundtripChildFare`
-   **学割運賃**: `fareInfo.academicFare`, `fareInfo.roundtripAcademicFare` （`fareInfo.isAcademicFare` が立っている場合）

## セクション4: 備考（条件付き表示）

特記事項がある場合にメッセージを表示します。表示されるメッセージは`fareInfo`オブジェクト内の特定のフラグや情報に基づきます。

-   例: 「近郊区間内の最短経路利用」、「BRT乗継ぎ割引適用」など。

## セクション5: 有効日数

### タイトル
-   「有効日数」

### 表示項目

-   有効日数: `fareInfo.ticketAvailDays`
-   途中下車情報: `fareInfo`内のフラグに基づいて以下のメッセージを表示。
    -   近郊区間内の場合（優先）: 「近郊区間内ですので最安運賃の経路にしました（途中下車不可、有効日数当日限り）」
    -   片道営業キロ < 101km の場合: 「途中下車前途無効」
    -   発着駅が都区市内駅の場合: 「発着駅の都区市内を除き途中下車できます」
    -   それ以外: 「途中下車できます」

## セクション6: 経由

### タイトル
-   「経由」

### 表示項目

-   **経路リスト**: `Farert`オブジェクトの経路情報 (`getRoutesJson()`) を元に、`[路線名]着駅[路線名]着駅...`形式で表示します。（例: _[東海道線]熱海[身延線]甲府_）
    -   これは表示用のフォーマットであり、内部の`routeScript()`のカンマ区切り形式とは異なります。
-   **IC運賃計算経路（条件付き）**: IC運賃の経路が普通運賃と異なる場合、そのIC運賃計算経路を上記と同じ形式で表示します。

## オプションメニュー内容（条件付き表示）

### オプション表示条件とメニュー項目

- オプションメニューのデフォルトの "オプション" は、**無効**としてグレー表示している。
- `fareInfo.isFareOptEnabled` が `true` で、かつ下表の判定1が1つでも `true` のときに、判定2の文言に切り替える。
- `fareInfo.isFareOptEnabled` が `false` の場合は「オプション」は常に無効表示（グレー）にする（行追加なし）。
- 判定2の初期状態は `false` なので、初期表示は `true` 列の文言を採用する。
- メニューは単一ではなく判定1が2つ以上Trueであれば、2行以上のメニューを追加する。
- setOption は、項目が `false` 状態のときに選択される操作で実行する関数。
- clear option(default) は、項目が `true` 状態のときに選択される操作で実行する関数。
- すなわち、各メニューともトグル表示である

|判定1|判定2|True|False|set option|clear option(default)|
|----|----|----|----|----|----|
|fareInfo.isRuleAppliedEnable|fareInfo.isRuleApplied|特例を適用しない|特例を適用する|`route.setNoRule(True)`|`route.setNoRule(False)`|
|fareInfo.isMeihanCityStartTerminalEnable|fareInfo.isMeihanCityTerminal|着駅を単駅指定|発駅を単駅指定|`route.setArrivalAsCity()`|`route.setStartAsCity()`|
|fareInfo.isEnableLongRoute|fareInfo.isLongRoute|最安経路で運賃計算|指定した経路で運賃計算|`route.setLongRoute(False)`|`route.setLongRoute(True)`|
|fareInfo.isEnableRule115|fareInfo.isRule115specificTerm|旅客営業取扱基準規程115条(単駅最安)|旅客営業取扱基準規程115条(特定都区市内発着)|`route.setSpecificTermRule115(True)`|`route.setSpecificTermRule115(False)`|
|fareInfo.isJRCentralStockEnable|fareInfo.isJRCentralStock|JR東海株主優待券を適用しない|JR東海株主優待券を適用する|`route.setJrTokaiStockApply(True)`|`route.setJrTokaiStockApply(False)`|


0. **共通動作**
   - いずれのメニュー項目も、選択時に 「setOption」「clear option」の関数を実行した後 `calcFare` 相当の再計算を行う
   - 再計算後、詳細画面を更新する

## エラー表示

経路が不完全または無効な場合、画面上部にエラーバナーを表示します（`ui-guidelines.md`のエラー表示パターンを参照）。

-   例: 「無効な経路」、「経路が不完全です。続けて指定してください」、「会社線のみ運賃は表示できません」など。

## サブタイトルバー色の定義

`design-tokens.md`に以下を追加します。
`--color-subtitle-bar-bg: var(--color-gray-100);` (`#F5F5F5`)
これにより、サブタイトルバーの背景色として`gray-100`を使用します。
