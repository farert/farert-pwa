<script lang="ts">
	import { onMount } from 'svelte';
	import { initFarert, Farert } from '$lib/wasm';
	import { initStores, mainRoute, savedRoutes, ticketHolder, stationHistory, addToStationHistory, clearAllStores } from '$lib/stores';
	import { exportRoutes, importRoutes, copyRouteToClipboard, pasteRouteFromClipboard } from '$lib/storage';
	import { FareType, FareTypeLabels, type TicketHolderItem } from '$lib/types';

	let initialized = $state(false);
	let loading = $state(true);
	let error = $state('');
	let testResults = $state<string[]>([]);

	// Svelteストアの値を取得（リアクティブ）
	let currentRoute = $state($mainRoute);
	let currentSavedRoutes = $state($savedRoutes);
	let currentTicketHolder = $state($ticketHolder);
	let currentStationHistory = $state($stationHistory);

	// ストアの変更を監視
	$effect(() => {
		currentRoute = $mainRoute;
		currentSavedRoutes = $savedRoutes;
		currentTicketHolder = $ticketHolder;
		currentStationHistory = $stationHistory;
	});

	function addTestResult(message: string) {
		testResults = [...testResults, `✅ ${message}`];
		console.log(`[TEST] ${message}`);
	}

	function addTestError(message: string) {
		testResults = [...testResults, `❌ ${message}`];
		console.error(`[TEST] ${message}`);
	}

	onMount(async () => {
		try {
			// WASM初期化
			await initFarert();
			addTestResult('WASM初期化完了');

			// ストア初期化
			initStores(Farert);
			addTestResult('ストア初期化完了');

			initialized = true;
			loading = false;

			// テスト実行
			await runTests();
		} catch (err) {
			error = `初期化エラー: ${err}`;
			loading = false;
		}
	});

	async function runTests() {
		addTestResult('=== データモデルテスト開始 ===');

		// Test 1: 経路作成とrouteScript
		try {
			const route = new Farert();
			const rc1 = route.addStartRoute('東京');
			const rc2 = route.addRoute('東海道線', '熱海');

			console.log('[TEST] addStartRoute rc =', rc1);
			console.log('[TEST] addRoute rc =', rc2);

			const script = route.routeScript();
			console.log('[TEST] routeScript =', script);

			if (script === '東京,東海道線,熱海') {
				addTestResult(`経路作成とrouteScript: ${script}`);
			} else {
				addTestError(`経路作成失敗: expected "東京,東海道線,熱海", got "${script}" (rc1=${rc1}, rc2=${rc2})`);
			}
		} catch (err) {
			addTestError(`経路作成エラー: ${err}`);
		}

		// Test 2: mainRouteストアに経路を設定
		try {
			const route = new Farert();
			const rc1 = route.addStartRoute('新宿');
			const rc2 = route.addRoute('中央東線', '八王子');

			// 返り値をチェック
			if (rc1 < 0) {
				addTestError(`addStartRoute失敗: rc=${rc1}`);
			}
			if (rc2 < 0) {
				addTestError(`addRoute失敗: rc=${rc2}`);
			}

			// routeScript を確認
			const script = route.routeScript();
			console.log('[TEST] route.routeScript() =', script);

			mainRoute.set(route);

			// 少し待ってlocalStorageに保存されるのを確認
			await new Promise(resolve => setTimeout(resolve, 100));

			const stored = localStorage.getItem('farert_current_route');
			if (stored === '新宿,中央東線,八王子') {
				addTestResult(`mainRouteストア保存: ${stored}`);
			} else {
				addTestError(`mainRouteストア保存失敗: expected "新宿,中央東線,八王子", got "${stored}"`);
			}
		} catch (err) {
			addTestError(`mainRouteストアエラー: ${err}`);
		}

		// Test 3: 駅選択履歴
		try {
			addToStationHistory('東京');
			addToStationHistory('新宿');
			addToStationHistory('東京'); // 重複

			await new Promise(resolve => setTimeout(resolve, 100));

			const history = $stationHistory;
			if (history[0] === '東京' && history[1] === '新宿' && history.length === 2) {
				addTestResult(`駅選択履歴: ${history.join(', ')}`);
			} else {
				addTestError(`駅選択履歴エラー: ${history.join(', ')}`);
			}
		} catch (err) {
			addTestError(`駅選択履歴エラー: ${err}`);
		}

		// Test 4: きっぷホルダ
		try {
			const item1: TicketHolderItem = {
				order: 1,
				routeScript: '東京,東海道線,熱海',
				fareType: FareType.NORMAL
			};
			const item2: TicketHolderItem = {
				order: 2,
				routeScript: '新宿,中央線,八王子',
				fareType: FareType.CHILD
			};
			ticketHolder.set([item1, item2]);

			await new Promise(resolve => setTimeout(resolve, 100));

			const holder = $ticketHolder;
			if (holder.length === 2 && holder[0].fareType === FareType.NORMAL) {
				addTestResult(`きっぷホルダ: ${holder.length}件登録`);
			} else {
				addTestError(`きっぷホルダエラー: ${holder.length}件`);
			}
		} catch (err) {
			addTestError(`きっぷホルダエラー: ${err}`);
		}

		// Test 5: 保存経路
		try {
			savedRoutes.set(['東京,東海道線,新大阪', '札幌,函館本線,小樽']);

			await new Promise(resolve => setTimeout(resolve, 100));

			const routes = $savedRoutes;
			if (routes.length === 2) {
				addTestResult(`保存経路: ${routes.length}件登録`);
			} else {
				addTestError(`保存経路エラー: ${routes.length}件`);
			}
		} catch (err) {
			addTestError(`保存経路エラー: ${err}`);
		}

		// Test 6: エクスポート/インポート
		try {
			const routes = ['東京,東海道線,新大阪', '札幌,函館本線,小樽'];
			const exported = exportRoutes(routes);
			const imported = importRoutes(exported);

			if (imported.length === 2 && imported[0] === routes[0]) {
				addTestResult(`エクスポート/インポート: ${imported.length}件`);
			} else {
				addTestError(`エクスポート/インポートエラー: ${imported.length}件`);
			}
		} catch (err) {
			addTestError(`エクスポート/インポートエラー: ${err}`);
		}

		// Test 7: クリップボード（非同期）
		try {
			const success = await copyRouteToClipboard('東京,東海道線,熱海');
			if (success) {
				const pasted = await pasteRouteFromClipboard();
				if (pasted === '東京,東海道線,熱海') {
					addTestResult(`クリップボード: ${pasted}`);
				} else {
					addTestError(`クリップボードペーストエラー: ${pasted}`);
				}
			} else {
				addTestResult('クリップボード: Clipboard API未対応（スキップ）');
			}
		} catch (err) {
			addTestResult('クリップボード: エラー（スキップ）');
		}

		addTestResult('=== データモデルテスト完了 ===');
	}

	function handleClearAll() {
		clearAllStores();
		testResults = [...testResults, '⚠️ すべてのストアをクリアしました'];
	}

	function handleReload() {
		window.location.reload();
	}
