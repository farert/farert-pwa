# デザイントークン

実装の正本は `src/app.css` の CSS カスタムプロパティ。

## ライトテーマ
```css
--bg: #f4f5f7;
--text-main: #0f172a;
--text-sub: #6b7280;
--card-bg: #ffffff;
--card-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
--primary: #2563eb;
--primary-hover: #1d4ed8;
--border-color: #e5e7eb;
--error-bg: #fee2e2;
--error-text: #b91c1c;
--success-bg: #dcfce7;
--success-text: #15803d;
--warning-bg: #fff7ed;
--warning-text: #c2410c;
--fare-card-bg: #ecfdf5;
--fare-card-label: #047857;
--fare-card-value: #064e3b;
```

## ダークテーマ
```css
--bg: #1a0a2e;
--text-main: #ffffff;
--text-sub: #e0d4f7;
--card-bg: #000000;
--primary: #6366f1;
--primary-hover: #818cf8;
--border-color: #3b1d6e;
--fare-card-bg: #1a2d2e;
--fare-card-label: #86efac;
--fare-card-value: #a7f3d0;
```

## 補助トークン
- `--station-grad-start`
- `--station-grad-end`
- `--menu-bg`
- `--menu-shadow`
- `--overlay-dim`
- `--add-card-bg`
- `--add-card-text`
- `--nav-btn-bg`
- `--nav-btn-text`

## タイポグラフィ
- 基本フォントは `'Noto Sans JP', system-ui, sans-serif`
- アイコンフォントは `Material Symbols Rounded`

## 運用ルール
- 新しい色や余白を追加する場合はまず `src/app.css` に変数を追加する。
- 仕様書上の値は `src/app.css` と一致させる。
