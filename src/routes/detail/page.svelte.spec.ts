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
			showFare: () => 'FARE_EXPORT_TEXT',
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

		const message = page.getByText('テストメッセージ');
		await expect.element(message).toBeInTheDocument();

		const exportText = page.getByTestId('fare-export-text');
		await expect.element(exportText).toHaveTextContent('FARE_EXPORT_TEXT');
	});

	it('displays kilometer, fare and route details from FareInfo', async () => {
		const fakeRoute = {
			routeScript: () => '柏木平,陸羽東線,鳴子温泉,陸羽街道,新庄',
			departureStationName: () => '柏木平',
			arrivevalStationName: () => '阿知須',
			showFare: () => 'EXPORT_SAMPLE',
			getFareInfoObjectJson: () =>
				JSON.stringify({
					fareResultCode: 0,
					totalSalesKm: 1454.7,
					jrCalcKm: 1484.3,
					fare: 16610,
					roundTripFareWithCompanyLine: 29880,
					childFare: 8300,
					academicFare: 13280,
					messages: ['規程114条を適用しました'],
					ticketAvailDays: 9,
					routeList: '[陸羽東線]鳴子温泉[陸羽街道]新庄',
					routeListForTOICA: '[陸羽東線]鳴子温泉'
				}),
			getRoutesJson: () =>
				JSON.stringify([
					{ line: '陸羽東線', station: '鳴子温泉' },
					{ line: '陸羽街道', station: '新庄' }
				])
		};
		decompressMock.mockReturnValue(fakeRoute);

		render(DetailPage, { initialCompressedRoute: 'encoded' });

		await expect.element(page.getByRole('heading', { name: '柏木平 → 阿知須' })).toBeInTheDocument();
		await expect.element(page.getByText('キロ程')).toBeInTheDocument();
		await expect.element(page.getByText('1,454.7km')).toBeInTheDocument();
		await expect.element(page.getByRole('heading', { name: '運賃' })).toBeInTheDocument();
		await expect.element(page.getByText('¥16,610')).toBeInTheDocument();
		await expect.element(page.getByText('¥29,880')).toBeInTheDocument();
		await expect.element(page.getByText('有効日数')).toBeInTheDocument();
		await expect.element(page.getByText('9日間')).toBeInTheDocument();
		await expect
			.element(page.getByText('[陸羽東線]鳴子温泉[陸羽街道]新庄'))
			.toBeInTheDocument();
		await expect.element(page.getByText('規程114条を適用しました')).toBeInTheDocument();
		await expect.element(page.getByTestId('fare-export-text')).toHaveTextContent('EXPORT_SAMPLE');
	});
});
