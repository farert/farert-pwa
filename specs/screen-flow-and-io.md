# 画面遷移と入出力

## 共通
- すべての主要画面は `initFarert()` 完了後に WASM API を利用する。
- `mainRoute` はメイン画面、発着駅選択、駅選択、保存画面で参照・更新する。

## `/`

### 入力
- `mainRoute`
- `ticketHolder`
- `mainScreenErrorMessage`

### 出力
- `/terminal-selection` へ発駅選択遷移
- `/line-selection` へ経路追加遷移
- `/detail?r=...` へ詳細遷移
- `/save`、`/version`、`/help` へ遷移
- ドロワー内で `ticketHolder` 更新

### 主な操作
- 発駅変更
- 区間追加
- 末尾削除
- 経路反転
- テーマ切替
- 大阪環状線／小倉博多オプション切替
- きっぷホルダ追加・共有・並び替え

## `/terminal-selection`

### 入力
- `mode=start|destination`
- `stationHistory`
- `mainRoute`

### 出力
- 発駅確定時は `mainRoute` を新規作成して `/` に戻る
- 着駅確定時は `mainRoute.autoRoute()` を実行して `/` に戻る
- グループ・都道府県経由では `/line-selection` に進む

### 主な WASM 呼び出し
- `getCompanys()`
- `getPrefects()`
- `getLinesByCompany()`
- `getLinesByPrefect()`
- `getStationsByCompanyAndLine()`
- `getStationsByPrefectureAndLine()`
- `searchStationFuzzy()`
- `getKanaByStation()`
- `getPrefectureByStation()`
- `autoRoute()`

## `/line-selection`

### 入力
- `from=main|start|destination`
- `station?`
- `prefecture?`
- `group?`

### 出力
- 選択した路線を付与して `/route-station-select` へ遷移
- `from=start|destination` では戻り導線として `/terminal-selection` を使う

## `/route-station-select`

### 入力
- `from=main|start|destination`
- `line`
- `station?`

### 出力
- `from=main`: `mainRoute.addRoute()` で区間追加して `/` に戻る
- `from=start|destination`: 選択文脈を保ったまま `/terminal-selection` へ戻す

### 画面モード
- `branch`: 分岐候補中心
- `destination`: 路線上の全駅候補

## `/detail`

### 入力
- `r`: 圧縮済み経路文字列

### 出力
- 共有 URL 共有またはコピー
- 結果テキストのエクスポート表示
- WASM オプション切替による詳細の再計算

## `/save`

### 入力
- `mainRoute`
- `savedRoutes`
- `ticketHolder`

### 出力
- 保存済み経路の追加・削除
- 保存済み経路の読込
- テキスト複数行インポート
- テキスト共有またはダウンロードによるエクスポート

## `/version`

### 入力
- ビルド埋め込み値 `APP_VERSION`, `BUILD_AT`, `GIT_COMMIT_AT`, `GIT_SHA`
- `databaseInfo()`

### 出力
- 更新確認
- 更新適用
- サポートサイト遷移

## `/help`

### 入力
- なし

### 出力
- 外部ブログ導線
- `/` へ戻る
