import { beforeEach, describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';

const initFarertMock = vi.fn();
const decompressMock = vi.fn();
const gotoMock = vi.fn();

vi.mock('$lib/wasm', () => ({
	initFarert: () => initFarertMock()
}));

vi.mock('$lib/utils/urlRoute', () => ({
	decompressRouteFromUrl: (...args: unknown[]) => decompressMock(...args)
}));

vi.mock('$app/navigation', () => ({
	goto: (...args: unknown[]) => gotoMock(...args)
}));

vi.mock('$app/paths', () => ({
	base: '/farert-pwa'
}));

const { default: DetailPage } = await import('./+page.svelte');

	describe('/detail/+page.svelte', () => {
		beforeEach(() => {
			initFarertMock.mockReset();
			decompressMock.mockReset();
			gotoMock.mockReset();
			initFarertMock.mockResolvedValue(undefined);
			vi.unstubAllGlobals();
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

		const heading = page.getByRole('heading', { name: '運賃詳細' });
		await expect.element(heading).toBeInTheDocument();

		const fare = page.getByText('¥8,910');
		await expect.element(fare).toBeInTheDocument();

		const message = page.getByText('テストメッセージ');
		await expect.element(message).toBeInTheDocument();

		await page.getByRole('button', { name: '結果エクスポート' }).click();
		const exportText = page.getByTestId('fare-export-text');
		await expect.element(exportText).toHaveTextContent('FARE_EXPORT_TEXT');
	});

	it('uses beginStation and endStation from FareInfo when available', async () => {
		const fakeRoute = {
			routeScript: () => '東京都心,東海道線,熱海',
			departureStationName: () => '東京',
			arrivevalStationName: () => '熱海',
			showFare: () => 'EXPORT_CITY_INFO',
			getFareInfoObjectJson: () =>
				JSON.stringify({
					fare: 1980,
					totalSalesKm: 1200,
					ticketAvailDays: 2,
					beginStation: '都区内',
					endStation: '勝田',
					messages: [],
					isMeihanCityStartTerminalEnable: false
				}),
			getRoutesJson: () => JSON.stringify([{ line: '東海道線', station: '熱海' }])
		};
		decompressMock.mockReturnValue(fakeRoute);

		render(DetailPage, { initialCompressedRoute: 'encoded-city-info' });

		await expect.element(page.getByRole('heading', { name: '運賃詳細' })).toBeInTheDocument();
		await expect.element(page.getByText('都区内 → 勝田')).toBeInTheDocument();
	});

	it('displays kilometer, fare and route details from FareInfo', async () => {
		const fakeRoute = {
			routeScript: () => '長津田,横浜線,東神奈川,東海道線,富士,身延線,国母',
			departureStationName: () => '長津田',
			arrivevalStationName: () => '国母',
			showFare: () => 'EXPORT_SAMPLE',
			getFareInfoObjectJson: () =>
				JSON.stringify({
					fareResultCode: 0,
					totalSalesKm: 2183,
					jrSalesKm: 2183,
					jrCalcKm: 2264,
					salesKmForEast: 955,
					isRule114Applied: true,
					rule114SalesKm: 2005,
					rule114CalcKm: 2088,
					rule114ApplyTerminal: '甲斐住吉',
					fare: 3810,
					farePriorRule114: 4170,
					roundTripFareWithCompanyLine: 7620,
					roundTripFareWithCompanyLinePriorRule114: 8340,
					childFare: 1900,
					roundtripChildFare: 3800,
					isAcademicFare: true,
					academicFare: 3040,
					roundtripAcademicFare: 6080,
					stockDiscounts: [
						{
							stockDiscountTitle: 'JR東海株主優待',
							stockDiscountFare: 3400,
							rule114StockFare: 3600
						}
					],
					messages: ['旅客営業取扱基準規程第114条適用営業キロ計算駅:甲斐住吉'],
					ticketAvailDays: 3,
					routeList: '[横浜線]東神奈川[東海道線]富士[身延線]国母',
					routeListForTOICA: ''
				}),
			getRoutesJson: () =>
				JSON.stringify([
					{ line: '横浜線', station: '東神奈川' },
					{ line: '東海道線', station: '富士' },
					{ line: '身延線', station: '国母' }
				])
		};
		decompressMock.mockReturnValue(fakeRoute);

		render(DetailPage, { initialCompressedRoute: 'encoded' });

		await expect.element(page.getByRole('heading', { name: '運賃詳細' })).toBeInTheDocument();
		await expect.element(page.getByText('キロ程')).toBeInTheDocument();
		const kilometerSection = page.getByRole('heading', { name: 'キロ程' }).locator('..');
		await expect.element(kilometerSection.getByText('218.3km').first()).toBeInTheDocument();
		await expect.element(kilometerSection.getByText('218.3km').nth(1)).toBeInTheDocument();
		await expect.element(kilometerSection.getByText('226.4km')).toBeInTheDocument();
		await expect.element(kilometerSection.getByText('95.5km')).toBeInTheDocument();
		await expect
			.element(kilometerSection.getByText('規程114条適用 営業キロ / 計算キロ'))
			.toBeInTheDocument();
		await expect.element(kilometerSection.getByText('200.5km / 208.8km')).toBeInTheDocument();
		await expect.element(page.getByRole('heading', { name: '運賃' })).toBeInTheDocument();
		await expect.element(page.getByText('¥3,810')).toBeInTheDocument();
		await expect.element(page.getByText('¥7,620')).toBeInTheDocument();
		await expect.element(page.getByText('¥4,170')).toBeInTheDocument();
		await expect.element(page.getByText('¥8,340')).toBeInTheDocument();
		await expect.element(page.getByText('¥1,900')).toBeInTheDocument();
		await expect.element(page.getByText('¥3,800')).toBeInTheDocument();
		await expect.element(page.getByText('¥3,040')).toBeInTheDocument();
		await expect.element(page.getByText('¥6,080')).toBeInTheDocument();
		await expect
			.element(page.getByText('株主優待運賃（JR東海株主優待）'))
			.toBeInTheDocument();
		await expect.element(page.getByText('¥3,400')).toBeInTheDocument();
		await expect.element(page.getByText('規程114条適用前: ¥3,600')).toBeInTheDocument();
		await expect
			.element(page.getByText('規程114条適用前（往復運賃）'))
			.toBeInTheDocument();
		await expect.element(page.getByText('有効日数')).toBeInTheDocument();
		await expect.element(page.getByText('3日間')).toBeInTheDocument();
		await expect.element(page.getByText('途中下車できます')).toBeInTheDocument();
		await expect
			.element(page.getByText('[横浜線]東神奈川[東海道線]富士[身延線]国母'))
			.toBeInTheDocument();
		await expect
			.element(page.getByText('旅客営業取扱基準規程第114条適用営業キロ計算駅:甲斐住吉'))
			.toBeInTheDocument();
		await page.getByRole('button', { name: '結果エクスポート' }).click();
		await expect.element(page.getByTestId('fare-export-text')).toHaveTextContent('EXPORT_SAMPLE');
	});

	it('replaces option menu item with city-station toggles and recalculates', async () => {
		let startAsCity = false;
		let arrivalAsCity = false;
		const setStartAsCityMock = vi.fn(() => {
			startAsCity = true;
			arrivalAsCity = false;
		});
		const setArrivalAsCityMock = vi.fn(() => {
			startAsCity = false;
			arrivalAsCity = true;
		});
		const fakeRoute = {
			routeScript: () => '東京,東海道線,熱海',
			departureStationName: () => '東京',
			arrivevalStationName: () => '熱海',
			showFare: () => 'EXPORT_CITY',
			setStartAsCity: () => setStartAsCityMock(),
			setArrivalAsCity: () => setArrivalAsCityMock(),
			getFareInfoObjectJson: () =>
				JSON.stringify({
					fareResultCode: 0,
					totalSalesKm: 1200,
					jrSalesKm: 1200,
					jrCalcKm: 1200,
					fare: 1980,
					ticketAvailDays: 2,
					routeList: '[東海道線]熱海',
					routeListForTOICA: '',
					isMeihanCityStartTerminalEnable: true,
					isBeginInCity: startAsCity,
					isEndInCity: arrivalAsCity,
					messages: []
				}),
			getRoutesJson: () => JSON.stringify([{ line: '東海道線', station: '熱海' }])
		};
		decompressMock.mockReturnValue(fakeRoute);

		render(DetailPage, { initialCompressedRoute: 'encoded-city' });

		await expect.element(page.getByText('途中下車できます')).toBeInTheDocument();

		await page.getByRole('button', { name: 'メニュー' }).click();
		await expect.element(page.getByRole('menuitem', { name: '発駅を単駅にする' })).toBeInTheDocument();
		await expect.element(page.getByRole('menuitem', { name: '着駅を単駅にする' })).toBeInTheDocument();
		await expect.element(page.getByRole('menuitem', { name: 'オプション' })).not.toBeInTheDocument();

		await page.getByRole('menuitem', { name: '発駅を単駅にする' }).click();
		expect(setStartAsCityMock).toHaveBeenCalledTimes(1);
		await expect
			.element(page.getByText('発着駅の都区市内を除き途中下車できます'))
			.toBeInTheDocument();

		await page.getByRole('button', { name: 'メニュー' }).click();
		await page.getByRole('menuitem', { name: '着駅を単駅にする' }).click();
		expect(setArrivalAsCityMock).toHaveBeenCalledTimes(1);
		await expect
			.element(page.getByText('発着駅の都区市内を除き途中下車できます'))
			.toBeInTheDocument();
	});

	it('copies fare export text when export button is clicked', async () => {
		const writeTextMock = vi.fn(async () => undefined);
		vi.stubGlobal('navigator', { clipboard: { writeText: writeTextMock } });
		const fakeRoute = {
			routeScript: () => '東京,東海道線,熱海',
			departureStationName: () => '東京',
			arrivevalStationName: () => '熱海',
			showFare: () => 'EXPORT_FOR_CLIPBOARD',
			getFareInfoObjectJson: () =>
				JSON.stringify({
					fareResultCode: 0,
					fare: 1980,
					totalSalesKm: 1045,
					ticketAvailDays: 2,
					messages: []
				})
		};
		decompressMock.mockReturnValue(fakeRoute);

		render(DetailPage, { initialCompressedRoute: 'encoded-copy' });
		await page.getByRole('button', { name: '結果エクスポート' }).click();

		expect(writeTextMock).toHaveBeenCalledTimes(1);
		expect(writeTextMock).toHaveBeenCalledWith('EXPORT_FOR_CLIPBOARD');
	});

	it('shares URL with base path', async () => {
		const shareMock = vi.fn(async () => undefined);
		vi.stubGlobal('navigator', { share: shareMock });
		const fakeRoute = {
			routeScript: () => '東京,東海道線,熱海',
			departureStationName: () => '東京',
			arrivevalStationName: () => '熱海',
			showFare: () => 'EXPORT_FOR_SHARE',
			getFareInfoObjectJson: () =>
				JSON.stringify({
					fareResultCode: 0,
					fare: 1980,
					totalSalesKm: 1045,
					ticketAvailDays: 2,
					messages: []
				})
		};
		decompressMock.mockReturnValue(fakeRoute);

		render(DetailPage, { initialCompressedRoute: 'encoded-share' });
		await page.getByRole('button', { name: '共有' }).click();

		expect(shareMock).toHaveBeenCalledTimes(1);
		expect(shareMock).toHaveBeenCalledWith(
			expect.objectContaining({
				url: expect.stringContaining('/farert-pwa/detail?r=encoded-share')
			})
		);
	});
});
