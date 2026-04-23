<script lang="ts">
import { goto } from '$app/navigation';
import { base } from '$app/paths';
import { onDestroy, onMount } from 'svelte';
import SavedRouteCard from '$lib/components/SavedRouteCard.svelte';
import { initFarert, Farert } from '$lib/wasm';
import { initStores, mainRoute, savedRoutes, ticketHolder } from '$lib/stores';
import type { FaretClass } from '$lib/wasm/types';
import type { TicketHolderItem } from '$lib/types';
import { getSerializedRouteScript } from '$lib/utils/routeScriptPersistence';
import { restoreRouteFromScript } from '$lib/utils/urlRoute';

type BuildRouteResult = {
	rc: number;
	failItem?: string;
	offset?: number;
};

	let loading = $state(true);
	let errorMessage = $state('');
	let infoMessage = $state('');
	let isEditing = $state(false);
	let currentRoute: FaretClass | null = null;
	let currentRouteScript = $state('');
	let savedList = $state<string[]>([]);
    let holderItems = $state<TicketHolderItem[]>([]);
    let warnDialog = $state('');
	let confirmDialogOpen = $state(false);
	let confirmDialogMessage = $state('');
	let confirmResolver: ((result: boolean) => void) | null = null;
	let importDialogOpen = $state(false);
	let importDialogText = $state('');
	let importDialogResolver: ((result: string | null) => void) | null = null;

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
					const normalized = uniqueRouteScripts(value);
					savedList = normalized;
					if (!isSameRoutes(value, normalized)) {
						savedRoutes.set(normalized);
					}
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
	const visibleSavedList = $derived(
		savedList.filter((route) => !(currentRouteCount > 1 && route === currentRouteScript))
	);

	function safeRouteScript(route: FaretClass | null): string {
		try {
			if (!route) return '';
			return normalizeRouteScript(getSerializedRouteScript(route));
		} catch (err) {
			console.warn('経路スクリプト取得に失敗しました', err);
			return '';
		}
	}

	function normalizeRouteScript(routeScript: string): string {
		return (routeScript ?? '').trim();
	}

	function uniqueRouteScripts(routes: string[]): string[] {
		const seen = new Set<string>();
		const normalized: string[] = [];
		for (const route of routes) {
			const trimmed = normalizeRouteScript(route);
			if (!trimmed || seen.has(trimmed)) continue;
			seen.add(trimmed);
			normalized.push(trimmed);
		}
		return normalized;
	}

	function isSameRoutes(left: string[], right: string[]): boolean {
		if (left.length !== right.length) return false;
		for (let i = 0; i < left.length; i += 1) {
			if (left[i] !== right[i]) return false;
		}
		return true;
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
		goto(`${base}/`);
	}

	function toggleEdit(): void {
		isEditing = !isEditing;
	}

	function handleSaveCurrent(): void {
		clearMessages();
		const normalizedCurrent = normalizeRouteScript(currentRouteScript);
		if (!normalizedCurrent) {
			showError('保存する経路がありません。');
			return;
		}
		const count = getCurrentRouteCount();
		if (count <= 1) {
			warnDialog = '1区間以下の経路は保存できません。';
			return;
		}
		if (savedList.includes(normalizedCurrent)) {
			showInfo('すでに保存済みです。');
			return;
	    }
		savedRoutes.update((list) => uniqueRouteScripts([normalizedCurrent, ...list]));
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

	    function handleDeleteRoute(routeScript: string): void {
		const normalized = normalizeRouteScript(routeScript);
		if (!normalized) return;
	        savedRoutes.update((list) => list.filter((item) => normalizeRouteScript(item) !== normalized));
	    }

	function handleDeleteCurrent(): void {
		if (!currentRouteScript) return;
		handleDeleteRoute(currentRouteScript);
	}

	function shouldConfirmRouteOverwrite(targetScript: string): boolean {
		if (!currentRouteScript || currentRouteScript === targetScript) return false;
		const isCurrentInSaved = savedList.some((item) => item === currentRouteScript);
		const isCurrentInHolder = holderItems.some(
			(item) => normalizeRouteScript(item.routeScript) === currentRouteScript
		);
		return !isCurrentInSaved && !isCurrentInHolder;
	}

	function resolveConfirmDialog(result: boolean): void {
		confirmDialogOpen = false;
		confirmDialogMessage = '';
		const resolver = confirmResolver;
		confirmResolver = null;
		resolver?.(result);
	}

	function requestConfirm(message: string): Promise<boolean> {
		if (confirmResolver) {
			confirmResolver(false);
			confirmResolver = null;
		}
		confirmDialogMessage = message;
		confirmDialogOpen = true;
		return new Promise((resolve) => {
			confirmResolver = resolve;
		});
	}

	function openImportDialog(defaultText = ''): Promise<string | null> {
		if (importDialogResolver) {
			importDialogResolver(null);
		}
		importDialogText = defaultText;
		importDialogOpen = true;
		return new Promise((resolve) => {
			importDialogResolver = resolve;
		});
	}

	function resolveImportDialog(result: string | null): void {
		importDialogOpen = false;
		const resolver = importDialogResolver;
		importDialogResolver = null;
		resolver?.(result);
	}

	async function importRoutesFromText(rawText: string): Promise<void> {
		try {
			const candidates = rawText
				.split(/\r?\n/u)
				.map((line) => normalizeRouteScript(line))
				.filter((line) => line.length > 0);
			if (!candidates.length) {
				showError('インポート対象の経路がありません。');
				return;
			}

			const imported: string[] = [];
			let failed = 0;
			let lastErrorMessage = '';
			candidates.forEach((candidate, lineIndex) => {
				const route = new Farert();
				const lineNumber = lineIndex + 1;
				try {
					const restored = restoreRouteFromScript(route, candidate);
					if (!restored) {
						const parsed = parseBuildRouteResult(route.buildRoute(candidate));
						failed += 1;
						if (!lastErrorMessage) {
							lastErrorMessage = formatImportError(parsed, lineNumber);
						}
						return;
					}
					const script = normalizeRouteScript(route.routeScript());
					if (!script) {
						failed += 1;
						if (!lastErrorMessage) {
							lastErrorMessage = `経路の書式不正により、インポートに失敗しました: ${lineNumber} 行目`;
						}
						return;
					}
					imported.push(script);
				} catch (err) {
					failed += 1;
					if (!lastErrorMessage) {
						lastErrorMessage = '経路のインポートに失敗しました。';
						console.error('経路インポートエラー', err);
					}
				}
			});

			if (!imported.length) {
				showError(lastErrorMessage || '経路の書式不正により、インポートに失敗しました。');
				return;
			}

			savedRoutes.update((list) => uniqueRouteScripts([...imported, ...list]));
			if (imported.length === 1) {
				showInfo('インポートしました。');
			} else {
				showInfo(`${imported.length}件インポートしました。`);
			}
			if (failed > 0) {
				showError(lastErrorMessage || `${failed}件は書式不正のためインポートできませんでした。`);
			}
		} catch (err) {
			console.error('インポートエラー', err);
			showError('経路のインポートに失敗しました。');
		}
	}

	function parseBuildRouteResult(result: unknown): BuildRouteResult | null {
		if (typeof result === 'number') {
			return { rc: result };
		}
		if (typeof result === 'string') {
			const trimmed = result.trim().replace(/\0/g, '');
			const numeric = Number(trimmed);
			if (!Number.isNaN(numeric)) {
				return { rc: numeric };
			}
			try {
				const parsed = JSON.parse(trimmed) as BuildRouteResult;
				if (typeof parsed?.rc === 'number') {
					return {
						rc: parsed.rc,
						failItem: parsed.failItem,
						offset: parsed.offset
					};
				}
			} catch {
				const match = trimmed.match(/"rc"\s*:\s*(-?\d+)/);
				if (match) {
					return { rc: Number(match[1]) };
				}
			}
		}
		return null;
	}

	function isBuildSuccess(result: unknown): boolean {
		const parsed = parseBuildRouteResult(result);
		if (!parsed) return false;
		return parsed.rc >= 0;
	}

	function isBuildSuccessResult(result: BuildRouteResult | null): boolean {
		if (!result) return false;
		return result.rc >= 0;
	}

	function formatImportError(result: BuildRouteResult | null, lineNumber: number): string {
		let message = `経路の書式不正により、インポートに失敗しました: ${lineNumber} 行目`;
		if (!result?.failItem) {
			return message;
		}

		message += `、${result.failItem}`;
		if ((result.rc === -200 || result.rc === -300) && typeof result.offset === 'number') {
			message += `（${result.offset + 1}番目のワード）`;
		}
		return message;
	}

    async function applyRoute(routeScript: string): Promise<void> {
        clearMessages();
		const normalizedScript = normalizeRouteScript(routeScript);
		if (!normalizedScript) {
			showError('経路データが不正です。');
			return;
		}
			if (
				shouldConfirmRouteOverwrite(normalizedScript) &&
				!(await requestConfirm('⚠️経路は保存されていません。上書きしてよろしいですか？'))
			) {
				return;
			}
	        try {
	            const route = new Farert();
	            const restored = restoreRouteFromScript(route, normalizedScript);
            if (!restored) {
				const result = route.buildRoute(normalizedScript);
                showError(`経路の復元に失敗しました (コード: ${result})`);
                return;
            }
            mainRoute.set(route);
            goto(`${base}/`);
        } catch (err) {
            console.error('経路適用に失敗しました', err);
            showError('経路の適用に失敗しました。');
        }
    }

	async function handleImport(): Promise<void> {
		clearMessages();
		const input = await openImportDialog('');
		if (input === null) {
			return;
		}

		if (!input) {
			showError('インポート対象の経路がありません。');
			return;
		}

		const confirmed = await requestConfirm('経路をインポートしてよろしいですか？');
		if (!confirmed) {
			return;
		}

		await importRoutesFromText(input);
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
				{#each visibleSavedList as route}
					<SavedRouteCard
						route={route}
						showDelete={isEditing}
						onSelect={() => applyRoute(route)}
						onDelete={() => handleDeleteRoute(route)}
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

	{#if confirmDialogOpen}
		<div class="modal-backdrop" role="dialog" aria-modal="true" aria-label="確認ダイアログ">
			<section class="modal">
				<h3>確認</h3>
				<p>{confirmDialogMessage}</p>
				<div class="confirm-actions">
					<button type="button" class="confirm-primary" onclick={() => resolveConfirmDialog(true)}>
						はい
					</button>
					<button
						type="button"
						class="confirm-secondary"
						onclick={() => resolveConfirmDialog(false)}
					>
						いいえ
					</button>
				</div>
			</section>
		</div>
	{/if}

	{#if importDialogOpen}
		<div class="modal-backdrop" role="dialog" aria-modal="true" aria-label="経路インポート">
			<section class="modal">
				<h3>経路テキストを入力</h3>
				<p class="placeholder small">
					経路はカンマまたはスペース区切りで1行1経路で複数行指定可能です
				</p>
				<textarea
					class="route-textarea"
					aria-label="経路テキスト"
					rows="8"
					bind:value={importDialogText}
				></textarea>
				<div class="confirm-actions">
					<button type="button" class="confirm-primary" onclick={() => resolveImportDialog(importDialogText)}>
						インポート実行
					</button>
					<button
						type="button"
						class="confirm-secondary"
						onclick={() => resolveImportDialog(null)}
					>
						キャンセル
					</button>
				</div>
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
		background: var(--top-bar-bg);
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
		background: var(--info-bg);
		color: var(--info-text);
	}

	.banner.error {
		background: var(--error-bg);
		color: var(--error-text);
	}

	.banner.info {
		background: var(--success-bg);
		color: var(--success-text);
	}

	.list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.placeholder {
		margin: 0;
		color: var(--subtitle-color);
		font-size: 0.95rem;
	}

	.placeholder.small {
		font-size: 0.85rem;
	}

	.action-bar {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		background: var(--card-bg);
		border-top: 1px solid var(--border-color);
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
		color: var(--text-main);
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
		background: var(--card-bg);
		padding: 1rem;
		border-radius: 0.9rem;
		width: min(90vw, calc(100% - 1rem));
		box-shadow: var(--card-shadow);
	}

	.modal p {
		margin: 0 0 0.75rem;
		color: var(--text-main);
	}

	.modal h3 {
		margin: 0 0 0.5rem;
		color: var(--text-main);
	}

	.route-textarea {
		width: 100%;
		min-height: 130px;
		resize: vertical;
		padding: 0.6rem;
		border: 1px solid var(--border-color);
		border-radius: 0.6rem;
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New',
			monospace;
		margin-bottom: 0.75rem;
		background: var(--input-bg);
		color: var(--text-main);
	}

	.modal-close {
		border: none;
		background: var(--primary);
		color: #fff;
		padding: 0.5rem 1.1rem;
		border-radius: 0.6rem;
		font-weight: 700;
	}

	.confirm-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.5rem;
	}

	.confirm-actions button {
		border: none;
		border-radius: 0.6rem;
		padding: 0.5rem 1rem;
		font-weight: 700;
	}

	.confirm-primary {
		background: var(--primary);
		color: #fff;
	}

	.confirm-secondary {
		background: var(--secondary-btn-bg);
		color: var(--secondary-btn-text);
	}
</style>
