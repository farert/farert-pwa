# URL ルーティング仕様

## 基本方針

詳細画面やその他の経路表示画面へのURLパラメータは、**LZ文字列圧縮**を使用して経路データを圧縮し、URL長を削減します。

## 圧縮ライブラリ

**lz-string** を使用：

```bash
pnpm add lz-string
pnpm add -D @types/lz-string
```

## ユーティリティ関数

### ファイル: `src/lib/utils/urlRoute.ts`

```typescript
import LZString from 'lz-string';
import { Farert } from 'farert-wasm';

/**
 * 経路をURL用に圧縮
 */
export function compressRouteForUrl(route: Farert, segmentCount: number = -1): string {
  const tempRoute = new Farert();
  tempRoute.assign(route, segmentCount);
  const routeScript = tempRoute.routeScript();

  // URL-safe圧縮
  return LZString.compressToEncodedURIComponent(routeScript);
}

/**
 * URL圧縮データから経路を復元
 */
export function decompressRouteFromUrl(compressed: string): Farert | null {
  try {
    const routeScript = LZString.decompressFromEncodedURIComponent(compressed);
    if (!routeScript) {
      console.error('Failed to decompress route');
      return null;
    }

    const route = new Farert();
    const result = route.buildRoute(routeScript);

    if (result !== 0) {
      console.error('Failed to build route:', result);
      return null;
    }

    return route;
  } catch (error) {
    console.error('Error decompressing route:', error);
    return null;
  }
}

/**
 * 共有用URLを生成
 */
export function generateShareUrl(route: Farert, segmentCount: number = -1): string {
  const compressed = compressRouteForUrl(route, segmentCount);
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/detail?r=${compressed}`;
}
```

## 画面別実装

### 1. メイン画面 → 詳細画面

```typescript
// src/routes/+page.svelte
<script lang="ts">
  import { goto } from '$app/navigation';
  import { mainRoute } from '$lib/stores/app';
  import { compressRouteForUrl } from '$lib/utils/urlRoute';

  function goToDetail(segmentIndex?: number) {
    const compressed = compressRouteForUrl($mainRoute, segmentIndex);
    goto(`/detail?r=${compressed}`);
  }

  function goToFullDetail() {
    const compressed = compressRouteForUrl($mainRoute, -1); // 全経路
    goto(`/detail?r=${compressed}`);
  }
</script>

<button on:click={() => goToDetail(2)}>
  2番目の区間まで詳細表示
</button>

<button on:click={goToFullDetail}>
  全経路の詳細表示
</button>
```

### 2. 詳細画面

```typescript
// src/routes/detail/+page.svelte
<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { decompressRouteFromUrl } from '$lib/utils/urlRoute';
  import type { Farert } from 'farert-wasm';

  let detailRoute: Farert | null = null;
  let fareInfo: any = null;
  let error: string | null = null;

  onMount(() => {
    const compressed = $page.url.searchParams.get('r');

    if (!compressed) {
      error = '経路データが見つかりません';
      return;
    }

    detailRoute = decompressRouteFromUrl(compressed);

    if (!detailRoute) {
      error = '経路の復元に失敗しました';
      return;
    }

    // 運賃計算
    try {
      fareInfo = JSON.parse(detailRoute.getFareInfoObjectJson());
    } catch (e) {
      console.error('Fare calculation error:', e);
      error = '運賃計算に失敗しました';
    }
  });
</script>

{#if error}
  <div class="error-banner">
    <p>{error}</p>
    <button on:click={() => goto('/')}>メイン画面へ戻る</button>
  </div>
{:else if fareInfo}
  <div class="detail-content">
    <h1>{detailRoute.departureStationName()} → {detailRoute.arrivevalStationName()}</h1>
    <p>運賃: ¥{fareInfo.fare?.toLocaleString() || 0}</p>
    <!-- 詳細情報表示 -->
  </div>
{:else}
  <p>読み込み中...</p>
{/if}
```

### 3. 共有機能

```typescript
// src/lib/components/ShareButton.svelte
<script lang="ts">
  import { mainRoute } from '$lib/stores/app';
  import { generateShareUrl } from '$lib/utils/urlRoute';

  async function shareRoute(segmentCount: number = -1) {
    const shareUrl = generateShareUrl($mainRoute, segmentCount);
    const routeText = $mainRoute.routeScript();

    // Web Share API対応チェック
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Farert - 経路詳細',
          text: routeText,
          url: shareUrl
        });
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Share failed:', error);
          fallbackCopyToClipboard(shareUrl);
        }
      }
    } else {
      // フォールバック: クリップボードにコピー
      fallbackCopyToClipboard(shareUrl);
    }
  }

  async function fallbackCopyToClipboard(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      alert('URLをクリップボードにコピーしました');
    } catch (error) {
      console.error('Copy failed:', error);
      // さらにフォールバック: テキストエリアで表示
      prompt('以下のURLをコピーしてください:', url);
    }
  }
