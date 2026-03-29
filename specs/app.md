# アプリ概要

## 構成
- フレームワークは Svelte 5 / SvelteKit。
- `src/routes/+layout.svelte` が共通レイアウトと PWA 更新通知を担当する。
- `src/routes/+layout.ts` で `ssr = false`、`prerender = false` とし、SPA として動作する。
- 運賃計算と駅・路線データ参照は `src/lib/wasm/index.ts` 経由で WASM を使う。

## 主要画面
- `/`: メイン画面。経路編集、運賃サマリー、きっぷホルダ操作の起点。
- `/terminal-selection`: 発駅選択と着駅指定。グループ・都道府県・履歴・検索を持つ。
- `/line-selection`: 路線一覧の中間画面。
- `/route-station-select`: 路線上の分岐駅または着駅を選ぶ。
- `/detail`: 経路詳細、共有、結果エクスポート、詳細オプション。
- `/save`: 保存済み経路の管理、インポート、エクスポート。
- `/version`: アプリ・DB・ビルド・更新情報。
- `/help`: 使い方と注意事項。

## 状態管理
- `mainRoute`: 現在編集中の `Farert` インスタンス。
- `savedRoutes`: 保存済み `routeScript` 配列。
- `ticketHolder`: きっぷホルダ配列。
- `stationHistory`: 駅選択履歴。
- `mainScreenErrorMessage`: 画面間で返す一時エラー。

上記は `src/lib/stores/index.ts` に定義され、`localStorage` と同期する。

## 永続化
- `farert_current_route`
- `farert_saved_routes`
- `farert_ticket_holder`
- `farert_station_history`
- テーマは `localStorage.theme` に `light` / `dark` を保存する。

## PWA
- `src/lib/service-worker.js` で Service Worker を提供する。
- 共通レイアウトと `/version` 画面から更新確認と `SKIP_WAITING` 適用を行う。
- オフライン時も既存キャッシュからアプリシェルと WASM 資産の再利用を優先する。

## URL ベースの共有
- 詳細画面への遷移・共有には `r` クエリを使う。
- `routeScript` を `lz-string` で圧縮し URL 安全形式で載せる。
- 詳細画面側で伸長し `buildRoute()` により復元する。
