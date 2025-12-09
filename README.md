# Farert PWA

JR運賃計算アプリ - SvelteKit PWA版

## セットアップ

### 前提条件

- Node.js 20+
- pnpm
- farert-wasmプロジェクトがビルド済み（`../farert-wasm/`）

### インストール

farert-pwa リポジトリトップディレクトリで、
`code .`
または、
`code -n .`
で、DevContainerを起動し、コンテナ内で実施することを推奨しています。

```bash
# 依存関係のインストール
pnpm install

# WASMファイルのコピー（オプション：最新版を使いたい場合）
# コミット済みのWASMファイルがあるため、通常は不要
pnpm copy:wasm
```

### 開発

```bash
# 開発サーバー起動（WASMファイルを自動コピー）
pnpm dev
```

ブラウザで http://localhost:5173/ を開きます。

### ビルド

```bash
# 本番ビルド（WASMファイルを自動コピー）
pnpm build

# プレビュー
pnpm preview
```

## デプロイ

### Netlify / Cloudflare Pages

このプロジェクトは静的サイトホスティングサービスに直接デプロイできます。

#### ビルド設定

- **Build command**: `pnpm build`
- **Publish directory**: `build`
- **Node version**: 20

#### 環境変数

CI環境では `CI=true` が自動的に設定されるため、`copy-wasm.sh` がスキップされ、リポジトリにコミット済みのWASMファイルが使用されます。

#### WASMファイルの更新

WASMファイルを更新する場合：

```bash
# ローカルで最新のWASMファイルをコピー
pnpm copy:wasm

# 変更をコミット
git add static/farert.{wasm,js,data}
git commit -m "chore: update WASM files"
git push
```

#### Netlifyのリダイレクト設定

`static/_redirects` ファイルがSPAルーティングのために設定されています：

```
/*    /index.html   200
```

### 手動デプロイ

```bash
# ビルド実行
pnpm build

# build/ ディレクトリの内容を任意の静的ホスティングにアップロード
```

## プロジェクト構造

```
farert-pwa/
├── src/
│   ├── lib/wasm/          # WASM統合
│   ├── routes/            # ページコンポーネント
│   ├── app.html           # HTMLテンプレート
│   └── service-worker.ts  # Service Worker
├── static/                # 静的ファイル
│   ├── farert.wasm        # WASMバイナリ（コミット済み）
│   ├── farert.js          # Emscriptenローダー（コミット済み）
│   ├── farert.data        # データベース（コミット済み）
│   └── _redirects         # Netlifyリダイレクト設定
├── specs/                 # 画面仕様
└── scripts/               # ビルドスクリプト
    └── copy-wasm.sh       # WASMファイルコピー（ローカル開発用）
```

**注**: WASMファイルはCI/デプロイ環境をサポートするためにリポジトリにコミットされています。ローカル開発では `pnpm copy:wasm` で最新版に更新できます。

## 技術スタック

- **SvelteKit**: SPAモード
- **TypeScript**: strict モード
- **Tailwind CSS v4**: スタイリング
- **WASM**: 運賃計算エンジン (farert-wasm)
- **PWA**: オフライン対応

## 開発ガイド

詳細な開発ガイドは `CLAUDE.md` を参照してください。

## ライセンス

GPL-3.0
