# デザイントークン

## 目的
- Farert PWA の見た目を支える共通値を定義する。
- CSS 変数の一覧ではなく、「どの意味の色か」を残す。

## 正本
- 実装の正本は `src/app.css` の CSS カスタムプロパティ。
- 仕様書はその意味づけと利用ルールを記述する。

## テーマ構造
- ライトテーマ: `:root`
- ダークテーマ: `[data-theme='dark']`

## カラートークン

色値には小さい矩形の見本を併記する。

### 背景系
| トークン | 用途 | Light | Dark |
|---|---|---|---|
| `--bg` | 全体背景の基底色 | <span style="display:inline-block;width:1.1em;height:0.85em;border:1px solid #cbd5e1;vertical-align:middle;background:#f4f5f7;"></span> `#f4f5f7` | <span style="display:inline-block;width:1.1em;height:0.85em;border:1px solid #cbd5e1;vertical-align:middle;background:#1a0a2e;"></span> `#1a0a2e` |
| `--page-bg` | ページ面の背景 | <span style="display:inline-block;width:1.1em;height:0.85em;border:1px solid #cbd5e1;vertical-align:middle;background:#f8fafc;"></span> `#f8fafc` | <span style="display:inline-block;width:1.1em;height:0.85em;border:1px solid #cbd5e1;vertical-align:middle;background:#1a0a2e;"></span> `#1a0a2e` |
| `--card-bg` | カード面 | <span style="display:inline-block;width:1.1em;height:0.85em;border:1px solid #cbd5e1;vertical-align:middle;background:#ffffff;"></span> `#ffffff` | <span style="display:inline-block;width:1.1em;height:0.85em;border:1px solid #cbd5e1;vertical-align:middle;background:#000000;"></span> `#000000` |
| `--menu-bg` | メニュー面 | <span style="display:inline-block;width:1.1em;height:0.85em;border:1px solid #cbd5e1;vertical-align:middle;background:#ffffff;"></span> `#ffffff` | <span style="display:inline-block;width:1.1em;height:0.85em;border:1px solid #cbd5e1;vertical-align:middle;background:#0a0a0a;"></span> `#0a0a0a` |
| `--input-bg` | 入力欄背景 | <span style="display:inline-block;width:1.1em;height:0.85em;border:1px solid #cbd5e1;vertical-align:middle;background:#ffffff;"></span> `#ffffff` | <span style="display:inline-block;width:1.1em;height:0.85em;border:1px solid #cbd5e1;vertical-align:middle;background:#1a0a2e;"></span> `#1a0a2e` |
| `--list-item-bg` | リスト項目背景 | <span style="display:inline-block;width:1.1em;height:0.85em;border:1px solid #cbd5e1;vertical-align:middle;background:#f9fafb;"></span> `#f9fafb` | <span style="display:inline-block;width:1.1em;height:0.85em;border:1px solid #cbd5e1;vertical-align:middle;background:#1a0a2e;"></span> `#1a0a2e` |
| `--list-item-active` | 選択 / hover 相当 | <span style="display:inline-block;width:1.1em;height:0.85em;border:1px solid #cbd5e1;vertical-align:middle;background:#eef2ff;"></span> `#eef2ff` | <span style="display:inline-block;width:1.1em;height:0.85em;border:1px solid #cbd5e1;vertical-align:middle;background:#2d1b4e;"></span> `#2d1b4e` |

