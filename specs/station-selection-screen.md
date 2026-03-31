# 駅選択画面仕様

## 対象
- ルート: `/route-station-select`
- 実装: `src/routes/route-station-select/+page.svelte`

## 画面の役割
- 選択済み路線に対して、次に確定する駅を選ぶ。
- 同じ画面を、経路追加用の「分岐駅/着駅選択」と、発着駅探索用の「駅一覧選択」で再利用する。

## 入力クエリ
- `from=main|start|destination`
- `line`
- `station?`
- `prefecture?`
- `group?`

## 画面モード
- `branch`
  - 経路追加用の既定モード
  - 分岐候補中心に表示する
- `destination`
  - 路線上の全駅を表示する

`from=main` のときだけトグル切替を提供し、初期値は `branch` とする。

## データ取得
- 路線上の全駅: `getStationsByLine(line)`
- 分岐駅候補: `getBranchStationsByLine(line, station)`
- 駅かな: `getKanaByStation(station)`
- 所属路線: `getLinesByStation(station)`
- 同名駅補助情報:
  - `executeSql()` で `samename` を引いて表示名を補う

## 表示データ
各行は以下の情報を持つ。
- 表示駅名
- かな
- 所属路線一覧
- 必要なら同名駅の補助サフィックス

## `from=main` のとき

### 分岐駅モード
- `mainRoute` の発駅または現在駅を基準に `getBranchStationsByLine()` を呼ぶ。
- 現在駅をリスト先頭側に含める。
- 発駅が同一路線上にある場合は候補に含める。
- 全駅リスト順に並び替え、路線上の順序を保つ。

### 着駅モード
- `getStationsByLine(line)` の全駅を表示する。
- 直前の接続駅と同じ駅は選択不可にする。

### 駅確定
- `mainRoute.addRoute(line, station)` を実行する。
- 成功コード `0`, `4`, `5` は成功扱いでメイン画面へ戻る。
- `-1` は「経路が重複しています」として扱う。
- その他の失敗はエラーバナー表示とする。

## `from=start|destination` のとき
- 発着駅探索フローの一部として使う。
- トグルは不要で、一覧選択専用画面として振る舞う。
- 選択結果は直前の `/terminal-selection` フローへ戻して確定処理に使う。
- `prefecture` または `group` の文脈を画面内サブタイトルに残す。

## 画面構成
- ヘッダー
  - 戻る
  - タイトル
  - `from=main` 時のみ `分岐駅選択` / `着駅選択` トグル
- サブタイトル
  - `line`
  - 必要に応じて `prefecture` / `group`
- 駅一覧

## 埋め込み表示
- `line-selection` の広幅 2 ペイン表示では、この画面を右ペインへ埋め込んで使ってよい。
- 埋め込み時も、駅一覧、分岐/着駅トグル、選択可否、確定動作の仕様は単独表示時と同じにする。
- 埋め込み時は親画面が戻る導線を持つため、この画面自身の戻る導線は省略してよい。

## エラー
- `line` がない場合は一覧を構築できないのでエラー表示する。
- 駅一覧取得失敗時はエラーバナーを表示する。
- `addRoute()` 失敗時はメッセージを表示し、画面を維持する。
