# 発着駅選択画面仕様

## 対象
- ルート: `/terminal-selection`
- 実装: `src/routes/terminal-selection/+page.svelte`

## 画面の役割
- 発駅または着駅候補を選ぶ入口画面。
- グループ、都道府県、履歴、検索という複数の探索手段を 1 画面に集約する。
- SwiftUI 版では「駅探索コンテナ画面」として独立させやすいよう、探索手段と確定動作を分離して考える。

## 画面モード
- `mode=start`
  - 発駅選択モード
  - 選択結果は新しい `Farert` の開始駅になる
- `mode=destination`
  - 着駅選択モード
  - 選択結果は `autoRoute()` の終点入力になる

画面タイトルはモードで切り替える。

## 内部状態
- `tab`: `group` / `prefecture` / `history`
- `stage`: `root` / `lines` / `stations`
- `selectionBase`: `group` / `prefecture`
- `searchMode`: 検索 UI 表示中か
- `searchQuery`: 検索文字列
- `selectedCompany`, `selectedPrefecture`, `selectedLine`
- `historyItems`: 駅履歴

SwiftUI 版ではこれを 1 つの ViewModel にまとめ、`tab`, `stage`, `searchMode` を画面状態として持つのが自然。

## 画面構成

### ヘッダー
- 戻る
- 画面タイトル
- 必要に応じて履歴編集導線

### タブ列
- グループ
- 都道府県
- 履歴

### 検索バー
- あいまい検索入力
- クリア操作
- 検索中のローディング状態

### リスト領域
- `stage=root`
  - グループ一覧、都道府県一覧、履歴一覧のいずれか
- `stage=lines`
  - 選択基準に紐づく路線一覧
- `stage=stations`
  - 選択路線に属する駅一覧
- `searchMode=true`
  - タブ状態より優先して検索結果一覧を表示

## データ取得
- グループ一覧: `getCompanys()`
- 都道府県一覧: `getPrefects()`
- グループ別路線: `getLinesByCompany(company)`
- 都道府県別路線: `getLinesByPrefect(prefecture)`
- グループ配下駅一覧: `getStationsByCompanyAndLine(company, line)`
- 都道府県配下駅一覧: `getStationsByPrefectureAndLine(prefecture, line)`
- 路線配下駅一覧: `getStationsByLine(line)`
- あいまい検索: `searchStationFuzzy(keyword, 50)`
- 補助情報:
  - `getKanaByStation(station)`
  - `getPrefectureByStation(station)`

## 操作フロー

### グループ起点
1. JR グループを選ぶ
2. 路線一覧を表示する
3. 路線を選ぶ
4. 駅一覧を表示する
5. 駅を確定する

### 都道府県起点
1. 都道府県を選ぶ
2. 路線一覧を表示する
3. 路線を選ぶ
4. 駅一覧を表示する
5. 駅を確定する

### 履歴起点
1. 履歴駅を一覧表示する
2. 駅を直接確定する

### 検索起点
1. キーワード入力
2. `searchStationFuzzy()` の結果を表示
3. 駅を直接確定する

## 発駅選択時の確定動作
- 必要に応じて既存経路上書き確認を行う。
- 新しい `Farert` を生成する。
- `addStartRoute(station)` を実行する。
- `mainRoute` を置き換える。
- `stationHistory` に追加する。
- メイン画面へ戻る。

## 着駅選択時の確定動作
- 選択直後に「新幹線を利用しますか？」確認ダイアログを出す。
- 確認後に `mainRoute.autoRoute(useBulletTrain, destination)` を実行する。
- 成功時:
  - `stationHistory` に追加する
  - メイン画面へ戻る
- 失敗時:
  - `mainScreenErrorMessage` にエラーを設定する
  - メイン画面へ戻る

この流れは SwiftUI 版でもそのまま使え、違うのはダイアログ実装だけである。

## 履歴管理
- `stationHistory` を最近順に表示する。
- 個別削除に対応する。
- 編集モードまたはスワイプ操作で削除する。
- 必要なら全消去導線を持てる。

## エラーと戻る挙動
- 検索中は戻るで検索解除を優先する。
- 駅一覧表示中は戻るで路線一覧へ戻る。
- 路線一覧表示中は戻るでタブの root へ戻る。
- root 状態で戻るとメイン画面へ戻る。
- 一覧取得失敗、検索失敗時は画面内エラーバナーで通知する。