### 文字系
| トークン | 用途 | Light | Dark |
|---|---|---|---|
| `--text-main` | 主本文字 | <span style="display:inline-block;width:1.1em;height:0.85em;border:1px solid #cbd5e1;vertical-align:middle;background:#0f172a;"></span> `#0f172a` | <span style="display:inline-block;width:1.1em;height:0.85em;border:1px solid #cbd5e1;vertical-align:middle;background:#ffffff;"></span> `#ffffff` |
| `--text-sub` | 補助文字 | <span style="display:inline-block;width:1.1em;height:0.85em;border:1px solid #cbd5e1;vertical-align:middle;background:#6b7280;"></span> `#6b7280` | <span style="display:inline-block;width:1.1em;height:0.85em;border:1px solid #cbd5e1;vertical-align:middle;background:#e0d4f7;"></span> `#e0d4f7` |
| `--title-color` | 見出し | <span style="display:inline-block;width:1.1em;height:0.85em;border:1px solid #cbd5e1;vertical-align:middle;background:#1f2937;"></span> `#1f2937` | <span style="display:inline-block;width:1.1em;height:0.85em;border:1px solid #cbd5e1;vertical-align:middle;background:#ffffff;"></span> `#ffffff` |
| `--subtitle-color` | サブタイトル | <span style="display:inline-block;width:1.1em;height:0.85em;border:1px solid #cbd5e1;vertical-align:middle;background:#9ca3af;"></span> `#9ca3af` | <span style="display:inline-block;width:1.1em;height:0.85em;border:1px solid #cbd5e1;vertical-align:middle;background:#c7d2fe;"></span> `#c7d2fe` |
| `--link` | リンク | <span style="display:inline-block;width:1.1em;height:0.85em;border:1px solid #cbd5e1;vertical-align:middle;background:#2563eb;"></span> `#2563eb` | <span style="display:inline-block;width:1.1em;height:0.85em;border:1px solid #cbd5e1;vertical-align:middle;background:#2563eb;"></span> Light 値準用 |

### アクション系
| トークン | 用途 | Light | Dark |
|---|---|---|---|
| `--primary` | 主操作色 | <span style="display:inline-block;width:1.1em;height:0.85em;border:1px solid #cbd5e1;vertical-align:middle;background:#2563eb;"></span> `#2563eb` | <span style="display:inline-block;width:1.1em;height:0.85em;border:1px solid #cbd5e1;vertical-align:middle;background:#6366f1;"></span> `#6366f1` |
| `--primary-hover` | 主操作 hover / pressed | <span style="display:inline-block;width:1.1em;height:0.85em;border:1px solid #cbd5e1;vertical-align:middle;background:#1d4ed8;"></span> `#1d4ed8` | <span style="display:inline-block;width:1.1em;height:0.85em;border:1px solid #cbd5e1;vertical-align:middle;background:#818cf8;"></span> `#818cf8` |
| `--top-bar-bg` | ヘッダー帯 | <span style="display:inline-block;width:1.1em;height:0.85em;border:1px solid #cbd5e1;vertical-align:middle;background:#1976d2;"></span> `#1976d2` | <span style="display:inline-block;width:1.1em;height:0.85em;border:1px solid #cbd5e1;vertical-align:middle;background:#3b1d6e;"></span> `#3b1d6e` |
| `--nav-btn-bg` | 下部ナビ補助ボタン背景 | <span style="display:inline-block;width:1.1em;height:0.85em;border:1px solid #cbd5e1;vertical-align:middle;background:#ede9fe;"></span> `#ede9fe` | <span style="display:inline-block;width:1.1em;height:0.85em;border:1px solid #cbd5e1;vertical-align:middle;background:#3b1d6e;"></span> `#3b1d6e` |
| `--nav-btn-text` | 下部ナビ補助ボタン文字 | <span style="display:inline-block;width:1.1em;height:0.85em;border:1px solid #cbd5e1;vertical-align:middle;background:#4c1d95;"></span> `#4c1d95` | <span style="display:inline-block;width:1.1em;height:0.85em;border:1px solid #cbd5e1;vertical-align:middle;background:#e0d4f7;"></span> `#e0d4f7` |
| `--secondary-btn-bg` | 補助ボタン背景 | <span style="display:inline-block;width:1.1em;height:0.85em;border:1px solid #cbd5e1;vertical-align:middle;background:#e5e7eb;"></span> `#e5e7eb` | <span style="display:inline-block;width:1.1em;height:0.85em;border:1px solid #cbd5e1;vertical-align:middle;background:#3b1d6e;"></span> `#3b1d6e` |
| `--secondary-btn-text` | 補助ボタン文字 | <span style="display:inline-block;width:1.1em;height:0.85em;border:1px solid #cbd5e1;vertical-align:middle;background:#1f2937;"></span> `#1f2937` | <span style="display:inline-block;width:1.1em;height:0.85em;border:1px solid #cbd5e1;vertical-align:middle;background:#ffffff;"></span> `#ffffff` |

