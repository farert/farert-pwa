<script lang="ts">
	let {
		route = '',
		statusLabel = '',
		statusTone = 'normal',
		isTextFormat = false,
		showDelete = false,
		onSelect,
		onDelete
	} = $props<{
		route?: string;
		statusLabel?: string;
		statusTone?: 'alert' | 'muted' | 'normal';
		isTextFormat?: boolean;
		showDelete?: boolean;
		onSelect?: () => void;
		onDelete?: () => void;
	}>();

	let revealDelete = $state(false);
	let startX: number | null = null;

	function handleKeydown(event: KeyboardEvent): void {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			handleSelect();
		}
	}

	function handlePointerStart(event: PointerEvent | TouchEvent): void {
		const point = 'touches' in event ? event.touches[0] : event;
		startX = point.clientX;
	}

	function handlePointerMove(event: PointerEvent | TouchEvent): void {
		if (startX === null) return;
		const point = 'touches' in event ? event.touches[0] : event;
		const delta = point.clientX - startX;
		if (delta < -24) {
			revealDelete = true;
		} else if (delta > 24) {
			revealDelete = false;
		}
	}

	function handlePointerEnd(): void {
		startX = null;
	}

	function handleDelete(event: Event): void {
		event.stopPropagation();
		onDelete?.();
	}

	function handleSelect(): void {
		onSelect?.();
	}

	const showDeleteButton = $derived(showDelete || revealDelete);
</script>

<div
	class={`saved-card ${isTextFormat ? 'text-card' : ''}`}
	onclick={handleSelect}
	onpointerdown={handlePointerStart}
	onpointermove={handlePointerMove}
	onpointerup={handlePointerEnd}
	ontouchstart={handlePointerStart}
	ontouchmove={handlePointerMove}
	ontouchend={handlePointerEnd}
	role="button"
	tabindex="0"
	aria-label={`経路 ${route}`}
	onkeydown={handleKeydown}
>
	<div class="text">
		{#if statusLabel}
			<p class={`status ${statusTone}`}>{statusLabel}</p>
		{/if}
		<p class="route">{route}</p>
	</div>
	{#if showDeleteButton}
		<button class="delete" type="button" aria-label="削除" onclick={handleDelete}>
			<span class="material-symbols-rounded" aria-hidden="true">delete</span>
		</button>
	{/if}
</div>

<style>
	.saved-card {
		position: relative;
		display: flex;
		gap: 0.5rem;
		align-items: flex-start;
		background: #f8fafc;
		border-radius: 0.75rem;
		padding: 0.9rem 1rem;
		box-shadow: 0 8px 18px rgba(15, 23, 42, 0.08);
		border: 1px solid #e5e7eb;
		cursor: pointer;
	}

	.saved-card.text-card {
		background: #fff;
		box-shadow: none;
		border: none;
	}

	.text {
		flex: 1;
	}

	.route {
		margin: 0;
		color: #111827;
		line-height: 1.4;
		white-space: pre-wrap;
		word-break: break-word;
		font-size: 0.95rem;
	}

	.status {
		margin: 0 0 0.25rem;
		font-size: 0.85rem;
		font-weight: 700;
	}

	.status.alert {
		color: #dc2626;
	}

	.status.muted {
		color: #6b7280;
	}

	.status.normal {
		color: #374151;
	}

	.delete {
		border: none;
		background: #fef2f2;
		color: #b91c1c;
		border-radius: 999px;
		width: 36px;
		height: 36px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 4px 10px rgba(185, 28, 28, 0.25);
	}
</style>
