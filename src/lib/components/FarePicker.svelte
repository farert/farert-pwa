<!--
運賃種別を切り替えるための小さな入力コンポーネントです。
表示中の運賃種別を示し、変更イベントだけを親へ通知します。
-->
<script lang="ts">
	import { FareType, FareTypeLabels } from '$lib/types';

	export type FarePickerOption = {
		value: FareType;
		label: string;
	};

	let {
		value = FareType.NORMAL,
		availableTypes = Object.values(FareType) as FareType[],
		options,
		onChange
	} = $props<{
		value?: FareType;
		availableTypes?: FareType[];
		options?: FarePickerOption[];
		onChange?: (fareType: FareType) => void;
	}>();

		/**
	 * `handleChange` のイベント処理を行います。
	 *
	 * @param event 発生したイベントです。
	 * @returns この処理は戻り値を持ちません。
	 */
function handleChange(event: Event): void {
		const target = event.target as HTMLSelectElement;
		const next = target.value as FareType;
		onChange?.(next);
	}

		/**
	 * `stopInteractionPropagation` を処理します。
	 *
	 * @param event 発生したイベントです。
	 * @returns この処理は戻り値を持ちません。
	 */
function stopInteractionPropagation(event: Event): void {
		event.stopPropagation();
	}

		/**
	 * `labelFor` を処理します。
	 *
	 * @param type 処理対象の値です。
	 * @returns 文字列結果を返します。
	 */
function labelFor(type: FareType): string {
		return FareTypeLabels[type];
	}

	const resolvedOptions = $derived(
		options ?? availableTypes.map((type) => ({ value: type, label: labelFor(type) }))
	);
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
	{#each resolvedOptions as option}
		<option value={option.value} selected={option.value === value}>{option.label}</option>
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
