# アプリ概要

## 目的
- Farert は JR 線を中心とした経路構築と運賃確認を行う PWA である。
- ユーザーは発駅を決め、路線と駅を順に追加し、運賃や営業キロ、有効日数を確認し、その結果を保存・共有できる。

## アーキテクチャ
- フロントエンドは Svelte 5 / SvelteKit で構成する。
- `src/routes/+layout.svelte` が共通レイアウトと PWA 更新通知を担当する。
- `src/routes/+layout.ts` で `ssr = false`、`prerender = false` とし、SPA として動作する。
- 経路構築・運賃計算・DB 参照は `src/lib/wasm/index.ts` 経由で WASM に委譲する。
- 画面状態は Svelte store が持ち、永続化は `localStorage` と URL クエリで分担する。

## 主要画面
- `/`: メイン画面。発駅設定、区間追加、サマリー確認、きっぷホルダ操作の起点。
- `/terminal-selection`: 発駅・着駅選択。グループ、都道府県、履歴、検索を横断する。
- `/line-selection`: 路線一覧の中間画面。次に駅選択へ渡す文脈を保持する。
- `/route-station-select`: 分岐駅または着駅を選ぶ再利用画面。
- `/detail`: 経路詳細、運賃内訳、共有、結果出力、詳細オプション。
- `/save`: 保存済み経路の管理、インポート、エクスポート。
- `/version`: アプリ・DB・ビルド・Service Worker 更新情報。
- `/help`: 利用案内と注意事項。

## 主なユーザーフロー
1. 発駅を選ぶ。
2. 路線選択と駅選択を繰り返して経路を組み立てる。
3. メイン画面または詳細画面で運賃や営業キロを確認する。
4. 必要に応じて保存、きっぷホルダ登録、共有 URL 生成を行う。

## 状態管理
- `mainRoute`: 現在編集中の `Farert` インスタンス。
- `savedRoutes`: 保存済み `routeScript` 配列。
- `ticketHolder`: きっぷホルダ配列。
- `stationHistory`: 駅選択履歴。
- `mainScreenErrorMessage`: 画面遷移をまたいで返す一時エラーメッセージ。

上記は `src/lib/stores/index.ts` に定義される。永続化対象と一時状態を分けている点が重要で、`mainScreenErrorMessage` は `localStorage` に保存しない。

## 永続化方針
- `farert_current_route`: 現在編集中の経路。
- `farert_saved_routes`: 保存済み経路。
- `farert_ticket_holder`: きっぷホルダ。
- `farert_station_history`: 駅履歴。
- `theme`: ライト / ダーク設定。

`initStores(Farert)` が起動時復元を担い、各 store の購読で即時保存する。共有 URL やエクスポート文字列は `localStorage` には保存せず、都度生成する。

## 画面責務の分離
- メイン画面は「現在編集中の経路」を直接編集する。
- 保存画面は `savedRoutes` と `mainRoute` を読み書きするが、計算エンジンそのものは持たない。
- 詳細画面は URL で受け取った経路を一時的に復元して表示する。編集中の `mainRoute` を直接共有しない。
- ドロワーは補助導線であり、経路編集の正本は常にメイン画面側の `mainRoute` にある。

## routeScript と URL 共有
- 経路の実体は `routeScript()` ベースで扱う。
- 詳細画面共有では `routeScript` を `lz-string` で圧縮して `r` クエリに載せる。
- 復元時は `buildRoute()` を優先し、一致しない場合は `addStartRoute()` / `addRoute()` で再構築する。
- これにより、編集中経路・保存済み経路・きっぷホルダ経路を同一表現で受け渡せる。

## PWA 要件
- Service Worker は `src/lib/service-worker.js` で提供する。
- アプリシェルと `farert.js` / `farert.wasm` / `farert.data` を再利用可能にし、オフライン時も既存キャッシュから復元できるようにする。
- 深い URL への直接遷移でも復旧できるよう、shell fallback を考慮する。
- 更新は `+layout.svelte` と `/version` 画面から検出し、待機中 worker へ `SKIP_WAITING` を送って反映する。

## 実装と設計の読み分け
- 画面単位の UI 要件は各 `*-screen.md` を参照する。
- 状態遷移や入出力の正確な経路は `specs/screen-flow-and-io.md` を参照する。
- WASM API の引数・返却値の最終正本は `../farert-wasm/docs/API.md` を参照する。

## SwiftUI 版への移植方針
- 仕様書では URL クエリを「ナビゲーション入力コンテキスト」と読み替えられるように書く。
- Svelte store は SwiftUI では `Observable` な状態コンテナや Repository に置き換える前提で読む。
- 画面仕様は View の見た目だけでなく、入力、内部状態、確定結果、エラー出力までを含めて残す。
