import { beforeEach, describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';

const initFarertMock = vi.fn();
const decompressMock = vi.fn();

vi.mock('$lib/wasm', () => ({
	initFarert: () => initFarertMock()
}));

vi.mock('$lib/utils/urlRoute', () => ({
	decompressRouteFromUrl: (...args: unknown[]) => decompressMock(...args)
}));

const { default: DetailPage } = await import('./+page.svelte');

describe('/detail/+page.svelte', () => {
	beforeEach(() => {
		initFarertMock.mockReset();
		decompressMock.mockReset();
		initFarertMock.mockResolvedValue(undefined);
	});

	it('shows an error when route parameter is missing', async () => {
		render(DetailPage);

		const errorMessage = page.getByText('経路データが指定されていません。');
		await expect.element(errorMessage).toBeInTheDocument();
	});

	it('renders route summary when data is provided', async () => {
		const fakeRoute = {
			routeScript: () => '東京,東海道新幹線,新大阪',
			departureStationName: () => '東京',
			arrivevalStationName: () => '新大阪',
			getFareInfoObjectJson: () =>
				JSON.stringify({
					fare: 8910,
					totalSalesKm: 552.6,
					ticketAvailDays: 3,
					messages: ['テストメッセージ']
				})
		};
		decompressMock.mockReturnValue(fakeRoute);

		render(DetailPage, { initialCompressedRoute: 'dummy' });

		const heading = page.getByRole('heading', { name: '東京 → 新大阪' });
		await expect.element(heading).toBeInTheDocument();

		const fare = page.getByText('¥8,910');
		await expect.element(fare).toBeInTheDocument();

		const message = page.getByText('テストメッセージ').first();
		await expect.element(message).toBeInTheDocument();
	});
});
