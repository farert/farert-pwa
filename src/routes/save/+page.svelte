<!--
保存済み経路の管理と import/export を行う画面です。
現在経路保存、一覧読込、削除、クリップボード連携を扱います。
-->
<script lang="ts">
import { goto } from '$app/navigation';
import { base } from '$app/paths';
import { onDestroy, onMount } from 'svelte';
import SavedRouteCard from '$lib/components/SavedRouteCard.svelte';
import { initFarert, Farert } from '$lib/wasm';
import { initStores, mainRoute, savedRoutes, stationHistory, ticketHolder } from '$lib/stores';
import {
	downloadAppBackupAsFile,
	importAppBackup,
	importAppBackupFromFile
} from '$lib/storage/backup';
import type { FaretClass } from '$lib/wasm/types';
import type { AppStorage, TicketHolderItem } from '$lib/types';
import { getSerializedRouteScript } from '$lib/utils/routeScriptPersistence';
import { scrollPageToBottom, scrollPageToTop } from '$lib/utils/responsiveLayout';
import { normalizeRouteScript, restoreRouteFromScript } from '$lib/utils/urlRoute';

type BuildRouteResult = {
	rc: number;
	failItem?: string;
	offset?: number;
};

type ImportRouteResult =
	| { ok: true; script: string }
	| { ok: false; detail: string; routeText: string };

type ImportCandidate = {
	source: string;
	normalized: string;
};

type ImportErrorDetail = {
	routeText: string;
	detail: string;
};

	let loading = $state(true);
	let errorMessage = $state('');
	let importErrorDetails = $state<ImportErrorDetail[]>([]);
	let infoMessage = $state('');
	let isEditing = $state(false);
	let backupMenuOpen = $state(false);
	let currentRoute: FaretClass | null = null;
	let currentRouteScript = $state('');
	let savedList = $state<string[]>([]);
	let holderItems = $state<TicketHolderItem[]>([]);
	let stationHistoryList = $state<string[]>([]);
	let warnDialog = $state('');
	let confirmDialogOpen = $state(false);
	let confirmDialogMessage = $state('');
	let confirmResolver: ((result: boolean) => void) | null = null;
	let importDialogOpen = $state(false);
	let importDialogText = $state('');
	let importDialogResolver: ((result: string | null) => void) | null = null;
	let backupImportDialogOpen = $state(false);
	let backupImportDialogText = $state('');
	let backupImportDialogResolver: ((result: string | null) => void) | null = null;
	let backupFileInput: HTMLInputElement | null = null;
	let statusTimer: ReturnType<typeof setTimeout> | null = null;
	let exportDialogOpen = $state(false);
	let exportDialogText = $state('');
	let exportDialogStatus = $state('');
	let unsubscribeRoute: (() => void) | null = null;
	let unsubscribeSaved: (() => void) | null = null;
	let unsubscribeHolder: (() => void) | null = null;
	let unsubscribeStationHistory: (() => void) | null = null;

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
				unsubscribeStationHistory = stationHistory.subscribe((value) => {
					stationHistoryList = [...value];
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
		clearStatusTimer();
		unsubscribeRoute?.();
		unsubscribeSaved?.();
		unsubscribeHolder?.();
		unsubscribeStationHistory?.();
	});

	const isCurrentSaved = $derived(
		currentRouteScript && savedList.some((route) => route === currentRouteScript)
	);
	const currentRouteCount = $derived(getCurrentRouteCount());
	const visibleSavedList = $derived(
		savedList.filter((route) => !(currentRouteCount > 1 && route === currentRouteScript))
	);
	const simpleErrorMessage = $derived(
		errorMessage && importErrorDetails.length === 0 ? errorMessage : ''
	);
	const floatingStatusMessage = $derived(infoMessage || simpleErrorMessage);
	const floatingStatusTone = $derived(infoMessage ? 'info' : 'error');
	const showFloatingScrollButtons = $derived(savedList.length >= 30);

	/**
	 * `safeRouteScript` を処理します。
	 *
	 * @param route 対象の経路または経路文字列です。
	 * @returns 文字列結果を返します。
	 */
	function safeRouteScript(route: FaretClass | null): string {
		try {
			if (!route) return '';
			return normalizeRouteScript(getSerializedRouteScript(route));
		} catch (err) {
			console.warn('経路スクリプト取得に失敗しました', err);
			return '';
		}
	}

	/**
	 * `uniqueRouteScripts` を処理します。
	 *
	 * @param routes 対象の経路または経路文字列です。
	 * @returns 文字列結果を返します。
	 */
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

	/**
	 * `isSameRoutes` の判定結果を返します。
	 *
	 * @param left 処理に必要な入力値です。
	 * @param right 処理に必要な入力値です。
	 * @returns 判定結果を返します。
	 */
	function isSameRoutes(left: string[], right: string[]): boolean {
		if (left.length !== right.length) return false;
		for (let i = 0; i < left.length; i += 1) {
			if (left[i] !== right[i]) return false;
		}
		return true;
	}

	/**
	 * `moveRouteToFront` を処理します。
	 *
	 * @param routes 対象の経路または経路文字列です。
	 * @param routeScript 対象の経路または経路文字列です。
	 * @returns 文字列結果を返します。
	 */
	function moveRouteToFront(routes: string[], routeScript: string): string[] {
		const normalizedTarget = normalizeRouteScript(routeScript);
		if (!normalizedTarget) return uniqueRouteScripts(routes);
		const remaining = routes.filter((item) => normalizeRouteScript(item) !== normalizedTarget);
		return uniqueRouteScripts([normalizedTarget, ...remaining]);
	}

	/**
	 * `showInfo` を処理します。
	 *
	 * @param message 表示または処理に使うメッセージです。
	 * @returns この処理は戻り値を持ちません。
	 */
	function showInfo(message: string): void {
		infoMessage = message;
		scheduleStatusClear();
	}

		/**
	 * `showError` を処理します。
	 *
	 * @param message 表示または処理に使うメッセージです。
	 * @param details 処理に必要な入力値です。
	 * @returns この処理は戻り値を持ちません。
	 */
