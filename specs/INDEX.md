# Specs Index

`specs/` の入口です。実装追従のための索引であると同時に、画面仕様書を読む前提になる設計情報の目次でもあります。

## このディレクトリの役割
- 画面・状態・URL・永続化・PWA 更新など、Farert PWA の設計判断を説明する。
- 実装ファイルの所在を明示し、仕様とコードの往復をしやすくする。
- 「今そう動く」だけでなく、「どの責務がどこにあるか」を残す。
- 将来の別 UI 実装、特に SwiftUI 版の設計母体として利用できる粒度を保つ。

## 参照順
1. この `specs/INDEX.md`
2. 全体像と用語: `specs/app.md`
3. 共通設計: `specs/screen-flow-and-io.md` / `specs/data-model.md` / `specs/component-design.md`
4. 個別画面仕様: `specs/*-screen.md`
5. WASM API 正本: `../farert-wasm/docs/API.md`

## 主要仕様
- 全体構成・用語・永続化・PWA 前提: `specs/app.md`
- 画面遷移と画面間 I/O: `specs/screen-flow-and-io.md`
- メイン画面: `specs/main-screen.md`
- 発着駅選択: `specs/terminal-selection-screen.md`
- 路線選択: `specs/line-selection-screen.md`
- 駅選択: `specs/station-selection-screen.md`
- 詳細画面: `specs/detail-screen.md`
- 保存画面: `specs/save-screen.md`
- バージョン情報画面: `specs/version-info-screen.md`
- ヘルプ画面: `specs/help-screen.md`
- ドロワー: `specs/drawer-navigation.md`
- オプション: `specs/option-menu.md`
- URL 圧縮共有: `specs/url-routing.md`

## 画面対応表

| 仕様書 | 画面名 | ルート | 実装 | 補足 |
|---|---|---|---|---|
| `specs/main-screen.md` | メイン画面 | `/` | `src/routes/+page.svelte` | 経路編集の起点 |
| `specs/detail-screen.md` | 詳細画面 | `/detail` | `src/routes/detail/+page.svelte` | 運賃詳細と共有 |
| `specs/terminal-selection-screen.md` | 発着駅選択画面 | `/terminal-selection` | `src/routes/terminal-selection/+page.svelte` | 発駅・着駅選択の入口 |
| `specs/line-selection-screen.md` | 路線選択画面 | `/line-selection` | `src/routes/line-selection/+page.svelte` | 経路追加・文脈付き遷移 |
| `specs/station-selection-screen.md` | 駅選択画面 | `/route-station-select` | `src/routes/route-station-select/+page.svelte` | 分岐駅または着駅の確定 |
| `specs/save-screen.md` | 保存画面 | `/save` | `src/routes/save/+page.svelte` | 保存・読込・共有入出力 |
| `specs/version-info-screen.md` | バージョン情報画面 | `/version` | `src/routes/version/+page.svelte` | DB・ビルド・更新確認 |
| `specs/help-screen.md` | ヘルプ画面 | `/help` | `src/routes/help/+page.svelte` | 利用案内 |

## 共通設計
- データモデル: `specs/data-model.md`
- コンポーネント設計: `specs/component-design.md`
- UI ガイドライン: `specs/ui-guidelines.md`
- デザイントークン: `specs/design-tokens.md`
- あいまい検索: `specs/fuzzy-search.md`

## 用語と読み分け
- 「正本」は実装または外部仕様のうち、最終判断基準になるものを指す。
- 画面レイアウトや責務分担は `specs/` に残し、低レベルな API 契約は WASM 側資料を優先する。
- `/route-station-select` は再利用画面なので、利用文脈は `specs/line-selection-screen.md` と `specs/screen-flow-and-io.md` を併読する。

## 更新ルール
- 実装に合わせるだけでなく、変更理由・責務分担・制約も残す。
- 仕様変更時は、入口文書と該当画面仕様の両方を必要に応じて更新する。
- 同じ説明を複数ファイルに複製しすぎず、索引から辿れる形で分担する。
- SvelteKit 固有の記述と、UI フレームワーク非依存の振る舞いを混同しない。
- ルート名の正本は `src/routes` 配下のディレクトリ名とする。
- WASM API の返却形式や利用可能関数は `../farert-wasm/docs/API.md` を優先する。

## SwiftUI 版の推奨読順
1. `specs/app.md`
   アプリ全体像、責務分割、永続化方針を把握する。
2. `specs/data-model.md`
   `Farert`, `routeScript`, Repository, ViewState の境界を把握する。
3. `specs/screen-flow-and-io.md`
   画面遷移、入力コンテキスト、確定時の副作用を把握する。
4. 各 `*-screen.md`
   画面ごとの View / ViewModel 設計へ落とす。
5. `specs/component-design.md` と `specs/drawer-navigation.md`
   再利用 View と親子責務を整理する。
6. `specs/design-tokens.md` と `specs/ui-guidelines.md`
   Theme, Color, Typography, Spacing の設計へ落とす。
7. `specs/url-routing.md` と `specs/fuzzy-search.md`
   共有 URL と検索 API のフレームワーク非依存契約を確認する。

## SwiftUI 版への対応表
| 仕様書 | 主に対応する SwiftUI 側の関心 |
|---|---|
| `specs/app.md` | アプリ構成、Coordinator 方針 |
| `specs/data-model.md` | Entity / Repository / Session |
| `specs/screen-flow-and-io.md` | Router / Coordinator / ViewModel 入出力 |
| `specs/*-screen.md` | View / ViewModel |
| `specs/component-design.md` | 再利用 View と親子責務 |
| `specs/design-tokens.md` | Theme / Color / Typography / Spacing |
| `specs/url-routing.md` | Deep Link / Share Link 契約 |
| `specs/fuzzy-search.md` | Search Service / Search ViewModel |
