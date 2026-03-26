<script lang="ts">
	import { base } from '$app/paths';
	import FarePicker from '$lib/components/FarePicker.svelte';
	import type { FareType, TicketHolderItem } from '$lib/types';

	let {
		item,
		title,
		fareText,
		kmText,
		onSelect,
		onDelete,
		onFareTypeChange,
		onMoveDragStart,
		onMoveDragOver,
		onMoveDrop,
		onMoveDragEnter,
		onMoveDragLeave,
		onMoveDragEnd,
		dropPosition = null,
		showDelete = false
	} = $props<{
		item: TicketHolderItem;
		title: string;
		fareText: string;
		kmText: string;
		onSelect?: () => void;
		onDelete?: () => void;
		onFareTypeChange?: (type: FareType) => void;
		onMoveDragStart?: (event: DragEvent) => void;
		onMoveDragOver?: (event: DragEvent) => void;
		onMoveDrop?: (event: DragEvent) => void;
		onMoveDragEnter?: (event: DragEvent) => void;
		onMoveDragLeave?: (event: DragEvent) => void;
		onMoveDragEnd?: () => void;
		dropPosition?: 'before' | 'after' | null;
		showDelete?: boolean;
	}>();

	function handleDelete(event: Event): void {
		event.stopPropagation();
		onDelete?.();
	}

	function handleSelect(): void {
		onSelect?.();
	}

	function handleDragStart(event: DragEvent): void {
		event.stopPropagation();
		onMoveDragStart?.(event);
	}

	function handleDragOver(event: DragEvent): void {
		onMoveDragOver?.(event);
	}

	function handleDragEnter(event: DragEvent): void {
		onMoveDragEnter?.(event);
	}

	function handleDragLeave(event: DragEvent): void {
		onMoveDragLeave?.(event);
	}

	function handleDrop(event: DragEvent): void {
		event.preventDefault();
		event.stopPropagation();
		onMoveDrop?.(event);
	}

	function handleDragEnd(): void {
		onMoveDragEnd?.();
	}

	function handleKeydown(event: KeyboardEvent): void {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			handleSelect();
		}
	}

	function handleDragHandleClick(event: Event): void {
		event.stopPropagation();
	}
</script>

<div
	class="card"
	role="button"
	tabindex="0"
	onclick={handleSelect}
	onkeydown={handleKeydown}
	ondragover={handleDragOver}
	ondragenter={handleDragEnter}
	ondragleave={handleDragLeave}
	ondrop={handleDrop}
	ondragend={handleDragEnd}
	class:drop-insert-before={dropPosition === 'before'}
	class:drop-insert-after={dropPosition === 'after'}
	data-holder-order={item.order}
>
	{#if dropPosition === 'before'}
		<div class="drop-banner drop-banner-before" aria-hidden="true">ここへ移動</div>
	{:else if dropPosition === 'after'}
		<div class="drop-banner drop-banner-after" aria-hidden="true">ここへ移動</div>
	{/if}

	<header class="card-header">
		<div class="title-group">
			<img
				src={`${base}/mipmap-hdpi/ic_launcher.png`}
				alt=""
				class="holder-icon"
				aria-hidden="true"
			/>
			<p>{title}</p>
		</div>
		<div class="meta">
			<strong>{fareText}</strong>
			<span class="distance">{kmText}</span>
		</div>
	</header>

	<div class="controls">
		<FarePicker value={item.fareType} onChange={(type) => onFareTypeChange?.(type)} />
		{#if showDelete}
			<button type="button" class="icon-button" aria-label="削除" onclick={handleDelete}>
				<span class="material-symbols-rounded" aria-hidden="true">delete</span>
			</button>
		{/if}
	</div>

	<button
		type="button"
		class="icon-button drag-handle"
		aria-label="順番を並び替え"
		title="ドラッグして並び替え"
		draggable="true"
		onclick={handleDragHandleClick}
		ondragstart={handleDragStart}
	>
		<span class="material-symbols-rounded" aria-hidden="true">drag_handle</span>
	</button>
</div>

<style>
	.card {
		background: linear-gradient(135deg, #1f2937, #312e81, #0f172a);
		border-radius: 1rem;
		padding: 0.85rem;
		position: relative;
		color: #fff;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		box-shadow: 0 10px 25px rgba(15, 23, 42, 0.3);
		border: 2px solid transparent;
		text-align: left;
		transition: box-shadow 0.16s ease, outline 0.16s ease, border-color 0.16s ease;
	}

	.card-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.title-group {
		display: flex;
		align-items: center;
		gap: 0.35rem;
	}

	.holder-icon {
		width: 20px;
		height: 20px;
		object-fit: contain;
	}

	.title-group p {
		margin: 0;
		font-weight: 700;
	}

	.meta {
		text-align: right;
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
	}

	.distance {
		opacity: 0.8;
		font-size: 0.9rem;
	}

	.controls {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.icon-button {
		width: 36px;
		height: 36px;
		border-radius: 999px;
		border: none;
		background: rgba(255, 255, 255, 0.15);
		color: #fff;
		display: inline-flex;
		align-items: center;
		justify-content: center;
	}

	.drag-handle {
		position: absolute;
		right: 0.6rem;
		bottom: 0.6rem;
		cursor: grab;
		touch-action: none;
	}

	.card.drop-insert-before,
	.card.drop-insert-after {
		border-color: rgba(245, 158, 11, 0.7);
		outline: 2px solid rgba(251, 191, 36, 0.8);
		outline-offset: -2px;
		box-shadow:
			0 0 0 2px rgba(251, 191, 36, 0.2),
			0 0 8px 1px rgba(250, 204, 21, 0.32),
			inset 0 0 0 2px rgba(250, 204, 21, 0.12),
			inset 0 0 12px rgba(251, 191, 36, 0.14);
		transform: none;
		z-index: 1;
	}

	.card.drop-insert-before::before,
	.card.drop-insert-after::after {
		content: '';
		position: absolute;
		left: 0;
		right: 0;
		height: 8px;
		opacity: 1;
		pointer-events: none;
		filter: none;
		z-index: 2;
		border-radius: 999px;
	}

	.card.drop-insert-before::before {
		top: 0;
		background: linear-gradient(90deg, rgba(254, 240, 138, 0.85) 0%, rgba(245, 158, 11, 0.45) 50%, rgba(254, 240, 138, 0.85) 100%);
	}

	.card.drop-insert-after::after {
		bottom: 0;
		background: linear-gradient(90deg, rgba(254, 240, 138, 0.85) 0%, rgba(245, 158, 11, 0.45) 50%, rgba(254, 240, 138, 0.85) 100%);
	}

	.drop-banner {
		position: absolute;
		left: 50%;
		transform: translateX(-50%);
		padding: 0.18rem 0.48rem;
		font-size: 0.72rem;
		font-weight: 700;
		line-height: 1;
		color: #111827;
		border: 1px solid rgba(255, 255, 255, 0.85);
		border-radius: 999px;
		background: linear-gradient(90deg, #fde68a 0%, #fbbf24 100%);
		box-shadow: 0 0 6px rgba(251, 191, 36, 0.25);
		z-index: 2;
		pointer-events: none;
		text-shadow: none;
		white-space: nowrap;
	}

	.drop-banner-before {
		top: -0.6rem;
	}

	.drop-banner-after {
		bottom: -0.6rem;
	}
</style>