function showError(message: string, details: ImportErrorDetail[] = []): void {
		errorMessage = message;
		importErrorDetails = details;
		if (details.length === 0) {
			scheduleStatusClear();
			return;
		}
		clearStatusTimer();
	}

		/**
	 * `clearMessages` を処理します。
	 *
	 * @returns この処理は戻り値を持ちません。
	 */
function clearMessages(): void {
		errorMessage = '';
		importErrorDetails = [];
		infoMessage = '';
		warnDialog = '';
		clearStatusTimer();
	}

	function clearStatusTimer(): void {
		if (statusTimer === null) return;
		clearTimeout(statusTimer);
		statusTimer = null;
	}

	function scheduleStatusClear(delay = 3000): void {
		clearStatusTimer();
		statusTimer = setTimeout(() => {
			infoMessage = '';
			if (importErrorDetails.length === 0) {
				errorMessage = '';
			}
			statusTimer = null;
		}, delay);
	}

		/**
	 * `handleBack` のイベント処理を行います。
	 *
	 * @returns この処理は戻り値を持ちません。
	 */
function handleBack(): void {
		goto(`${base}/`);
	}

	function scrollToTop(): void {
		scrollPageToTop();
	}

	function scrollToBottom(): void {
		scrollPageToBottom();
	}

	function toggleEdit(): void {
		isEditing = !isEditing;
	}

	function toggleBackupMenu(): void {
		backupMenuOpen = !backupMenuOpen;
	}

	function closeBackupMenu(): void {
		backupMenuOpen = false;
	}

	/**
	 * `handleSaveCurrent` のイベント処理を行います。
	 *
	 * @returns この処理は戻り値を持ちません。
	 */
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

		/**
	 * `getCurrentRouteCount` を取得します。
	 *
	 * @returns 数値結果を返します。
	 */
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

		/**
	 * `handleDeleteRoute` のイベント処理を行います。
	 *
	 * @param routeScript 対象の経路または経路文字列です。
	 * @returns この処理は戻り値を持ちません。
	 */
function handleDeleteRoute(routeScript: string): void {
		const normalized = normalizeRouteScript(routeScript);
		if (!normalized) return;
		savedRoutes.update((list) => list.filter((item) => normalizeRouteScript(item) !== normalized));
	}

		/**
	 * `handleDeleteCurrent` のイベント処理を行います。
	 *
	 * @returns この処理は戻り値を持ちません。
	 */
