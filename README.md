# 経路運賃営業キロ計算アプリ Farert　PWA版

## すぐ使ってみたい

-> [こちら](https://farert.github.io/farert-pwa/)です

## 概要
[リポジトリ](https://github.com/farert)は3つに分けられています。
- [farert](https://github.com/farert/farert): Android, iOS, macOS, Windows, database すべてのソースが格納（Active)(下図-左)
- [farert-wasm](https://github.com/farert/farert-wasm): WASM. [farert](https://github.com/farert/farert)の[コアロジック](https://github.com/farert/farert/tree/main/app/alps)に依存しています（参照しています)(Active)
- [farert-pwa](https://github.com/farert/farert-pwa): このリポジトリで、[farert-wasm](https://github.com/farert/farert-wasm) に依存します。(下図-右)

<table>
<tr>
    <th>
        Farert 構成
    </th>
    <th>
    PWA全体構成
    </th>
</tr>
<tr>
    <td>
<a href="https://github.com/user-attachments/assets/f41168fc-86e5-4d22-bab6-c536f725bc1a">
  <img src="https://github.com/user-attachments/assets/f41168fc-86e5-4d22-bab6-c536f725bc1a" width="300" />
</a>
</td><td>
<a href="https://github.com/user-attachments/assets/1ba3325c-db60-405c-bb95-26019a8c8f91">
<img alt="image" src="https://github.com/user-attachments/assets/1ba3325c-db60-405c-bb95-26019a8c8f91" width="300" />
</a>            
        </td>
    </tr>
</table>

## 開発者向けセットアップ

### 前提条件

- Node.js 20+
- pnpm
- farert-wasmプロジェクトがビルド済み（`../farert-wasm/`）
- Visual Stduio Code (Windowsの場合仮想環境使用せざる得ないので)
- (作者はWindowsを使用しての検証はしていません)

### インストール

farert-pwa リポジトリトップディレクトリで、Visual Studio Code を起動します。
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

### Github Pages

プロジェクトサイトとして https://farert.github.io/farert-pwa/ にデプロイされます。

#### 初回セットアップ

1. リポジトリの **Settings > Pages** を開く
2. **Source**: "GitHub Actions" を選択
3. `main` ブランチにpushすると自動デプロイが開始されます

#### 自動デプロイ

`main` ブランチへのpush時に自動的にビルド・デプロイされます（`.github/workflows/deploy.yml`）。

デプロイ状況は **Actions** タブで確認できます。

#### ローカルでの本番ビルド確認

```bash
# 本番モードでビルド（basePath: /farert-pwa/）
NODE_ENV=production pnpm build

# プレビュー（本番と同じパスでアクセス）
pnpm preview
# http://localhost:4173/farert-pwa/ を開く
```

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

#### デプロイ設定

- **Build command**: `pnpm build`
- **Publish directory**: `build`
- **Node version**: 20
- **Base path**: `/farert-pwa/`（本番ビルド時のみ）

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

AGPL-3.0
