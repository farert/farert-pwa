<script lang="ts">
import type { FareInfo } from '$lib/types';

export let fareInfo: FareInfo | null = null;
export let onDetailClick: (() => void) | undefined;
export let detailEnabled = false;

function formatCurrency(value: number | undefined): string {
	if (typeof value !== 'number' || Number.isNaN(value)) return '¥—';
	return `¥${value.toLocaleString()}`;
}

function resolveDistance(info: FareInfo | null): string {
	const raw = (info?.totalSalesKm as number | undefined) ?? (info?.distance as number | undefined);
	if (typeof raw !== 'number' || Number.isNaN(raw)) return '— km';
	return `${raw} km`;
}

function resolveValidDays(info: FareInfo | null): string {
	const raw = (info?.ticketAvailDays as number | undefined) ?? (info?.validDays as number | undefined);
	if (typeof raw !== 'number' || Number.isNaN(raw)) return '— 日';
	return `${raw} 日`;
}

$: fareAmount = formatCurrency((fareInfo?.fare as number | undefined) ?? undefined);
$: distanceText = resolveDistance(fareInfo);
$: validDaysText = resolveValidDays(fareInfo);

function handleDetailClick(): void {
	const showDetail = detailEnabled && onDetailClick;
	if (!showDetail) return;
	onDetailClick();
}
</script>

<button
	class="fare-summary-card"
	type="button"
	on:click={handleDetailClick}
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
		background: #ecfdf5;
		border-radius: 1rem;
		padding: 1rem 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		box-shadow: 0 10px 25px rgba(16, 185, 129, 0.15);
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
		color: #047857;
		font-weight: 600;
	}

	.value {
		margin: 0.2rem 0 0;
		font-size: 1.1rem;
		font-weight: 700;
		color: #064e3b;
	}

	.fare-summary-card:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.chevron {
		font-size: 1.5rem;
		color: #10b981;
	}
</style>