function handleDeleteCurrent(): void {
		if (!currentRouteScript) return;
		handleDeleteRoute(currentRouteScript);
	}

		/**
	 * `shouldConfirmRouteOverwrite` の判定結果を返します。
	 *
	 * @param targetScript 処理対象の文字列です。
	 * @returns 判定結果を返します。
	 */
function shouldConfirmRouteOverwrite(targetScript: string): boolean {
		if (!currentRouteScript || currentRouteScript === targetScript) return false;
		const isCurrentInSaved = savedList.some((item) => item === currentRouteScript);
		const isCurrentInHolder = holderItems.some(
			(item) => normalizeRouteScript(item.routeScript) === currentRouteScript
		);
		return !isCurrentInSaved && !isCurrentInHolder;
	}

		/**
	 * `resolveConfirmDialog` の解決結果を返します。
	 *
	 * @param result 処理対象の値です。
	 * @returns この処理は戻り値を持ちません。
	 */
function resolveConfirmDialog(result: boolean): void {
		confirmDialogOpen = false;
		confirmDialogMessage = '';
		const resolver = confirmResolver;
		confirmResolver = null;
		resolver?.(result);
	}

		/**
	 * `requestConfirm` を処理します。
	 *
	 * @param message 表示または処理に使うメッセージです。
	 * @returns 非同期処理の成否を返します。
	 */
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

		/**
	 * `openImportDialog` を開始または表示します。
	 *
	 * @param defaultText 処理対象の文字列です。
	 * @returns 非同期処理で得た文字列または `null` を返します。
	 */
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

		/**
	 * `resolveImportDialog` の解決結果を返します。
	 *
	 * @param result 処理対象の値です。
	 * @returns この処理は戻り値を持ちません。
	 */
function resolveImportDialog(result: string | null): void {
		importDialogOpen = false;
		const resolver = importDialogResolver;
		importDialogResolver = null;
		resolver?.(result);
	}

	function openBackupImportDialog(defaultText = ''): Promise<string | null> {
		if (backupImportDialogResolver) {
			backupImportDialogResolver(null);
		}
		backupImportDialogText = defaultText;
		backupImportDialogOpen = true;
		return new Promise((resolve) => {
			backupImportDialogResolver = resolve;
		});
	}

	function resolveBackupImportDialog(result: string | null): void {
		backupImportDialogOpen = false;
		const resolver = backupImportDialogResolver;
		backupImportDialogResolver = null;
		resolver?.(result);
	}

	function handleBackupFileButtonClick(): void {
		closeBackupMenu();
		backupFileInput?.click();
	}

	async function handleBackupFileChange(event: Event): Promise<void> {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0] ?? null;
		input.value = '';
		if (!file) return;

		clearMessages();
		try {
			const backup = await importAppBackupFromFile(file);
			const confirmed = await requestConfirm(
				'バックアップファイルを読み込むと現在の保存データを置き換えます。よろしいですか？'
			);
			if (!confirmed) {
				return;
			}

			applyImportedBackup(backup.storage);
			showInfo('バックアップを復元しました。');
		} catch (err) {
			console.error('バックアップファイルの読み込みに失敗しました', err);
			showError(
				err instanceof Error ? err.message : 'バックアップファイルの読み込みに失敗しました。'
			);
		}
	}

	async function importRoutesFromText(rawText: string): Promise<void> {
		try {
			const candidates = parseImportCandidates(rawText);
			if (!candidates.length) {
				showError('インポート対象の経路がありません。');
				return;
			}

			const imported: string[] = [];
			const errors: ImportErrorDetail[] = [];
			candidates.forEach((candidate, lineIndex) => {
				const result = tryImportRoute(candidate, lineIndex + 1);
				if (result.ok) {
					imported.push(result.script);
					return;
				}
				errors.push({ routeText: result.routeText, detail: result.detail });
			});

			if (!imported.length) {
				showError('以下の経路はインポートに失敗しました。', errors);
				return;
			}

			savedRoutes.update((list) => uniqueRouteScripts([...imported, ...list]));
			if (imported.length === 1) {
				showInfo('インポートしました。');
			} else {
				showInfo(`${imported.length}件インポートしました。`);
			}
			if (errors.length > 0) {
				showError('以下の経路はインポートに失敗しました。', errors);
			}
		} catch (err) {
			console.error('インポートエラー', err);
			showError('経路のインポートに失敗しました。');
		}
	}

		/**
	 * `parseImportCandidates` の解析結果を返します。
	 *
	 * @param rawText 処理対象の文字列です。
	 * @returns 配列結果を返します。
	 */
