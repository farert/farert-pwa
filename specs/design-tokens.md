# デザイントークン

## 目的
- Farert PWA の見た目を支える共通値を定義する。
- CSS 変数の一覧ではなく、「どの意味の色か」「別 UI 実装でどう読み替えるか」を残す。
- SwiftUI 版では `Theme`, `Color`, `Typography`, `Spacing`, `Elevation` へ対応づけて利用する。

## 正本
- 実装の正本は `src/app.css` の CSS カスタムプロパティ。
- 仕様書はその意味づけと利用ルールを記述する。

## テーマ構造
- ライトテーマ: `:root`
- ダークテーマ: `[data-theme='dark']`

SwiftUI 版では `AppTheme.light` / `AppTheme.dark` のような定数群として持つ想定で読む。

## カラートークン

### 背景系
| トークン | 用途 | Light | Dark |
|---|---|---|---|
| `--bg` | 全体背景の基底色 | `#f4f5f7` | `#1a0a2e` |
| `--page-bg` | ページ面の背景 | `#f8fafc` | `#1a0a2e` |
| `--card-bg` | カード面 | `#ffffff` | `#000000` |
| `--menu-bg` | メニュー面 | `#ffffff` | `#0a0a0a` |
| `--input-bg` | 入力欄背景 | `#ffffff` | `#1a0a2e` |
| `--list-item-bg` | リスト項目背景 | `#f9fafb` | `#1a0a2e` |
| `--list-item-active` | 選択 / hover 相当 | `#eef2ff` | `#2d1b4e` |

### 文字系
| トークン | 用途 | Light | Dark |
|---|---|---|---|
| `--text-main` | 主本文字 | `#0f172a` | `#ffffff` |
| `--text-sub` | 補助文字 | `#6b7280` | `#e0d4f7` |
| `--title-color` | 見出し | `#1f2937` | `#ffffff` |
| `--subtitle-color` | サブタイトル | `#9ca3af` | `#c7d2fe` |
| `--link` | リンク | `#2563eb` | Light 値準用 |

### アクション系
| トークン | 用途 | Light | Dark |
|---|---|---|---|
| `--primary` | 主操作色 | `#2563eb` | `#6366f1` |
| `--primary-hover` | 主操作 hover / pressed | `#1d4ed8` | `#818cf8` |
| `--top-bar-bg` | ヘッダー帯 | `#1976d2` | `#3b1d6e` |
| `--nav-btn-bg` | 下部ナビ補助ボタン背景 | `#ede9fe` | `#3b1d6e` |
| `--nav-btn-text` | 下部ナビ補助ボタン文字 | `#4c1d95` | `#e0d4f7` |
| `--secondary-btn-bg` | 補助ボタン背景 | `#e5e7eb` | `#3b1d6e` |
| `--secondary-btn-text` | 補助ボタン文字 | `#1f2937` | `#ffffff` |

### 状態表示系
| トークン | 用途 | Light | Dark |
|---|---|---|---|
| `--info-bg` / `--info-text` | 情報バナー | `#eff6ff` / `#1d4ed8` | `#2d1b4e` / `#e0d4f7` |
| `--error-bg` / `--error-text` | エラーバナー | `#fee2e2` / `#b91c1c` | `#3f1d2e` / `#fecdd3` |
| `--success-bg` / `--success-text` | 成功表示 | `#dcfce7` / `#15803d` | `#1a3d2e` / `#86efac` |
| `--warning-bg` / `--warning-text` | 警告表示 | `#fff7ed` / `#c2410c` | `#3d2a1a` / `#fdba74` |
| `--danger` | 破壊的操作色 | `#dc2626` | `#ef4444` |

### 画面固有アクセント
| トークン | 用途 | Light | Dark |
|---|---|---|---|
| `--station-grad-start` | 発駅カード / グラデ開始 | `#6b21a8` | `#5b21b6` |
| `--station-grad-end` | 発駅カード / グラデ終端 | `#a855f7` | `#6d28d9` |
| `--add-card-bg` | 経路追加カード背景 | `#fff7ed` | `#2d1b4e` |
| `--add-card-text` | 経路追加カード文字 | `#92400e` | `#86efac` |
| `--fare-card-bg` | 運賃サマリー背景 | `#ecfdf5` | `#1a2d2e` |
| `--fare-card-label` | 運賃ラベル文字 | `#047857` | `#86efac` |
| `--fare-card-value` | 運賃値文字 | `#064e3b` | `#a7f3d0` |
| `--fare-card-accent` | 運賃アクセント | `#10b981` | `#34d399` |
| `--icon-bg` / `--icon-fg` | 円形アイコン背景 / 前景 | `#f3e8ff` / `#6b21a8` | `rgba(255,255,255,0.12)` / `#e0e7ff` |

### 補助表現
| トークン | 用途 |
|---|---|
| `--border-color` | 枠線 |
| `--overlay-dim` | モーダル・ドロワー背面オーバーレイ |
| `--code-bg` / `--code-text` | コードブロック |
| `--menu-shadow` | メニュー浮き上がり |
| `--card-shadow` | カード浮き上がり |

## タイポグラフィ

### フォント
- 本文: `'Noto Sans JP', system-ui, sans-serif`
- アイコン: `Material Symbols Rounded`

### 意味分類
- タイトル: 画面名や主見出し
- サブタイトル: 補助説明や経路補足
- 本文: 通常ラベル
- 補助: かな、注記、ステータス

SwiftUI 版では固定 px 値の移植よりも、`largeTitle`, `title3`, `body`, `caption` などへ意味対応させるほうがよい。

## 余白と寸法

### ルール
- 仕様書上の余白は 4px グリッドで考える。
- カード内余白、セクション間余白、固定バー高さはコンポーネント意味ごとに再利用する。

### 推奨スケール
- `4`, `8`, `12`, `16`, `20`, `24`, `32`, `40`, `48`, `64`

SwiftUI 版では `Spacing.xs/sm/md/lg/xl` のような semantic token 名に置き換えるのが望ましい。

## 角丸と影

### 角丸
- 小要素: 6px 前後
- 標準カード: 12px 前後
- 大きい面 / モーダル: 16px 前後
- 円形ボタン / バッジ: full

### 影
- カードは弱め
- メニュー / ドロワーはやや強め
- ダークテーマでは影を強め、境界を補う

SwiftUI 版では `cornerRadius` と `shadow(radius:y:)` の semantic wrapper を持たせる。

## コンポーネントへの適用原則
- ヘッダー帯は `--top-bar-bg`
- カード面は `--card-bg` と `--card-shadow`
- 追加導線は `--add-card-*`
- 運賃サマリーは `--fare-card-*`
- バナーは `info/error/success/warning`
- オーバーレイは `--overlay-dim`

## 運用ルール
- 新しい色や余白を追加する場合はまず `src/app.css` に変数を追加する。
- 仕様書上では「16px」より「カード内部の標準余白」のように意味でも記述する。
- SwiftUI 版を作る際は、CSS 名をそのまま移植するより semantic token 名へ再編してよい。
