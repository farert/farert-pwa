<script lang="ts">
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';

	const blogUrl = 'https://farert.blogspot.jp/';

	const usageSteps = [
		'発駅カードを押して、発駅を選びます。',
		'「+ 経路を追加」から路線を選び、次の駅を確定して経路を伸ばします。',
		'運賃サマリーが表示されたら、押して詳細画面を開きます。',
		'必要に応じて保存画面で保存し、詳細画面から共有します。'
	];

	const mainScreenParts = [
		{
			name: '発駅カード',
			description: '現在の発駅を設定・変更する入口です。経路が空のときはここから開始します。'
		},
		{
			name: '区間カード',
			description: '追加済みの区間を確認する欄です。押すとその区間までの詳細を開けます。'
		},
		{
			name: '運賃サマリーカード',
			description: '経路全体の運賃結果を確認する欄です。押すと全経路の詳細画面を開きます。'
		},
		{
			name: '+ 経路を追加',
			description: '次に使う路線と駅を選ぶ入口です。経路が終端に達すると追加できません。'
		},
		{
			name: '下部操作ナビ',
			description: '戻る、反転、保存、画面上下移動などの基本操作をまとめた固定操作欄です。'
		},
		{
			name: '右上メニュー',
			description: 'バージョン情報、ヘルプ、経路オプションを開きます。'
		}
	];

	const bottomToolbarItems = [
		{
			icon: 'undo',
			label: '戻る',
			description: '直前の操作を取り消します。区間があるときは末尾区間を消し、区間がないときは経路全体をクリアします。'
		},
		{
			icon: 'swap_horiz',
			label: '反転',
			description: '発駅と着駅の向きを入れ替えて、現在の経路を反転します。'
		},
		{
			icon: 'save',
			label: '保存',
			description: '保存画面を開き、現在の経路を保存したり保存済み経路を読み込んだりします。'
		},
		{
			icon: 'vertical_align_top',
			label: '上へ',
			description: 'ページ先頭までスクロールします。'
		},
		{
			icon: 'vertical_align_bottom',
			label: '下へ',
			description: 'ページ末尾までスクロールします。'
		}
	];

	const mainScreenImage = {
		src: `${base}/help/main-screen.png`,
		alt: 'メイン画面のスクリーンショット'
	};

	const screenManuals = [
		{
			title: '発着駅選択',
			image: `${base}/help/terminal-selection.png`,
			imageAlt: '発着駅選択画面のスクリーンショット',
			steps: [
				'「グループ」「都道府県」「履歴」から探すか、検索バーで駅名を検索します。',
				'候補一覧から駅を選ぶと、発駅または着駅として確定します。',
				'着駅選択では、必要に応じて新幹線利用確認が表示されます。'
			]
		},
		{
			title: '路線選択',
			image: `${base}/help/line-selection.png`,
			imageAlt: '路線選択画面のスクリーンショット',
			steps: [
				'現在駅や選択文脈に応じた路線候補が表示されます。',
				'路線を選ぶと、次の駅を選ぶ画面へ進みます。',
				'メイン画面から来た場合は「最短経路」で着駅の自動探索にも進めます。'
			]
		},
		{
			title: '駅選択',
			image: `${base}/help/route-station-select.png`,
			imageAlt: '駅選択画面のスクリーンショット',
			steps: [
				'メイン画面から来た場合は「分岐駅選択」と「着駅選択」を切り替えられます。',
				'駅名の下には、かなや所属路線が表示されます。',
				'駅を選ぶとその路線・駅の組み合わせが経路へ追加されます。'
			]
		},
		{
			title: '運賃詳細',
			image: `${base}/help/detail.png`,
			imageAlt: '運賃詳細画面のスクリーンショット',
			steps: [
				'運賃、営業キロ、有効日数、注記、経由を確認します。',
				'共有ボタンで URL 共有、結果エクスポートで文字列出力ができます。',
				'右上メニューでは、特例適用や最安経路計算などの再計算オプションを切り替えられます。'
			]
		},
		{
			title: '保存',
			image: `${base}/help/save.png`,
			imageAlt: '保存画面のスクリーンショット',
			steps: [
				'現在の経路を保存し、保存済み経路を一覧で管理します。',
				'保存済み経路を押すと読み込み、編集モードでは削除ができます。',
				'インポートとエクスポートでは、経路文字列をまとめて扱えます。'
			]
		}
	];

	const saveScreenDetails = {
		overviewImage: `${base}/help/save.png`,
		overviewAlt: '保存画面全体のスクリーンショット',
		importImage: `${base}/help/save-import-dialog.png`,
		importAlt: '保存画面のインポートダイアログ',
		exportImage: `${base}/help/save-export-dialog.png`,
		exportAlt: '保存画面のエクスポートダイアログ'
	};

	const saveScreenParts = [
		{
			name: '現在経路カード',
			description: '編集中の経路が 2 区間以上あるときに先頭へ表示されます。保存済みか未保存かもここで確認できます。'
		},
		{
			name: '保存済み経路一覧',
			description: '保存した経路を一覧で管理します。通常時は押すと読み込み、編集モード時は削除対象になります。'
		},
		{
			name: '編集ボタン',
			description: '保存済み経路の削除導線を表示する切替です。編集モード中は経路カードを押しても読み込みません。'
		},
		{
			name: '下部アクションバー',
			description: 'インポート、エクスポート、保存の 3 操作を固定表示します。'
		}
	];

	const saveImportSteps = [
		'経路は 1 行 1 件で入力します。',
		'区切りはカンマまたはスペースに対応します。',
		'「インポート実行」を押すと、成功分だけ保存済み一覧へ追加されます。'
	];

	const saveExportSteps = [
		'保存済み経路を改行区切りテキストで確認できます。',
		'ダイアログ表示時にコピーを試行し、結果はダイアログ内に表示されます。',
		'内容はそのまま保存画面への再インポートや外部メモへの転記に使えます。'
	];

	const options = [
		'大阪環状線の近回り / 遠回りを切り替えられます。',
		'小倉-博多間新幹線在来線別線扱いを切り替えられます。',
		'詳細画面では、特例適用や最安経路計算などの再計算オプションを切り替えられます。'
	];

	const reuseTips = [
		'保存画面では、現在経路の保存、保存済み経路の読込、削除ができます。',
		'詳細画面では、共有 URL を作成して他端末へ渡せます。',
		'共有やコピーの方法は端末により異なり、共有シート、クリップボード、ダイアログ表示のいずれかを使います。'
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
		},
		{
			q: '同名駅はどう見分けますか？',
			a: '必要に応じて駅名に補助表記が付きます。かなや所属路線も合わせて確認してください。'
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
		<h2>メイン画面の各部</h2>
		<div class="main-screen-layout">
			<div class="main-screen-visual">
				<img
					class="main-screen-shot"
					src={mainScreenImage.src}
					alt={mainScreenImage.alt}
					loading="lazy"
				/>
			</div>
			<div class="main-screen-details">
				<ul class="plain-list">
					{#each mainScreenParts as part}
						<li>
							<strong>{part.name}</strong>
							<p>{part.description}</p>
						</li>
					{/each}
				</ul>
				<div class="toolbar-guide">
					<h3>下部ツールバー</h3>
					<table class="icon-table">
						<thead>
							<tr>
								<th scope="col">アイコン</th>
								<th scope="col">説明</th>
							</tr>
						</thead>
						<tbody>
							{#each bottomToolbarItems as item}
								<tr>
									<td>
										<div class="icon-cell">
											<span class="material-symbols-rounded toolbar-icon" aria-hidden="true">{item.icon}</span>
											<span>{item.label}</span>
										</div>
									</td>
									<td>{item.description}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	</section>

	<section class="card">
		<h2>画面別の操作マニュアル</h2>
		<div class="manual-grid">
			{#each screenManuals as manual}
				<section class="manual-card">
					<h3>{manual.title}</h3>
					<img class="manual-shot" src={manual.image} alt={manual.imageAlt} loading="lazy" />
					<ul>
						{#each manual.steps as step}
							<li>{step}</li>
						{/each}
					</ul>
				</section>
			{/each}
		</div>
	</section>

	<section class="card">
		<h2>保存画面の使い方</h2>
		<div class="save-help-layout">
			<div class="save-help-visual">
				<img
					class="main-screen-shot"
					src={saveScreenDetails.overviewImage}
					alt={saveScreenDetails.overviewAlt}
					loading="lazy"
				/>
			</div>
			<div class="save-help-details">
				<ul class="plain-list">
					{#each saveScreenParts as part}
						<li>
							<strong>{part.name}</strong>
							<p>{part.description}</p>
						</li>
					{/each}
				</ul>
			</div>
		</div>

		<div class="manual-grid save-detail-grid">
			<section class="manual-card">
				<h3>インポート実行</h3>
				<img
					class="manual-shot"
					src={saveScreenDetails.importImage}
					alt={saveScreenDetails.importAlt}
					loading="lazy"
				/>
				<ul>
					{#each saveImportSteps as step}
						<li>{step}</li>
					{/each}
				</ul>
			</section>
			<section class="manual-card">
				<h3>エクスポート結果</h3>
				<img
					class="manual-shot"
					src={saveScreenDetails.exportImage}
					alt={saveScreenDetails.exportAlt}
					loading="lazy"
				/>
				<ul>
					{#each saveExportSteps as step}
						<li>{step}</li>
					{/each}
				</ul>
			</section>
		</div>
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
		<h2>保存・共有・再利用</h2>
		<ul>
			{#each reuseTips as tip}
				<li>{tip}</li>
			{/each}
		</ul>
	</section>

	<section class="card">
		<h2>外部サイト</h2>
		<p>
			<a href="https://farert.blogspot.com/2017/03/blog-post_54.html" target="_blank" rel="noopener noreferrer"
				>経路運賃キロ計算アプリの使い方〜目次</a
			>
		</p>
	</section>

	<section class="card">
		<h2>よくある質問</h2>
		<ul class="faq-list">
			{#each faqs as faq}
				<li>
					<strong>{faq.q}</strong>
					<p>{faq.a}</p>
				</li>
			{/each}
		</ul>
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
		font-weight: 700;
	}

	h3 {
		margin: 0;
		font-size: 0.98rem;
		font-weight: 700;
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

	p {
		margin: 0;
		line-height: 1.6;
	}

	li span {
		font-weight: 700;
		margin-right: 0.35rem;
	}

	.plain-list,
	.faq-list {
		list-style: none;
		padding-left: 0;
	}

	.manual-grid {
		display: grid;
		gap: 0.75rem;
	}

	.manual-card {
		border: 1px solid rgba(100, 116, 139, 0.18);
		border-radius: 0.75rem;
		padding: 0.85rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		background: rgba(248, 250, 252, 0.8);
	}

	.main-screen-layout {
		display: grid;
		gap: 1rem;
	}

	.main-screen-visual,
	.main-screen-details {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.main-screen-shot {
		width: 100%;
		border-radius: 0.85rem;
		border: 1px solid rgba(100, 116, 139, 0.18);
		background: #e2e8f0;
		box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
	}

	.save-help-layout {
		display: grid;
		gap: 1rem;
	}

	.save-help-visual,
	.save-help-details {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.toolbar-guide {
		display: flex;
		flex-direction: column;
		gap: 0.65rem;
	}

	.icon-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.95rem;
	}

	.icon-table th,
	.icon-table td {
		padding: 0.7rem 0.65rem;
		border-top: 1px solid rgba(148, 163, 184, 0.28);
		vertical-align: top;
		text-align: left;
	}

	.icon-table thead th {
		font-size: 0.85rem;
		color: var(--text-sub, #64748b);
		font-weight: 700;
	}

	.icon-cell {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		font-weight: 700;
		white-space: nowrap;
	}

	.toolbar-icon {
		font-size: 1.3rem;
		line-height: 1;
	}

	.manual-shot {
		width: 100%;
		max-height: 28rem;
		object-fit: contain;
		object-position: center top;
		padding: 0.35rem;
		box-sizing: border-box;
		border-radius: 0.65rem;
		border: 1px solid rgba(100, 116, 139, 0.18);
		background: linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%);
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
		background: var(--primary);
		color: white;
		border-radius: 0.75rem;
		padding: 0.8rem;
		font-size: 1rem;
		font-weight: 700;
		cursor: pointer;
	}

	@media (min-width: 720px) {
		.help-page {
			padding: 2rem;
		}

		.main-screen-layout {
			grid-template-columns: minmax(280px, 0.9fr) minmax(0, 1.1fr);
			align-items: start;
		}

		.save-help-layout {
			grid-template-columns: minmax(280px, 0.95fr) minmax(0, 1.05fr);
			align-items: start;
		}

		.manual-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
</style>
