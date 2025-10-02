# Farert モバイルアプリからPWAへの移行 (SvelteKit PWA)

## 基本設定
- 常に日本語で返答してください
- エラーメッセージも日本語で説明してください

## コーディング規約
- テスト駆動開発（TDD）の手法で開発してください
- コミットメッセージは conventional commits 形式で書いてください
- 関数は単一責任の原則に従って小さく保ってください

## 技術的な制約
- TypeScript を使用する際は strict モードを有効にしてください
- CSS は Tailwind CSS を優先的に使用してください
- コアロジックは、WASM モジュールをロードして実行します。WASMプロジェクトは、
`~/priv/Farert.repos/farert-wasm/` にあります。使用法は、
`~/priv/Farert.repos/farert-wasm/CLAUDE.md`
`~/priv/Farert.repos/farert-wasm/README.md`
を参照してください

## プロジェクトのソース
- 旧版Android: ~/priv/Farert.android
- 新版Android: ~/priv/farert.repos/farert/app/Farert.android
- iOS オリジナル: ~/priv/farert.repos/farert/app/Farert.ios/Farert
- WASM

## 出力先
- SvelteKit PWA: ~/priv/farert.repos/farert-pwa

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
- `specs/drawer-navigation.md` - ドロワーナビゲーション
- `specs/station-selection-screen.md` - 駅選択関連画面
- `specs/save-screen.md` - 保存画面
- `specs/detail-screen.md` - 詳細画面
- `specs/version-info-screen.md` - バージョン情報画面
- `specs/option-menu.md` - オプションメニュー
- `specs/data-model.md` - データモデル定義
- `specs/screen-flow-and-io.md` - 画面遷移フロー＆IO定義

## スクリーンショットの参照先
スクリーンショットの場所: ~/priv/farert.repos/farert-pwa/screenshots/

画面のマッピング:
- main.png: リスト表示のメイン画面
- drawer.png: 開いたナビゲーションドロワー
- drawer_list.png: ドロワー内のリストビュー
- select.png: 4つのリストオプションを表示する選択画面
- settings.png: 設定/構成画面
- save.png: 保存/エクスポート機能画面
- detail.png: 詳細情報表示画面

正確なレイアウトの再現とレスポンシブデザインの決定のための視覚的な参考資料として使用してください。

## キャプチャすべき画面状態
- main.png: データが入力されたリストを表示（空の状態ではない）
- drawer.png: ドロワーが完全に開いた状態、メニュー項目が見える
- select.png: 4つの選択オプションすべてが明確に表示されている
- settings.png: すべての設定オプションが見える（多様性を示すためにスクロール）
- detail.png: サンプルの詳細コンテンツが読み込まれている

ライトモードでキャプチャ（ダークモードはオプションですが、あると便利です）。

## アプリのコンテキスト
- アプリ名: Farert（Fare + Ticket）
- アプリアイコン: 昭和時代の硬券切符をモチーフにした紫色のデザイン
- 主な目的: JR線の経路と運賃を計算するアプリ
- 主要なユーザーワークフロー:
  1. 発駅を選択
  2. 経由する路線と駅を順次追加
  3. 営業キロ・運賃・有効日数などの詳細情報を表示
  4. 経路を保存・共有

## 技術要件
- 最小限の構成でSvelteKit（SPAモード）
- ファイルベースルーティング
- ドロワーナビゲーション付きの共有 +layout.svelte
- @vite-pwa/sveltekitを使用したPWA
- TypeScriptを全体で使用（strict mode）
- データ永続化のためのlocalStorage（1-2MB）
- クライアントサイドのみ（SSRなし、APIルートなし）
- WASM統合（../farert-wasm/ プロジェクトと連携）
- Tailwind CSS使用
- DevContainer環境での開発

## PWA設定

- manifest.json - アプリ名、アイコン、テーマカラー、表示モードなどの定義
- Service Worker - オフラインでの動作を可能にするキャッシュ戦略
- インストール機能 -　ホーム画面に追加できるようにする
- オフライン対応 - ネット接続がなくても動作

## TypeScript strict mode 設定

- すべての厳格チェックを有効化
- 暗黙的なany型を禁止
- null/undefinedチェックを厳格化
- 未使用の変数を警告
- 未使用のパラメータを警告

## データ管理（シンプルなアプローチ）
- ローカル永続化のためのlocalStorage（1-2MBのテキストデータ）
- ユーザー制御のデータ共有のためのコピー＆ペースト
- エクスポート/インポート機能（JSON、プレーンテキスト）
- サーバーインフラストラクチャは不要
- 完全にオフライン対応

## デザインアプローチ
反復的な改善を伴うモバイルからWebへの直接変換:
1. ピクセルパーフェクトな初期変換を作成
2. レスポンシブデザインの原則を自動的に適用
3. 主要なコンポーネントに対して複数のデザインバリエーションを提供
4. フィードバックに基づいた迅速な反復を可能にする
5. モバイルの制約よりもWeb固有のUX改善に焦点を当てる

モダンでアクセシブルなCSSを現代的なデザイントレンドで生成します。

## 変換戦略
- AndroidのXMLレイアウトをSvelteページコンポーネントに変換
- Fragment/ActivityのナビゲーションをSvelteKitのルーティングにマッピング
- RecyclerViewsをリアクティブなSvelteリストに変換
- ドロワーナビゲーション付きの共有レイアウトを作成
- PWAのインストールとオフライン機能を実装
- 構成を最小限に保つ - 過度なエンジニアリングを避ける
- Androidのcolors.xmlとiOSのAssetsから色を自動抽出
- ピクセルパーフェクトな変換のための視覚的参考としてスクリーンショットを使用

## 期待される出力
モダンなSvelteKit PWAで:
- Androidの進化形からのピクセルパーフェクトなUI
- 高パフォーマンスのコアロジック（WASM統合準備済み）
- 適切なインターフェースを持つTypeScriptを全体で使用
- コピー＆ペースト共有によるシンプルなデータ管理
- Progressive Web Appの機能
- オフラインファーストの機能

不必要な複雑さを避け、SvelteKitのルーティングの利点を活用したクリーンで高速でインストール可能なPWAを作成します。

# 重要な指示の再確認
求められたことを実行してください。それ以上でも以下でもありません。
目標達成に絶対に必要な場合を除き、ファイルを作成しないでください。
常に新しいファイルを作成するよりも既存のファイルを編集することを優先してください。
ユーザーが明示的に要求しない限り、ドキュメントファイル（*.md）やREADMEファイルを積極的に作成しないでください。
