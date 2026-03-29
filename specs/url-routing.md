# URL ルーティング仕様

## 基本
- 詳細画面の共有には `r` クエリを使う。
- 値は `routeScript` を `lz-string` の `compressToEncodedURIComponent()` で圧縮した文字列。

## 実装
- 圧縮: `compressRouteForUrl(route, segmentCount)`
- 復元: `decompressRouteFromUrl(compressed)`
- 共有 URL 生成: `generateShareUrl(route, segmentCount, options?)`

## `segmentCount`
- `-1`: 全経路
- `0 以上`: 先頭から指定区間数ぶんだけを切り出す

## 復元ルール
- まず `buildRoute(script)` を試す
- 一致復元できない場合は `addStartRoute()` と `addRoute()` で再構築する
- 成功コードとして `0`, `1`, `4`, `5` を許容する

## 利用箇所
- メイン画面から詳細画面への遷移
- 詳細画面の共有

## エラー
- 空文字、伸長失敗、`buildRoute()` 失敗時は `null` を返す
- 画面側はエラーバナーを表示する
