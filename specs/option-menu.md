# オプション仕様

## 役割
- 経路の意味や運賃計算条件を切り替える UI をまとめた仕様。
- 単なる表示切替ではなく、WASM の `Farert` インスタンスへ setter を適用し、その結果を画面へ再反映する。

## メイン画面オプション

### 表示位置
- メイン画面右上メニュー内の「経路オプション」セクション。

### 大阪環状線の経路選択
- 表示条件:
  - 経路に大阪環状線が含まれる
  - または `routeScript` 上に遠回り指定トークンが含まれる
  - または `isOsakakanDetourEnable()` が有効
- 文言:
  - `大阪環状線 近回り`
  - `大阪環状線 遠回り`
- 動作:
  - `setDetour(enabled)` を呼ぶ
  - 成功後に `mainRoute.set(route)` して UI を更新する

### 小倉-博多間 新幹線・在来線別線扱い
- 設計上の項目:
  - `小倉-博多間新幹線在来線別線扱い（有効）`
  - `小倉-博多間新幹線在来線別線扱い（無効）`
- 利用 API:
  - 状態取得 `isNotSameKokuraHakataShinZai()`
  - 切替 `setNotSameKokuraHakataShinZai(enabled)`
- 意味:
  - 有効時は新幹線と在来線を別線として扱う
  - 無効時は同一路線として扱う

## 詳細画面オプション

### 表示位置
- 詳細画面右上メニュー。

### 表示条件
- `FareInfo` の有効フラグに応じて項目を動的生成する。
- 有効な判定が 2 つ以上ある場合は、複数行のメニューとして並ぶ。

### メニュー定義

| 有効判定 | 状態判定 | 状態 false 時の文言 | 状態 true 時の文言 | setter | clear |
|---|---|---|---|---|---|
| `isRuleAppliedEnable` | `isRuleApplied` | `特例を適用する` | `特例を適用しない` | `setNoRule(false)` | `setNoRule(true)` |
| `isMeihanCityStartTerminalEnable` | `isMeihanCityTerminal` | `発駅を単駅指定` | `着駅を単駅指定` | `setArrivalAsCity()` | `setStartAsCity()` |
| `isEnableLongRoute` | `isLongRoute` | `指定した経路で運賃計算` | `最安経路で運賃計算` | `setLongRoute(false)` | `setLongRoute(true)` |
| `isEnableRule115` | `isRule115specificTerm` | `旅客営業取扱基準規程115条(特定都区市内発着)` | `旅客営業取扱基準規程115条(単駅最安)` | `setSpecificTermRule115(true)` | `setSpecificTermRule115(false)` |
| `isJRCentralStockEnable` | `isJRCentralStock` | `JR東海株主優待券を適用する` | `JR東海株主優待券を適用しない` | `setJrTokaiStockApply(true)` | `setJrTokaiStockApply(false)` |

## 共通動作
- ユーザーが項目を選択する。
- 対象 route に setter または clear を適用する。
- その場で再計算し、画面表示を更新する。
- メニューを閉じる。
- 失敗時は画面内バナーで通知する。

## 永続化と共有への影響
- オプションは別ストアでは持たず、経路状態の一部として扱う。
- `mainRoute` に反映されたオプションは、保存、詳細表示、共有 URL 復元時にも再現される前提で設計する。
- とくにメイン画面のオプションは `routeScript` 復元や経路再構成と整合している必要がある。
