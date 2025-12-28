# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Farert モバイルアプリからPWAへの移行 (SvelteKit PWA)

## 基本設定
- 常に日本語で返答してください
- エラーメッセージも日本語で説明してください

## コーディング規約
- テスト駆動開発（TDD）の手法で開発してください
- コミットメッセージは conventional commits 形式で書いてください
- 関数は単一責任の原則に従って小さく保ってください

## プロジェクト構造

```
farert-pwa/
├── specs/              # 画面仕様・データモデル定義
├── images/             # アプリアイコン画像
├── farert-svelte/      # 補助スクリプトとテンプレート
├── chat/               # プロトタイプコード（参考用）
├── .devcontainer/      # DevContainer設定
└── src/                # (実装予定) SvelteKitソースコード
    ├── routes/         # ページコンポーネント
    ├── lib/            # 共有コンポーネント・ストア・ユーティリティ
    └── wasm/           # WASM統合コード
```

## 開発コマンド

プロジェクトはまだ初期段階です。SvelteKitプロジェクトのセットアップ後、以下のコマンドが使用可能になります：

```bash
# 依存関係のインストール
pnpm install

# 開発サーバー起動（ホットリロード有効）
pnpm dev

# 本番ビルド
pnpm build

# 本番ビルドのプレビュー
pnpm preview

# TypeScriptの型チェック
pnpm check

# リント実行
pnpm lint

# テスト実行（TDD）
pnpm test

# テストウォッチモード
pnpm test:watch
```

## DevContainer環境

このプロジェクトはDevContainer環境での開発を推奨しています：

- Node.js 20 LTS環境
- pnpmがプリインストール済み
- WASMプロジェクト (`../farert-wasm/`) が `/workspace-wasm` に読み取り専用でマウント
- 開発サーバーのポート: 5173（開発）、4173（プレビュー）

## 技術的な制約

- TypeScript strict モードを有効にする
- CSS は Tailwind CSS を優先的に使用
- コアロジックは WASM モジュールをロードして実行
  - WASMプロジェクト: `~/priv/farert.repos/farert-wasm/`（DevContainer内: `/workspace-wasm`）
  - 詳細: `/workspace-wasm/CLAUDE.md` と `/workspace-wasm/README.md` を参照

## 参照プロジェクト

- 旧版Android: ~/priv/Farert.android
- 新版Android: ~/priv/farert.repos/farert/app/Farert.android
- iOS オリジナル: ~/priv/farert.repos/farert/app/Farert.ios/Farert
- WASM: ~/priv/farert.repos/farert-wasm/

## アプリ構成（画面とルーティング）

### 主要画面
1. メイン画面 (/) - 経路リスト表示
2. 発駅選択画面 (/station-select) - グループ・都道府県・履歴タブ
3. 路線選択画面 (/line-select) - 路線一覧
4. 駅一覧画面 (/station-list) - 駅一覧
5. 経路追加画面 (/route-add) - 路線選択
6. 駅選択画面 (/route-station-select) - 分岐駅・着駅選択
7. 詳細画面 (/detail) - 運賃詳細表示
8. 保存画面 (/save) - 経路保存・インポート・エクスポート
9. バージョン情報画面 (/version) - アプリ・DB情報

### レイアウトコンポーネント
- ドロワーナビゲーション - きっぷホルダ（経路リスト）

### 詳細仕様ドキュメント
すべての画面仕様は `specs/` ディレクトリに定義されています：
- `specs/main-screen.md` - メイン画面
- `specs/drawer-navigation.md` - キップホルダー画面 ドロワーナビゲーション
- `specs/station-selection-screen.md` - 駅一覧・経路追加用駅選択画面
- `specs/line-selection-screen.md` - 路線選択画面
- `specs/terminal-selection-screen.md` - 発駅選択画面（発駅/着駅選択）
- `specs/save-screen.md` - 保存画面
- `specs/detail-screen.md` - 詳細画面
- `specs/version-info-screen.md` - バージョン情報画面
- `specs/option-menu.md` - オプションメニュー
- `specs/data-model.md` - データモデル定義
- `specs/screen-flow-and-io.md` - 画面遷移フロー＆IO定義

- WASM API仕様は、../farert-wasm/docs/API.md を参照すること
- WASM の導入は、../farert-wasm/README.md を参照
- URLルーティング仕様（経路の圧縮）は、specs/url-routing.md を参照

