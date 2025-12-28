<script lang="ts">
import { goto } from '$app/navigation';
import { onDestroy, onMount } from 'svelte';
import SavedRouteCard from '$lib/components/SavedRouteCard.svelte';
import { initFarert, Farert } from '$lib/wasm';
import { initStores, mainRoute, savedRoutes, ticketHolder } from '$lib/stores';
import type { FaretClass } from '$lib/wasm/types';
import type { TicketHolderItem } from '$lib/types';
import { pasteRouteFromClipboard } from '$lib/storage';

	let loading = $state(true);
	let errorMessage = $state('');
	let infoMessage = $state('');
	let isEditing = $state(false);
	let currentRoute: FaretClass | null = null;
	let currentRouteScript = $state('');
	let savedList = $state<string[]>([]);
    let holderItems = $state<TicketHolderItem[]>([]);
    let warnDialog = $state('');

	let unsubscribeRoute: (() => void) | null = null;
	let unsubscribeSaved: (() => void) | null = null;
	let unsubscribeHolder: (() => void) | null = null;

	onMount(() => {
		(async () => {
			try {
				await initFarert();
				initStores(Farert);
				unsubscribeRoute = mainRoute.subscribe((value) => {
					currentRoute = value;
					currentRouteScript = safeRouteScript(value);
				});
				unsubscribeSaved = savedRoutes.subscribe((value) => {
					savedList = [...value];
				});
				unsubscribeHolder = ticketHolder.subscribe((value) => {
					holderItems = [...value];
				});
			} catch (err) {
				console.error('保存画面初期化エラー', err);
				errorMessage = '保存画面の初期化に失敗しました。';
			} finally {
				loading = false;
			}
		})();
	});

	onDestroy(() => {
		unsubscribeRoute?.();
		unsubscribeSaved?.();
		unsubscribeHolder?.();
	});

	const isCurrentSaved = $derived(
		currentRouteScript && savedList.some((route) => route === currentRouteScript)
	);
	const currentRouteCount = $derived(getCurrentRouteCount());

	function safeRouteScript(route: FaretClass | null): string {
		try {
			return route?.routeScript()?.trim() ?? '';
		} catch (err) {
			console.warn('経路スクリプト取得に失敗しました', err);
			return '';
		}
	}

	function showInfo(message: string): void {
		infoMessage = message;
	}

	function showError(message: string): void {
		errorMessage = message;
	}

    function clearMessages(): void {
        errorMessage = '';
        infoMessage = '';
        warnDialog = '';
    }

	function handleBack(): void {
		goto('/');
	}

	function toggleEdit(): void {
		isEditing = !isEditing;
	}

	function handleSaveCurrent(): void {
		clearMessages();
		if (!currentRouteScript) {
			showError('保存する経路がありません。');
			return;
		}
		const count = getCurrentRouteCount();
		if (count <= 1) {
			warnDialog = '1区間以下の経路は保存できません。';
			return;
		}
		if (isCurrentSaved) {
			showInfo('すでに保存済みです。');
			return;
	    }
        savedRoutes.update((list) => [currentRouteScript, ...list]);
        showInfo('保存しました。');
    }

    function getCurrentRouteCount(): number {
        try {
            if (currentRoute?.getRouteCount) return currentRoute.getRouteCount();
            const tokens = currentRouteScript ? currentRouteScript.split(',') : [];
            return Math.max(0, (tokens.length - 1) / 2);
        } catch (err) {
            console.warn('経路本数取得に失敗しました', err);
            return 0;
        }
    }

    function handleDeleteRoute(index: number): void {
        savedRoutes.update((list) => list.filter((_, i) => i !== index));
    }

	function handleDeleteCurrent(): void {
		if (!currentRouteScript) return;
		const idx = savedList.findIndex((r) => r === currentRouteScript);
		if (idx >= 0) {
			handleDeleteRoute(idx);
		}
	}

    function shouldConfirmOverride(targetScript: string): boolean {
        if (!currentRouteScript || currentRouteScript === targetScript) return false;
        const isInHolder = holderItems.some((item) => item.routeScript === currentRouteScript);
        return !isCurrentSaved && !isInHolder;
    }

	function isBuildSuccess(result: unknown): boolean {
		if (typeof result === 'number') return result >= 0;
		if (typeof result === 'string') {
			const trimmed = result.trim().replace(/\0/g, '');
			const numeric = Number(trimmed);
			if (!Number.isNaN(numeric)) return numeric >= 0;
			try {
				const parsed = JSON.parse(trimmed) as { rc?: number };
				return typeof parsed.rc === 'number' ? parsed.rc >= 0 : false;
			} catch {
				const match = trimmed.match(/"rc"\s*:\s*(-?\d+)/);
				return match ? Number(match[1]) >= 0 : false;
			}
		}
		return false;
	}

    function applyRoute(routeScript: string): void {
        clearMessages();
        if (shouldConfirmOverride(routeScript)) {
            const ok = window.confirm('⚠️経路は保存されていません。上書きしてよろしいですか？');
            if (!ok) return;
        }
        try {
            const route = new Farert();
            const result = route.buildRoute(routeScript);
            if (!isBuildSuccess(result)) {
                showError(`経路の復元に失敗しました (コード: ${result})`);
                return;
            }
            mainRoute.set(route);
            goto('/');
        } catch (err) {
            console.error('経路適用に失敗しました', err);
            showError('経路の適用に失敗しました。');
        }
    }

	async function handleImport(): Promise<void> {
		clearMessages();
		const ok = window.confirm('経路をインポートしてよろしいですか？');
		if (!ok) return;
		const text = await pasteRouteFromClipboard();
		if (!text) {
			showError('クリップボードから読み取れませんでした。');
			return;
		}
		try {
			const route = new Farert();
			const result = route.buildRoute(text.trim());
			if (result !== 0) {
				showError(`経路の書式不正により、インポートに失敗しました: コード ${result}`);
				return;
			}
			const script = route.routeScript();
			savedRoutes.update((list) => [script, ...list]);
			showInfo('インポートしました。');
		} catch (err) {
			console.error('インポートエラー', err);
			showError('経路のインポートに失敗しました。');
		}
	}

	async function handleExport(): Promise<void> {
		clearMessages();
		if (!savedList.length) {
			showError('エクスポートする経路がありません。');
			return;
		}
		const text = savedList.join('\n');
		try {
			if (navigator.share) {
				await navigator.share({ text });
				showInfo('共有しました。');
				return;
			}
		} catch (err) {
			console.warn('共有に失敗しました', err);
		}
		try {
			await navigator.clipboard.writeText(text);
			showInfo('クリップボードへコピーしました。');
		} catch (err) {
			console.error('エクスポートに失敗しました', err);
			showError('エクスポートに失敗しました。');
		}
	}
