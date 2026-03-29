# 駅選択画面仕様

## 対象
- ルート: `/route-station-select`
- 実装: `src/routes/route-station-select/+page.svelte`

## 入力クエリ
- `from=main|start|destination`
- `line`
- `station?`
- `prefecture?`
- `group?`

## モード
- `branch`: 分岐駅候補
- `destination`: 路線上の全駅

切替は画面内トグルで行う。

## データ取得
- 全駅一覧: `getStationsByLine(line)`
- 分岐候補: `getBranchStationsByLine(line, station)`
- 駅かな: `getKanaByStation()`
- 所属路線: `getLinesByStation()`
- 同名駅補助情報: `executeSql()` を使った `samename` 解決

## `from=main` のとき
- 分岐候補は現在経路の発駅も加味して並び順を補正する。
- 駅選択で `mainRoute.addRoute(line, station)` を行い `/` に戻る。

## `from=start|destination` のとき
- 一覧用途として使い、選択結果は `/terminal-selection` の流れに戻す。
- 画面遷移時は `from` / `group` / `prefecture` を維持する。

## 補足表示
- 駅名
- かな
- 同名駅補助表記を含む表示名
- 所属路線一覧
