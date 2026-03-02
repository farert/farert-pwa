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
-   メインタイトル: 着駅名（例: _熱海_）
-   サブタイトル（prompt）: 発駅名 →（例: _東京 →_）

### 右上ボタン

1.  `共有`ボタン (`ShareIcon`):
    -   タップでシステム共有シートを表示（Web Share API）。
    -   経路の詳細URLを共有（圧縮形式）。`url-routing.md`を参照。
    -   Web Share APIが利用できない場合はクリップボードにURLをコピーするフォールバックを提供します。

## セクション1: 区間 (RouteHeaderコンポーネント)

`RouteHeader`コンポーネントとして表示されます。

-   内容: 発駅 → 着駅（例: _東京 → 熱海_）

## セクション2: キロ程 (KilometerCardコンポーネント)

`KilometerCard`コンポーネントとして表示されます。表示される詳細な内容は`fareInfo`オブジェクトに基づきます。

### タイトル
-   「キロ程」

### 表示項目例（条件付き表示）

-   **営業キロ・計算キロ**: `fareInfo.totalSalesKm`, `fareInfo.jrCalcKm`
-   **JR各社別キロ程**: `fareInfo`内の各JR会社の営業キロ・計算キロ (0でない場合)
-   **規程114条適用 営業キロ / 計算キロ**: `fareInfo.rule114SalesKm`, `fareInfo.rule114CalcKm` (適用される場合)
-   **JR線・会社線・BRT線の内訳**: `fareInfo.jrKm`, `fareInfo.companyKm`, `fareInfo.brtKm` (それぞれ0でない場合)

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

-   **普通運賃**: `fareInfo.fare`。会社線運賃、IC運賃、BRT運賃の内訳 (`fareInfo.companyFare`, `fareInfo.icFare`, `fareInfo.brtFare`)
-   **往復運賃**: `fareInfo.roundTripFare` (片道営業キロ ≥ 601km かつ往復割引適用時)
-   **規程114条適用前運賃**: `fareInfo.farePriorRule114` (規程114条適用時)
-   **規程114条適用前（往復運賃）**: `fareInfo.roundTripFareWithCompanyLinePriorRule114` (規程114条適用時)
-   **株主優待割引運賃**: `fareInfo`内のJR各社別割引運賃 (利用可能な場合)
    - ラベル: `株主優待運賃（{stockDiscountTitle}）`
    - `rule114StockFare` がある場合は注記 `規程114条適用前: ¥...` を表示
-   **小児運賃**: `fareInfo.childFare`, `fareInfo.roundtripChildFare`
-   **学割運賃**: `fareInfo.academicFare`, `fareInfo.roundtripAcademicFare` (片道営業キロ ≥ 101km の場合のみ表示)

## セクション4: 備考（条件付き表示）

特記事項がある場合にメッセージを表示します。表示されるメッセージは`fareInfo`オブジェクト内の特定のフラグや情報に基づきます。

-   例: 「近郊区間内の最短経路利用」、「BRT乗継ぎ割引適用」など。

## セクション5: 有効日数

### タイトル
-   「有効日数」

### 表示項目

-   有効日数: `fareInfo.ticketAvailDays`
-   途中下車情報: `fareInfo`内のフラグに基づいて以下のメッセージを表示。
    -   片道営業キロ ≥ 101km の場合: 「途中下車できます」
    -   発着駅が都区市内駅の場合: 「発着駅の都区市内を除き途中下車できます」
    -   片道営業キロ < 101km の場合: 「(途中下車前途無効)」
    -   近郊区間内の場合: 「近郊区間内ですので最安運賃の経路にしました(途中下車不可、有効日数当日限り)」

## セクション6: 経由

### タイトル
-   「経由」

### 表示項目

-   **経路リスト**: `Farert`オブジェクトの経路情報 (`getRoutesJson()`) を元に、`[路線名]着駅[路線名]着駅...`形式で表示します。（例: _[東海道線]熱海[身延線]甲府_）
    -   これは表示用のフォーマットであり、内部の`routeScript()`のカンマ区切り形式とは異なります。
-   **IC運賃計算経路（条件付き）**: IC運賃の経路が普通運賃と異なる場合、そのIC運賃計算経路を上記と同じ形式で表示します。

## オプションメニュー内容（条件付き表示）

`option-menu.md`で定義された経路オプションを、詳細画面から直接切り替え可能とします。  
`/Users/ntake/priv/farert.repos/farert/test/unix/all/test_result.txt` の結果表記を参考に、以下を条件付きで表示します。

