# Farert PWA

JR運賃計算アプリ - SvelteKit PWA版

## セットアップ

### 前提条件

- Node.js 20+
- pnpm
- farert-wasmプロジェクトがビルド済み（`../farert-wasm/`）

### インストール

```bash
# 依存関係のインストール
pnpm install

# WASMファイルのコピー（初回のみ）
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

## プロジェクト構造

```
farert-pwa/
├── src/
│   ├── lib/wasm/          # WASM統合
│   ├── routes/            # ページコンポーネント
│   ├── app.html           # HTMLテンプレート
│   └── service-worker.ts  # Service Worker
├── static/                # 静的ファイル
│   ├── farert.wasm        # WASMバイナリ（自動コピー）
│   ├── farert.js          # Emscriptenローダー（自動コピー）
│   └── farert.data        # データベース（自動コピー）
├── specs/                 # 画面仕様
└── scripts/               # ビルドスクリプト
    └── copy-wasm.sh       # WASMファイルコピー
```

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