### 状態表示系
| トークン | 用途 | Light | Dark |
|---|---|---|---|
| `--info-bg` / `--info-text` | 情報バナー | <span style="display:inline-block;width:1.1em;height:0.85em;border:1px solid #cbd5e1;vertical-align:middle;background:#eff6ff;"></span> `#eff6ff` / <span style="display:inline-block;width:1.1em;height:0.85em;border:1px solid #cbd5e1;vertical-align:middle;background:#1d4ed8;"></span> `#1d4ed8` | <span style="display:inline-block;width:1.1em;height:0.85em;border:1px solid #cbd5e1;vertical-align:middle;background:#2d1b4e;"></span> `#2d1b4e` / <span style="display:inline-block;width:1.1em;height:0.85em;border:1px solid #cbd5e1;vertical-align:middle;background:#e0d4f7;"></span> `#e0d4f7` |
| `--error-bg` / `--error-text` | エラーバナー | <span style="display:inline-block;width:1.1em;height:0.85em;border:1px solid #cbd5e1;vertical-align:middle;background:#fee2e2;"></span> `#fee2e2` / <span style="display:inline-block;width:1.1em;height:0.85em;border:1px solid #cbd5e1;vertical-align:middle;background:#b91c1c;"></span> `#b91c1c` | <span style="display:inline-block;width:1.1em;height:0.85em;border:1px solid #cbd5e1;vertical-align:middle;background:#3f1d2e;"></span> `#3f1d2e` / <span style="display:inline-block;width:1.1em;height:0.85em;border:1px solid #cbd5e1;vertical-align:middle;background:#fecdd3;"></span> `#fecdd3` |
| `--success-bg` / `--success-text` | 成功表示 | <span style="display:inline-block;width:1.1em;height:0.85em;border:1px solid #cbd5e1;vertical-align:middle;background:#dcfce7;"></span> `#dcfce7` / <span style="display:inline-block;width:1.1em;height:0.85em;border:1px solid #cbd5e1;vertical-align:middle;background:#15803d;"></span> `#15803d` | <span style="display:inline-block;width:1.1em;height:0.85em;border:1px solid #cbd5e1;vertical-align:middle;background:#1a3d2e;"></span> `#1a3d2e` / <span style="display:inline-block;width:1.1em;height:0.85em;border:1px solid #cbd5e1;vertical-align:middle;background:#86efac;"></span> `#86efac` |
| `--warning-bg` / `--warning-text` | 警告表示 | <span style="display:inline-block;width:1.1em;height:0.85em;border:1px solid #cbd5e1;vertical-align:middle;background:#fff7ed;"></span> `#fff7ed` / <span style="display:inline-block;width:1.1em;height:0.85em;border:1px solid #cbd5e1;vertical-align:middle;background:#c2410c;"></span> `#c2410c` | <span style="display:inline-block;width:1.1em;height:0.85em;border:1px solid #cbd5e1;vertical-align:middle;background:#3d2a1a;"></span> `#3d2a1a` / <span style="display:inline-block;width:1.1em;height:0.85em;border:1px solid #cbd5e1;vertical-align:middle;background:#fdba74;"></span> `#fdba74` |
| `--danger` | 破壊的操作色 | <span style="display:inline-block;width:1.1em;height:0.85em;border:1px solid #cbd5e1;vertical-align:middle;background:#dc2626;"></span> `#dc2626` | <span style="display:inline-block;width:1.1em;height:0.85em;border:1px solid #cbd5e1;vertical-align:middle;background:#ef4444;"></span> `#ef4444` |

