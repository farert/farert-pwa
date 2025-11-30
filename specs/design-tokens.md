# デザイントークン

Farert PWAのデザインシステム定義

## カラーパレット

### ブランドカラー（紫）

```css
/* Material Design Purple */
--color-primary-50: #F3E5F5;   /* 最も薄い紫 */
--color-primary-100: #E1BEE7;  /* 薄い紫 */
--color-primary-200: #CE93D8;  /* やや薄い紫 */
--color-primary-300: #BA68C8;  /* 中間の紫 */
--color-primary-400: #AB47BC;  /* やや濃い紫 */
--color-primary-500: #9C27B0;  /* 紫（標準） */
--color-primary-600: #8E24AA;  /* 濃い紫 */
--color-primary-700: #7B1FA2;  /* より濃い紫 */
--color-primary-800: #6A1B9A;  /* 最も濃い紫 */
--color-primary-900: #4A148C;  /* 超濃い紫 */
```

### 使用箇所
- **Primary (700)**: アプリバー、プライマリボタン
- **Primary (600)**: ホバー状態
- **Primary (800)**: ステータスバー
- **Primary (100)**: 背景のアクセント

### アクセントカラー

```css
/* オレンジ - アクション用 */
--color-accent-orange-50: #FFF3E0;
--color-accent-orange-100: #FFE0B2;
--color-accent-orange-200: #FFCC80;
--color-accent-orange-300: #FFB74D;
--color-accent-orange-400: #FFA726;
--color-accent-orange-500: #FF9800;  /* 追加ボタン */
--color-accent-orange-600: #FB8C00;
--color-accent-orange-700: #F57C00;

/* 緑 - 情報表示用 */
--color-accent-green-400: #66BB6A;
--color-accent-green-500: #4CAF50;   /* バッジ、キロ数表示 */
--color-accent-green-600: #43A047;
--color-accent-green-700: #388E3C;
```

### グレースケール

```css
--color-gray-50: #FAFAFA;    /* 最も薄いグレー */
--color-gray-100: #F5F5F5;   /* 背景 */
--color-gray-200: #EEEEEE;   /* カード背景（薄） */
--color-gray-300: #E0E0E0;   /* 区切り線 */
--color-gray-400: #BDBDBD;   /* 非アクティブテキスト */
--color-gray-500: #9E9E9E;   /* 補足テキスト */
--color-gray-600: #757575;   /* セカンダリテキスト */
--color-gray-700: #616161;   /* 本文テキスト */
--color-gray-800: #424242;   /* 見出しテキスト */
--color-gray-900: #212121;   /* 最も濃いテキスト */
```

### セマンティックカラー

```css
/* ドロワーナビゲーション */
--color-drawer-bg: linear-gradient(135deg, #4A148C 0%, #311B92 100%);
--color-drawer-text: #FFFFFF;

/* カード */
--color-card-bg: #FFFFFF;
--color-card-border: #E0E0E0;
--color-card-shadow: rgba(0, 0, 0, 0.1);

/* ボタン */
--color-button-primary-bg: #7B1FA2;
--color-button-primary-text: #FFFFFF;
--color-button-secondary-bg: #FF9800;
--color-button-secondary-text: #FFFFFF;

/* ステータス */
--color-success: #4CAF50;
--color-warning: #FF9800;
--color-error: #F44336;
--color-info: #2196F3;
```

## Tailwind CSS設定

`tailwind.config.js` での設定例：

```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#F3E5F5',
          100: '#E1BEE7',
          200: '#CE93D8',
          300: '#BA68C8',
          400: '#AB47BC',
          500: '#9C27B0',
          600: '#8E24AA',
          700: '#7B1FA2',
          800: '#6A1B9A',
          900: '#4A148C',
        },
        accent: {
          orange: {
            500: '#FF9800',
            600: '#FB8C00',
            700: '#F57C00',
          },
          green: {
            500: '#4CAF50',
            600: '#43A047',
          },
        },
      },
    },
  },
};
```

## タイポグラフィ

### フォントファミリー

```css
--font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto',
             'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Noto Sans JP',
             'Yu Gothic', 'Meiryo', sans-serif;
```

### フォントサイズ