function parseImportCandidates(rawText: string): ImportCandidate[] {
		return rawText
			.split(/\r?\n/u)
			.map((line) => ({
				source: line.trim(),
				normalized: normalizeRouteScript(line)
			}))
			.filter((line) => line.normalized.length > 0);
	}

		/**
	 * `tryImportRoute` を処理します。
	 *
	 * @param candidate 処理に必要な入力値です。
	 * @param lineNumber 対象の路線名です。
	 * @returns 処理結果を返します。
	 */
function tryImportRoute(candidate: ImportCandidate, lineNumber: number): ImportRouteResult {
		const route = new Farert();
		try {
			const restored = restoreRouteFromScript(route, candidate.normalized);
			if (!restored) {
				return {
					ok: false,
					detail: formatImportError(
						parseBuildRouteResult(route.buildRoute(candidate.normalized)),
						lineNumber
					),
					routeText: candidate.source || candidate.normalized
				};
			}

			const script = normalizeRouteScript(route.routeScript());
			if (!script) {
				return {
					ok: false,
					detail: formatImportError(null, lineNumber),
					routeText: candidate.source || candidate.normalized
				};
			}

			return { ok: true, script };
		} catch (err) {
			console.error('経路インポートエラー', err);
			return {
				ok: false,
				detail: `${lineNumber} 行目、インポート処理でエラーが発生しました。`,
				routeText: candidate.source || candidate.normalized
			};
		}
	}

		/**
	 * `parseBuildRouteResult` の解析結果を返します。
	 *
	 * @param result 処理対象の値です。
	 * @returns 解決結果を返します。
	 */
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

		/**
	 * `formatImportError` の整形結果を返します。
	 *
	 * @param result 処理対象の値です。
	 * @param lineNumber 対象の路線名です。
	 * @returns 文字列結果を返します。
	 */
function formatImportError(result: BuildRouteResult | null, lineNumber: number): string {
		let message = `${lineNumber} 行目`;
		if (!result?.failItem) {
			return message;
		}

		message += `、${result.failItem}`;
		if ((result.rc === -200 || result.rc === -300) && typeof result.offset === 'number') {
			message += `（${result.offset + 1}番目のワード）`;
		}
		return message;
	}

		/**
	 * `applyRoute` を適用します。
	 *
	 * @param routeScript 対象の経路または経路文字列です。
	 * @returns この処理は戻り値を持ちません。
	 */
