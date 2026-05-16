<!--
アプリの使い方と注意事項をまとめるヘルプ画面です。
各画面説明、FAQ、外部導線を静的コンテンツとして提供します。
-->
<script lang="ts">
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';

	const blogUrl = 'https://farert.blogspot.jp/';
	const inquiryUrl = 'https://nostalgic-wasabi-423.notion.site/28edffbd711a801ba33edaf258af9562';

	const usageSteps = [
		{
			html: '「<a class="help-inline-link" href="#terminal-selection-manual">発駅</a>」で、発駅を選びます。'
		},
		{
			html: '「<a class="help-inline-link" href="#line-selection-manual">+ 経路を追加</a>」から路線を選び、次の駅を確定して経路を伸ばします。'
		},
		{
			html: '運賃サマリーが表示されたら、押して<a class="help-inline-link" href="#detail-manual">詳細画面</a>を開きます。'
		},
		{
			html: '必要に応じて<a class="help-inline-link" href="#archive-manual">保存画面を開き</a>、保存し、<a class="help-inline-link" href="#detail-manual">詳細画面</a>から共有します。'
		},
		{
			html: '<span class="inline-icon-label"><span class="material-symbols-rounded inline-symbol" aria-hidden="true">menu</span></span> メニューから開くきっぷホルダでも「<a class="help-inline-link" href="#archive-manual">保存画面</a>」と同様に経路を保存できます。こちらは運賃額の集計に利用します。'
		}
	];

	const basicUsageFlowCharts = [
		{
			title: '経路を指定して運賃額を確認',
			viewBox: '0 0 980 270',
			nodes: [
				{ id: 'begin', x: 40, y: 98, label: ['発駅選択'] },
				{ id: 'junction', x: 230, y: 125, label: ['分岐点'], kind: 'junction' },
				{ id: 'line1', x: 330, y: 36, label: ['路線選択'] },
				{ id: 'branch1', x: 500, y: 36, label: ['分岐駅選択'] },
				{ id: 'line2', x: 330, y: 186, label: ['路線選択'] },
				{ id: 'branch2', x: 500, y: 186, label: ['分岐駅選択'] },
				{ id: 'arrive', x: 670, y: 186, label: ['着駅選択'] },
				{ id: 'detail', x: 840, y: 186, label: ['運賃詳細'] }
			],
			edges: [
				'M160 125 L214 125',
				'M246 118 L330 63',
				'M450 63 L500 63',
				'M560 90 C560 124 310 134 246 128',
				'M246 132 L330 213',
				'M450 213 L500 213',
				'M620 213 L670 213',
				'M790 213 L840 213'
			],
			edgeLabels: [
				{ x: 255, y: 86, text: '経路追加' },
				{ x: 255, y: 180, text: '経路追加' }
			],
			note: '分岐駅を選ぶと分岐点へ戻り、必要な区間を順に指定します。目的地がその路線内にあるときは着駅選択へ進みます。'
		},
		{
			title: '最短経路検出',
			viewBox: '0 0 980 150',
			nodes: [
				{ id: 'begin', x: 40, y: 48, label: ['発駅選択'] },
				{ id: 'line', x: 200, y: 48, label: ['路線選択'] },
				{ id: 'shortest', x: 360, y: 48, label: ['最短経路'] },
				{ id: 'arrive', x: 520, y: 48, label: ['着駅選択'] },
				{ id: 'route', x: 680, y: 48, label: ['使用路線選択'] },
				{ id: 'detail', x: 840, y: 48, label: ['運賃詳細'] }
			],
			edges: [
				'M160 75 L200 75',
				'M320 75 L360 75',
				'M480 75 L520 75',
				'M640 75 L680 75',
				'M800 75 L840 75'
			],
			edgeLabels: [{ x: 162, y: 54, text: '経路追加' }],
			note: '路線選択後に最短経路で着駅を指定し、候補から使用路線を選ぶと詳細を表示します。'
		}
	];

	const mainScreenParts = [
		{
			nameHtml: '発駅カード',
			description:
				'現在の発駅を設定・変更する入口です。経路が空のときはここから開始します。  経路を新規に入力しなおすときも、ここから発駅を指定することで上書きして開始します。<a class="help-inline-link" href="#terminal-selection-manual">発駅選択画面</a>が開きます。'
		},
		{
			nameHtml: '区間カード',
			description:
				'丸囲み数字で始まる、追加済みの区間を確認する欄です。押すとその区間までの<a class="help-inline-link" href="#detail-manual">詳細</a>を開けます。'
		},
		{
			nameHtml: '運賃サマリーカード',
			description:
				'経路全体の運賃結果を確認する欄です。押すと全経路の<a class="help-inline-link" href="#detail-manual">詳細画面</a>を開きます。'
		},
		{
			nameHtml: '+ 経路を追加',
			description:
				'次に使う路線と駅を選ぶ入口です。経路が終端に達すると追加できません。<a class="help-inline-link" href="#line-selection-manual">路線選択画面</a>が開きます。'
		},
		{
			nameHtml:
				'<span class="inline-icon-label"><span class="material-symbols-rounded inline-symbol" aria-hidden="true">more_vert</span>メニュー</span>',
			description:
				'バージョン情報、ヘルプ（今見ている画面）、経路オプションを開きます。経路オプションは、大阪環状線を通った際に大回りする指定ができます。'
		}
	];

	const bottomToolbarItems = [
		{
			icon: 'undo',
			label: '戻る',
			description:
				'直前の操作を取り消します。区間カードを一番下から消していきます。区間がないときは発駅（経路全体）をクリアします。'
		},
		{
			icon: 'swap_horiz',
			label: '反転',
			description:
				'発駅と着駅の向きを入れ替えて、現在の経路を反転します。Pの字型の経路など反転できな経路もあります。'
		},
		{
			icon: 'save',
			label: '保存',
			description:
				' <a class="help-inline-link" href="#archive-manual">保存画面を開き</a>、現在の経路を保存したり保存済み経路を読み込んだりします。 他の端末へ既存経路を移すときもこの機能をお使いください。'
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
			id: 'terminal-selection-manual',
			title: '発着駅選択',
			image: `${base}/help/terminal-selection.png`,
			imageAlt: '発着駅選択画面のスクリーンショット',
			steps: [
				{
					html: '「JRグループ」「都道府県」「履歴」から探すか、検索バーで駅名を直接入力して指定します。'
				},
				{ html: '候補一覧から駅を選ぶと、発駅または着駅として確定します。' }
			]
		},
		{
			id: 'line-selection-manual',
			title: '路線選択',
			image: `${base}/help/line-selection.png`,
			imageAlt: '路線選択画面のスクリーンショット',
			steps: [
				{ html: '発着駅選択画面や、経路（区間）指定時に、路線候補が表示されます。' },
				{
					html: '路線を選ぶと、<a class="help-inline-link" href="#station-selection-manual">次の駅を選ぶ画面へ進みます</a>。'
				},
				{
					html: 'メイン画面の「＋経路を追加」から来た場合は「最短経路」で着駅を指定し、最短経路を自動算出することができます。'
				}
			]
		},
		{
			id: 'station-selection-manual',
			title: '駅選択',
			image: `${base}/help/route-station-select.png`,
			imageAlt: '駅選択画面のスクリーンショット',
			steps: [
				{ html: '「発着駅指定」の場合、駅一覧が表示されますので、選んでください。' },
				{ html: '「＋経路を追加」の場合、分岐駅、つまり乗り換え駅のみしか表示されません。' },
				{ html: '乗り換え駅を選ぶ場合は、そのまま乗り換え駅を選んでください。' },
				{ html: '目的地がその路線内である場合は右上の「着駅選択」を選んでください。' },
				{ html: '一覧表示を「分岐駅選択」と「着駅選択」とで切り替えられます。' }
			]
		},
		{
			id: 'detail-manual',
			title: '運賃詳細',
			image: `${base}/help/detail.png`,
			imageAlt: '運賃詳細画面のスクリーンショット',
			steps: [
				{ html: '運賃、営業キロ、有効日数、注記、経由を表示します。' },
				{
					html: '<span class="inline-icon-label"><span class="material-symbols-rounded inline-symbol" aria-hidden="true">description</span>文字列出力し、表示テキストをクリップボードへエクスポートします。</span>'
				},
				{
					html: '<span class="inline-icon-label"><span class="material-symbols-rounded inline-symbol" aria-hidden="true">share</span>URL 共有ができます。URL 共有を作成して他端末へ渡すこともできます。</span>'
				},
				{
					html: '<span class="inline-icon-label"><span class="material-symbols-rounded inline-symbol" aria-hidden="true">more_vert</span>特例非適用や最安経路計算などの再計算オプションを切り替えられます。特例非適用は指定した経路の運賃計算経路ではない営業キロを確認したいときなどに利用します。</span>'
				},
				{
					html: '共有やコピーの方法は端末により異なり、共有シート、クリップボード、ダイアログ表示のいずれかを使います。'
				}
			]
		},
		{
			id: 'archive-manual',
			title: '保存',
			image: `${base}/help/save.png`,
			imageAlt: '保存画面のスクリーンショット',
			steps: [
				{ html: '現在の経路を保存し、保存済み経路を一覧で管理します。' },
				{ html: '保存済み経路を押すと読み込み、編集モードでは削除ができます。' },
				{ html: 'インポートとエクスポートでは、経路文字列をまとめて扱えます。' }
			]
		}
	];

	const saveScreenDetails = {
		overviewImage: `${base}/help/save.png`,
		overviewAlt: '保存画面全体のスクリーンショット',
		importImage: `${base}/help/save-import-dialog.png`,
		importAlt: '保存画面のインポートダイアログ',
		exportImage: `${base}/help/save-export-dialog.png`,
		exportAlt: '保存画面のエクスポートダイアログ',
		backupImage: `${base}/help/bkuprestore.png`,
		backupAlt: 'バックアップとレストア画面'
	};

	const saveScreenParts = [
		{
			name: '現在経路カード',
			description:
				'編集中の経路が 2 区間以上あるときに先頭へ表示されます。保存済みか未保存かもここで確認できます。保存したい場合「保存」を選んでください。'
		},
		{
			name: '保存済み経路一覧',
			description:
				'保存した経路を一覧で管理します。通常時は選択するメイン画面へその経路で表示します。編集モード時は削除対象になります。'
		},
		{
			name: '編集ボタン',
			description:
				'保存済み経路の削除導線を表示する切替です。編集モード中は経路カードを押しても読み込みません。'
		},
		{
			name: '下部アクションバー',
			description: 'インポート、エクスポート、保存の 3 操作を固定表示します。'
		}
	];

	const saveImportSteps = [
		'「インポート実行」すると、保存済み一覧へ追加されます。',
		'',
		'経路は 1 行 1 件で入力します。改行で複数経路を指定可能です',
		'経路は、発駅 路線 駅 路線 駅 ... と指定します。',
		'例えば、 "あき亀山 可部線 広島 山陽新幹線 新大阪 東海道線 大阪 大阪環状線 天王寺" などと奇数個指定します。',
		'偶数の個数を指定すると最後の駅は自動経路で検索補完されます',
		'例えば、 "横浜 東海道線 東神奈川 国母" などと指定すると、東神奈川から最短経路で国母までの経路が選ばれます。',
		'区切りはカンマまたはスペースに対応します。'
	];

	const saveExportSteps = [
		'保存済み経路をCSVテキストでエクスポートします。',
		'ダイアログ表示時にコピーを試行し、結果はダイアログ内に表示されます。',
		'内容はそのまま保存画面への再インポートや外部メモへの転記に使えます。'
	];

	const backupRestoreSteps = [
		'「保存」画面の「バックアップ」から、現在経路、保存済み経路、きっぷホルダ、駅履歴をまとめてファイルへ保存できます。',
		'「ファイル読み込み」で、保存したバックアップファイルを選んで復元します。',
		'ファイルを扱いにくい環境では「テキスト復元」からバックアップファイルの中身のJSONを貼り付けて復元できます。'
	];
	/**
	 * `close` を終了または非表示にします。
	 *
	 * @returns この処理は戻り値を持ちません。
	 */
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
		<p>
			経路を作成すると、運賃を算出して表示します。駅・路線の選択結果をもとに、JRグループの旅客営業規則に基づいた各種運賃を表示します。
		</p>
	</section>

	<section class="card">
		<h2>基本的な使い方</h2>
		<ol>
			{#each usageSteps as step, index}
				<li><span>{index + 1}.</span>{@html step.html}</li>
			{/each}
		</ol>
		<div class="flow-diagrams" aria-label="基本的な使い方のフロー図">
			{#each basicUsageFlowCharts as flow, flowIndex}
				<section class="flow-card" aria-label={flow.title}>
					<h3>{flow.title}</h3>
					<div class="flow-chart-wrap">
						<svg
							class="flow-chart"
							viewBox={flow.viewBox}
							role="img"
							aria-label={`${flow.title}のフロー図`}
						>
							<defs>
								<marker
									id={`flow-arrow-${flowIndex}`}
									viewBox="0 0 10 10"
									refX="8"
									refY="5"
									markerWidth="6"
									markerHeight="6"
									orient="auto-start-reverse"
								>
									<path d="M 0 0 L 10 5 L 0 10 z" />
								</marker>
							</defs>
							{#each flow.edges as edge}
								<path class="flow-edge" d={edge} marker-end={`url(#flow-arrow-${flowIndex})`} />
							{/each}
							{#each flow.edgeLabels ?? [] as edgeLabel}
								<text class="flow-edge-label" x={edgeLabel.x} y={edgeLabel.y}>{edgeLabel.text}</text
								>
							{/each}
							{#each flow.nodes as node}
								<g class="flow-node">
									{#if node.kind === 'junction'}
										<circle class="flow-junction" cx={node.x} cy={node.y} r="16" />
										<text class="flow-junction-label" x={node.x} y={node.y + 39}
											>{node.label[0]}</text
										>
									{:else}
										<rect x={node.x} y={node.y} width="120" height="54" rx="14" />
										<text x={node.x + 60} y={node.y + (node.label.length === 1 ? 33 : 24)}>
											{#each node.label as line, lineIndex}
												<tspan x={node.x + 60} dy={lineIndex === 0 ? 0 : 17}>{line}</tspan>
											{/each}
										</text>
									{/if}
								</g>
							{/each}
						</svg>
					</div>
					<p class="flow-note">{flow.note}</p>
				</section>
			{/each}
		</div>
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
							<strong>{@html part.nameHtml}</strong>
							<p>{@html part.description}</p>
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
											<span class="material-symbols-rounded toolbar-icon" aria-hidden="true"
												>{item.icon}</span
											>
											<span>{item.label}</span>
										</div>
									</td>
									<td>{@html item.description}</td>
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
				<section class="manual-card" id={manual.id}>
					<h3>{manual.title}</h3>
					<img class="manual-shot" src={manual.image} alt={manual.imageAlt} loading="lazy" />
					<ul>
						{#each manual.steps as step}
							<li>{@html step.html}</li>
						{/each}
					</ul>
				</section>
			{/each}
		</div>
	</section>

	<section class="card" id="archive-manual">
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
			<section class="manual-card">
				<h3>バックアップとレストア</h3>
				<img
					class="manual-shot"
					src={saveScreenDetails.backupImage}
					alt={saveScreenDetails.backupAlt}
					loading="lazy"
				/>
				<ul>
					{#each backupRestoreSteps as step}
						<li>{step}</li>
					{/each}
				</ul>
			</section>
		</div>
	</section>

	<section class="card" id="inquiry-manual">
		<h2>不具合報告・問い合わせ</h2>
		<div class="faq-list">
			<div class="faq-item">
				<h3>不具合や質問を送る</h3>
				<p>
					結果が想定と違う場合や操作で困った場合は、経路、画面、操作内容を添えて送ってください。
					<a class="external-help-link" href={inquiryUrl} target="_blank" rel="noopener noreferrer">
						不具合報告・問い合わせフォームを開く
					</a>
				</p>
			</div>
		</div>
	</section>

	<section class="card">
		<h2>その他詳しい使い方は</h2>
		<p>
			<a
				class="external-help-link"
				href="https://farert.blogspot.com/2017/03/blog-post_54.html"
				target="_blank"
				rel="noopener noreferrer">経路運賃キロ計算アプリの使い方〜目次</a
			>
		</p>
	</section>

	<section class="link-row">
		<button
			type="button"
			class="link-button"
			onclick={() => window.open(blogUrl, '_blank', 'noopener')}
		>
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

	.flow-diagrams {
		display: grid;
		gap: 0.75rem;
	}

	.flow-card {
		border: 1px solid rgba(100, 116, 139, 0.18);
		border-radius: 0.75rem;
		padding: 0.85rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		background: rgba(248, 250, 252, 0.8);
	}

	.flow-chart-wrap {
		overflow-x: auto;
		padding: 0.25rem 0 0.35rem;
	}

	.flow-chart {
		display: block;
		width: 100%;
		height: auto;
		border-radius: 0.75rem;
		background: linear-gradient(180deg, #f8fafc 0%, #eef6ff 100%);
	}

	.flow-edge {
		fill: none;
		stroke: rgba(37, 99, 235, 0.55);
		stroke-width: 2.4;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	.flow-chart marker path {
		fill: rgba(37, 99, 235, 0.72);
	}

	.flow-node rect {
		fill: #ffffff;
		stroke: rgba(37, 99, 235, 0.28);
		stroke-width: 1.4;
		filter: drop-shadow(0 4px 10px rgba(15, 23, 42, 0.08));
	}

	.flow-node text {
		fill: #1e3a8a;
		font-size: 0.9rem;
		font-weight: 700;
		text-anchor: middle;
		dominant-baseline: middle;
	}

	.flow-edge-label {
		fill: #1d4ed8;
		font-size: 0.82rem;
		font-weight: 700;
		text-anchor: middle;
	}

	.flow-junction {
		fill: #1d4ed8;
		stroke: #ffffff;
		stroke-width: 4;
		filter: drop-shadow(0 4px 10px rgba(15, 23, 42, 0.12));
	}

	.flow-junction-label {
		fill: #475569;
		font-size: 0.78rem;
		font-weight: 700;
		text-anchor: middle;
	}

	.flow-note {
		color: var(--text-sub, #64748b);
		font-size: 0.9rem;
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
		max-height: 32rem;
		object-fit: contain;
		object-position: center top;
		padding: 0.35rem;
		box-sizing: border-box;
		border-radius: 0.85rem;
		border: 1px solid rgba(100, 116, 139, 0.18);
		background: linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%);
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

	.help-page :global(.inline-icon-label) {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.1rem;
		vertical-align: text-bottom;
	}

	.help-page :global(.inline-symbol) {
		font-size: 1.2rem;
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

	.help-page :global(a.help-inline-link) {
		display: inline-block;
		padding: 0.05rem 0.35rem;
		border-radius: 999px;
		color: #1d4ed8;
		background: rgba(59, 130, 246, 0.12);
		text-decoration: underline;
		text-underline-offset: 0.14em;
		font-weight: 700;
	}

	.help-page :global(a.help-inline-link:hover),
	.help-page :global(a.help-inline-link:focus-visible) {
		background: rgba(59, 130, 246, 0.2);
		outline: none;
	}

	.external-help-link {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.16rem 0.45rem;
		border-radius: 0.5rem;
		color: #1d4ed8;
		background: rgba(59, 130, 246, 0.1);
		text-decoration: underline;
		text-underline-offset: 0.16em;
		font-weight: 700;
	}

	.external-help-link::after {
		content: '↗';
		font-size: 0.9em;
		line-height: 1;
	}

	.external-help-link:hover,
	.external-help-link:focus-visible {
		background: rgba(59, 130, 246, 0.18);
		outline: none;
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