```css
--text-xs: 0.75rem;    /* 12px - ふりがな */
--text-sm: 0.875rem;   /* 14px - 補足テキスト */
--text-base: 1rem;     /* 16px - 本文 */
--text-lg: 1.125rem;   /* 18px - 小見出し */
--text-xl: 1.25rem;    /* 20px - 見出し */
--text-2xl: 1.5rem;    /* 24px - 大見出し */
--text-3xl: 1.875rem;  /* 30px - タイトル */
```

### フォントウェイト

```css
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

### 行間

```css
--leading-tight: 1.25;
--leading-normal: 1.5;
--leading-relaxed: 1.75;
```

## スペーシング

### パディング/マージン

```css
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-5: 1.25rem;   /* 20px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-10: 2.5rem;   /* 40px */
--space-12: 3rem;     /* 48px */
--space-16: 4rem;     /* 64px */
```

### コンテナ幅

```css
--container-sm: 640px;
--container-md: 768px;
--container-lg: 1024px;
--container-xl: 1280px;
```

## ボーダー

### 角丸

```css
--rounded-sm: 0.25rem;   /* 4px - 小さいカード */
--rounded: 0.375rem;     /* 6px - 標準カード */
--rounded-md: 0.5rem;    /* 8px - カード */
--rounded-lg: 0.75rem;   /* 12px - 大きいカード */
--rounded-xl: 1rem;      /* 16px - モーダル */
--rounded-full: 9999px;  /* 完全な円（バッジ） */
```

### ボーダー幅

```css
--border-thin: 1px;
--border-medium: 2px;
--border-thick: 4px;
```

## シャドウ

```css
--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
--shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
--shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
```

## コンポーネント固有のスタイル

### アプリバー

```css
background: var(--color-primary-700);  /* #7B1FA2 */
height: 56px;  /* モバイル */
height: 64px;  /* デスクトップ */
color: white;
```

### カード

```css
background: white;
border-radius: var(--rounded-md);  /* 8px */
padding: var(--space-4);  /* 16px */
box-shadow: var(--shadow);
```

### バッジ（緑色の丸）

```css
background: var(--color-accent-green-500);  /* #4CAF50 */
color: white;
width: 48px;
height: 48px;
border-radius: var(--rounded-full);
font-size: var(--text-base);
font-weight: var(--font-semibold);
```

### ボタン

```css
/* プライマリボタン */
background: var(--color-primary-700);
color: white;
padding: var(--space-3) var(--space-6);  /* 12px 24px */
border-radius: var(--rounded-md);
font-weight: var(--font-medium);

/* アクセントボタン（追加ボタン） */
background: var(--color-accent-orange-500);
color: white;
padding: var(--space-4) var(--space-6);  /* 16px 24px */
border-radius: var(--rounded-md);
font-weight: var(--font-medium);
```

### リストアイテム

```css
background: var(--color-gray-200);  /* #EEEEEE */
padding: var(--space-4);  /* 16px */
border-radius: var(--rounded-md);  /* 8px */
margin-bottom: var(--space-2);  /* 8px */
```

### ドロワーナビゲーション

```css
background: linear-gradient(135deg, #4A148C 0%, #311B92 100%);
width: 85%;  /* モバイル */
max-width: 320px;
padding: var(--space-6);  /* 24px */
```

## アイコン

### サイズ

```css
--icon-sm: 16px;
--icon-md: 24px;
--icon-lg: 32px;
--icon-xl: 48px;
```

### 推奨アイコンライブラリ

- Material Design Icons (MDI)
- または Material Symbols

## アニメーション

### トランジション

```css
--transition-fast: 150ms ease-in-out;
--transition-base: 300ms ease-in-out;
--transition-slow: 500ms ease-in-out;
```

### 使用箇所

- ボタンホバー: `transition: all var(--transition-fast);`
- ドロワー開閉: `transition: transform var(--transition-base);`
- モーダル表示: `transition: opacity var(--transition-base);`

## レスポンシブブレークポイント

```css
/* Tailwind デフォルト */
sm: 640px   /* スマートフォン（横向き）*/
md: 768px   /* タブレット */
lg: 1024px  /* デスクトップ（小） */
xl: 1280px  /* デスクトップ（大） */
2xl: 1536px /* デスクトップ（超大） */
```

## Z-Index階層

```css
--z-base: 0;
--z-dropdown: 10;
--z-sticky: 20;
--z-drawer: 30;
--z-modal-backdrop: 40;
--z-modal: 50;
--z-toast: 60;
--z-tooltip: 70;
```