実装根拠は `/Users/ntake/priv/farert.repos/farert/test/unix/common/test_exec.cpp` の `2694` 行付近（`CalcRoute` のオプション適用テスト）です。  
同テストと同じく、各オプションは `route_flag` を更新して再計算し、結果を再描画します。

### 現行実装（本日反映）

- 右上メニューでは、従来の `オプション` 項目を置き換え、以下を直接表示する
  - `発駅を単駅にする`
  - `着駅を単駅にする`
- 表示可否は `isMeihanCityEnable`（UI上は `fareInfo.isMeihanCityStartTerminalEnable`）で判定する
- 選択時動作:
  - `発駅を単駅にする` -> `setStartAsCity()` を呼び再計算
  - `着駅を単駅にする` -> `setArrivalAsCity()` を呼び再計算
- 再計算後は詳細画面の結果を即時更新する
- `バージョン情報` メニューは継続表示する

### オプション表示条件とメニュー項目

0. **共通動作**
   - いずれのメニュー項目も、選択時に対象フラグを更新した後 `calcFare` 相当の再計算を行う
   - 再計算後、詳細画面の以下を更新する
     - キロ程
     - 運賃
     - 備考メッセージ
     - 有効日数
     - 経由

1. **JR東海株主優待券使用オプション**
   - 判定条件: `jrtokaistock_enable` が有効な場合（UI実装上は `fareInfo.isJRCentralStockEnable` を使用してよい）
   - 表示条件の目安メッセージ: `JR東海株主優待券使用オプション選択可`
   - メニュー項目:
     - `JR東海株主優待券使用`
     - `JR東海株主優待券未使用`
   - 選択時動作:
     - `JR東海株主優待券使用` 選択時: `setJrTokaiStockApply(true)` を適用して再計算
     - `JR東海株主優待券未使用` 選択時: `setJrTokaiStockApply(false)` を適用して再計算

2. **名阪都区市内（単駅指定）オプション**
   - 判定条件: `isMeihanCityEnable` が `true` の場合（UI実装上は `fareInfo.isMeihanCityStartTerminalEnable` を使用してよい）
   - メニュー項目:
     - `発駅を単駅指定`
     - `着駅を単駅指定`
   - 選択時動作:
     - `発駅を単駅指定` 選択時: `setStartAsCity()` を適用して再計算
     - `着駅を単駅指定` 選択時: `setArrivalAsCity()` を適用して再計算

3. **大都市近郊区間 経路選択オプション**
   - 判定条件: `isEnableLongRoute` が `true` の場合（UI実装上は `fareInfo.isEnableLongRoute`）
   - メニュー項目:
     - `指定経路`
     - `最安経路`
   - 選択時動作:
     - `指定経路` 選択時: `setLongRoute(true)` を適用して再計算
     - `最安経路` 選択時: `setLongRoute(false)` を適用して再計算
   - 備考:
     - テスト実装上、デフォルトは「最安経路」側として扱われる

4. **旅客営業取扱基準規程115条オプション**
   - 判定条件: `isEnableRule115` が `true` の場合（UI実装上は `fareInfo.isEnableRule115`）
   - メニュー項目:
     - `旅客営業取扱基準規程115条（特定都区市内発着）`
     - `旅客営業取扱基準規程115条（単駅最安）`
   - 選択時動作:
     - `特定都区市内発着` 選択時: `setSpecificTermRule115(true)` を適用して再計算
     - `単駅最安` 選択時: `setSpecificTermRule115(false)` を適用して再計算
   - 備考:
     - テスト実装上、デフォルトは `setSpecificTermRule115(false)`（単駅最安）

5. **規則非適用オプション（デバッグ/開発向け）**
   - 判定条件: `rule_en()` が `true` の場合
   - メニュー項目:
     - `規則適用`
     - `規則非適用`
   - 選択時動作:
     - `規則非適用` 選択時: `setNoRule(true)` を適用して再計算
     - `規則適用` 選択時: `setNoRule(false)` を適用して再計算
   - 備考:
     - `test_exec.cpp` の `///非適用` ケースに対応する検証項目
     - 本項目を本番UIで露出するかは別途決定する

## エラー表示

経路が不完全または無効な場合、画面上部にエラーバナーを表示します（`ui-guidelines.md`のエラー表示パターンを参照）。

-   例: 「無効な経路」、「経路が不完全です。続けて指定してください」、「会社線のみ運賃は表示できません」など。

## サブタイトルバー色の定義

`design-tokens.md`に以下を追加します。
`--color-subtitle-bar-bg: var(--color-gray-100);` (`#F5F5F5`)
これにより、サブタイトルバーの背景色として`gray-100`を使用します。
