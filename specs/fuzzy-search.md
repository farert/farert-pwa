# あいまい検索仕様

## 対象
- 利用画面: `/terminal-selection`
- 呼び出し: `searchStationFuzzy(keyword)`

## 目的
- 駅名の表記ゆれやかな入力に対して候補駅を返す。

## PWA 側の扱い
- 検索入力中に WASM API を呼ぶ。
- 結果は `name`, `kana`, `prefecture` を表示する。
- PWA 側では `getKanaByStation()` と `getPrefectureByStation()` で補足情報を補完する。

## 並び順
- WASM の返却順を基本とする。
- PWA 側では重複候補を除去して表示する。

## UI 方針
- 候補タップで即確定する。
- 自動確定はしない。
- 結果なし時は空状態メッセージを出す。

## 実装上の注意
- 正規化ロジックと検索アルゴリズムの正本は PWA ではなく WASM 側にある。
- 仕様変更時は `../farert-wasm` と同期して更新する。
