<!--
メイン画面で運賃サマリーを表示するカードコンポーネントです。
普通運賃、営業キロ、有効日数と詳細導線をまとめて表示します。
-->
<script lang="ts">
	import type { FareInfo } from '$lib/types';

	let {
		fareInfo = null,
		onDetailClick = undefined,
		detailEnabled = false
	} = $props<{
		fareInfo?: FareInfo | null;
		onDetailClick?: (() => void) | undefined;
		detailEnabled?: boolean;
	}>();

	/**
	 * 金額を日本円表記に整形します。
	 *
	 * @param value 整形対象の金額
	 * @returns 表示用文字列（不正値は「¥—」）
	 */
	function formatCurrency(value: number | undefined): string {
		if (typeof value !== 'number' || Number.isNaN(value)) return '¥—';
		return `¥${value.toLocaleString()}`;
	}

	/**
	 * 営業キロ表示文字列を返します。
	 *
	 * @param info 運賃情報
	 * @returns 表示用文字列（不正値は「— km」）
	 */
	function resolveDistance(info: FareInfo | null): string {
		const raw = info?.totalSalesKm;
		if (typeof raw !== 'number' || Number.isNaN(raw)) return '— km';
		return `${raw} km`;
	}

	/**
	 * 有効日数表示文字列を返します。
	 *
	 * @param info 運賃情報
	 * @returns 表示用文字列（不正値は「— 日」）
	 */
	function resolveValidDays(info: FareInfo | null): string {
		const raw = info?.ticketAvailDays;
		if (typeof raw !== 'number' || Number.isNaN(raw)) return '— 日';
		return `${raw} 日`;
	}

	const fareAmount = $derived(formatCurrency(fareInfo?.fare));
	const distanceText = $derived(resolveDistance(fareInfo));
	const validDaysText = $derived(resolveValidDays(fareInfo));

	/**
	 * 詳細ボタン押下時に有効時のみコールバックを呼び出します。
	 *
	 * @returns この処理は戻り値を持ちません。
	 */
	function handleDetailClick(): void {
		if (!detailEnabled || !onDetailClick) return;
		onDetailClick();
	}
</script>

<button
	class="fare-summary-card"
	type="button"
	onclick={handleDetailClick}
	disabled={!detailEnabled}
	aria-label="運賃サマリー"
>
	<div class="summary-row">
		<div>
			<p class="label">普通運賃</p>
			<p class="value">{fareAmount}</p>
		</div>
		<div>
			<p class="label">有効日数</p>
			<p class="value">{validDaysText}</p>
		</div>
	</div>
	<div class="summary-row">
		<div>
			<p class="label">営業キロ</p>
			<p class="value">{distanceText}</p>
		</div>
		<span class="chevron" aria-hidden="true">&gt;</span>
	</div>
</button>

<style>
	.fare-summary-card {
		background: var(--fare-card-bg);
		border-radius: 1rem;
		padding: 1rem 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		box-shadow: var(--card-shadow);
		border: none;
		width: 100%;
		text-align: left;
		cursor: pointer;
	}

	.summary-row {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.summary-row > div {
		flex: 1;
		min-width: 120px;
	}

	.label {
		margin: 0;
		font-size: 0.85rem;
		color: var(--fare-card-label);
		font-weight: 600;
	}

	.value {
		margin: 0.2rem 0 0;
		font-size: 1.1rem;
		font-weight: 700;
		color: var(--fare-card-value);
	}

	.fare-summary-card:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.chevron {
		font-size: 1.5rem;
		color: var(--fare-card-accent);
	}
</style>
