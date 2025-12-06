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

<div class="fare-summary-card">
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
		<button type="button" class="detail-link" on:click={handleDetailClick} disabled={!detailEnabled}>
			<span>詳細を見る</span>
			<span class="material-symbols-rounded" aria-hidden="true">chevron_right</span>
		</button>
	</div>
</div>

<style>
	.fare-summary-card {
		background: #ecfdf5;
		border-radius: 1rem;
		padding: 1rem 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		box-shadow: 0 10px 25px rgba(16, 185, 129, 0.15);
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

	.detail-link {
		align-self: flex-start;
		display: inline-flex;
		align-items: center;
		gap: 0.2rem;
		border: none;
		background: transparent;
		color: #047857;
		font-weight: 600;
		cursor: pointer;
	}

	.detail-link:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.detail-link :global(.material-symbols-rounded) {
		font-size: 1.25rem;
	}
</style>
