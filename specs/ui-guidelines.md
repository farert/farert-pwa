# UI実装ガイドライン

Farert PWAの共通UIパターンとルール

## アイコンライブラリ

### 標準アイコン
- **ライブラリ**: Material Design Icons (MDI)
- **使用場所**: すべてのUI要素
  - ハンバーガーメニュー（3点メニュー）
  - 戻るボタン
  - 検索アイコン
  - 共有アイコン
  - 削除アイコン
  - ドラッグハンドル
  - その他すべての標準UI

### 例外
- **きっぷホルダアイコン**: `images/tickfolder3.png`（カスタムアイコン）

### パッケージ推奨
```bash
pnpm add @mdi/js svelte-material-icons
```

## エラー表示

### 基本方針
- **形式**: インライン表示（トースト風だが消えない）
- **配置**: エラーが発生したコンテキストの直近
- **スタイル**: 目立つが邪魔にならない

### 実装例

#### エラーバナー（推奨）
```svelte
{#if error}
  <div class="error-banner">
    <AlertIcon class="error-icon" />
    <p class="error-message">{error.message}</p>
    <button class="dismiss-button" on:click={dismissError}>
      <CloseIcon />
    </button>
  </div>
{/if}
```

**スタイル**:
- 背景: `bg-red-50`
- ボーダー: `border-l-4 border-red-500`
- テキスト: `text-red-800`
- アイコン: `text-red-500`
- パディング: `p-4`
- 角丸: `rounded-md`
- マージン: `mb-4`（他の要素を押し下げる）

#### フィールドエラー（フォーム用）
```svelte
<input class:error={fieldError} />
{#if fieldError}
  <p class="field-error">{fieldError}</p>
{/if}
```

**スタイル**:
- テキスト: `text-red-600 text-sm mt-1`

### エラー表示パターン

#### パターン1: 検証エラー
```
⚠️ 経路の書式不正により、インポートに失敗しました: 2行目、新宿駅
```

#### パターン2: システムエラー
```
⚠️ 運賃計算に失敗しました。もう一度お試しください。
```

#### パターン3: 警告メッセージ
```
⚠️ 経路は保存されていません
```

### 解除動作
- ユーザーが `×` ボタンをクリック
- 別の操作を開始（自動解除）
- エラーの原因が解消された場合（自動解除）

## リストの並べ替え

### きっぷホルダリスト
- **並べ替え**: ✅ 可能（ドラッグアンドドロップ）
- **実装**: `order` フィールドで管理
- **UI**: 編集モード時に右端にドラッグハンドル（横3本線）表示

#### 実装例
```svelte
<script>
  import { flip } from 'svelte/animate';
  import { dndzone } from 'svelte-dnd-action';

  let items = [...];

  function handleDndConsider(e) {
    items = e.detail.items;
  }

  function handleDndFinalize(e) {
    items = e.detail.items;
    // order フィールドを更新
    items = items.map((item, index) => ({ ...item, order: index }));
    // localStorage に保存
    saveToStorage(items);
  }
</script>

<div use:dndzone={{ items }} on:consider={handleDndConsider} on:finalize={handleDndFinalize}>
  {#each items as item (item.order)}
    <div animate:flip={{ duration: 300 }}>
      <TicketHolderCard {item} />
    </div>
  {/each}
</div>
```

### その他のリスト
- **並べ替え**: ❌ 不可
- **表示順**: 固定またはサーバー/WASM側で決定

## きっぷホルダの「追加」ボタン

### 表示条件
- **表示**: メイン画面に経路が存在する場合
- **非表示**: メイン画面の経路が空の場合

### 動作
1. メイン画面の現在の経路を取得
2. 同一経路が既にきっぷホルダに存在してもOK（重複可能）
3. 新しい `TicketHolderItem` を作成
   - `order`: 最大値 + 1
   - `route`: 現在の経路のコピー
   - `fareType`: デフォルト `FareType.NORMAL`
4. きっぷホルダリストの先頭に追加
5. localStorage に保存
6. ドロワーを閉じる

### 実装例
```svelte
<script>
  import { currentRoute, ticketHolder } from '$lib/stores/app';

  function addToTicketHolder() {
    if (!$currentRoute || !$currentRoute.startStation) {
      return; // 経路が空の場合は何もしない
    }

    const newItem: TicketHolderItem = {
      order: Math.max(...$ticketHolder.map(i => i.order), 0) + 1,
      route: structuredClone($currentRoute), // ディープコピー
      fareType: FareType.NORMAL,
    };

    ticketHolder.update(items => [newItem, ...items]);
    // ドロワーを閉じる
    closeDrawer();
  }
</script>

{#if $currentRoute && $currentRoute.startStation}
  <button class="add-to-holder-button" on:click={addToTicketHolder}>
    追加≪
  </button>
{/if}
```

## バージョン情報画面へのアクセス

