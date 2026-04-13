# バージョン情報画面仕様

## 対象
- ルート: `/version`
- 実装: `src/routes/version/+page.svelte`

## 画面の役割
- アプリの配布単位としての情報をまとめて表示する。
- WASM DB の版情報を利用者に見せる。
- Service Worker 更新の明示的な入口を提供する。

## 表示項目
- アプリアイコン
- 画面タイトル
- アプリバージョン
- ビルド日時
- コミット日時と SHA
- DB 名称
- DB 作成日
- 消費税率
- 著作権表示
- 免責・ライセンス案内
- README / LICENSE へのリンク
- 変更履歴へのリンク
- サポートサイト URL
- 更新確認ボタン
- 閉じるボタン

## データ取得
- 初回表示時に `initFarert()` 後、`databaseInfo()` を取得する。
- 取得値は `parseDatabaseInfo()` で吸収する。
- DB 名称や作成日は `dbName` / `name` / `create_date` / `createdate` など複数キー候補から読み取る。
- 消費税率は `databaseInfo()` が返す実行時税率 `tax` を表示する。
- ビルド情報は `src/lib/version.ts` に埋め込まれた `APP_VERSION`, `BUILD_AT`, `GIT_COMMIT_AT`, `GIT_SHA` を使う。

## 更新確認フロー
1. `getReadyServiceWorkerRegistration()` で registration を取得する。
2. `registration.waiting` があればそのまま反映候補とする。
3. なければ `waitForPendingWorker(registration, 4000)` を開始してから `registration.update()` を呼ぶ。
4. 待機中 worker が見つかれば `SKIP_WAITING` を送る。
5. `controllerchange` 後に再読み込みして最新版へ切り替える。

この画面で明示的な更新ボタンを持つ理由は、PWA では新しい SW が配信済みでも、利用者が反映タイミングを把握しにくいためである。

## エラーとフォールバック
- WASM 初期化または DB 情報取得に失敗した場合はバナー表示する。
- Service Worker 非対応環境では「更新できない」旨を文言で返す。
- 更新通知送信に失敗した場合は再読み込みへフォールバックする。

## 外部導線
- サポートサイトは別タブで開く。
- README / LICENSE は GitHub 上の文書へ遷移する。
- 変更履歴は `https://github.com/farert/farert-pwa/commits/main/` へ遷移する。
- README / LICENSE / 変更履歴リンクは通常リンクと分かる視覚表現にする。
- 閉じる操作は `/` に戻る。
