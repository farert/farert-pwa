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
			.element(page.getByRole('heading', { name: '画面別の操作マニュアル' }))
			.toBeInTheDocument();
		await expect.element(page.getByText('/terminal-selection')).toBeInTheDocument();
		await expect.element(page.getByText('/route-station-select')).toBeInTheDocument();
		await expect.element(page.getByText('/detail')).toBeInTheDocument();
		await expect.element(page.getByRole('button', { name: '閉じる' })).toBeInTheDocument();
	});

	it('よくある質問と外部サイト導線を表示する', async () => {
		render(HelpPage);

		await expect.element(page.getByRole('heading', { name: 'よくある質問' })).toBeInTheDocument();
		await expect
			.element(page.getByText('結果が想定と違う場合はどうすればよいですか？'))
			.toBeInTheDocument();
		await expect
			.element(page.getByRole('link', { name: '経路運賃キロ計算アプリの使い方〜目次' }))
			.toHaveAttribute('href', 'https://farert.blogspot.com/2017/03/blog-post_54.html');
	});
});