</script>

<div class="save-page">
	<header class="top-bar">
		<button type="button" class="icon-button" aria-label="戻る" onclick={handleBack}>
			<span class="material-symbols-rounded" aria-hidden="true">arrow_back</span>
		</button>
		<h1>経路保存</h1>
		<div class="actions">
			<button
				type="button"
				class="icon-button"
				aria-label={isEditing ? '完了' : '編集'}
				onclick={toggleEdit}
			>
				<span class="material-symbols-rounded" aria-hidden="true">
					{isEditing ? 'check' : 'edit'}
				</span>
			</button>
		</div>
	</header>

	{#if loading}
		<p class="banner">読み込み中...</p>
	{:else}
		{#if errorMessage}
			<p class="banner error" role="alert">{errorMessage}</p>
		{/if}
		{#if infoMessage}
			<p class="banner info" role="status">{infoMessage}</p>
		{/if}

		<section class="list">
			{#if currentRouteScript}
				{#if currentRouteCount > 1}
				<SavedRouteCard
					route={currentRouteScript}
					statusLabel={isCurrentSaved ? '保存済み' : '未保存'}
					statusTone={isCurrentSaved ? 'muted' : 'alert'}
					isTextFormat={!isCurrentSaved}
					showDelete={isEditing && isCurrentSaved}
					onSelect={() => applyRoute(currentRouteScript)}
					onDelete={handleDeleteCurrent}
				/>
				{/if}
			{/if}

			{#if savedList.length === 0 && !currentRouteScript}
				<p class="placeholder">保存された経路はありません。</p>
			{:else}
				{#each savedList as route, index}
					<SavedRouteCard
						route={route}
						showDelete={isEditing}
						onSelect={() => applyRoute(route)}
						onDelete={() => handleDeleteRoute(index)}
					/>
				{/each}
			{/if}
	</section>
	{/if}

	<footer class="action-bar">
		<button type="button" aria-label="インポート" onclick={handleImport}>
			<span class="material-symbols-rounded" aria-hidden="true">download</span>
			<span>インポート</span>
		</button>
		<button type="button" aria-label="エクスポート" onclick={handleExport}>
			<span class="material-symbols-rounded" aria-hidden="true">upload</span>
			<span>エクスポート</span>
		</button>
		<button type="button" aria-label="保存" onclick={handleSaveCurrent}>
			<span class="material-symbols-rounded" aria-hidden="true">save</span>
			<span>保存</span>
		</button>
	</footer>

	{#if warnDialog}
		<div class="modal-backdrop">
			<section class="modal">
				<p>{warnDialog}</p>
				<button type="button" class="modal-close" onclick={() => (warnDialog = '')}>OK</button>
			</section>
		</div>
	{/if}
</div>

<style>
	.save-page {
		max-width: 720px;
		margin: 0 auto;
		padding: 1rem 1rem 5rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		min-height: 100vh;
	}

	.top-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		background: #1976d2;
		color: #fff;
		padding: 0.75rem 1rem;
		border-radius: 0 0 1rem 1rem;
		position: sticky;
		top: 0;
		z-index: 10;
	}

	.top-bar h1 {
		flex: 1;
		margin: 0;
		font-size: 1.1rem;
		font-weight: 700;
	}

	.actions {
		display: flex;
		gap: 0.5rem;
	}

	.icon-button {
		width: 42px;
		height: 42px;
		border-radius: 999px;
		border: none;
		background: rgba(255, 255, 255, 0.15);
		color: #fff;
		display: inline-flex;
		align-items: center;
		justify-content: center;
	}

	.banner {
		margin: 0;
		padding: 0.75rem 1rem;
		border-radius: 0.75rem;
		background: #e0f2fe;
		color: #0ea5e9;
	}

	.banner.error {
		background: #fee2e2;
		color: #b91c1c;
	}

	.banner.info {
		background: #dcfce7;
		color: #15803d;
	}

	.list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.placeholder {
		margin: 0;
		color: #9ca3af;
		font-size: 0.95rem;
	}

	.action-bar {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		background: #fff;
		border-top: 1px solid #e5e7eb;
		padding: 0.5rem 0.75rem env(safe-area-inset-bottom, 0);
		box-shadow: 0 -6px 20px rgba(15, 23, 42, 0.08);
	}

	.action-bar button {
		border: none;
		background: none;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.15rem;
		padding: 0.35rem 0.25rem;
		color: #1f2937;
		font-size: 0.9rem;
	}

	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.35);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 100;
	}

	.modal {
		background: #fff;
		padding: 1rem;
		border-radius: 0.9rem;
		width: min(360px, calc(100% - 2rem));
		box-shadow: 0 14px 30px rgba(15, 23, 42, 0.2);
	}

	.modal p {
		margin: 0 0 0.75rem;
		color: #111827;
	}

	.modal-close {
		border: none;
		background: #2563eb;
		color: #fff;
		padding: 0.5rem 1.1rem;
		border-radius: 0.6rem;
		font-weight: 700;
	}
</style>
