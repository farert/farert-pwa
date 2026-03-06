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
