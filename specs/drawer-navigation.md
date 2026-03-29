# きっぷホルダ仕様

## 対象
- コンポーネント: `src/lib/components/DrawerNavigation.svelte`
- 呼び出し元: `src/routes/+page.svelte`

## 入力
- `isOpen`
- `isEditing`
- `items`
- `canAdd`
- `onClose`
- `onToggleEdit`
- `onItemClick`
- `onItemDelete`
- `onFareTypeChange`
- `onMoveItem`
- `onAddToHolder`
- `onShare`

## 表示
- ヘッダー
- 総運賃
- 総営業キロ
- 共有ボタン
- 編集切替ボタン
- 追加ボタン
- `TicketHolderCard` 一覧

## 振る舞い
- 総運賃と総営業キロは `items` から導出する。
- 編集モードでは削除 UI を見せる。
- 並べ替えは PC の drag and drop とモバイルの touch 両対応。
- 追加ボタンは `canAdd=false` のとき無効化する。

## 共有形式
- ホルダ内の `routeScript` を改行区切りで連結したテキスト。
- 合計運賃や合計キロは共有本文に含めない。
