<script lang="ts">
	import { goto } from '$app/navigation';
import { base } from '$app/paths';

	const blogUrl = 'https://farert.blogspot.jp/';

	const usageSteps = [
		'まず発駅を1つ目のカードから選択します。',
		'「区間を追加」で到達駅と路線を順に選び、経路を作成します。',
		'入力が完了すると、一覧に運賃結果が表示されます。',
		'必要に応じて「きっぷホルダ」を開き、経路内を追加してください。'
	];

	const options = [
		'大阪環状線遠回り（大坂～天王寺周辺）',
		'小倉〜博多新幹線在来線別線扱い（経路条件に応じた補助的な最適化）'
	];

	const faqs = [
		{
			q: '結果が想定と違う場合はどうすればよいですか？',
			a: '運賃制度の更新タイミングや地域運行条件により、表示結果に差異が出ることがあります。実利用前に、公式窓口で再確認してください。'
		},
		{
			q: '保存機能はどこ？',
			a: '画面下部の保存系操作（環境設定により）から経路を保存できます。'
		},
		{
			q: 'ブラウザ版・モバイルで表示が違う？',
			a: '端末幅でレイアウトが変わるため見え方は変わります。機能自体は同一です。'
		}
	];

	function close(): void {
		goto(`${base}/`);
	}
</script>

<div class="help-page">
	<img src="{base}/trade-icon.png" alt="Farert" class="hero-icon" />
	<h1>ヘルプ</h1>
	<p class="subtext">Farert の使い方・注意事項をまとめています。</p>

	<section class="card">
		<h2>このアプリについて</h2>
		<p>経路を作成すると、運賃を算出して表示します。駅・路線の選択結果をもとに、各種条件付き運賃の適用有無を判定します。</p>
	</section>

	<section class="card">
		<h2>基本の使い方</h2>
		<ol>
			{#each usageSteps as step, index}
				<li><span>{index + 1}.</span>{step}</li>
			{/each}
		</ol>
	</section>

	<section class="card">
		<h2>主な設定・オプション</h2>
		<ul>
			{#each options as option}
				<li>{option}</li>
			{/each}
		</ul>
	</section>

	<section class="card">
		<h2>よくある質問</h2>
		{#each faqs as faq}
			<details>
				<summary>{faq.q}</summary>
				<p>{faq.a}</p>
			</details>
		{/each}
	</section>

	<section class="card warning">
		<h2>注意・免責</h2>
		<p>
			本アプリの表示結果は、時刻表・運賃制度の更新、地域ごとの運用条件、データ反映のタイミング等により実際の運賃と異なる場合があります。<br />
			実利用前に、公式窓口でご確認ください。
		</p>
	</section>

	<section class="link-row">
		<button type="button" class="link-button" onclick={() => window.open(blogUrl, '_blank', 'noopener')}>
			運営ブログを開く
		</button>
	</section>

	<button type="button" class="close-button" onclick={close}>閉じる</button>
</div>

<style>
	.help-page {
		min-height: 100vh;
		padding: 1.6rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		background: var(--page-bg, #f8fafc);
		color: var(--text-main, #0f172a);
	}

	.hero-icon {
		width: 84px;
		height: 84px;
		object-fit: contain;
		align-self: center;
	}

	h1 {
		margin: 0;
		text-align: center;
		font-size: 1.5rem;
	}

	.subtext {
		text-align: center;
		color: var(--text-sub, #64748b);
		margin: 0;
	}

	.card {
		background: var(--card-bg, #ffffff);
		border-radius: 0.9rem;
		box-shadow: var(--card-shadow, 0 6px 18px rgba(15, 23, 42, 0.08));
		padding: 1rem 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.65rem;
	}

	h2 {
		margin: 0;
		font-size: 1.05rem;
	}

	ol,
	ul {
		margin: 0;
		padding-left: 1.1rem;
		display: flex;
		flex-direction: column;
		gap: 0.45rem;
	}

	li {
		line-height: 1.6;
	}

	li span {
		font-weight: 700;
		margin-right: 0.35rem;
	}

	details {
		border-top: 1px solid color-mix(in srgb, var(--text-main, #0f172a) 10%, transparent);
		padding: 0.5rem 0;
	}

	summary {
		cursor: pointer;
		font-weight: 600;
	}

	.warning p {
		margin: 0;
		line-height: 1.6;
	}

	.link-row {
		display: flex;
		justify-content: center;
	}

	.link-button {
		border: none;
		background: none;
		color: var(--link, #2563eb);
		font-weight: 700;
		text-decoration: underline;
		cursor: pointer;
	}

	.close-button {
		border: none;
		background: #2563eb;
		color: white;
		border-radius: 0.75rem;
		padding: 0.8rem;
		font-size: 1rem;
		font-weight: 700;
		cursor: pointer;
	}
</style>