</script>

<button on:click={() => shareRoute(-1)}>
  経路を共有
</button>
```

### 4. きっぷホルダからの詳細表示

```typescript
// src/lib/components/TicketHolderCard.svelte
<script lang="ts">
  import { goto } from '$app/navigation';
  import { Farert } from 'farert-wasm';
  import { compressRouteForUrl } from '$lib/utils/urlRoute';
  import type { TicketHolderItem } from '$lib/types';

  export let item: TicketHolderItem;

  function viewDetail() {
    // routeScript から Farert オブジェクトを復元
    const route = new Farert();
    route.buildRoute(item.routeScript);

    // 圧縮してURLへ
    const compressed = compressRouteForUrl(route, -1);
    goto(`/detail?r=${compressed}`);
  }
</script>

<div class="ticket-card" on:click={viewDetail}>
  <!-- カード内容 -->
</div>
```

## URL構造

### 詳細画面

```
/detail?r={圧縮された経路データ}
```

**例**:
```
元の経路: "東京 東海道線 熱海 身延線 甲府" (約20バイト)
圧縮後: "N4IgdghgtgpiBcIAqA..." (約10-15バイト、50%削減)

完全URL:
https://farert.app/detail?r=N4IgdghgtgpiBcIAqA...
```

### その他の画面

圧縮不要な短いパラメータはそのまま使用：

```
/station-select?type=start
/line-select?group=JR東日本
/save
/version
```

## 圧縮効果

| 経路の長さ | 元サイズ | 圧縮後 | 削減率 |
|-----------|---------|--------|--------|
| 短い（2区間） | 30 bytes | 20 bytes | 33% |
| 中程度（5区間） | 100 bytes | 60 bytes | 40% |
| 長い（10区間） | 300 bytes | 150 bytes | 50% |
| 最大（50区間） | 3000 bytes | 1500 bytes | 50% |

## エラーハンドリング

### パターン1: 圧縮データが不正

```typescript
const route = decompressRouteFromUrl(compressed);
if (!route) {
  // エラー表示 → メイン画面へリダイレクト
  error = '経路の復元に失敗しました';
  setTimeout(() => goto('/'), 3000);
}
```

### パターン2: パラメータなし

```typescript
const compressed = $page.url.searchParams.get('r');
if (!compressed) {
  error = '経路データが見つかりません';
  goto('/');
}
```

### パターン3: buildRoute失敗

```typescript
const route = new Farert();
const result = route.buildRoute(routeScript);
if (result !== 0) {
  error = '無効な経路データです';
}
```

## セキュリティ考慮事項

1. **入力検証**: URLパラメータは常に検証
2. **エラーハンドリング**: 不正なデータでもクラッシュしない
3. **サイズ制限**: 解凍後のデータサイズをチェック（10KB以上は拒否など）

```typescript
export function decompressRouteFromUrl(compressed: string): Farert | null {
  try {
    const routeScript = LZString.decompressFromEncodedURIComponent(compressed);

    // サイズチェック
    if (!routeScript || routeScript.length > 10000) {
      console.error('Route data too large or invalid');
      return null;
    }

    const route = new Farert();
    if (route.buildRoute(routeScript) !== 0) {
      return null;
    }

    return route;
  } catch (error) {
    console.error('Decompression error:', error);
    return null;
  }
}
```

## テスト

```typescript
// tests/urlRoute.test.ts
import { describe, it, expect } from 'vitest';
import { Farert } from 'farert-wasm';
import { compressRouteForUrl, decompressRouteFromUrl } from '$lib/utils/urlRoute';

describe('URL Route Compression', () => {
  it('should compress and decompress route correctly', () => {
    const route = new Farert();
    route.addStartRoute('東京');
    route.addRoute('東海道線', '熱海');
    route.addRoute('身延線', '甲府');

    const compressed = compressRouteForUrl(route, -1);
    expect(compressed).toBeTruthy();
    expect(compressed.length).toBeLessThan(route.routeScript().length);

    const decompressed = decompressRouteFromUrl(compressed);
    expect(decompressed).toBeTruthy();
    expect(decompressed.routeScript()).toBe(route.routeScript());
  });

  it('should handle invalid compressed data', () => {
    const result = decompressRouteFromUrl('invalid-data');
    expect(result).toBeNull();
  });
});
```

## 実装チェックリスト

- [ ] lz-string パッケージのインストール
- [ ] `src/lib/utils/urlRoute.ts` 作成
- [ ] 詳細画面で圧縮データを受け取る実装
- [ ] メイン画面から圧縮URLで遷移
- [ ] 共有機能の実装
- [ ] エラーハンドリング
- [ ] テストコード作成