async function applyRoute(routeScript: string): Promise<void> {
		if (isEditing) {
			return;
		}
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
			savedRoutes.update((list) => moveRouteToFront(list, normalizedScript));
			goto(`${base}/`);
		} catch (err) {
			console.error('経路適用に失敗しました', err);
			showError('経路の適用に失敗しました。');
		}
	}

		/**
	 * `handleImport` のイベント処理を行います。
	 *
	 * @returns この処理は戻り値を持ちません。
	 */
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

		await importRoutesFromText(input);
	}

	/**
	 * `handleExport` のイベント処理を行います。
	 *
	 * @returns この処理は戻り値を持ちません。
	 */
	async function handleExport(): Promise<void> {
		clearMessages();
		if (!savedList.length) {
			showError('エクスポートする経路がありません。');
			return;
		}
		const text = savedList.join('\n');
		exportDialogText = text;
		exportDialogStatus = '';
		exportDialogOpen = true;
		try {
			await copyExportText(text);
			exportDialogStatus = 'クリップボードへコピーしました。';
		} catch (err) {
			console.error('エクスポートに失敗しました', err);
			exportDialogStatus = 'エクスポートに失敗しました。';
		}
	}

	/**
	 * エクスポート本文を OS 共有メニューへ渡します。
	 *
	 * @returns この処理は戻り値を持ちません。
	 */
	async function handleShareExport(): Promise<void> {
		if (!exportDialogText) {
			exportDialogStatus = '共有する経路がありません。';
			return;
		}
		if (typeof navigator === 'undefined' || !navigator.share) {
			exportDialogStatus = 'この環境では共有できません。';
			return;
		}
		try {
			await navigator.share({
				title: 'Farert - 経路エクスポート',
				text: exportDialogText
			});
			exportDialogStatus = '共有メニューを開きました。';
		} catch (err) {
			if ((err as Error).name === 'AbortError') {
				exportDialogStatus = '共有をキャンセルしました。';
				return;
			}
			console.error('エクスポート共有に失敗しました', err);
			exportDialogStatus = '共有できませんでした。';
		}
	}

	function getCurrentStorageSnapshot(): AppStorage {
		return {
			currentRoute: currentRouteScript || null,
			savedRoutes: [...savedList],
			ticketHolder: [...holderItems],
			stationHistory: [...stationHistoryList]
		};
	}

	async function handleExportBackup(): Promise<void> {
		clearMessages();
		closeBackupMenu();
		try {
			downloadAppBackupAsFile(getCurrentStorageSnapshot());
			showInfo('バックアップファイルを保存しました。');
		} catch (err) {
			console.error('バックアップのエクスポートに失敗しました', err);
			showError('バックアップのエクスポートに失敗しました。');
		}
	}

	async function handleImportBackupFromText(): Promise<void> {
		clearMessages();
		closeBackupMenu();
		const input = await openBackupImportDialog('');
		if (input === null) {
			return;
		}

		if (!input) {
			showError('バックアップJSONがありません。');
			return;
		}

		const confirmed = await requestConfirm(
			'バックアップを読み込むと現在の保存データを置き換えます。よろしいですか？'
		);
		if (!confirmed) {
			return;
		}

		try {
			const backup = importAppBackup(input);
			applyImportedBackup(backup.storage);
			showInfo('バックアップを復元しました。');
		} catch (err) {
			console.error('バックアップのインポートに失敗しました', err);
			showError(
				err instanceof Error ? err.message : 'バックアップのインポートに失敗しました。'
			);
		}
	}

	function applyImportedBackup(storage: AppStorage): void {
		const routeScript = normalizeRouteScript(storage.currentRoute ?? '');
		if (storage.currentRoute === null) {
			mainRoute.set(null);
		} else if (routeScript) {
			const route = new Farert();
			const restored = restoreRouteFromScript(route, routeScript);
			if (restored) {
				mainRoute.set(route);
			} else {
				warnDialog = '現在の経路の復元に失敗しました。';
			}
		}

		savedRoutes.set(storage.savedRoutes);
		ticketHolder.set(storage.ticketHolder);
		stationHistory.set(storage.stationHistory);
	}

	async function copyExportText(text: string): Promise<void> {
		if (navigator.clipboard?.writeText) {
			try {
				await navigator.clipboard.writeText(text);
				return;
			} catch (err) {
				console.warn('Clipboard API でのコピーに失敗したためフォールバックします', err);
			}
		}

		copyTextWithExecCommand(text);
	}

		/**
	 * `copyTextWithExecCommand` を処理します。
	 *
	 * @param text 処理対象の文字列です。
	 * @returns この処理は戻り値を持ちません。
	 */
