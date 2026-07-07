<!--
確認ダイアログの共通コンポーネントです。
メッセージ表示と「はい/いいえ」の選択結果通知だけを担います。
-->
<script lang="ts">
	let {
		open = false,
		message = '',
		title = '確認',
		onResolve
	} = $props<{
		open?: boolean;
		message?: string;
		title?: string;
		onResolve?: (result: boolean) => void;
	}>();
</script>

{#if open}
	<div class="confirm-overlay" role="dialog" aria-modal="true" aria-label="確認ダイアログ">
		<section class="confirm-card">
			<h3>{title}</h3>
			<p>{message}</p>
			<div class="confirm-actions">
				<button type="button" class="confirm-primary" onclick={() => onResolve?.(true)}>
					はい
				</button>
				<button type="button" class="confirm-secondary" onclick={() => onResolve?.(false)}>
					いいえ
				</button>
			</div>
		</section>
	</div>
{/if}

<style>
	.confirm-overlay {
		position: fixed;
		inset: 0;
		display: grid;
		place-items: center;
		background: rgba(2, 6, 23, 0.45);
		backdrop-filter: blur(2px);
		z-index: 60;
	}

	.confirm-card {
		width: min(420px, calc(100% - 2rem));
		background: var(--card-bg);
		border-radius: 1rem;
		padding: 1rem;
		box-shadow: 0 24px 40px rgba(15, 23, 42, 0.35);
	}

	.confirm-card h3 {
		margin: 0 0 0.5rem;
		font-size: 1.05rem;
		color: var(--title-color);
	}

	.confirm-card p {
		margin: 0;
		color: var(--text-main);
	}

	.confirm-actions {
		margin-top: 1rem;
		display: flex;
		justify-content: flex-end;
		gap: 0.5rem;
	}

	.confirm-actions button {
		border: none;
		border-radius: 0.65rem;
		padding: 0.5rem 0.95rem;
		font-weight: 700;
		cursor: pointer;
	}

	.confirm-primary {
		background: #2563eb;
		color: #fff;
	}

	.confirm-secondary {
		background: #e5e7eb;
		color: #1f2937;
	}
</style>
