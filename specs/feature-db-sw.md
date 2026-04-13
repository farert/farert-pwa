# DB切替と配信方式の最小仕様

> この文書は将来検討用の仕様メモであり、現時点では実装対象ではない。
> 明示的な指示があるまで、本書の内容に基づく実装は行わない。

## 目的
- 単一の WASM バイナリを維持したまま、複数の運賃 DB を実行時に切り替えられるようにする。
- バージョン情報画面や運賃計算が、現在選択中の DB と消費税率を正しく表示できるようにする。
- 将来の Service Worker 配信戦略を整理し、DB 切替時のキャッシュ運用を破綻させないようにする。

## 基本方針
- `wasm` は 1 つだけ配布する。
- DB は複数保持し、実行時に選択する。
- 消費税率は DB 名から推定せず、実行時状態 `g_tax` を正とする。
- クライアントは `databaseInfo()` の返却値を表示し、独自推定を行わない。

## 対象 DB
- `2014`
- `2015`
- `2017`
- `newest`

各 DB は `dbKey` で識別する。

## WASM API
```ts
type DatabaseKey = '2014' | '2015' | '2017' | 'newest';

async function initFarert(): Promise<void>;
function openDatabase(dbKey: DatabaseKey): string;
function databaseInfo(): string;
function closeDatabase(): void;
```

## API の責務
### `initFarert()`
- WASM を初期化する。
- DB はまだ選択しない。

### `openDatabase(dbKey)`
- `dbKey` から対象 DB ファイルを決定する。
- 対象 DB に対応する `g_tax` を設定する。
- 対象 DB を開く。
- 開いた結果を JSON で返す。

### `databaseInfo()`
- 現在開いている DB の情報を返す。
- `tax` は必ず実行時の `g_tax` を返す。

### `closeDatabase()`
- 現在の DB を閉じる。

## `databaseInfo()` 返却形式
```json
{
  "result": true,
  "dbKey": "2017",
  "dbName": "2017",
  "createdate": "2017-03-14 12:43:43",
  "tax": 8
}
```

## 税率の扱い
- `tax` は DB メタデータの表示値ではなく、現在の運賃計算に使う実行時税率とする。
- `g_tax` は `openDatabase(dbKey)` の中で設定する。
- PWA 側で DB 名や作成日から税率を補完してはならない。

## PWA 側の実装方針
- 設定画面で `dbKey` を選択可能にする。
- 選択した `dbKey` はローカル保存する。
- 起動時に `initFarert()` 後 `openDatabase(savedDbKey)` を呼ぶ。
- バージョン情報画面は `databaseInfo()` をそのまま表示する。

## Service Worker 配信方針
- `wasm` は 1 ファイルをキャッシュする。
- DB ファイルは `dbKey` ごとに別アセットとしてキャッシュする。
- Service Worker は選択中 DB に加え、将来切替対象の DB も段階的にキャッシュ可能とする。
- DB 更新時は `wasm` 更新と独立してキャッシュ更新できる構成を優先する。

## 非採用方針
- DB ごとに別の WASM バイナリを配布する方式は、初期段階では採用しない。

理由:
- キャッシュ管理が複雑になる。
- 配布単位が増え、PWA 更新時の整合が取りづらい。
- バージョン情報と実行時状態の対応が分かりにくくなる。

## テスト観点
- `openDatabase('2014')` で `tax: 5` が返る。
- `openDatabase('2015')` で `tax: 8` が返る。
- `openDatabase('2017')` で `tax: 8` が返る。
- `openDatabase('newest')` で `tax: 10` が返る。
- `databaseInfo()` が現在選択中 DB の `dbKey`, `dbName`, `createdate`, `tax` を返す。
- バージョン情報画面が `databaseInfo().tax` をそのまま表示する。

## 今後の作業順
1. `../farert` の正本 API を `dbKey` 対応に拡張する。
2. `../farert-wasm` に同じ API を反映する。
3. `farert-pwa` に設定画面と保存処理を追加する。
4. Service Worker の DB キャッシュ戦略を実装する。
