# AGENTS.md

Farert PWA 開発時の最小運用ルール。
詳細仕様は `specs/` を参照し、このファイルには重複記述しない。

## 基本方針
- 常に日本語で返答する
- エラー説明も日本語で行う
- Svelte 5 / SvelteKit 前提で実装する

## 必須ルール
- TDD で進める（`vitest` / `playwright`）
- コミットメッセージは Conventional Commits
- 関数は単一責任で小さく保つ
- TypeScript は strict を維持する
- スタイルは Tailwind CSS 優先
- 運賃計算などコアロジックは WASM を利用する

## 仕様の参照順（優先順）
1. `specs/INDEX.md`（仕様の入口）
2. `specs/*.md`（画面・データ・フロー仕様）
3. `../farert-wasm/docs/API.md`（WASM API の正本）

## 変更時ルール
- 仕様変更は先に `specs/` を更新してから実装する
- 実装変更時は関連テストを同時に更新する
- 新規ファイル作成は必要最小限。可能なら既存ファイルを編集する
- 変更後は、変更点の概要の説明の後に、git commit 時のコメント用の説明を英語で複数行形式で併記する
  - 1 行目は Conventional Commits の `subject`
  - 2 行目は空行
  - 3 行目以降は変更理由や要点を簡潔に書く `body`

## テスト時のルール
- Dockerコンテナ内で実施する
- Docker コンテナ起動は、以下
 ```
./docker.sh start
./docker.sh shell
```
- 詳細は、 README.md を参照

## 関連リポジトリ
- WASM 実装: `../farert-wasm/`
- WASM 元ソース（マスター）: `../farert/`
