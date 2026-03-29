# 発着駅選択画面仕様

## 対象
- ルート: `/terminal-selection`
- 実装: `src/routes/terminal-selection/+page.svelte`

## モード
- `mode=start`: 発駅選択
- `mode=destination`: 着駅指定と最短経路生成

## タブ
- グループ
- 都道府県
- 履歴

## 画面状態
- `stage=root`: グループまたは都道府県の一覧
- `stage=lines`: 選択基準に紐づく路線一覧
- `stage=stations`: 路線配下の駅一覧
- `searchMode=true`: あいまい検索結果一覧

## 操作
- グループ選択: `getLinesByCompany()` で路線一覧を出す
- 都道府県選択: `getLinesByPrefect()` を基準に路線一覧を出す
- 路線選択: 駅一覧を表示する
- 履歴選択: 直ちに駅選択を確定する
- 検索: `searchStationFuzzy()` で結果を表示する

## 発駅選択時
- 新しい `Farert` を構築して `addStartRoute(station)` を行う
- `mainRoute` を置き換える
- 駅履歴へ追加して `/` に戻る

## 着駅選択時
- 選択後に「新幹線を利用しますか？」ダイアログを表示する
- `mainRoute.autoRoute(useBulletTrain, destination)` を実行する
- 成功時は `/` に戻る
- 失敗時は `mainScreenErrorMessage` に設定する

## 履歴
- `stationHistory` を表示する
- スワイプまたは編集操作で個別削除できる

## 補足
- 既存の未保存経路がある状態で上書き相当になるときは確認ダイアログを表示する。