### 画面固有アクセント
| トークン | 用途 | Light | Dark |
|---|---|---|---|
| `--station-grad-start` | 発駅カード / グラデ開始 | <span style="display:inline-block;width:1.1em;height:0.85em;border:1px solid #cbd5e1;vertical-align:middle;background:#6b21a8;"></span> `#6b21a8` | <span style="display:inline-block;width:1.1em;height:0.85em;border:1px solid #cbd5e1;vertical-align:middle;background:#5b21b6;"></span> `#5b21b6` |
| `--station-grad-end` | 発駅カード / グラデ終端 | <span style="display:inline-block;width:1.1em;height:0.85em;border:1px solid #cbd5e1;vertical-align:middle;background:#a855f7;"></span> `#a855f7` | <span style="display:inline-block;width:1.1em;height:0.85em;border:1px solid #cbd5e1;vertical-align:middle;background:#6d28d9;"></span> `#6d28d9` |
| `--add-card-bg` | 経路追加カード背景 | <span style="display:inline-block;width:1.1em;height:0.85em;border:1px solid #cbd5e1;vertical-align:middle;background:#fff7ed;"></span> `#fff7ed` | <span style="display:inline-block;width:1.1em;height:0.85em;border:1px solid #cbd5e1;vertical-align:middle;background:#2d1b4e;"></span> `#2d1b4e` |
| `--add-card-text` | 経路追加カード文字 | <span style="display:inline-block;width:1.1em;height:0.85em;border:1px solid #cbd5e1;vertical-align:middle;background:#92400e;"></span> `#92400e` | <span style="display:inline-block;width:1.1em;height:0.85em;border:1px solid #cbd5e1;vertical-align:middle;background:#86efac;"></span> `#86efac` |
| `--fare-card-bg` | 運賃サマリー背景 | <span style="display:inline-block;width:1.1em;height:0.85em;border:1px solid #cbd5e1;vertical-align:middle;background:#ecfdf5;"></span> `#ecfdf5` | <span style="display:inline-block;width:1.1em;height:0.85em;border:1px solid #cbd5e1;vertical-align:middle;background:#1a2d2e;"></span> `#1a2d2e` |
| `--fare-card-label` | 運賃ラベル文字 | <span style="display:inline-block;width:1.1em;height:0.85em;border:1px solid #cbd5e1;vertical-align:middle;background:#047857;"></span> `#047857` | <span style="display:inline-block;width:1.1em;height:0.85em;border:1px solid #cbd5e1;vertical-align:middle;background:#86efac;"></span> `#86efac` |
| `--fare-card-value` | 運賃値文字 | <span style="display:inline-block;width:1.1em;height:0.85em;border:1px solid #cbd5e1;vertical-align:middle;background:#064e3b;"></span> `#064e3b` | <span style="display:inline-block;width:1.1em;height:0.85em;border:1px solid #cbd5e1;vertical-align:middle;background:#a7f3d0;"></span> `#a7f3d0` |
| `--fare-card-accent` | 運賃アクセント | <span style="display:inline-block;width:1.1em;height:0.85em;border:1px solid #cbd5e1;vertical-align:middle;background:#10b981;"></span> `#10b981` | <span style="display:inline-block;width:1.1em;height:0.85em;border:1px solid #cbd5e1;vertical-align:middle;background:#34d399;"></span> `#34d399` |
| `--icon-bg` / `--icon-fg` | 円形アイコン背景 / 前景 | <span style="display:inline-block;width:1.1em;height:0.85em;border:1px solid #cbd5e1;vertical-align:middle;background:#f3e8ff;"></span> `#f3e8ff` / <span style="display:inline-block;width:1.1em;height:0.85em;border:1px solid #cbd5e1;vertical-align:middle;background:#6b21a8;"></span> `#6b21a8` | <span style="display:inline-block;width:1.1em;height:0.85em;border:1px solid #cbd5e1;vertical-align:middle;background:rgba(255,255,255,0.12);"></span> `rgba(255,255,255,0.12)` / <span style="display:inline-block;width:1.1em;height:0.85em;border:1px solid #cbd5e1;vertical-align:middle;background:#e0e7ff;"></span> `#e0e7ff` |

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

## 余白と寸法

### ルール
- 仕様書上の余白は 4px グリッドで考える。
- カード内余白、セクション間余白、固定バー高さはコンポーネント意味ごとに再利用する。

### 推奨スケール
- `4`, `8`, `12`, `16`, `20`, `24`, `32`, `40`, `48`, `64`

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