### アクセス方法
- **トリガー**: メイン画面右上の3点メニュー（ハンバーガーメニュー）
- **メニュー項目**:
  1. バージョン情報
  2. （その他の項目）

### メニュー実装
```svelte
<script>
  let showMenu = false;

  function toggleMenu() {
    showMenu = !showMenu;
  }

  function navigateToVersion() {
    goto('/version');
    showMenu = false;
  }
</script>

<button class="menu-button" on:click={toggleMenu}>
  <MoreVertIcon />
</button>

{#if showMenu}
  <div class="dropdown-menu">
    <button on:click={navigateToVersion}>
      バージョン情報
    </button>
  </div>
{/if}
```

## BottomNavigation（メイン画面フッター）

### ボタン構成（4つ）
1. **戻る** (`↩︎`): 最後の経路セグメントを削除
2. **リバース** (`⇄`): 経路を反転
3. **オプション** (歯車): 経路オプションメニュー表示
4. **保存** (`📁`): 保存画面へ遷移

### ボタンの有効/無効状態

| ボタン | 有効条件 |
|--------|----------|
| 戻る | 経路が1つ以上存在 |
| リバース | 経路が2つ以上存在 |
| オプション | 大阪環状線または小倉-博多間が経路に含まれる |
| 保存 | 常に有効 |

### 実装例
```svelte
<script>
  import { currentRoute } from '$lib/stores/app';

  $: hasSegments = $currentRoute?.segments.length > 0;
  $: hasMultipleSegments = $currentRoute?.segments.length >= 2;
  $: hasOptions = checkRouteOptions($currentRoute);

  function checkRouteOptions(route) {
    if (!route) return false;
    // 大阪環状線または小倉-博多間チェック
    return route.segments.some(s =>
      s.line.name === '大阪環状線' ||
      (s.line.name === '山陽新幹線' && /* 小倉-博多間チェック */)
    );
  }
</script>

<nav class="bottom-navigation">
  <button disabled={!hasSegments} on:click={undoLastSegment}>
    <UndoIcon />
    <span>戻る</span>
  </button>

  <button disabled={!hasMultipleSegments} on:click={reverseRoute}>
    <SwapIcon />
    <span>リバース</span>
  </button>

  <button disabled={!hasOptions} on:click={showOptionsMenu}>
    <SettingsIcon />
    <span>オプション</span>
  </button>

  <button on:click={navigateToSave}>
    <SaveIcon />
    <span>保存</span>
  </button>
</nav>
```

## オプションメニュー

### 表示条件
- 大阪環状線が経路に含まれる
- 小倉-博多間が経路に含まれる

### メニュー形式
- **Android風**: ボトムシート
- **iOS風**: アクションシート
- **Web**: モーダルダイアログまたはポップオーバー

### 実装例
```svelte
<script>
  let showOptionsMenu = false;

  function selectOsakakanOption(isDetour: boolean) {
    currentRoute.update(route => ({
      ...route,
      options: {
        ...route.options,
        osakakanDetour: isDetour,
      },
    }));
    // 運賃再計算
    recalculateFare();
    showOptionsMenu = false;
  }
</script>

{#if showOptionsMenu}
  <div class="modal-backdrop" on:click={() => showOptionsMenu = false}>
    <div class="options-menu">
      <h3>経路オプション</h3>

      {#if hasOsakakan}
        <button on:click={() => selectOsakakanOption(false)}>
          大阪環状線 近回り
        </button>
        <button on:click={() => selectOsakakanOption(true)}>
          大阪環状線 遠回り
        </button>
      {/if}

      <button on:click={() => showOptionsMenu = false}>
        キャンセル
      </button>
    </div>
  </div>
{/if}
```

## 共通スタイルパターン

### カード
```css
.card {
  @apply bg-white rounded-lg p-4 shadow;
}
```

### リストアイテム
```css
.list-item {
  @apply bg-gray-200 rounded-lg p-4 mb-2;
}
```

### プライマリボタン
```css
.primary-button {
  @apply bg-primary-700 text-white px-6 py-3 rounded-md font-medium;
}
```

### セカンダリボタン（アクセント）
```css
.secondary-button {
  @apply bg-accent-orange-500 text-white px-6 py-3 rounded-md font-medium;
}
```

## アニメーション

### トランジション
- ページ遷移: `transition: all 300ms ease-in-out`
- ドロワー開閉: `transition: transform 300ms ease-in-out`
- ボタンホバー: `transition: all 150ms ease-in-out`

### アニメーション例
```svelte
<script>
  import { fade, slide } from 'svelte/transition';
</script>

<!-- フェードイン/アウト -->
{#if visible}
  <div transition:fade={{ duration: 300 }}>
    Content
  </div>
{/if}

<!-- スライド -->
{#if open}
  <div transition:slide={{ duration: 300 }}>
    Menu
  </div>
{/if}
```