### UI仕様凡例

 プロジェクトの specs 以下のドキュメントは、以下の表記ルールに則り記述する.

| 項目         | 意味・用途                                           | 表記例                     |
|--------------|------------------------------------------------------|----------------------------|
| 変数名       | コード上で使用する識別子。UIとは直接関係しない。     | ``station``                 |
| 画面名       | UI上の画面タイトルやセクション名。固定表示。         | **<経路選択>**              |
| ボタンラベル | UI上のボタンに表示される文字列。ユーザー操作対象。   | ``[追加]``                    |
| 表示名       | UI上に**固定で表示されるラベル名**。動的ではない。   | "路線"                  |
| 表示例       | 表示名の下などに**動的に表示される値の一例**。       | _三重_                    |
| リンク       | ボタンラベル以外のタップすると動作する文字列       | _`行`_                    |

- 関数定義で、`wasm.func()` とあるのは、WASMモジュール関数であることを示す

## アプリのコンテキスト
- アプリ名: Farert（Fare + Ticket）
- アプリアイコン: 昭和時代の硬券切符をモチーフにした紫色のデザイン
- 主な目的: JR線の経路と運賃を計算するアプリ
- 主要なユーザーワークフロー:
  1. 発駅を選択
  2. 経由する路線と駅を順次追加
  3. 営業キロ・運賃・有効日数などの詳細情報を表示
  4. 経路を保存・共有

## 技術スタック・アーキテクチャ

### フロントエンド
- **SvelteKit**: SPAモード（SSRなし、APIルートなし）
- **TypeScript**: strict モード必須
- **Tailwind CSS**: スタイリング
- **@vite-pwa/sveltekit**: PWA機能（オフライン対応、ホーム画面追加）

### データ層
- **localStorage**: 永続化（1-2MBのテキストデータ）
  - 現在の経路、保存経路、きっぷホルダ、駅履歴
- **Svelte Stores**: グローバル状態管理
  - `currentRoute`, `savedRoutes`, `ticketHolder`, `stationHistory`

### ビジネスロジック
- **WASM**: 運賃計算エンジン
  - 経路計算、運賃計算、データベース照会
  - DevContainer内で `/workspace-wasm` にマウント

### PWA要件
- manifest.json: アプリメタデータ（名前、アイコン、テーマカラー）
- Service Worker: オフラインキャッシュ戦略
- インストール可能: ホーム画面に追加可能

## 実装アプローチ

### モバイルからWebへの移行戦略
1. Android/iOSの既存実装を参考にしながら、Webネイティブな実装を行う
2. レスポンシブデザインでモバイル・デスクトップ両対応
3. ファイルベースルーティングで画面遷移を実装
4. 共有レイアウト（+layout.svelte）でドロワーナビゲーションを実装
5. 最小限の構成を維持、過度なエンジニアリングを避ける

### データ共有
- コピー＆ペーストによる経路の共有（スペース区切りテキスト形式）
- エクスポート/インポート機能（CSV形式）
- サーバー不要、完全にクライアントサイドで完結

### WASM統合の手順
1. WASMモジュールのビルド（`/workspace-wasm` 内）
2. 生成された `.wasm` ファイルを `static/` にコピー
3. `src/lib/wasm/` にTypeScript型定義とラッパー関数を作成
4. 各画面から `wasm.calculateFare()` などを呼び出し

# 重要な指示の再確認
求められたことを実行してください。それ以上でも以下でもありません。
目標達成に絶対に必要な場合を除き、ファイルを作成しないでください。
常に新しいファイルを作成するよりも既存のファイルを編集することを優先してください。
ユーザーが明示的に要求しない限り、ドキュメントファイル（*.md）やREADMEファイルを積極的に作成しないでください。

# デプロイ

## Github Pages

プロジェクトサイトとして `https://<username>.github.io/farert-pwa/` にデプロイされます。

### 自動デプロイ

`main` ブランチへのpush時に自動的にビルド・デプロイされます（Github Actions使用）。

### 初回セットアップ

1. リポジトリの Settings > Pages を開く
2. Source: "GitHub Actions" を選択
3. `main` ブランチにpushすると自動デプロイが開始されます

### 手動デプロイ

```bash
pnpm build
# build/ ディレクトリの内容をGithub Pagesにデプロイ
```

### ローカルでの本番ビルド確認

```bash
NODE_ENV=production pnpm build
pnpm preview
# http://localhost:4173/farert-pwa/ でアクセス
```



