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
	- `injectManifest` 方式を使用し、`vite.config.ts` の `injectManifest.globPatterns` に以下を含める。
		- `html,js,css,svg,png,wasm,data,webmanifest`
	- PWA の `start_url` に対応する起動シェル (`/` または `BASE_URL/index.html`) を実ファイルとして生成し、オフラインでも直接起動できるようにする。
	- `src/lib/service-worker.js` は以下を必須要件として実装する。
		- キャッシュ登録: `precacheManifest` の全URLを `CACHE_NAME` でインストール時に `addAll`。
		- `start_url` 相当のシェルパス (`BASE_URL/`, `BASE_URL/index.html`) と fallback の `404.html` を明示的にキャッシュ対象へ含める。
		- ネットワーク優先 + キャッシュフォールバック。
		- `BASE_URL` を跨ぐパス差分（`/` と `/farert-pwa/` など）を吸収するため、キャッシュキー比較は `pathname` の先頭スラッシュ有無・`BASE_URL` 付与有無を候補化して判定する。
		- `navigate` リクエスト（`/route-station-select` などの深いURL）失敗時は、adapter-static の fallback である `404.html` を
		  `BASE_URL` 起点のシェルとして返し、画面を復元可能とする。
		- `navigate` リクエストがネットワーク例外ではなく `4xx/5xx` を返した場合も、WebKit/iOS のオフライン挙動を考慮して
		  shell fallback の対象とする。
		- `404.html` は precacheManifest に含まれない場合でも、Service Worker が明示的にキャッシュ対象へ追加する。
		- 外部ネットワーク障害時でも、`/route-station-select` を含む既存画面の再表示とWASM初期化に必要な静的資産の再利用を維持する。
	- インストール可能: ホーム画面に追加可能
- 更新ポリシー（PWAの運用）
	- 1) ビルドごとに新しいSWが配信される。
	- 2) `waiting` 状態で更新候補を待機。
	- 3) アプリ側（`+layout.svelte` / `/version`）から `SKIP_WAITING` を送信し、`controllerchange` 後に再読込。
	- 4) オフライン中は有効なキャッシュ版（現行キャッシュ）を継続利用。オンライン復帰後に更新反映。
- 重要資産として `farert.js`, `farert.wasm`, `farert.data` を同時にキャッシュ対象とし、
	  オフライン時の駅検索・経路計算・路線/駅一覧表示を阻害しない。

### WASM統合の手順
1. WASMモジュールのビルド（`/workspace-wasm` 内）
2. 生成された `.wasm` ファイルを `static/` に `scripts/copy-wasm.sh`でコピー
3. `src/lib/wasm/` にTypeScript型定義とラッパー関数を作成
4. 各画面から `wasm.calculateFare()` などを呼び出し
