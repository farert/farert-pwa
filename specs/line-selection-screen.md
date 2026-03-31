# 路線選択画面仕様

## 対象
- ルート: `/line-selection`
- 実装: `src/routes/line-selection/+page.svelte`

## 画面の役割
- 駅選択に進む前の中間画面として、文脈に応じた路線一覧を表示する。
- 呼び出し元の文脈を保持したまま、次画面の `/route-station-select` へ橋渡しする。

## 入力コンテキスト
- `from=main|start|destination`
- `station?`
- `line?`
- `prefecture?`
- `group?`

## コンテキストの意味
- `from=main`
  - メイン画面の経路追加導線から来たことを表す。
  - `station` は現在の接続起点駅。
  - `line` は直前区間の路線で、同一路線の連続選択を防ぐために使う。
- `from=start|destination`
  - 発着駅探索の一部として来たことを表す。
  - `prefecture` または `group` が一覧の親文脈になる。

## 一覧取得ルール
- `station` 指定時: `getLinesByStation(station)`
- `prefecture` 指定時:
  - `getLinesByPrefect(prefecture)` を利用
  - `都 / 府 / 県` の有無を吸収して正規化する
  - 返却 JSON 構造が揺れても、対象都道府県の配列を抽出できるようにする
- `group` 指定時: `getLinesByCompany(group)`

## 画面構成
- ヘッダー
  - 戻る
  - タイトル `路線選択`
  - `from=main` 時のみ `最短経路` ボタン
- サブタイトル
  - `station` / `prefecture` / `group` のいずれか
- 路線リスト
- 広幅時は駅選択ペイン

## 表示ルール
- `station` 指定時は、その駅に属する路線を列挙する。
- `params.line` と同じ路線は選択不可にする。
- `prefecture` / `group` 指定時は、その文脈に属する路線を列挙する。
- 対象が不足している場合や候補ゼロの場合はエラーまたはプレースホルダを表示する。
- 画面横幅が十分に広い場合は 2 ペイン表示に切り替えてよい。
- 2 ペイン時は左ペインに路線一覧、右ペインに選択中路線の駅選択を表示する。
- 2 ペイン時の右ペインは `/route-station-select` と同じ入力文脈を使い、表示内容も一致させる。
- 2 ペイン時に未選択なら、右ペインには「路線を選ぶと駅候補を表示する」旨のプレースホルダを出す。
- 狭幅時は従来通り路線選択後に `/route-station-select` へ遷移する。

## 主要操作
- 路線選択:
  - 狭幅時は `/route-station-select` へ遷移する
  - 広幅時は同一画面内の駅選択ペインを更新する
  - `from`, `line`, `station`, `prefecture`, `group` を適切に引き継ぐ
- `最短経路`:
  - `/terminal-selection?mode=destination` へ遷移する
  - これはメイン画面の経路追加フローから、直接 autoRoute の終点選択へ分岐する導線である

## 戻り先
- 通常は前画面へ戻る。
- 履歴がない場合はメイン画面へ戻る。
