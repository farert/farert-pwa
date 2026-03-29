# Specs Index

`specs/` の入口です。現行の SvelteKit 実装に合わせ、ルート・ストア・WASM 連携の正本をここから参照します。

## 参照順
1. この `specs/INDEX.md`
2. `specs/app.md`
3. 個別画面・機能仕様
4. `../farert-wasm/docs/API.md`

## 画面対応表

| 仕様書 | 画面 | ルート | 実装 |
|---|---|---|---|
| `specs/main-screen.md` | メイン画面 | `/` | `src/routes/+page.svelte` |
| `specs/detail-screen.md` | 詳細画面 | `/detail` | `src/routes/detail/+page.svelte` |
| `specs/terminal-selection-screen.md` | 発着駅選択画面 | `/terminal-selection` | `src/routes/terminal-selection/+page.svelte` |
| `specs/line-selection-screen.md` | 路線選択画面 | `/line-selection` | `src/routes/line-selection/+page.svelte` |
| `specs/station-selection-screen.md` | 駅選択画面 | `/route-station-select` | `src/routes/route-station-select/+page.svelte` |
| `specs/save-screen.md` | 保存画面 | `/save` | `src/routes/save/+page.svelte` |
| `specs/version-info-screen.md` | バージョン情報画面 | `/version` | `src/routes/version/+page.svelte` |
| `specs/help-screen.md` | ヘルプ画面 | `/help` | `src/routes/help/+page.svelte` |

## 機能仕様
- 全体概要: `specs/app.md`
- 画面遷移と入出力: `specs/screen-flow-and-io.md`
- ドロワー: `specs/drawer-navigation.md`
- オプション: `specs/option-menu.md`
- URL 圧縮経路: `specs/url-routing.md`
- データモデル: `specs/data-model.md`
- コンポーネント一覧: `specs/component-design.md`
- UI 方針: `specs/ui-guidelines.md`
- デザイントークン: `specs/design-tokens.md`
- あいまい検索: `specs/fuzzy-search.md`

## 補足ルール
- ルート名の正本は `src/routes` 配下のディレクトリ名とする。
- 実装と仕様が食い違う場合、まず `src/routes` と `src/lib` を確認し、その内容に合わせて仕様を更新する。
- `specs/` では理想設計ではなく、現行実装の説明を優先する。
- WASM API の詳細な返却形式・利用可能関数は `../farert-wasm/docs/API.md` を優先する。
