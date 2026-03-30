# 詳細画面仕様

## 対象
- ルート: `/detail`
- 実装: `src/routes/detail/+page.svelte`

## 画面の役割
- 経路の計算結果を詳細表示する。
- メイン画面や共有 URL から受け取った経路を一時復元し、運賃・営業キロ・有効日数・注記を確認できるようにする。
- 共有、結果エクスポート、運賃計算オプション切替の入口になる。

## 入力
- `r` クエリに圧縮済み経路を受け取る。
- 初期表示時に `decompressRouteFromUrl()` で `Farert` を復元する。
- 復元後、`getFareInfoObjectJson()` と `getRoutesJson()` を読み、画面表示用データへ整形する。

## 画面構成

### 上部バー
- 戻る
- 画面タイトル `運賃詳細`
- サブタイトルとして発駅 → 着駅
- 結果エクスポート
- 共有
- 右上メニュー

### 本文
- 区間カード
- キロ程カード
- 運賃カード
- 注記メッセージ
- 有効日数
- 経由文字列
- IC 運賃計算経路

### 補助 UI
- 読み込みバナー
- エラーバナー
- 警告バナー
- エクスポートダイアログ

## 共有
- `navigator.share` があれば共有 URL を共有する。
- 非対応時はクリップボードへコピーする。
- どちらも不可なら非対応メッセージを出す。

## 結果エクスポート
- `showFare()` と `routeScript()` を元に結果文字列を生成する。
- ダイアログ表示時にクリップボードコピーも試行する。
- コピー不可の環境ではダイアログ表示だけは維持する。

## キロ程

### 表示方針
- 基本値を常に上から並べ、値が 0 の項目は原則省略する。
- WASM 側が 10 倍整数で返すケースがあるため、画面側で km 系フィールドを正規化する。

### 主な表示項目
- 総営業キロ
- JR 営業キロ
- JR 計算キロ
- 会社線営業キロ
- BRT 営業キロ
- JR 北海道 / 東日本 / 四国 / 九州の営業キロ・計算キロ
- 規程 114 条適用時キロ

### 規程 114 条
- `isRule114Applied` が真のときに表示する。
- `rule114ApplyTerminal` があれば注記として併記する。

## 運賃

### 表示方針
- 普通運賃を先頭に置く。
- 条件付きで会社線、IC、BRT、往復、小児、学割、株主優待、規程114条適用前を追加する。
- 0 円または値なしの項目は原則省略する。

### 主な表示項目
- 普通運賃
- 会社線運賃
- IC 運賃
- BRT 運賃
- 往復運賃
- 小児運賃 / 小児往復運賃
- 学割運賃 / 学割往復運賃
- 株主優待運賃
- 規程114条適用前運賃
- 規程114条適用前（往復運賃）

## 備考・有効日数
- `messages` 配列を備考として表示する。
- 有効日数は `ticketAvailDays` を表示する。
- 補足文言は以下の優先順で決める。
  1. 近郊区間の特定運賃経路
  2. 片道営業キロ 101km 未満
  3. 都区市内発着
  4. 通常の途中下車可

## 経由表示
- `routeList` があればそれを優先表示する。
- なければ `getRoutesJson()` を `[路線]駅` 形式へ整形する。
- `routeListForTOICA` が通常経由と異なる場合のみ IC 運賃計算経路として別表示する。

## オプションメニュー

### 表示条件
- `fareInfo.isFareOptEnabled` が真、または個別オプションの enable フラグのいずれかが真のときに表示対象になる。
- 表示項目は単一固定ではなく、有効なものだけを列挙する。

### メニュー定義

| 有効判定 | 状態判定 | 非適用時に出す文言 | 適用時に出す文言 | setter | clear |
|---|---|---|---|---|---|
| `isRuleAppliedEnable` | `isRuleApplied` | `特例を適用する` | `特例を適用しない` | `setNoRule(false)` | `setNoRule(true)` |
| `isMeihanCityStartTerminalEnable` | `isMeihanCityTerminal` | `発駅を単駅指定` | `着駅を単駅指定` | `setArrivalAsCity()` | `setStartAsCity()` |
| `isEnableLongRoute` | `isLongRoute` | `指定した経路で運賃計算` | `最安経路で運賃計算` | `setLongRoute(false)` | `setLongRoute(true)` |
| `isEnableRule115` | `isRule115specificTerm` | `旅客営業取扱基準規程115条(特定都区市内発着)` | `旅客営業取扱基準規程115条(単駅最安)` | `setSpecificTermRule115(true)` | `setSpecificTermRule115(false)` |
| `isJRCentralStockEnable` | `isJRCentralStock` | `JR東海株主優待券を適用する` | `JR東海株主優待券を適用しない` | `setJrTokaiStockApply(true)` | `setJrTokaiStockApply(false)` |

### 共通動作
- 現在状態が `true` の場合は `clear`、`false` の場合は `setter` を呼ぶ。
- 適用後は同じ `Farert` インスタンスに対して再計算済み表示を更新する。
- 失敗時はエラーバナーを表示する。

## エラー
- `r` がない、伸長失敗、`buildRoute()` 失敗時はエラーバナーを表示する。
- 運賃計算結果コードが 1 の場合は「経路が不完全です」を出す。
- `-2` の場合は「会社線のみの経路は運賃を表示できません」を出す。
