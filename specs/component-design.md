# コンポーネント設計

Farert PWAのコンポーネント構造とデザイン仕様

## コンポーネント階層

```
App
├── AppBar (共有レイアウト)
├── DrawerNavigation (共有レイアウト)
│   ├── TicketHolderHeader
│   ├── TicketHolderCard
│   │   ├── FarePicker
│   │   └── CardActions
│   └── AddToHolderButton
├── BottomNavigation (共有レイアウト)
└── Pages
    ├── MainPage
    │   ├── StationCard
    │   ├── RouteSegmentCard
    │   ├── AddRouteButton
    │   └── FareSummaryCard
    ├── StationSelectPage
    │   ├── TabNavigation
    │   ├── SearchBar
    │   └── StationList / GroupList / PrefectureList
    ├── LineSelectPage
    │   └── LineList
    ├── StationListPage
    │   └── StationList
    ├── DetailPage
    │   ├── RouteHeader
    │   ├── KilometerCard
    │   ├── FareCard
    │   ├── ValidityCard
    │   └── RouteDetailCard
    ├── SavePage
    │   ├── SavedRouteCard
    │   └── ActionButtons
    └── VersionPage
        └── VersionInfo
```

## 共有コンポーネント

### AppBar

**ファイル**: `src/lib/components/AppBar.svelte`

**Props**:
```typescript
interface AppBarProps {
  title: string;
  showBack?: boolean;
  showMenu?: boolean;
  showSearch?: boolean;
  showShare?: boolean;
  showOptions?: boolean;
  onBack?: () => void;
  onMenuClick?: () => void;
  onSearchClick?: () => void;
  onShareClick?: () => void;
  onOptionsClick?: () => void;
}
```

