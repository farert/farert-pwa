<script lang="ts">
	import { base } from '$app/paths';
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
		onMoveItem,
		onAddToHolder,
		onShare
	} = $props<{
		isOpen?: boolean;
		items?: DrawerItem[];
		onClose?: () => void;
		onItemClick?: (item: TicketHolderItem) => void;
		onItemDelete?: (order: number) => void;
		onFareTypeChange?: (order: number, fareType: FareType) => void;
		onMoveItem?: (fromOrder: number, toOrder: number, insertBefore?: boolean) => void;
		onAddToHolder?: () => void;
		onShare?: () => void;
		canAdd?: boolean;
	}>();

	const totalFare = $derived(items.reduce((sum, item) => sum + (item.fareValue ?? 0), 0));
	const totalKm = $derived(items.reduce((sum, item) => sum + (item.kmValue ?? 0), 0));
	let draggingFromOrder = $state<number | null>(null);
	let dropTargetOrder = $state<number | null>(null);
	let dropTargetPosition = $state<'before' | 'after' | null>(null);

	function parseOrder(key: string): number {
		const value = Number(key);
		return Number.isNaN(value) ? -1 : value;
	}

	function getOrderFromTarget(target: EventTarget | null): number | null {
		if (!(target instanceof Element)) return null;
		const card = target.closest('[data-holder-order]');
		if (!card) return null;
		const order = Number(card.getAttribute('data-holder-order'));
		return Number.isNaN(order) ? null : order;
	}

	function parseOrderKey(key: string): number {
		const order = Number(key);
		return Number.isNaN(order) ? Number.NaN : order;
	}

	function getDropPositionFromEvent(target: EventTarget | null, clientY: number): 'before' | 'after' {
		if (!(target instanceof Element)) return 'after';
		const card = target.closest('[data-holder-order]');
		if (!card) return 'after';
		const rect = card.getBoundingClientRect();
		return clientY - rect.top <= rect.height / 2 ? 'before' : 'after';
	}

	function handleMoveDragStart(event: DragEvent, key: string): void {
		if (!event.dataTransfer) return;
		event.dataTransfer.effectAllowed = 'move';
		event.dataTransfer.setData('text/plain', key);
		draggingFromOrder = parseOrder(key);
		dropTargetOrder = null;
		dropTargetPosition = null;
	}

	function handleMoveDragOver(event: DragEvent, key: string): void {
		event.preventDefault();
		const targetOrder = parseOrderKey(key);
		if (Number.isNaN(targetOrder)) return;
		dropTargetOrder = targetOrder;
		dropTargetPosition = getDropPositionFromEvent(event.currentTarget, event.clientY);
		if (event.dataTransfer) {
			event.dataTransfer.dropEffect = 'move';
		}
	}

	function handleMoveDragEnter(event: DragEvent, key: string): void {
		event.preventDefault();
		const targetOrder = parseOrderKey(key);
		if (Number.isNaN(targetOrder)) return;
		dropTargetOrder = targetOrder;
		dropTargetPosition = getDropPositionFromEvent(event.currentTarget, event.clientY);
		if (event.dataTransfer) {
			event.dataTransfer.dropEffect = 'move';
		}
	}

	function handleMoveDragLeave(event: DragEvent, key: string): void {
		const order = parseOrderKey(key);
		if (Number.isNaN(order)) return;
		const relatedTarget = event.relatedTarget;
		if (relatedTarget instanceof Element) {
			const relatedCard = relatedTarget.closest('[data-holder-order]');
			const relatedOrder = relatedCard ? Number(relatedCard.getAttribute('data-holder-order')) : null;
			if (relatedCard && !Number.isNaN(relatedOrder) && relatedOrder === dropTargetOrder) {
				return;
			}
		}
		if (order === dropTargetOrder) {
			dropTargetOrder = null;
			dropTargetPosition = null;
		}
	}

	function handleMoveDrop(event: DragEvent, key: string): void {
		event.preventDefault();
		if (!onMoveItem) {
			draggingFromOrder = null;
			dropTargetOrder = null;
			dropTargetPosition = null;
			return;
		}
		const rawData = event.dataTransfer?.getData('text/plain');
		if (!rawData) return;
		const fromOrder = Number(rawData);
		const toOrder = Number(key);
		if (Number.isNaN(fromOrder) || Number.isNaN(toOrder)) return;
		if (fromOrder === toOrder) return;
		const position = getDropPositionFromEvent(event.currentTarget, event.clientY);
		onMoveItem(fromOrder, toOrder, position === 'before');
		draggingFromOrder = null;
		dropTargetOrder = null;
		dropTargetPosition = null;
	}

	function handleMoveDragEnd(): void {
		draggingFromOrder = null;
		dropTargetOrder = null;
		dropTargetPosition = null;
	}

	function handleTouchStart(event: TouchEvent): void {
		const target = event.target;
		if (!(target instanceof Element)) return;
		if (!target.closest('.drag-handle')) return;
		const order = getOrderFromTarget(target);
		if (order === null) return;
		event.preventDefault();
		draggingFromOrder = order;
		dropTargetOrder = order;
		dropTargetPosition = 'after';
	}

	function handleTouchMove(event: TouchEvent): void {
		if (draggingFromOrder === null || event.touches.length === 0) return;
		const point = event.touches[0];
		const element = document.elementFromPoint(point.clientX, point.clientY);
		const order = getOrderFromTarget(element);
		if (order !== null) {
			dropTargetOrder = order;
			dropTargetPosition = getDropPositionFromEvent(element, point.clientY);
		}
		event.preventDefault();
	}

	function handleTouchEnd(event: TouchEvent): void {
		if (draggingFromOrder === null) return;
		const point = event.changedTouches?.[0];
		const endOrder = point
			? getOrderFromTarget(document.elementFromPoint(point.clientX, point.clientY))
			: dropTargetOrder;
		const endPosition = point
			? getDropPositionFromEvent(
					document.elementFromPoint(point.clientX, point.clientY),
					point.clientY
			  )
			: dropTargetPosition ?? 'after';
		if (endOrder !== null && onMoveItem) {
			onMoveItem(draggingFromOrder, endOrder, endPosition === 'before');
		}
		draggingFromOrder = null;
		dropTargetOrder = null;
		dropTargetPosition = null;
	}

	function isDropTarget(order: number): boolean {
		return order === dropTargetOrder;
	}

	function getDropPosition(order: number): 'before' | 'after' | null {
		if (!isDropTarget(order)) return null;
		return dropTargetPosition;
	}
</script>

<aside class={`drawer ${isOpen ? 'open' : ''}`}>
	<div class="drawer-header">
		<img src="{base}/tickfolder3.png" alt="" class="icon" />
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

	<div
		class="ticket-list"
		ontouchstart={handleTouchStart}
		ontouchmove={handleTouchMove}
		ontouchend={handleTouchEnd}
		ontouchcancel={handleTouchEnd}
	>
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
					onDelete={() => onItemDelete?.(parseOrder(item.key))}
					onFareTypeChange={(fareType) => onFareTypeChange?.(parseOrder(item.key), fareType)}
					onMoveDragStart={(event) => handleMoveDragStart(event, item.key)}
					onMoveDragOver={(event) => handleMoveDragOver(event, item.key)}
					onMoveDrop={(event) => handleMoveDrop(event, item.key)}
					onMoveDragEnter={(event) => handleMoveDragEnter(event, item.key)}
					onMoveDragLeave={(event) => handleMoveDragLeave(event, item.key)}
					onMoveDragEnd={handleMoveDragEnd}
					dropPosition={getDropPosition(parseOrder(item.key))}
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
