import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';

const initFarertMock = vi.fn().mockResolvedValue(undefined);
const databaseInfoMock = vi.fn();

vi.mock('$lib/wasm', () => ({
	initFarert: () => initFarertMock(),
	databaseInfo: () => databaseInfoMock()
}));

vi.mock('$lib/version', () => ({
	APP_VERSION: '25.11.0-alpha',
	BUILD_AT: '2024-03-02T01:02:03Z',
	GIT_COMMIT_AT: '2024-03-01T12:34:56Z',
	GIT_SHA: 'abc1234'
}));

const { default: VersionPage } = await import('./+page.svelte');

describe('/version/+page.svelte', () => {
	beforeEach(() => {
		initFarertMock.mockClear();
		databaseInfoMock.mockReset();
		databaseInfoMock.mockReturnValue(
			JSON.stringify({ name: '2023年10月改正', create_date: '2023-10-01', tax: 10 })
		);
	});

	it('renders app version, db info, and change history link', async () => {
		render(VersionPage);

		await expect.element(page.getByText(/Farert /i)).toBeInTheDocument();
		await expect.element(page.getByText('ビルド日時: 2024/03/02 10:02:03')).toBeInTheDocument();
		await expect
			.element(page.getByText('コミット: 2024/03/01 21:34:56 (abc1234)'))
			.toBeInTheDocument();
		await expect.element(page.getByText('DB Rev. [2023年10月改正] (2023-10-01)')).toBeInTheDocument();
		await expect.element(page.getByText('消費税: 10%')).toBeInTheDocument();
		await expect
			.element(page.getByRole('link', { name: '変更履歴' }))
			.toHaveAttribute('href', 'https://github.com/farert/farert-pwa/commits/main/');
		await expect.element(page.getByRole('link', { name: 'README.md' })).toHaveClass(/doc-link/);
		await expect.element(page.getByRole('link', { name: 'LICENSE' })).toHaveClass(/doc-link/);
		await expect.element(page.getByRole('link', { name: '変更履歴' })).toHaveClass(/doc-link/);
	});

	it('renders tax rate from runtime database info payload', async () => {
		databaseInfoMock.mockReturnValue(
			JSON.stringify({ dbName: '2025', createdate: '2025-11-12 13:11:18', tax: 10 })
		);

		render(VersionPage);

		await expect.element(page.getByText('消費税: 10%')).toBeInTheDocument();
	});
});