**デザイン**:
- 高さ: 56px (モバイル)
- 背景: `bg-primary-700` (#7B1FA2)
- テキスト: `text-white`
- アイコン: 24px, `text-white`
- シャドウ: `shadow-md`

**構造**:
```svelte
<header class="app-bar">
  {#if showMenu}
    <button class="icon-button" on:click={onMenuClick}>
      <MenuIcon />
    </button>
  {/if}

  {#if showBack}
    <button class="icon-button" on:click={onBack}>
      <ArrowBackIcon />
    </button>
  {/if}

  <h1 class="title">{title}</h1>

  <div class="actions">
    {#if showSearch}
      <button class="icon-button" on:click={onSearchClick}>
        <SearchIcon />
      </button>
    {/if}

    {#if showShare}
      <button class="icon-button" on:click={onShareClick}>
        <ShareIcon />
      </button>
    {/if}

    {#if showOptions}
      <button class="icon-button" on:click={onOptionsClick}>
        <MoreVertIcon />
      </button>
    {/if}
  </div>
</header>
```

---

### DrawerNavigation

**ファイル**: `src/lib/components/DrawerNavigation.svelte`

**Props**:
```typescript
interface DrawerProps {
  isOpen: boolean;
  ticketHolderItems: TicketHolderItem[];
  onClose: () => void;
  onItemClick: (item: TicketHolderItem) => void;
  onItemDelete: (id: string) => void;
  onFareTypeChange: (id: string, fareType: FareType) => void;
  onAddToHolder: () => void;
}
```

**デザイン**:
- 幅: 85% (最大 320px)
- 背景: `linear-gradient(135deg, #4A148C 0%, #311B92 100%)`
- テキスト: `text-white`
- アニメーション: `transform transition-transform duration-300`

**構造**:
```svelte
<aside class="drawer" class:open={isOpen}>
  <div class="drawer-header">
    <FolderIcon />
    <h2>きっぷホルダ</h2>
  </div>

  <div class="drawer-summary">
    <p>総運賃 ¥{totalFare.toLocaleString()}</p>
    <p>総営業キロ {totalKm.toFixed(1)} km</p>
  </div>

  <button class="share-button" on:click={handleShare}>
    <ShareIcon />
  </button>

  <button class="add-button" on:click={onAddToHolder}>
    追加≪
  </button>

  <div class="ticket-list">
    {#each ticketHolderItems as item (item.id)}
      <TicketHolderCard
        {item}
        on:click={() => onItemClick(item)}
        on:delete={() => onItemDelete(item.id)}
        on:fareTypeChange={(e) => onFareTypeChange(item.id, e.detail)}
      />
    {/each}
  </div>
</aside>

{#if isOpen}
  <div class="backdrop" on:click={onClose}></div>
{/if}
```

---

### TicketHolderCard

**ファイル**: `src/lib/components/TicketHolderCard.svelte`

**Props**:
```typescript
interface TicketHolderCardProps {
  item: TicketHolderItem;
}
```

**Events**:
- `click`: カードクリック
- `delete`: 削除ボタンクリック
- `fareTypeChange`: 運賃タイプ変更

**デザイン**:
- 背景: `bg-gradient-to-br from-indigo-900 to-purple-900`
- 角丸: `rounded-lg`
- パディング: `p-4`
- テキスト: `text-white`

**構造**:
```svelte
<div class="ticket-card">
  <div class="card-header">
    <button class="menu-button">
      <MenuIcon />
    </button>
    <button class="delete-button">
      <DeleteIcon />
    </button>
    <h3>{item.route.startStation.name} - {getDestination(item.route)}</h3>
    <button class="train-icon">
      <TrainIcon />
    </button>
    <button class="expand-button">
      <ExpandIcon />
    </button>
  </div>

  <div class="fare-picker-container">
    <FarePicker
      value={item.fareType}
      fareInfo={item.route.fareInfo}
      on:change={(e) => dispatch('fareTypeChange', e.detail)}
    />
  </div>

  <div class="fare-display">
    <p class="fare-amount">¥{getFareAmount(item)}</p>
    <p class="distance">{item.route.fareInfo?.totalSalesKm.toFixed(1)}km</p>
  </div>
</div>
```

---

### FarePicker

**ファイル**: `src/lib/components/FarePicker.svelte`

**Props**:
```typescript
interface FarePickerProps {
  value: FareType;
  fareInfo: FareInfo | undefined;
}
```

**デザイン**:
- 背景: `bg-indigo-800/50`
- 角丸: `rounded-md`
- パディング: `p-2`
- ドロップダウン: 縦スクロール、グラデーション背景

**構造**:
```svelte
<div class="fare-picker">
  <button class="picker-button" on:click={toggleDropdown}>
    <span>{fareTypeLabel[value]}</span>
    <DropdownIcon class={isOpen ? 'rotate-180' : ''} />
  </button>

  {#if isOpen}
    <div class="dropdown">
      {#each availableFareTypes as fareType}
        <button
          class="dropdown-item"
          class:selected={fareType === value}
          on:click={() => selectFareType(fareType)}
        >
          {fareTypeLabel[fareType]}
        </button>
      {/each}
    </div>
  {/if}
</div>
```

**運賃タイプ**:
```typescript
const fareTypeLabel: Record<FareType, string> = {
  NORMAL: '普通運賃',
  CHILD: '小児運賃',
  ROUND_TRIP: '往復運賃',
  STOCK_DISCOUNT: '株割運賃',
  STOCK_DISCOUNT_X2: '株割x2運賃',
  STUDENT: '学割運賃',
  STUDENT_ROUND_TRIP: '学割往復',
  DISABLED: '無効',
};
```

---

## ページ固有コンポーネント

### MainPage コンポーネント

#### StationCard

**ファイル**: `src/lib/components/StationCard.svelte`

**Props**:
```typescript
interface StationCardProps {
  station: Station;
  isStartStation: boolean;
}
```

**デザイン**:
- 背景: `bg-gray-200` (#EEEEEE)
- 角丸: `rounded-lg`
- パディング: `p-4`
- 高さ: 約 80px
- アイコン: 青い電車アイコン (32px)

**構造**:
```svelte
<button class="station-card" on:click>
  <TrainIcon class="text-primary-700" size={32} />
  <div class="station-info">
    {#if isStartStation}
      <p class="label">発駅:</p>
    {/if}
    <p class="station-name">{station.name}</p>
    <p class="station-kana">{station.kana}</p>
  </div>
  <ChevronRightIcon class="text-gray-400" />
</button>
```

---

#### RouteSegmentCard

**ファイル**: `src/lib/components/RouteSegmentCard.svelte`

**Props**:
```typescript
interface RouteSegmentCardProps {
  segment: RouteSegment;
  index: number;
  onDelete?: () => void;
}
```

**デザイン**:
- 背景: `bg-gray-200`
- 角丸: `rounded-lg`
- バッジ: 緑色の丸 (`bg-accent-green-500`)、白文字

**構造**:
```svelte
<div class="route-segment-card">
  <div class="segment-badge">
    {index + 1}
  </div>

  <div class="segment-info">
    <p class="line-name">{segment.line.name}</p>
    <p class="station-name">{segment.arrivalStation.name}</p>
  </div>

  {#if onDelete}
    <button class="delete-button" on:click={onDelete}>
      <CloseIcon />
    </button>
  {/if}

  <button class="expand-button">
    <ChevronRightIcon />
  </button>
</div>
```

---

#### AddRouteButton

**ファイル**: `src/lib/components/AddRouteButton.svelte`

**デザイン**:
- 背景: `bg-accent-orange-500` (#FF9800)
- 角丸: `rounded-lg`
- パディング: `py-4`
- テキスト: `text-white font-medium`
- アイコン: `+`

**構造**:
```svelte
<button class="add-route-button" on:click>
  <AddIcon />
  <span>経路を追加</span>
</button>
```

---

#### FareSummaryCard

**ファイル**: `src/lib/components/FareSummaryCard.svelte`

**Props**:
```typescript
interface FareSummaryCardProps {
  fareInfo: FareInfo;
  onDetailClick: () => void;
}
```

**デザイン**:
- 背景: `bg-green-50` (薄い緑)
- 角丸: `rounded-lg`
- パディング: `p-4`
- テキスト: 黒、右寄せ

**構造**:
```svelte
<div class="fare-summary-card" on:click={onDetailClick}>
  <div class="summary-row">
    <span class="label">普通運賃</span>
    <span class="value">¥{fareInfo.fare.toLocaleString()}-</span>

    <span class="label">有効日数</span>
    <span class="value">{fareInfo.ticketAvailDays}日</span>
  </div>

  <div class="summary-row">
    <span class="label">営業キロ</span>
    <span class="value">{fareInfo.totalSalesKm.toFixed(1)} km.</span>

    <button class="detail-link">
      詳細を見る
      <ChevronRightIcon />
    </button>
  </div>
</div>
```

---

### StationSelectPage コンポーネント

#### TabNavigation

**ファイル**: `src/lib/components/TabNavigation.svelte`

**Props**:
```typescript
interface TabNavigationProps {
  tabs: string[];
  activeTab: number;
  onTabChange: (index: number) => void;
}
```

**デザイン**:
- 背景: `bg-white`
- アクティブタブ: 下線 `border-b-2 border-primary-700`
- 非アクティブ: `text-gray-600`

**構造**:
```svelte
<div class="tab-navigation">
  {#each tabs as tab, i}
    <button
      class="tab"
      class:active={activeTab === i}
      on:click={() => onTabChange(i)}
    >
      {tab}
    </button>
  {/each}
</div>
```

---

#### GroupList

**ファイル**: `src/lib/components/GroupList.svelte`

**Props**:
```typescript
interface GroupListProps {
  groups: JRGroup[];
  onGroupClick: (group: JRGroup) => void;
}
```

**デザイン**:
- リストアイテム: `bg-gray-200`, `rounded-lg`, `p-4`, `mb-2`

**構造**:
```svelte
<div class="group-list">
  {#each groups as group}
    <button class="list-item" on:click={() => onGroupClick(group)}>
      <span>{group}</span>
    </button>
  {/each}
</div>
```

---

#### StationList

**ファイル**: `src/lib/components/StationList.svelte`

**Props**:
```typescript
interface StationListProps {
  stations: Station[];
  highlightStationId?: number;  // 反転表示する駅（分岐駅選択時）
  onStationClick: (station: Station) => void;
}
```

**デザイン**:
- 通常アイテム: `bg-gray-200`
- ハイライトアイテム: `bg-gray-400` (選択不可の発駅)

**構造**:
```svelte
<div class="station-list">
  {#each stations as station}
    <button
      class="list-item"
      class:highlighted={station.id === highlightStationId}
      disabled={station.id === highlightStationId}
      on:click={() => onStationClick(station)}
    >
      <div>
        <p class="station-name">{station.name}</p>
        <p class="station-kana">({station.kana})</p>
      </div>
    </button>
  {/each}
</div>
```

---

### DetailPage コンポーネント

#### RouteHeader

**ファイル**: `src/lib/components/RouteHeader.svelte`

**Props**:
```typescript
interface RouteHeaderProps {
  startStation: Station;
  endStation: Station;
}
```

**デザイン**:
- 背景: `bg-gray-200`
- 角丸: `rounded-lg`
- パディング: `p-6`
- テキスト: 大きめ、太字

**構造**:
```svelte
<div class="route-header">
  <h2>{startStation.name} → {endStation.name}</h2>
</div>
```

---

#### KilometerCard

**ファイル**: `src/lib/components/KilometerCard.svelte`

**Props**:
```typescript
interface KilometerCardProps {
  fareInfo: FareInfo;
}
```

**構造**:
```svelte
<div class="info-card">
  <h3 class="card-title">キロ程</h3>
  <div class="info-row">
    <span>営業キロ</span>
    <span>{fareInfo.totalSalesKm.toFixed(1)}km</span>
    <span>計算キロ</span>
    <span>{fareInfo.jrCalcKm.toFixed(1)}km</span>
  </div>
</div>
```

---

#### FareCard

**ファイル**: `src/lib/components/FareCard.svelte`

**Props**:
```typescript
interface FareCardProps {
  fareInfo: FareInfo;
}
```

**構造**:
```svelte
<div class="info-card">
  <h3 class="card-title">運賃</h3>

  <div class="fare-row">
    <span>普通運賃</span>
    <span class="fare-amount">¥{fareInfo.fare.toLocaleString()}-</span>
  </div>

  {#if fareInfo.isRoundtrip}
    <div class="fare-row">
      <span>往復</span>
      <span class="fare-amount">¥{fareInfo.roundTripFare.toLocaleString()}- (割引)</span>
    </div>
  {/if}

  <div class="fare-row sub">
    <span>小児運賃:</span>
    <span>¥{fareInfo.childFare.toLocaleString()}-</span>
    <span>往復</span>
    <span>¥{fareInfo.roundtripChildFare.toLocaleString()}-</span>
  </div>

  {#if fareInfo.isAcademicFare}
    <div class="fare-row sub">
      <span>学割運賃:</span>
      <span>¥{fareInfo.academicFare.toLocaleString()}-</span>
      <span>往復</span>
      <span>¥{fareInfo.roundtripAcademicFare.toLocaleString()}-</span>
    </div>
  {/if}
</div>
```

---

### SavePage コンポーネント

#### SavedRouteCard

**ファイル**: `src/lib/components/SavedRouteCard.svelte`

**Props**:
```typescript
interface SavedRouteCardProps {
  route: Route;
  isTextFormat?: boolean;  // テキスト形式表示かカード形式か
  onSelect?: () => void;
  onDelete?: () => void;
}
```

**デザイン（テキスト形式）**:
- テキスト: 赤色 (`text-red-600`)
- 背景: 白
- ボーダー: なし
- 右端: 削除アイコン

**デザイン（カード形式）**:
- 背景: `bg-gray-100`
- 角丸: `rounded-lg`
- パディング: `p-4`

---

### BottomNavigation

**ファイル**: `src/lib/components/BottomNavigation.svelte`

**Props**:
```typescript
interface BottomNavigationProps {
  onBackClick: () => void;
  onReverseClick: () => void;
  onSaveClick: () => void;
}
```

**デザイン**:
- 高さ: 64px
- 背景: `bg-white`
- ボーダー: `border-t border-gray-300`
- ボタン: 4つ均等配置

**構造**:
```svelte
<nav class="bottom-navigation">
  <button on:click={onBackClick}>
    <UndoIcon />
    <span>戻る</span>
  </button>

  <button on:click={onReverseClick}>
    <SwapIcon />
    <span>リバース</span>
  </button>

  <button on:click={onOptionClick}>
    <SwapIcon />
    <span>オプションメニュー</span>
  </button>

  <button on:click={onSaveClick}>
    <SaveIcon />
    <span>保存</span>
  </button>
</nav>
```

---

## ユーティリティコンポーネント

### SearchBar

**ファイル**: `src/lib/components/SearchBar.svelte`

**Props**:
```typescript
interface SearchBarProps {
  placeholder: string;
  value: string;
  onInput: (value: string) => void;
}
```

**デザイン**:
- 背景: `bg-white`
- ボーダー: `border border-gray-300`
- 角丸: `rounded-lg`
- パディング: `px-4 py-2`

---

### IconButton

**ファイル**: `src/lib/components/IconButton.svelte`

**Props**:
```typescript
interface IconButtonProps {
  icon: any;  // アイコンコンポーネント
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'secondary' | 'white';
  onClick: () => void;
}
```

---

### Badge

**ファイル**: `src/lib/components/Badge.svelte`

**Props**:
```typescript
interface BadgeProps {
  number: number;
  color?: 'green' | 'primary' | 'orange';
  size?: 'sm' | 'md' | 'lg';
}
```

**デザイン（緑色、medium）**:
- 背景: `bg-accent-green-500`
- サイズ: `w-12 h-12`
- 角丸: `rounded-full`
- テキスト: `text-white font-semibold`

---

## コンポーネント設計原則

### 1. 単一責任の原則
- 各コンポーネントは1つの明確な責任を持つ
- 例: `FarePicker` は運賃タイプの選択のみを担当

### 2. 再利用性
- 汎用的なコンポーネント（`IconButton`, `Badge`, `SearchBar`）は複数の場所で使用
- ページ固有のコンポーネントも、可能な限り汎用化

### 3. Props vs Store
- **Props**: コンポーネント固有のデータ（表示内容、見た目の設定）
- **Store**: グローバルな状態（`currentRoute`, `savedRoutes` など）

### 4. イベントハンドリング
- 親コンポーネントで状態管理
- 子コンポーネントは `dispatch` でイベントを発火

### 5. アクセシビリティ
- セマンティックHTML使用 (`button`, `nav`, `header`)
- ARIA属性の適切な使用
- キーボード操作対応

---

## 次のステップ

1. **SvelteKitプロジェクトのセットアップ**
2. **共有コンポーネントから実装** (`AppBar`, `DrawerNavigation`)
3. **ページコンポーネントの実装** (メイン画面から順次)
4. **Storybook導入**（オプション、コンポーネント開発支援）
