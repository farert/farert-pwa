<script lang="ts">
	import { FareType, FareTypeLabels } from '$lib/types';

	let {
		value = FareType.NORMAL,
		availableTypes = Object.values(FareType) as FareType[],
		onChange
	} = $props<{
		value?: FareType;
		availableTypes?: FareType[];
		onChange?: (fareType: FareType) => void;
	}>();

	function handleChange(event: Event): void {
		const target = event.target as HTMLSelectElement;
		const next = target.value as FareType;
		onChange?.(next);
	}

	function stopInteractionPropagation(event: Event): void {
		event.stopPropagation();
	}

	function labelFor(type: FareType): string {
		return FareTypeLabels[type];
	}
</script>

<select
	class="fare-picker"
	value={value}
	onchange={handleChange}
	onclick={stopInteractionPropagation}
	onpointerdown={stopInteractionPropagation}
	onfocusin={stopInteractionPropagation}
	aria-label="運賃タイプ選択"
>
	{#each availableTypes as type}
		<option value={type} selected={type === value}>{labelFor(type)}</option>
	{/each}
</select>

<style>
	.fare-picker {
		border: 1px solid rgba(255, 255, 255, 0.4);
		background: rgba(255, 255, 255, 0.08);
		color: #fff;
		border-radius: 0.5rem;
		padding: 0.45rem 0.6rem;
		font-size: 0.9rem;
		min-width: 160px;
	}
</style>
