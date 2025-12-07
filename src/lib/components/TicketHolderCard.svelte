<script lang="ts">
	import FarePicker from '$lib/components/FarePicker.svelte';
	import type { FareType, TicketHolderItem } from '$lib/types';

	let { item, title, fareText, kmText, onSelect, onDelete, onFareTypeChange } = $props<{
		item: TicketHolderItem;
		title: string;
		fareText: string;
		kmText: string;
		onSelect?: () => void;
		onDelete?: () => void;
		onFareTypeChange?: (type: FareType) => void;
	}>();

	function handleDelete(event: Event): void {
		event.stopPropagation();
		onDelete?.();
	}

	function handleSelect(): void {
		onSelect?.();
	}

	function handleKeydown(event: KeyboardEvent): void {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			handleSelect();
		}
	}
</script>

<div class="card" role="button" tabindex="0" onclick={handleSelect} onkeydown={handleKeydown}>
	<header class="card-header">
		<div class="title-group">
			<span class="material-symbols-rounded" aria-hidden="true">folder_open</span>
			<p>{title}</p>
		</div>
		<div class="meta">
			<strong>{fareText}</strong>
			<span class="distance">{kmText}</span>
		</div>
	</header>

	<div class="controls">
		<button type="button" class="icon-button" aria-label="削除" onclick={handleDelete}>
			<span class="material-symbols-rounded" aria-hidden="true">delete</span>
		</button>
		<FarePicker value={item.fareType} onChange={(type) => onFareTypeChange?.(type)} />
	</div>
</div>

<style>
	.card {
		background: linear-gradient(135deg, #1f2937, #312e81, #0f172a);
		border-radius: 1rem;
		padding: 0.85rem;
		color: #fff;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		box-shadow: 0 10px 25px rgba(15, 23, 42, 0.3);
		border: none;
		text-align: left;
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
</style>
