<script lang="ts">
	import { onMount } from 'svelte';
	import { initFarert, Farert, getPrefects, searchStationByKeyword } from '$lib/wasm';

	let initialized = $state(false);
	let loading = $state(true);
	let error = $state('');
	let fareResult = $state('');
	let prefectures = $state<string[]>([]);
	let searchResults = $state<string[]>([]);

	onMount(async () => {
		try {
			console.log('onMount: WASM初期化開始');
			// WASM初期化
			await initFarert();
			console.log('onMount: WASM初期化完了');
			initialized = true;

			// 都道府県リストを取得
			console.log('onMount: 都道府県リスト取得中');
			const prefectsJson = getPrefects();
			console.log('onMount: prefectsJson =', prefectsJson);
			const parsedPrefects = JSON.parse(prefectsJson);
			// 結果が配列かオブジェクトか確認
			prefectures = Array.isArray(parsedPrefects) ? parsedPrefects : (parsedPrefects.prefectures || []);
			console.log('onMount: prefectures =', prefectures);

			// テスト: 東京 → 大阪の運賃計算
			console.log('onMount: 運賃計算テスト開始');
			const farert = new Farert();
			farert.addStartRoute('東京');
			farert.addRoute('東海道新幹線', '新大阪');
			fareResult = farert.showFare();
			console.log('onMount: fareResult =', fareResult);

			// テスト: 駅検索
			console.log('onMount: 駅検索テスト開始');
			const results = searchStationByKeyword('新宿');
			const parsedResults = JSON.parse(results);
			console.log('onMount: parsedResults =', parsedResults);
			// 結果がオブジェクトの場合はstationsプロパティを取得、配列の場合はそのまま
			searchResults = Array.isArray(parsedResults) ? parsedResults : (parsedResults.stations || []);
			console.log('onMount: searchResults =', searchResults);

			loading = false;
			console.log('onMount: すべて完了');
		} catch (err) {
			console.error('onMount: エラー発生', err);
			error = `WASM初期化エラー: ${err}`;
			loading = false;
			// エラー時も配列を保持
			prefectures = [];
			searchResults = [];
		}
	});
</script>

<div class="container">
	<h1>Farert PWA - WASM テスト</h1>

	{#if loading}
		<p class="loading">WASMモジュールを初期化中...</p>
	{:else if error}
		<p class="error">{error}</p>
	{:else if initialized}
		<div class="success">
			<h2>✅ WASM初期化成功！</h2>

			<section>
				<h3>📍 都道府県リスト</h3>
				<p>取得件数: {prefectures.length}件</p>
				<div class="scroll-box">
					{#each prefectures.slice(0, Math.min(10, prefectures.length)) as prefecture}
						<span class="tag">{prefecture}</span>
					{/each}
					{#if prefectures.length > 10}
						<span class="more">...他 {prefectures.length - 10}件</span>
					{/if}
				</div>
			</section>

			<section>
				<h3>💴 運賃計算テスト: 東京 → 新大阪</h3>
				<pre class="fare-result">{fareResult}</pre>
			</section>

			<section>
				<h3>🔍 駅検索テスト: "新宿"</h3>
				<p>検索結果: {searchResults.length}件</p>
				<div class="scroll-box">
					{#each searchResults.slice(0, Math.min(10, searchResults.length)) as station}
						<span class="tag">{station}</span>
					{/each}
					{#if searchResults.length > 10}
						<span class="more">...他 {searchResults.length - 10}件</span>
					{/if}
				</div>
			</section>

			<section>
				<h3>🎉 次のステップ</h3>
				<ul>
					<li>データモデルとSvelteストアの実装</li>
					<li>メイン画面（経路リスト）の実装</li>
					<li>駅選択画面の実装</li>
					<li>ドロワーナビゲーションの実装</li>
				</ul>
			</section>
		</div>
	{/if}
</div>

<style>
	.container {
		max-width: 800px;
		margin: 0 auto;
		padding: 2rem;
		font-family: system-ui, -apple-system, sans-serif;
	}

	h1 {
		color: #9333ea;
		margin-bottom: 1.5rem;
	}

	h2 {
		color: #16a34a;
		margin-bottom: 1rem;
	}

	h3 {
		color: #334155;
		margin-bottom: 0.75rem;
		font-size: 1.25rem;
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

	.success {
		background-color: #f0fdf4;
		padding: 1.5rem;
		border-radius: 0.5rem;
		border: 2px solid #16a34a;
	}

	section {
		margin: 1.5rem 0;
		padding: 1rem;
		background-color: white;
		border-radius: 0.5rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	.scroll-box {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-top: 0.5rem;
	}

	.tag {
		background-color: #e0e7ff;
		color: #4338ca;
		padding: 0.25rem 0.75rem;
		border-radius: 0.25rem;
		font-size: 0.875rem;
	}

	.more {
		color: #64748b;
		font-style: italic;
		padding: 0.25rem 0.75rem;
	}

	.fare-result {
		background-color: #f8fafc;
		border: 1px solid #cbd5e1;
		border-radius: 0.375rem;
		padding: 1rem;
		font-family: 'Courier New', monospace;
		white-space: pre-wrap;
		line-height: 1.6;
	}

	ul {
		list-style: none;
		padding-left: 0;
	}

	li {
		padding: 0.5rem 0;
		padding-left: 1.5rem;
		position: relative;
	}

	li::before {
		content: '▸';
		position: absolute;
		left: 0;
		color: #9333ea;
	}
</style>
