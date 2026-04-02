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

		await expect.element(page.getByText('運賃詳細')).toBeInTheDocument();

		const fare = page.getByText('¥8,910');
		await expect.element(fare).toBeInTheDocument();

		const message = page.getByText('テストメッセージ');
		await expect.element(message).toBeInTheDocument();

		await page.getByRole('button', { name: '結果エクスポート' }).click();
		const exportText = page.getByTestId('fare-export-text');
		await expect
			.element(exportText)
			.toHaveTextContent(/FARE_EXPORT_TEXT\[指定経路\]\s+東京,東海道新幹線,新大阪/);
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

		await expect.element(page.getByText('運賃詳細')).toBeInTheDocument();
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

		await expect.element(page.getByText('運賃詳細')).toBeInTheDocument();
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
		await expect
			.element(page.getByTestId('fare-export-text'))
			.toHaveTextContent(
				/EXPORT_SAMPLE\[指定経路\]\s+長津田,横浜線,東神奈川,東海道線,富士,身延線,国母/
			);
	});

	it('toggles city-station option and recalculates', async () => {
		let startAsCity = false;
		let arrivalAsCity = false;
		const setArrivalAsCityMock = vi.fn(() => {
			startAsCity = false;
			arrivalAsCity = true;
		});
		const setStartAsCityMock = vi.fn(() => {
			startAsCity = true;
			arrivalAsCity = false;
		});
		const fakeRoute = {
			routeScript: () => '東京,東海道線,熱海',
			departureStationName: () => '東京',
			arrivevalStationName: () => '熱海',
			showFare: () => 'EXPORT_CITY',
			setArrivalAsCity: () => setArrivalAsCityMock(),
			setStartAsCity: () => setStartAsCityMock(),
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
					isMeihanCityTerminal: false,
					isFareOptEnabled: true,
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
		await expect.element(page.getByRole('menuitem', { name: '発駅を単駅指定' })).toBeInTheDocument();

		await page.getByRole('menuitem', { name: '発駅を単駅指定' }).click();
		expect(setArrivalAsCityMock).toHaveBeenCalledTimes(1);
		await expect
			.element(page.getByText('発着駅の都区市内を除き途中下車できます'))
			.toBeInTheDocument();
	});

	it('does not show fare option menu items when option control is disabled', async () => {
		const fakeRoute = {
			routeScript: () => '東京,東海道線,熱海',
			departureStationName: () => '東京',
			arrivevalStationName: () => '熱海',
			showFare: () => 'EXPORT_DISABLED_OPTION',
			getFareInfoObjectJson: () =>
				JSON.stringify({
					fareResultCode: 0,
					fare: 1980,
					totalSalesKm: 1200,
					ticketAvailDays: 2,
					isFareOptEnabled: false,
					isMeihanCityStartTerminalEnable: true,
					isMeihanCityTerminal: false,
					messages: []
				}),
			getRoutesJson: () => JSON.stringify([{ line: '東海道線', station: '熱海' }])
		};
		decompressMock.mockReturnValue(fakeRoute);

		render(DetailPage, { initialCompressedRoute: 'encoded-no-options' });

		await page.getByRole('button', { name: 'メニュー' }).click();
		await expect.element(page.getByRole('menuitem', { name: '発駅を単駅指定' })).not.toBeInTheDocument();
		await expect.element(page.getByRole('menuitem', { name: '着駅を単駅指定' })).not.toBeInTheDocument();
		await expect.element(page.getByRole('menuitem', { name: 'オプション' })).not.toBeInTheDocument();
	});

	it('shows fare option menu when isFareOptEnabled is omitted but option flag is available', async () => {
		const fakeRoute = {
			routeScript: () => '大高,東海道線,大阪,大阪環状線,天王寺,阪和線,杉本町',
			departureStationName: () => '大高',
			arrivevalStationName: () => '杉本町',
			showFare: () => 'EXPORT_MEIHAN',
			setArrivalAsCity: vi.fn(),
			getFareInfoObjectJson: () =>
				JSON.stringify({
					fareResultCode: 0,
					fare: 1980,
					totalSalesKm: 1200,
					ticketAvailDays: 2,
					isMeihanCityStartTerminalEnable: true,
					isMeihanCityTerminal: false,
					messages: []
				}),
			getRoutesJson: () =>
				JSON.stringify([
					{ line: '東海道線', station: '大阪' },
					{ line: '大阪環状線', station: '天王寺' },
					{ line: '阪和線', station: '杉本町' }
				])
		};
		decompressMock.mockReturnValue(fakeRoute);

		render(DetailPage, { initialCompressedRoute: 'encoded-meihan-legacy' });

		await page.getByRole('button', { name: 'メニュー' }).click();
		await expect.element(page.getByRole('menuitem', { name: '発駅を単駅指定' })).toBeInTheDocument();
		await expect.element(page.getByRole('menuitem', { name: 'バージョン情報' })).toBeInTheDocument();
	});

	it('shows fare options for legacy route output including fare opt flags', async () => {
		let noRuleCalled = 0;
		let arrivalAsCityCalled = 0;
		let startAsCityCalled = 0;
		const fakeRoute = {
			routeScript: () => '大高,東海道線,大阪,大阪環状線,天王寺,阪和線,杉本町',
			departureStationName: () => '大高',
			arrivevalStationName: () => '杉本町',
			showFare: () => 'EXPORT_LEGACY_FLAGS',
			setNoRule: () => noRuleCalled++,
			setArrivalAsCity: () => arrivalAsCityCalled++,
			setStartAsCity: () => startAsCityCalled++,
			getFareInfoObjectJson: () =>
				JSON.stringify({
					fareResultCode: 0,
					fare: 3740,
					totalSalesKm: 2028,
					ticketAvailDays: 3,
					isMeihanCityStartTerminalEnable: true,
					isMeihanCityTerminal: true,
					isRuleAppliedEnable: true,
					isRuleApplied: true,
					isFareOptEnabled: true
				}),
			getRoutesJson: () =>
				JSON.stringify([
					{ line: '東海道線', station: '大阪' },
					{ line: '大阪環状線', station: '天王寺' },
					{ line: '阪和線', station: '杉本町' }
				])
		};
		decompressMock.mockReturnValue(fakeRoute);

		render(DetailPage, { initialCompressedRoute: 'encoded-legacy-json' });

		await page.getByRole('button', { name: 'メニュー' }).click();
		const terminalMenu = page.getByRole('menuitem', { name: '着駅を単駅指定' });
		const ruleMenu = page.getByRole('menuitem', { name: '特例を適用しない' });
		await expect.element(terminalMenu).toBeInTheDocument();
		await expect.element(ruleMenu).toBeInTheDocument();

		await terminalMenu.click();
		expect(arrivalAsCityCalled).toBe(0);
		expect(startAsCityCalled).toBe(1);
		expect(noRuleCalled).toBe(0);
		await page.getByRole('button', { name: 'メニュー' }).click();
		await ruleMenu.click();
		expect(noRuleCalled).toBe(1);
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
		expect(writeTextMock).toHaveBeenCalledWith(
			'EXPORT_FOR_CLIPBOARD[指定経路]\n東京,東海道線,熱海'
		);
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
