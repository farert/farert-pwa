import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';

const initFarertMock = vi.fn().mockResolvedValue(undefined);
const databaseInfoMock = vi.fn();

vi.mock('$lib/wasm', () => ({
	initFarert: () => initFarertMock(),
	databaseInfo: () => databaseInfoMock()
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

	it('renders app version and db info', async () => {
		render(VersionPage);

		await expect.element(page.getByText(/Farert /i)).toBeInTheDocument();
		await expect.element(page.getByText('DB Rev. [2023年10月改正] (2023-10-01)')).toBeInTheDocument();
		await expect.element(page.getByText('消費税: 10%')).toBeInTheDocument();
	});
});
