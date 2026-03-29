# バージョン情報画面仕様

## 対象
- ルート: `/version`
- 実装: `src/routes/version/+page.svelte`

## 表示項目
- アプリアイコン
- アプリバージョン
- ビルド日時
- コミット日時と SHA
- DB 名称
- DB 作成日
- 消費税率
- 著作権表示
- README / LICENSE へのリンク

## データ取得
- `databaseInfo()` の JSON を `parseDatabaseInfo()` で吸収する
- DB 名称や作成日は複数キー候補から読み取る
- ビルド情報は `src/lib/version.ts` の埋め込み値を使う

## 更新機能
- `getReadyServiceWorkerRegistration()`
- `waitForPendingWorker()`
- `registration.update()`
- 待機中 worker が見つかれば `SKIP_WAITING` を送る
- `controllerchange` 後に再読み込みする

## 外部導線
- サポートサイトを別タブで開く
- 閉じる操作は `/` に戻る
