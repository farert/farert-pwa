<script lang="ts">
	import TicketHolderCard from '$lib/components/TicketHolderCard.svelte';
	import type { FareType, TicketHolderItem } from '$lib/types';

	type DrawerItem = TicketHolderItem & {
		key: string;
		title: string;
		fareText: string;
		kmText: string;
		fareValue?: number;
		kmValue?: number;
	};

	let {
		isOpen = false,
		items = [],
		canAdd = true,
		onClose,
		onItemClick,
		onItemDelete,
		onFareTypeChange,
		onAddToHolder,
		onShare
	} = $props<{
		isOpen?: boolean;
		items?: DrawerItem[];
		onClose?: () => void;
		onItemClick?: (item: TicketHolderItem) => void;
		onItemDelete?: (id: string) => void;
		onFareTypeChange?: (id: string, fareType: FareType) => void;
		onAddToHolder?: () => void;
		onShare?: () => void;
		canAdd?: boolean;
	}>();

	const totalFare = $derived(items.reduce((sum, item) => sum + (item.fareValue ?? 0), 0));
	const totalKm = $derived(items.reduce((sum, item) => sum + (item.kmValue ?? 0), 0));
</script>

<aside class={`drawer ${isOpen ? 'open' : ''}`}>
	<div class="drawer-header">
		<img src="/tickfolder3.png" alt="" class="icon" />
		<h2>きっぷホルダ</h2>
	</div>
	<div class="summary">
		<p>総運賃 <strong>¥{totalFare.toLocaleString('ja-JP')}</strong></p>
		<p>総営業キロ <strong>{totalKm.toFixed(1)}km</strong></p>
	</div>
	<div class="actions">
		<button type="button" class="icon-button" aria-label="共有" onclick={onShare}>
			<span class="material-symbols-rounded" aria-hidden="true">share</span>
		</button>
		<button
			type="button"
			class="add-button"
			aria-label="きっぷホルダに追加"
			onclick={onAddToHolder}
			disabled={!canAdd}
		>
			追加≪
		</button>
	</div>

	<div class="ticket-list">
		{#if items.length === 0}
			<p class="empty">きっぷホルダは空です。</p>
		{:else}
			{#each items as item (item.key)}
				<TicketHolderCard
					item={item}
					title={item.title}
					fareText={item.fareText}
					kmText={item.kmText}
					onSelect={() => onItemClick?.(item)}
					onDelete={() => onItemDelete?.(item.key)}
					onFareTypeChange={(fareType) => onFareTypeChange?.(item.key, fareType)}
				/>
			{/each}
		{/if}
	</div>
</aside>

{#if isOpen}
	<button type="button" class="backdrop" aria-label="閉じる" onclick={onClose}></button>
{/if}

<style>
	.drawer {
		position: fixed;
		top: 0;
		left: 0;
		bottom: 0;
		max-width: 340px;
		width: 85%;
		background: linear-gradient(135deg, #374151, #1f2937 45%, #0f172a);
		color: #fff;
		box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
		transform: translateX(-100%);
		transition: transform 0.25s ease;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 1rem;
		z-index: 40;
		pointer-events: none;
	}

	.drawer.open {
		transform: translateX(0);
		pointer-events: auto;
	}

	.drawer-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-weight: 700;
	}

	.icon {
		width: 32px;
		height: 32px;
		object-fit: contain;
	}

	.summary {
		font-size: 0.95rem;
		line-height: 1.5;
	}

	.actions {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.icon-button {
		border: none;
		background: rgba(255, 255, 255, 0.12);
		color: #fff;
		width: 40px;
		height: 40px;
		border-radius: 999px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
	}

	.add-button {
		border: none;
		background: none;
		color: #f8d34f;
		font-weight: 700;
		font-size: 0.95rem;
	}

	.add-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.ticket-list {
		flex: 1;
		overflow: auto;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding-bottom: 1rem;
	}

	.empty {
		margin: 0;
		color: #e5e7eb;
	}

	.backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.35);
		z-index: 30;
		pointer-events: auto;
	}
</style>
