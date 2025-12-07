<script lang="ts">
	import { FareType, FareTypeLabels } from '$lib/types';

	let { value = FareType.NORMAL, onChange } = $props<{
		value?: FareType;
		onChange?: (fareType: FareType) => void;
	}>();

	function handleChange(event: Event): void {
		const target = event.target as HTMLSelectElement;
		const next = target.value as FareType;
		onChange?.(next);
	}
</script>

<select class="fare-picker" value={value} onchange={handleChange} aria-label="運賃タイプ選択">
	{#each Object.values(FareType) as type}
		<option value={type} selected={type === value}>{FareTypeLabels[type]}</option>
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
