/**
 * ヘルプ画面の主要セクション表示を検証するテストです。
 * スクリーンショット、FAQ、外部リンク導線が表示されることを固定します。
 */
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';

const gotoMock = vi.fn();

vi.mock('$app/navigation', () => ({
	goto: (...args: unknown[]) => gotoMock(...args)
}));

const { default: HelpPage } = await import('./+page.svelte');

describe('/help/+page.svelte', () => {
	it('操作マニュアルの主要セクションを表示する', async () => {
		render(HelpPage);

		await expect.element(page.getByRole('heading', { name: 'ヘルプ' })).toBeInTheDocument();
		await expect
			.element(page.getByRole('heading', { name: 'メイン画面の各部' }))
			.toBeInTheDocument();
		await expect
			.element(page.getByRole('img', { name: 'メイン画面のスクリーンショット', exact: true }))
			.toHaveAttribute('src', '/help/main-screen.png');
		await expect
			.element(page.getByRole('heading', { name: '下部ツールバー' }))
			.toBeInTheDocument();
		await expect.element(page.getByRole('columnheader', { name: 'アイコン' })).toBeInTheDocument();
		await expect.element(page.getByRole('columnheader', { name: '説明' })).toBeInTheDocument();
		await expect.element(page.getByText('戻る', { exact: true })).toBeInTheDocument();
		await expect.element(page.getByText('ページ先頭までスクロールします。')).toBeInTheDocument();
		await expect
			.element(page.getByRole('heading', { name: '画面別の操作マニュアル' }))
			.toBeInTheDocument();
		await expect
			.element(page.getByRole('link', { name: '発駅', exact: true }))
			.toHaveAttribute('href', '#terminal-selection-manual');
		await expect
			.element(page.getByRole('link', { name: '保存画面を開き', exact: true }).first())
			.toHaveAttribute('href', '#archive-manual');
		await expect
			.element(page.getByRole('img', { name: '発着駅選択画面のスクリーンショット', exact: true }))
			.toHaveAttribute('src', '/help/terminal-selection.png');
		await expect
			.element(page.getByRole('img', { name: '路線選択画面のスクリーンショット', exact: true }))
			.toHaveAttribute('src', '/help/line-selection.png');
		await expect
			.element(page.getByRole('link', { name: '次の駅を選ぶ画面へ進みます', exact: true }))
			.toHaveAttribute('href', '#station-selection-manual');
		await expect
			.element(page.getByRole('img', { name: '駅選択画面のスクリーンショット', exact: true }))
			.toHaveAttribute('src', '/help/route-station-select.png');
		await expect
			.element(page.getByRole('img', { name: '運賃詳細画面のスクリーンショット', exact: true }))
			.toHaveAttribute('src', '/help/detail.png');
		await expect
			.element(page.getByRole('img', { name: '保存画面のスクリーンショット', exact: true }))
			.toHaveAttribute('src', '/help/save.png');
		await expect
			.element(page.getByRole('heading', { name: '保存画面の使い方' }))
			.toBeInTheDocument();
		await expect
			.element(page.getByRole('img', { name: '保存画面全体のスクリーンショット', exact: true }))
			.toHaveAttribute('src', '/help/save.png');
		await expect
			.element(page.getByRole('img', { name: '保存画面のインポートダイアログ', exact: true }))
			.toHaveAttribute('src', '/help/save-import-dialog.png');
		await expect
			.element(page.getByRole('img', { name: '保存画面のエクスポートダイアログ', exact: true }))
			.toHaveAttribute('src', '/help/save-export-dialog.png');
		await expect
			.element(page.getByRole('heading', { name: 'バックアップとレストア' }))
			.toBeInTheDocument();
		await expect
			.element(page.getByRole('img', { name: 'バックアップとレストア画面', exact: true }))
			.toHaveAttribute('src', '/help/bkuprestore.png');
	await expect
		.element(page.getByText('現在経路、保存済み経路、きっぷホルダ、駅履歴をまとめてファイルへ保存できます。'))
		.toBeInTheDocument();
		await expect.element(page.getByRole('button', { name: '閉じる' })).toBeInTheDocument();
	});

	it('不具合報告・問い合わせと外部サイト導線を表示する', async () => {
		render(HelpPage);

		await expect.element(page.getByRole('heading', { name: '不具合報告・問い合わせ' })).toBeInTheDocument();
		await expect
			.element(page.getByText('不具合や質問を送る'))
			.toBeInTheDocument();
		await expect
			.element(page.getByRole('link', { name: '不具合報告・問い合わせフォームを開く' }))
			.toHaveAttribute(
				'href',
				'https://nostalgic-wasabi-423.notion.site/28edffbd711a801ba33edaf258af9562'
			);
		await expect
			.element(page.getByRole('link', { name: '経路運賃キロ計算アプリの使い方〜目次' }))
			.toHaveAttribute('href', 'https://farert.blogspot.com/2017/03/blog-post_54.html');
	});
});