function copyTextWithExecCommand(text: string): void {
		if (typeof document === 'undefined') {
			throw new Error('document is not available');
		}

		const textArea = document.createElement('textarea');
		textArea.value = text;
		textArea.setAttribute('readonly', '');
		textArea.style.position = 'fixed';
		textArea.style.top = '0';
		textArea.style.left = '-9999px';
		textArea.style.opacity = '0';
		document.body.appendChild(textArea);
		textArea.select();
		textArea.setSelectionRange(0, text.length);

		try {
			if (!document.execCommand('copy')) {
				throw new Error('execCommand copy failed');
			}
		} finally {
			document.body.removeChild(textArea);
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
			<span class="saved-count" aria-label={`保存済み経路 ${savedList.length}件`}>
				保存済み {savedList.length}件
			</span>
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
			<div class="banner error" role="alert">
				<p>{errorMessage}</p>
				{#each importErrorDetails as detail}
					<div class="import-error-block">
						<p class="error-route-text">{detail.routeText}</p>
						<p class="import-error-detail">{detail.detail}</p>
					</div>
				{/each}
			</div>
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
		<div class="backup-menu-anchor">
			<button
				type="button"
				aria-label="バックアップメニュー"
				aria-haspopup="menu"
				aria-expanded={backupMenuOpen}
				onclick={toggleBackupMenu}
			>
				<span class="material-symbols-rounded" aria-hidden="true">backup</span>
				<span>バックアップ</span>
			</button>
			{#if backupMenuOpen}
				<section class="backup-popover" aria-label="全体バックアップ">
					<p class="backup-popover-title">バックアップ</p>
					<button
						type="button"
						class="backup-button"
						aria-label="バックアップを書き出す"
						onclick={handleExportBackup}
					>
						<span class="material-symbols-rounded" aria-hidden="true">backup</span>
						<span>バックアップ保存</span>
					</button>
					<div class="backup-divider" aria-hidden="true"></div>
					<button
						type="button"
						class="backup-button"
						aria-label="バックアップファイルを読み込む"
						onclick={handleBackupFileButtonClick}
					>
						<span class="material-symbols-rounded" aria-hidden="true">cloud_download</span>
						<span>ファイル読み込み</span>
					</button>
					<div class="backup-divider" aria-hidden="true"></div>
					<button
						type="button"
						class="backup-button"
						aria-label="バックアップをテキストで復元する"
						onclick={handleImportBackupFromText}
					>
						<span class="material-symbols-rounded" aria-hidden="true">text_fields</span>
						<span>テキスト復元</span>
					</button>
				</section>
			{/if}
		</div>
		<button type="button" aria-label="保存" onclick={handleSaveCurrent}>
			<span class="material-symbols-rounded" aria-hidden="true">save</span>
			<span>保存</span>
		</button>
		</footer>

		{#if exportDialogOpen}
			<div class="modal-backdrop" role="dialog" aria-modal="true" aria-label="経路エクスポート">
				<section class="modal">
					<h3>経路エクスポート</h3>
					<p class="placeholder small">{exportDialogStatus}</p>
					<textarea
						class="route-textarea"
						aria-label="エクスポート結果"
						rows="10"
						readonly
						bind:value={exportDialogText}
					></textarea>
					<div class="confirm-actions">
						<button
							type="button"
							class="confirm-secondary icon-action"
							aria-label="共有"
							onclick={handleShareExport}
						>
							<span class="material-symbols-rounded" aria-hidden="true">share</span>
						</button>
						<button type="button" class="confirm-primary" onclick={() => (exportDialogOpen = false)}>
							閉じる
						</button>
					</div>
				</section>
			</div>
		{/if}

		{#if floatingStatusMessage}
			<div
				class={`floating-status ${floatingStatusTone}`}
			role="status"
			aria-live="polite"
		>
			<p>{floatingStatusMessage}</p>
		</div>
	{/if}

	{#if showFloatingScrollButtons}
		<div class="floating-scroll-buttons" aria-label="スクロール操作">
			<button
				type="button"
				class="floating-scroll-button"
				aria-label="一覧の先頭へスクロール"
				onclick={scrollToTop}
			>
				<span class="material-symbols-rounded" aria-hidden="true">vertical_align_top</span>
			</button>
			<button
				type="button"
				class="floating-scroll-button"
				aria-label="一覧の末尾へスクロール"
				onclick={scrollToBottom}
			>
				<span class="material-symbols-rounded" aria-hidden="true">vertical_align_bottom</span>
			</button>
		</div>
	{/if}

	<input
		bind:this={backupFileInput}
		type="file"
		accept="application/json,.json"
		hidden
		aria-label="バックアップファイル"
		onchange={handleBackupFileChange}
	/>

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

	{#if backupImportDialogOpen}
		<div class="modal-backdrop" role="dialog" aria-modal="true" aria-label="バックアップ読込">
			<section class="modal">
				<h3>バックアップJSONを入力</h3>
				<p class="placeholder small">
					この画面には AppBackup 形式の JSON を貼り付けてください
				</p>
				<textarea
					class="route-textarea"
					aria-label="バックアップJSON"
					rows="10"
					bind:value={backupImportDialogText}
				></textarea>
				<div class="confirm-actions">
					<button type="button" class="confirm-primary" onclick={() => resolveBackupImportDialog(backupImportDialogText)}>
						読み込む
					</button>
					<button
						type="button"
						class="confirm-secondary"
						onclick={() => resolveBackupImportDialog(null)}
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
		padding: 1rem 1rem 9rem;
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
		align-items: center;
	}

	.saved-count {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.35rem 0.75rem;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.14);
		color: #fff;
		font-size: 0.8rem;
		font-weight: 700;
		white-space: nowrap;
		letter-spacing: 0.02em;
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
		padding: 0.75rem 1rem;
		border-radius: 0.75rem;
		background: var(--info-bg);
		color: var(--info-text);
	}

	.banner p {
		margin: 0;
	}

	.error-route-text {
		margin-top: 0.45rem;
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono',
			'Courier New', monospace;
		overflow-wrap: anywhere;
		user-select: all;
	}

	.import-error-block {
		margin-top: 0.9rem;
	}

	.import-error-detail {
		margin-top: 0.25rem;
	}

	.banner.error {
		background: var(--error-bg);
		color: var(--error-text);
	}

	.banner.info {
		background: var(--success-bg);
		color: var(--success-text);
	}

	.floating-status {
		position: fixed;
		left: 50%;
		transform: translateX(-50%);
		top: calc(4.75rem + env(safe-area-inset-top, 0));
		z-index: 30;
		width: min(720px, calc(100vw - 1.5rem));
		padding: 0.85rem 1rem;
		border-radius: 0.85rem;
		box-shadow: 0 12px 30px rgba(15, 23, 42, 0.18);
	}

	.floating-status p {
		margin: 0;
		font-weight: 700;
	}

	.floating-status.info {
		background: var(--success-bg);
		color: var(--success-text);
	}

	.floating-status.error {
		background: var(--error-bg);
		color: var(--error-text);
	}

	.floating-scroll-buttons {
		position: fixed;
		right: max(1rem, env(safe-area-inset-right, 0.75rem));
		bottom: max(1rem, calc(4.75rem + env(safe-area-inset-bottom, 0.75rem)));
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		z-index: 40;
	}

	.floating-scroll-button {
		width: 3.25rem;
		height: 3.25rem;
		border: none;
		border-radius: 999px;
		background: linear-gradient(135deg, #7e22ce, #5b21b6);
		color: #fff;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 12px 28px rgba(91, 33, 182, 0.32);
		cursor: pointer;
	}

	.floating-scroll-button .material-symbols-rounded {
		font-size: 1.5rem;
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
		grid-template-columns: repeat(4, minmax(0, 1fr));
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

	.backup-menu-anchor {
		position: relative;
		display: flex;
		align-items: stretch;
		justify-content: center;
	}

	.backup-menu-anchor > button {
		width: 100%;
	}

	.backup-popover {
		position: absolute;
		left: 0;
		bottom: calc(100% + 0.5rem);
		transform: none;
		z-index: 20;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		width: min(17rem, calc(100vw - 1.5rem));
		padding: 0.75rem;
		border: 1px solid var(--border-color);
		border-radius: 1rem;
		background: var(--card-bg);
		box-shadow: 0 14px 32px rgba(15, 23, 42, 0.18);
	}

	.backup-popover-title {
		margin: 0;
		padding: 0 0.25rem 0.2rem;
		color: var(--subtitle-color);
		font-size: 0.78rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		text-align: left;
	}

	.backup-button {
		border: none;
		border-radius: 0;
		padding: 0.85rem 0.15rem;
		display: flex;
		align-items: center;
		justify-content: flex-start;
		gap: 0.9rem;
		background: var(--surface-bg, var(--card-bg));
		color: var(--text-main);
		box-shadow: none;
		text-align: left;
		font-weight: 600;
		border-top: none;
		width: 100%;
		align-self: stretch;
	}

	.backup-popover .backup-button {
		align-items: center;
		justify-content: flex-start;
		text-align: left;
	}

	.backup-divider {
		height: 1px;
		width: 100%;
		background: var(--border-color);
		opacity: 0.9;
	}

	.backup-button:first-of-type {
		border-top: none;
	}

	.backup-button .material-symbols-rounded {
		font-size: 1.45rem;
		line-height: 1;
		flex: 0 0 auto;
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

	.confirm-actions .icon-action {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2.5rem;
		height: 2.5rem;
		padding: 0;
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