</script>

<div class="container">
	<h1>データモデルテスト</h1>

	{#if loading}
		<p class="loading">初期化中...</p>
	{:else if error}
		<p class="error">{error}</p>
	{:else if initialized}
		<div class="content">
			<section class="test-results">
				<h2>テスト結果</h2>
				<div class="results">
					{#each testResults as result}
						<div class="result-item">{result}</div>
					{/each}
				</div>
			</section>

			<section class="store-status">
				<h2>ストアの現在の状態</h2>

				<div class="store-item">
					<h3>mainRoute</h3>
					<pre>{currentRoute ? currentRoute.routeScript() : 'null'}</pre>
				</div>

				<div class="store-item">
					<h3>savedRoutes ({currentSavedRoutes.length}件)</h3>
					<pre>{JSON.stringify(currentSavedRoutes, null, 2)}</pre>
				</div>

				<div class="store-item">
					<h3>ticketHolder ({currentTicketHolder.length}件)</h3>
					<pre>{JSON.stringify(currentTicketHolder, null, 2)}</pre>
				</div>

				<div class="store-item">
					<h3>stationHistory ({currentStationHistory.length}件)</h3>
					<pre>{JSON.stringify(currentStationHistory, null, 2)}</pre>
				</div>
			</section>

			<section class="actions">
				<h2>アクション</h2>
				<button onclick={handleClearAll} class="btn-danger">すべてクリア</button>
				<button onclick={handleReload} class="btn-primary">リロード</button>
			</section>
		</div>
	{/if}
</div>

<style>
	.container {
		max-width: 1000px;
		margin: 0 auto;
		padding: 2rem;
		font-family: system-ui, -apple-system, sans-serif;
	}

	h1 {
		color: #9333ea;
		margin-bottom: 1.5rem;
	}

	h2 {
		color: #334155;
		margin-bottom: 1rem;
		font-size: 1.5rem;
	}

	h3 {
		color: #64748b;
		margin-bottom: 0.5rem;
		font-size: 1.125rem;
	}

	.loading,
	.error {
		padding: 1rem;
		border-radius: 0.5rem;
		margin: 1rem 0;
	}

	.loading {
		background-color: #dbeafe;
		color: #1e40af;
	}

	.error {
		background-color: #fee2e2;
		color: #991b1b;
	}

	.content {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	section {
		background-color: white;
		padding: 1.5rem;
		border-radius: 0.5rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	.test-results .results {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.result-item {
		padding: 0.5rem;
		background-color: #f8fafc;
		border-radius: 0.25rem;
		font-family: 'Courier New', monospace;
		font-size: 0.875rem;
	}

	.store-item {
		margin-bottom: 1.5rem;
	}

	.store-item:last-child {
		margin-bottom: 0;
	}

	pre {
		background-color: #f8fafc;
		border: 1px solid #cbd5e1;
		border-radius: 0.375rem;
		padding: 1rem;
		font-family: 'Courier New', monospace;
		white-space: pre-wrap;
		overflow-x: auto;
		font-size: 0.875rem;
	}

	.actions {
		display: flex;
		gap: 1rem;
	}

	button {
		padding: 0.75rem 1.5rem;
		border: none;
		border-radius: 0.5rem;
		font-size: 1rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
	}

	.btn-primary {
		background-color: #9333ea;
		color: white;
	}

	.btn-primary:hover {
		background-color: #7e22ce;
	}

	.btn-danger {
		background-color: #dc2626;
		color: white;
	}

	.btn-danger:hover {
		background-color: #b91c1c;
	}
</style>
