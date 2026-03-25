# Specs Index

このファイルは `specs/` の入口です。
各仕様の正本を明確にし、重複記述を避けることを目的とします。

## 参照順（優先順）
1. この `specs/INDEX.md`
2. 全体概要: `specs/app.md`
3. 機能別仕様（画面・データ・遷移）
4. WASM API 正本: `../farert-wasm/docs/API.md`

## 主要仕様
- 全体構成・用語凡例: `specs/app.md`
- 画面遷移と入出力: `specs/screen-flow-and-io.md`
- メイン画面: `specs/main-screen.md`
- 発駅選択: `specs/terminal-selection-screen.md`
- 路線選択: `specs/line-selection-screen.md`
- 駅選択: `specs/station-selection-screen.md`
- 経路追加時の駅選択（route-station-select）: `specs/line-selection-screen.md` で管理
- route-station-select の利用元: `main-screen` と `terminal-selection-screen` の両方（遷移詳細は `specs/screen-flow-and-io.md`）
- 詳細画面: `specs/detail-screen.md`
- 保存画面: `specs/save-screen.md`
- ドロワー: `specs/drawer-navigation.md`
- オプション: `specs/option-menu.md`
- URL 圧縮経路: `specs/url-routing.md`

## 画面対応表

| 仕様書 | 画面名 | ルート | 実装 | 補足 |
|---|---|---|---|---|
| `specs/main-screen.md` | メイン画面 | `/` | `src/routes/+page.svelte` | アプリの初期画面 |
| `specs/detail-screen.md` | 詳細画面 | `/detail` | `src/routes/detail/+page.svelte` | 運賃詳細表示 |
| `specs/terminal-selection-screen.md` | 発着駅選択画面 | `/terminal-selection` | `src/routes/terminal-selection/+page.svelte` | 発駅・着駅の選択に使用 |
| `specs/line-selection-screen.md` | 路線選択画面 | `/line-selection` | `src/routes/line-selection/+page.svelte` | メイン画面と発着駅選択画面の両方から遷移 |
| `specs/station-selection-screen.md` | 駅選択画面 | `/route-station-select` | `src/routes/route-station-select/+page.svelte` | 分岐駅選択 / 着駅選択のトグルを含む |
| `specs/save-screen.md` | 保存画面 | `/save` | `src/routes/save/+page.svelte` | 保存済み経路の管理 |
| `specs/version-info-screen.md` | バージョン情報画面 | `/version` | `src/routes/version/+page.svelte` | バージョン・更新情報表示 |

### 補足ルール

- `src/routes` のディレクトリ名を正本のルート名とみなす。
- 画面仕様の正本は、上表の「仕様書」列を優先する。
- `specs/component-design.md` の画面名やコンポーネント名は UI 設計上の呼称であり、ルート名と一致しない場合がある。
- `/route-station-select` は `specs/station-selection-screen.md` を画面仕様の正本とする。
- `/route-station-select` の利用元や画面フローの補足は `specs/line-selection-screen.md` と `specs/screen-flow-and-io.md` を参照する。

## データ・設計
- データモデル: `specs/data-model.md`
- コンポーネント設計: `specs/component-design.md`
- UI ガイドライン: `specs/ui-guidelines.md`
- デザイントークン: `specs/design-tokens.md`

## 検索関連
- あいまい検索仕様: `specs/fuzzy-search.md`
- API 仕様（PWA側ミラー）: `specs/API.md`

## 更新ルール
- 仕様変更時は、該当する最小ファイルのみ更新する
- 同じ内容を複数ファイルに複製しない
- API 仕様は `../farert-wasm/docs/API.md` を正本とし、`specs/API.md` は同期する
