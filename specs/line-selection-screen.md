# 路線選択画面仕様

## 対象
- ルート: `/line-selection`
- 実装: `src/routes/line-selection/+page.svelte`

## 入力クエリ
- `from=main|start|destination`
- `station?`
- `prefecture?`
- `group?`

## 一覧取得
- `station` 指定時: `getLinesByStation(station)`
- `prefecture` 指定時: `getLinesByPrefect(prefecture)` を正規化付きで利用
- `group` 指定時: `getLinesByCompany(group)`

## 表示
- タイトルは固定で「路線選択」。
- サブタイトルとして `station` / `prefecture` / `group` のいずれかを表示する。
- 対象が不足している場合はエラーを表示する。

## 遷移
- 路線選択後は `/route-station-select` へ進む。
- 既存クエリに `line` を加えて文脈を保持する。
- `from=start|destination` の場合でも駅選択専用画面は `/route-station-select` を使う。
