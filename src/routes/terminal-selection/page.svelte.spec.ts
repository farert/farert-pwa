import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import { get, writable, type Writable } from 'svelte/store';
import type { FaretClass } from '$lib/wasm/types';

class MockFarert implements FaretClass {
	script = '';
	autoRouteMock = vi.fn<[number, string], number>();

	addStartRoute(station: string): number {
		this.script = station;
		return 0;
	}

	addRoute(): number {
		return 0;
	}

	autoRoute(useBulletTrain: number, destination: string): number {
		const result = this.autoRouteMock(useBulletTrain, destination);
		if (result === 0 || result === undefined) {
			if (!this.script) return -1;
			this.script += `,AUTO,${destination}`;
			return 0;
		}
		return result;
	}

	getRouteCount(): number {
		return 0;
	}

	departureStationName(): string {
		return this.script;
	}

	arrivevalStationName(): string {
		return this.script;
	}

	buildRoute(routeStr: string): number {
		this.script = routeStr;
		return 0;
	}

	routeScript(): string {
		return this.script;
	}

	removeAll(): void {
		this.script = '';
	}

	removeTail(): void {
		return;
	}

	reverse(): number {
		return 0;
	}

	assign(): void {
		return;
	}

	typeOfPassedLine(): number {
		return 0;
	}

	setDetour(): number {
		return 0;
	}

	setNoRule(): void {
		return;
	}

	showFare(): string {
		return '';
	}

	setLongRoute(): void {
		return;
	}

	setJrTokaiStockApply(): void {
		return;
	}

	setStartAsCity(): void {
		return;
	}

	setArrivalAsCity(): void {
		return;
	}

	setSpecificTermRule115(): void {
		return;
	}

	isNotSameKokuraHakataShinZai(): boolean {
		return true;
	}

	isAvailableReverse(): boolean {
		return true;
	}

	isOsakakanDetourEnable(): boolean {
		return true;
	}

	isOsakakanDetour(): boolean {
		return false;
	}

	setNotSameKokuraHakataShinZai(): void {
		return;
	}

	getFareInfoObjectJson(): string {
		return '{}';
	}

	getRoutesJson(): string {
		return '[]';
	}

	getRouteRecord(): string {
		return this.script;
	}
}

const gotoMock = vi.fn();

vi.mock('$app/navigation', () => ({
	goto: (...args: unknown[]) => gotoMock(...args)
}));

const wasmApi = {
	initFarert: vi.fn<[], Promise<void>>(),
	getCompanys: vi.fn<[], string>(),
	getPrefects: vi.fn<[], string>(),
	getLinesByCompany: vi.fn<[string], string>(),
	getLinesByPrefect: vi.fn<[string], string>(),
	getStationsByLine: vi.fn<[string], string>(),
	getStationsByCompanyAndLine: vi.fn<[string, string], string>(),
	getStationsByPrefectureAndLine: vi.fn<[string, string], string>(),
	searchStationFuzzy: vi.fn<[string, number], string>(),
	getKanaByStation: vi.fn<[string], string>(),
	getPrefectureByStation: vi.fn<[string], string>(),
	getLinesByStation: vi.fn<[string], string>(),
	executeSql: vi.fn<[string], string>()
};

vi.mock('$lib/wasm', () => ({
	initFarert: () => wasmApi.initFarert(),
	Farert: MockFarert,
	getCompanys: () => wasmApi.getCompanys(),
	getPrefects: () => wasmApi.getPrefects(),
	getLinesByCompany: (company: string) => wasmApi.getLinesByCompany(company),
	getLinesByPrefect: (prefecture: string) => wasmApi.getLinesByPrefect(prefecture),
	getStationsByLine: (line: string) => wasmApi.getStationsByLine(line),
	getStationsByCompanyAndLine: (company: string, line: string) =>
		wasmApi.getStationsByCompanyAndLine(company, line),
	getStationsByPrefectureAndLine: (prefecture: string, line: string) =>
		wasmApi.getStationsByPrefectureAndLine(prefecture, line),
	searchStationFuzzy: (keyword: string, limit: number) => wasmApi.searchStationFuzzy(keyword, limit),
	getKanaByStation: (station: string) => wasmApi.getKanaByStation(station),
	getPrefectureByStation: (station: string) => wasmApi.getPrefectureByStation(station),
	getLinesByStation: (station: string) => wasmApi.getLinesByStation(station),
	executeSql: (sql: string) => wasmApi.executeSql(sql)
}));

const mainRouteStore: Writable<FaretClass | null> = writable(null);
const stationHistoryStore: Writable<string[]> = writable([]);
const mainScreenErrorMessageStore: Writable<string> = writable('');
const addToStationHistorySpy = vi.fn((station: string) => {
	stationHistoryStore.update((history) => {
		const filtered = history.filter((item) => item !== station);
		return [station, ...filtered].slice(0, 100);
	});
});

vi.mock('$lib/stores', () => ({
	mainRoute: mainRouteStore,
	mainScreenErrorMessage: mainScreenErrorMessageStore,
	stationHistory: stationHistoryStore,
	addToStationHistory: (station: string) => addToStationHistorySpy(station)
}));

const { default: TerminalSelectionPage } = await import('./+page.svelte');

describe('/terminal-selection/+page.svelte', () => {
	beforeEach(() => {
		vi.unstubAllGlobals();
		Object.defineProperty(window, 'innerWidth', {
			configurable: true,
			value: 640
		});
		Object.defineProperty(window, 'innerHeight', {
			configurable: true,
			value: 1024
		});
		gotoMock.mockReset();
		addToStationHistorySpy.mockClear();
		mainRouteStore.set(null);
		mainScreenErrorMessageStore.set('');
		stationHistoryStore.set([]);
		wasmApi.initFarert.mockReset();
		wasmApi.getCompanys.mockReset();
		wasmApi.getPrefects.mockReset();
		wasmApi.getLinesByCompany.mockReset();
		wasmApi.getLinesByPrefect.mockReset();
		wasmApi.getStationsByLine.mockReset();
		wasmApi.getStationsByCompanyAndLine.mockReset();
		wasmApi.getStationsByPrefectureAndLine.mockReset();
		wasmApi.searchStationFuzzy.mockReset();
		wasmApi.getKanaByStation.mockReset();
		wasmApi.getPrefectureByStation.mockReset();
		wasmApi.getLinesByStation.mockReset();
		wasmApi.executeSql.mockReset();

		wasmApi.initFarert.mockResolvedValue(undefined);
		wasmApi.getCompanys.mockReturnValue(JSON.stringify(['JR東日本', 'JR西日本']));
		wasmApi.getPrefects.mockReturnValue(JSON.stringify(['宮城県', '東京都']));
		wasmApi.getLinesByCompany.mockImplementation((company: string) => {
			if (company === 'JR東日本') return JSON.stringify(['東北新幹線']);
			return JSON.stringify(['山陽本線']);
		});
		wasmApi.getLinesByPrefect.mockImplementation((prefecture: string) => {
			if (prefecture === '宮城') return JSON.stringify(['仙山線']);
			return JSON.stringify(['中央線']);
		});
		wasmApi.getStationsByLine.mockImplementation((line: string) => {
			if (line === '仙山線') {
				return JSON.stringify(['北仙台', '品川']);
			}
			if (line === '東北新幹線') {
				return JSON.stringify(['仙台', '盛岡']);
			}
			return JSON.stringify(['立川']);
		});
		wasmApi.getStationsByCompanyAndLine.mockImplementation((company: string, line: string) => {
			if (company === 'JR東日本' && line === '東北新幹線') {
				return JSON.stringify(['仙台', '盛岡']);
			}
			return JSON.stringify(['姫路']);
		});
		wasmApi.getStationsByPrefectureAndLine.mockImplementation((prefecture: string, line: string) => {
			if (prefecture === '宮城' && line === '仙山線') {
				return JSON.stringify(['北仙台']);
			}
			return JSON.stringify(['立川']);
		});
		wasmApi.searchStationFuzzy.mockReturnValue(
			JSON.stringify({ results: [{ name: '東京', score: 0 }, { name: '品川', score: 1 }] })
		);
		wasmApi.getKanaByStation.mockImplementation((station: string) => `${station}かな`);
		wasmApi.getPrefectureByStation.mockImplementation((station: string) =>
			station === '品川' ? '東京都' : '宮城県'
		);
		wasmApi.getLinesByStation.mockImplementation((station: string) => {
			if (station === '北仙台') return JSON.stringify(['仙山線', '東北本線']);
			if (station === '仙台') return JSON.stringify(['東北新幹線', '東北本線']);
			if (station === '盛岡') return JSON.stringify(['東北新幹線', '田沢湖線']);
			return JSON.stringify(['仙山線']);
		});
		wasmApi.executeSql.mockReturnValue('{"columns":["samename"],"rows":[],"rowCount":0}');
	});

	it('shows destination mode title when requested', async () => {
		render(TerminalSelectionPage, { initialMode: 'destination' });

		const heading = page.getByRole('heading', { name: '着駅指定（最短経路）' });
		await expect.element(heading).toBeInTheDocument();
		await expect.element(page.getByText('着駅を選択してください')).toBeInTheDocument();
	});

	it('lists lines for the selected prefecture even when payload contains multiple prefectures', async () => {
		wasmApi.getLinesByPrefect.mockImplementation((prefecture: string) => {
			if (prefecture === '宮城') {
				return JSON.stringify({
					prefectures: [
						{ prefecture: '北海道', lines: ['宗谷線'] },
						{ prefecture: '宮城県', lines: ['仙山線'] }
					]
				});
			}
			return JSON.stringify(['中央線']);
		});

		render(TerminalSelectionPage);

		const prefectureTab = page.getByRole('tab', { name: '都道府県' });
		await prefectureTab.click();

		const prefectureButton = page.getByRole('button', { name: '宮城県' });
		await prefectureButton.click();

		const lineButton = page.getByRole('button', { name: '仙山線' });
		await expect.element(lineButton).toBeInTheDocument();
	});

	it('matches prefectures whose payload omits suffix characters', async () => {
		wasmApi.getPrefects.mockReturnValueOnce(JSON.stringify(['岩手県']));
			wasmApi.getLinesByPrefect.mockImplementation((prefecture: string) => {
				return JSON.stringify({
					prefectures: [
						{ prefecture: '北海道', lines: ['宗谷線'] },
						{ prefecture: '岩手', lines: ['釜石線'] }
					]
				});
			});

		render(TerminalSelectionPage);

		const prefectTab = page.getByRole('tab', { name: '都道府県' });
		await prefectTab.click();

		const prefectButton = page.getByRole('button', { name: '岩手県' });
		await prefectButton.click();

			const lineButton = page.getByRole('button', { name: '釜石線' });
			await expect.element(lineButton).toBeInTheDocument();

			expect(wasmApi.getLinesByPrefect).toHaveBeenCalledWith('岩手');
		});

	it('navigates to main view when pressing back on the root view', async () => {
		render(TerminalSelectionPage);

		const prefectTab = page.getByRole('tab', { name: '都道府県' });
		await prefectTab.click();

		gotoMock.mockClear();
		const backButton = page.getByRole('button', { name: '前の画面に戻る' });
		await backButton.click();

		expect(gotoMock).toHaveBeenCalledWith('/');
	});

	it('falls back to exact prefecture label when normalized lookup has no lines', async () => {
		const responses: Record<string, string> = {
			宮城: JSON.stringify([]),
			宮城県: JSON.stringify(['仙山線'])
		};
		wasmApi.getLinesByPrefect.mockImplementation((prefecture: string) => {
			return responses[prefecture] ?? JSON.stringify([]);
		});

		render(TerminalSelectionPage);

		const prefectTab = page.getByRole('tab', { name: '都道府県' });
		await prefectTab.click();

		const prefectButton = page.getByRole('button', { name: '宮城県' });
		await prefectButton.click();

		const lineButton = page.getByRole('button', { name: '仙山線' });
		await expect.element(lineButton).toBeInTheDocument();

		expect(wasmApi.getLinesByPrefect).toHaveBeenCalledWith('宮城');
		expect(wasmApi.getLinesByPrefect).toHaveBeenCalledWith('宮城県');
	});

	it('shows split line and station panes on wide screens for prefecture flow', async () => {
		Object.defineProperty(window, 'innerWidth', {
			configurable: true,
			value: 1280
		});
		Object.defineProperty(window, 'innerHeight', {
			configurable: true,
			value: 720
		});

		render(TerminalSelectionPage);

		await page.getByRole('tab', { name: '都道府県' }).click();
		await page.getByRole('button', { name: '宮城県' }).click();
		await page.getByRole('button', { name: '仙山線' }).click();

		await expect.element(page.getByText('路線を選ぶと駅候補を表示します')).not.toBeInTheDocument();
		await expect.element(page.getByText('仙山線').nth(1)).toBeInTheDocument();
		await expect.element(page.getByRole('button', { name: '北仙台' })).toBeInTheDocument();
		await expect.element(page.getByRole('button', { name: '一覧の先頭へスクロール' })).toBeInTheDocument();
	});

	it('shows split line and station panes on wide screens in destination mode', async () => {
		Object.defineProperty(window, 'innerWidth', {
			configurable: true,
			value: 1280
		});
		Object.defineProperty(window, 'innerHeight', {
			configurable: true,
			value: 720
		});

		render(TerminalSelectionPage, { initialMode: 'destination' });

		await page.getByRole('button', { name: 'JR東日本' }).click();
		await page.getByRole('button', { name: '東北新幹線' }).click();

		await expect.element(page.getByRole('button', { name: '仙台' })).toBeInTheDocument();
		await expect.element(page.getByRole('button', { name: '盛岡' })).toBeInTheDocument();
	});

	it('runs autoRoute after confirming a destination station selection', async () => {
		const seededRoute = new MockFarert();
		seededRoute.addStartRoute('柏木平');
		mainRouteStore.set(seededRoute);

		render(TerminalSelectionPage, { initialMode: 'destination' });

		const companyButton = page.getByRole('button', { name: 'JR東日本' });
		await companyButton.click();

		const lineButton = page.getByRole('button', { name: '東北新幹線' });
		await lineButton.click();

		const stationButton = page.getByRole('button', { name: '仙台' });
		await stationButton.click();

		const dialogHeading = page.getByRole('heading', { name: '新幹線を利用しますか？' });
		await expect.element(dialogHeading).toBeInTheDocument();

		const localButton = page.getByRole('button', { name: '在来線のみ' });
		await localButton.click();

		expect(seededRoute.autoRouteMock).toHaveBeenCalledWith(0, '仙台');
		expect(gotoMock).toHaveBeenCalledWith('/');
	});

	it('treats autoRoute rc=1 as success and navigates to main', async () => {
		const seededRoute = new MockFarert();
		seededRoute.addStartRoute('柏木平');
		seededRoute.autoRouteMock.mockReturnValue(1);
		mainRouteStore.set(seededRoute);

		render(TerminalSelectionPage, { initialMode: 'destination' });

		await page.getByRole('button', { name: 'JR東日本' }).click();
		await page.getByRole('button', { name: '東北新幹線' }).click();
		await page.getByRole('button', { name: '仙台' }).click();
		await page.getByRole('button', { name: '在来線のみ' }).click();

		expect(seededRoute.autoRouteMock).toHaveBeenCalledWith(0, '仙台');
		expect(gotoMock).toHaveBeenCalledWith('/');
		expect(get(mainScreenErrorMessageStore)).toBe('');
	});

	it('navigates to main and sets message when autoRoute returns negative error', async () => {
		const seededRoute = new MockFarert();
		seededRoute.addStartRoute('柏木平');
		seededRoute.autoRouteMock.mockReturnValue(-2);
		mainRouteStore.set(seededRoute);

		render(TerminalSelectionPage, { initialMode: 'destination' });

		await page.getByRole('button', { name: 'JR東日本' }).click();
		await page.getByRole('button', { name: '東北新幹線' }).click();
		await page.getByRole('button', { name: '仙台' }).click();
		await page.getByRole('button', { name: '在来線のみ' }).click();

		expect(gotoMock).toHaveBeenCalledWith('/');
		expect(get(mainScreenErrorMessageStore)).toContain('autoRoute rc=-2');
	});

	it('allows selecting a station via company → line → station flow', async () => {
		render(TerminalSelectionPage);

		const companyButton = page.getByRole('button', { name: 'JR東日本' });
		await companyButton.click();

		const lineButton = page.getByRole('button', { name: '東北新幹線' });
		await expect.element(lineButton).toBeInTheDocument();
		await lineButton.click();

		const stationListTitle = page.getByText('JR東日本ー東北新幹線');
		await expect.element(stationListTitle).toBeInTheDocument();

		const stationButton = page.getByRole('button', { name: '仙台' });
		await expect.element(stationButton).toBeInTheDocument();
		await stationButton.click();

		expect(gotoMock).toHaveBeenCalledWith('/');
		expect(addToStationHistorySpy).toHaveBeenCalledWith('仙台');
		const history = get(stationHistoryStore);
		expect(history[0]).toBe('仙台');
		const selectedRoute = get(mainRouteStore);
		expect(selectedRoute?.routeScript()).toBe('仙台');
	});

	it('allows selecting a station from history tab', async () => {
		stationHistoryStore.set(['仙台', '盛岡']);
		render(TerminalSelectionPage);

		const historyTab = page.getByRole('tab', { name: '履歴' });
		await historyTab.click();

		const historyStationButton = page.getByRole('button', { name: '仙台' });
		await expect.element(historyStationButton).toBeInTheDocument();
		await historyStationButton.click();

		expect(gotoMock).toHaveBeenCalledWith('/');
		expect(addToStationHistorySpy).toHaveBeenCalledWith('仙台');
		const selectedRoute = get(mainRouteStore);
		expect(selectedRoute?.routeScript()).toBe('仙台');
	});

	it('shows confirmation and does nothing when user cancels start-station overwrite', async () => {
		const seededRoute = new MockFarert();
		seededRoute.addStartRoute('東京');
		(seededRoute as unknown as { getRouteCount: () => number }).getRouteCount = () => 2;
		mainRouteStore.set(seededRoute);

		render(TerminalSelectionPage);

		const companyButton = page.getByRole('button', { name: 'JR東日本' });
		await companyButton.click();
		const lineButton = page.getByRole('button', { name: '東北新幹線' });
		await lineButton.click();
		const stationButton = page.getByRole('button', { name: '仙台' });
		await stationButton.click();
		await page.getByRole('button', { name: 'いいえ' }).click();

		expect(gotoMock).not.toHaveBeenCalled();
		expect(addToStationHistorySpy).not.toHaveBeenCalled();
		const selectedRoute = get(mainRouteStore);
		expect(selectedRoute?.routeScript()).toBe('東京');
	});

	it('overwrites start station when user confirms on multi-route warning', async () => {
		const seededRoute = new MockFarert();
		seededRoute.addStartRoute('東京');
		(seededRoute as unknown as { getRouteCount: () => number }).getRouteCount = () => 2;
		mainRouteStore.set(seededRoute);

		render(TerminalSelectionPage);

		const companyButton = page.getByRole('button', { name: 'JR東日本' });
		await companyButton.click();
		const lineButton = page.getByRole('button', { name: '東北新幹線' });
		await lineButton.click();
		const stationButton = page.getByRole('button', { name: '仙台' });
		await stationButton.click();
		await page.getByRole('button', { name: 'はい' }).click();

		expect(gotoMock).toHaveBeenCalledWith('/');
		expect(addToStationHistorySpy).toHaveBeenCalledWith('仙台');
		const selectedRoute = get(mainRouteStore);
		expect(selectedRoute?.routeScript()).toBe('仙台');
	});

	it('filters stations via search input and shows metadata', async () => {
		render(TerminalSelectionPage);

		const searchField = page.getByPlaceholder('駅名を検索');
		await searchField.click();
		await searchField.fill('東京');

		const tokyoButton = page.getByRole('button', { name: /^東京$/ });
		await expect.element(tokyoButton).toBeInTheDocument();

		const kanaText = page.getByText('（東京かな）');
		await expect.element(kanaText).toBeInTheDocument();
		await expect.element(page.getByTestId('search-result-prefecture-東京')).toHaveTextContent('宮城県');

		const clearButton = page.getByRole('button', { name: '検索をクリア' });
		await clearButton.click();

		await expect.element(tokyoButton).not.toBeInTheDocument();
	});

	it('accepts whitespace and notation variants when searching station names', async () => {
		wasmApi.searchStationFuzzy.mockImplementation((keyword: string) => {
			if (keyword === 'おち ゃの水') {
				return JSON.stringify({ results: [{ name: '御茶ノ水', score: 0 }] });
			}
			return JSON.stringify({ results: [] });
		});
		wasmApi.getKanaByStation.mockImplementation((station: string) =>
			station === '御茶ノ水' ? 'おちゃのみず' : `${station}かな`
		);
		wasmApi.getPrefectureByStation.mockImplementation((station: string) =>
			station === '御茶ノ水' ? '東京都' : '宮城県'
		);

		render(TerminalSelectionPage);

		const searchField = page.getByPlaceholder('駅名を検索');
		await searchField.click();
		await searchField.fill('おち ゃの水');

		const stationButton = page.getByRole('button', { name: /^御茶ノ水$/ });
		await expect.element(stationButton).toBeInTheDocument();
	});

	it('searches with ケヶが and 竜龍 variant expansion', async () => {
		wasmApi.searchStationFuzzy.mockImplementation((keyword: string) => {
			if (keyword === '竜が崎') {
				return JSON.stringify({
					results: [
						{ name: '龍ヶ崎', score: 1 },
						{ name: '竜ケ崎', score: 2 }
					]
				});
			}
			return JSON.stringify({ results: [] });
		});
		wasmApi.getKanaByStation.mockImplementation((station: string) => `${station}かな`);
		wasmApi.getPrefectureByStation.mockImplementation(() => '茨城県');

		render(TerminalSelectionPage);

		const searchField = page.getByPlaceholder('駅名を検索');
		await searchField.click();
		await searchField.fill('竜が崎');

		await expect.element(page.getByRole('button', { name: /^龍ヶ崎$/ })).toBeInTheDocument();
		await expect.element(page.getByRole('button', { name: /^竜ケ崎$/ })).toBeInTheDocument();
	});

	it('disambiguates same-name search results by samename and kana', async () => {
		wasmApi.searchStationFuzzy.mockImplementation((keyword: string) => {
			if (keyword === 'かしわ') {
				return JSON.stringify({
					results: [
						{ name: '柏原', kana: 'かしわばら', samename: ['((東))'], score: 0 },
						{ name: '柏原', kana: 'かしわら', samename: ['関'], score: 1 }
					]
				});
			}
			return JSON.stringify({ results: [] });
		});
		wasmApi.getPrefectureByStation.mockImplementation((station: string) => {
			if (station === '柏原(東)') return '滋賀県';
			if (station === '柏原(関)') return '大阪府';
			return '宮城県';
		});
		wasmApi.getKanaByStation.mockImplementation((station: string) => {
			if (station === '柏原(東)') return 'かしわばら';
			if (station === '柏原(関)') return 'かしわら';
			return `${station}かな`;
		});

		render(TerminalSelectionPage);

		const searchField = page.getByPlaceholder('駅名を検索');
		await searchField.click();
		await searchField.fill('かしわ');

		await expect.element(page.getByRole('button', { name: '柏原(東)' })).toBeInTheDocument();
		await expect.element(page.getByRole('button', { name: '柏原(関)' })).toBeInTheDocument();
		await expect.element(page.getByText('（かしわばら）')).toBeInTheDocument();
		await expect.element(page.getByText('（かしわら）')).toBeInTheDocument();
		await expect.element(page.getByTestId('search-result-prefecture-柏原(東)')).toHaveTextContent('滋賀県');
		await expect.element(page.getByTestId('search-result-prefecture-柏原(関)')).toHaveTextContent('大阪府');

		await page.getByRole('button', { name: '柏原(東)' }).click();

		expect(gotoMock).toHaveBeenCalledWith('/');
		expect(addToStationHistorySpy).toHaveBeenCalledWith('柏原(東)');
		expect(get(mainRouteStore)?.routeScript()).toBe('柏原(東)');
	});

	it('shows prefecture based line labels on station list title', async () => {
		render(TerminalSelectionPage);

		const prefectTab = page.getByRole('tab', { name: '都道府県' });
		await prefectTab.click();

		const prefectButton = page.getByRole('button', { name: '宮城県' });
		await prefectButton.click();

		const lineButton = page.getByRole('button', { name: '仙山線' });
		await expect.element(lineButton).toBeInTheDocument();
		await lineButton.click();

		const title = page.getByText('宮城県ー仙山線');
		await expect.element(title).toBeInTheDocument();
	});

	it('falls back to line-wide station lookup when prefecture scoped API result is unusable', async () => {
		wasmApi.getStationsByPrefectureAndLine.mockImplementationOnce(() => 'not-json');

		render(TerminalSelectionPage);

		const prefectTab = page.getByRole('tab', { name: '都道府県' });
		await prefectTab.click();

		const prefectButton = page.getByRole('button', { name: '宮城県' });
		await prefectButton.click();

		const lineButton = page.getByRole('button', { name: '仙山線' });
		await lineButton.click();

		const stationButton = page.getByRole('button', { name: '北仙台' });
		await expect.element(stationButton).toBeInTheDocument();

		const shinagawaButton = page.getByRole('button', { name: '品川' });
		await expect.element(shinagawaButton).not.toBeInTheDocument();
	});

	it('shows kana and other lines on the station list after selecting a line', async () => {
		render(TerminalSelectionPage);

		await page.getByRole('tab', { name: '都道府県' }).click();
		await page.getByRole('button', { name: '宮城県' }).click();
		await page.getByRole('button', { name: '仙山線' }).click();

		await expect.element(page.getByText('（北仙台かな）/仙山線/東北本線')).toBeInTheDocument();
	});

	it('shows kana and other lines in the split station pane on wide screens', async () => {
		Object.defineProperty(window, 'innerWidth', {
			configurable: true,
			value: 1280
		});
		Object.defineProperty(window, 'innerHeight', {
			configurable: true,
			value: 720
		});

		render(TerminalSelectionPage, { initialMode: 'destination' });

		await page.getByRole('button', { name: 'JR東日本' }).click();
		await page.getByRole('button', { name: '東北新幹線' }).click();

		await expect.element(page.getByText('（盛岡かな）/東北新幹線/田沢湖線')).toBeInTheDocument();
	});

	it('shows resolved same-name station labels with kana-only and multi-line variants', async () => {
		wasmApi.getStationsByPrefectureAndLine.mockImplementation((prefecture: string, line: string) => {
			if (prefecture === '宮城' && line === '仙山線') {
				return JSON.stringify(['愛子', '追分', '千歳']);
			}
			return JSON.stringify(['立川']);
		});
		wasmApi.getKanaByStation.mockImplementation((station: string) => {
			if (station === '愛子') return 'あやし';
			if (station === '追分(室)') return 'おいわけ';
			if (station === '追分') return '';
			if (station === '千歳(千)') return 'ちとせ';
			if (station === '千歳') return '';
			return `${station}かな`;
		});
		wasmApi.getLinesByStation.mockImplementation((station: string) => {
			if (station === '愛子') return JSON.stringify(['仙山線']);
			if (station === '追分(室)') return JSON.stringify(['室蘭線', '石勝線']);
			if (station === '追分') return JSON.stringify([]);
			if (station === '千歳(千)') return JSON.stringify(['千歳線']);
			if (station === '千歳') return JSON.stringify([]);
			return JSON.stringify(['仙山線']);
		});
		wasmApi.getPrefectureByStation.mockImplementation((station: string) => {
			if (station === '愛子') return '宮城県';
			if (station === '追分(室)') return '秋田県';
			if (station === '追分') return '';
			if (station === '千歳(千)') return '北海道';
			if (station === '千歳') return '';
			return '宮城県';
		});
		wasmApi.executeSql.mockImplementation((sql: string) => {
			if (sql.includes("t.name='追分'") && sql.includes("ln.name='仙山線'")) {
				return JSON.stringify({ columns: ['samename'], rows: [], rowCount: 0 });
			}
			if (sql.includes("t.name='追分'")) {
				return JSON.stringify({ columns: ['samename'], rows: [['室']], rowCount: 1 });
			}
			if (sql.includes("t.name='千歳'") && sql.includes("ln.name='仙山線'")) {
				return JSON.stringify({ columns: ['samename'], rows: [], rowCount: 0 });
			}
			if (sql.includes("t.name='千歳'")) {
				return JSON.stringify({ columns: ['samename'], rows: [['千']], rowCount: 1 });
			}
			return JSON.stringify({ columns: ['samename'], rows: [], rowCount: 0 });
		});

		render(TerminalSelectionPage);

		await page.getByRole('tab', { name: '都道府県' }).click();
		await page.getByRole('button', { name: '宮城県' }).click();
		await page.getByRole('button', { name: '仙山線' }).click();

		await expect.element(page.getByRole('button', { name: '愛子' })).toBeInTheDocument();
		await expect.element(page.getByText('（あやし）')).toBeInTheDocument();
		await expect.element(page.getByTestId('station-prefecture-愛子')).toHaveTextContent('宮城県');
		await expect.element(page.getByRole('button', { name: '追分(室)' })).toBeInTheDocument();
		await expect.element(page.getByText('（おいわけ）/室蘭線/石勝線')).toBeInTheDocument();
		await expect.element(page.getByTestId('station-prefecture-追分')).toHaveTextContent('秋田県');
		await expect.element(page.getByRole('button', { name: '千歳(千)' })).toBeInTheDocument();
		await expect.element(page.getByText('（ちとせ）')).toBeInTheDocument();
		expect(wasmApi.getLinesByStation).toHaveBeenCalledWith('追分(室)');
		expect(wasmApi.getLinesByStation).toHaveBeenCalledWith('千歳(千)');
	});

	it('omits prefecture on consecutive station rows within the same prefecture', async () => {
		wasmApi.getStationsByPrefectureAndLine.mockImplementation((prefecture: string, line: string) => {
			if (prefecture === '宮城' && line === '仙山線') {
				return JSON.stringify(['北仙台', '愛子', '山寺']);
			}
			return JSON.stringify([]);
		});
		wasmApi.getKanaByStation.mockImplementation((station: string) => `${station}かな`);
		wasmApi.getLinesByStation.mockReturnValue(JSON.stringify(['仙山線']));
		wasmApi.getPrefectureByStation.mockImplementation((station: string) => {
			if (station === '山寺') return '山形県';
			return '宮城県';
		});

		render(TerminalSelectionPage);

		await page.getByRole('tab', { name: '都道府県' }).click();
		await page.getByRole('button', { name: '宮城県' }).click();
		await page.getByRole('button', { name: '仙山線' }).click();

		await expect.element(page.getByTestId('station-prefecture-北仙台')).toHaveTextContent('宮城県');
		await expect.element(page.getByTestId('station-prefecture-愛子')).toHaveTextContent('');
		await expect.element(page.getByTestId('station-prefecture-山寺')).toHaveTextContent('山形県');
	});

	it('keeps showing lines even when prefecture filtering cannot inspect their stations', async () => {
		wasmApi.getStationsByLine.mockImplementation(() => 'not-json');

		render(TerminalSelectionPage);

		const prefectTab = page.getByRole('tab', { name: '都道府県' });
		await prefectTab.click();

		const prefectButton = page.getByRole('button', { name: '宮城県' });
		await prefectButton.click();

		const lineButton = page.getByRole('button', { name: '仙山線' });
		await expect.element(lineButton).toBeInTheDocument();
	});

	it('hides tab row and search bar after selecting group or prefecture options', async () => {
		render(TerminalSelectionPage);

		const tabs = page.getByTestId('terminal-tabs');
		const searchBar = page.getByTestId('terminal-search');
		await expect.element(tabs).toBeInTheDocument();
		await expect.element(searchBar).toBeInTheDocument();

		const companyButton = page.getByRole('button', { name: 'JR東日本' });
		await companyButton.click();

		await expect.element(tabs).not.toBeInTheDocument();
		await expect.element(searchBar).not.toBeInTheDocument();

		const backButton = page.getByRole('button', { name: '戻る' });
		await backButton.click();

		await expect.element(tabs).toBeInTheDocument();
		await expect.element(searchBar).toBeInTheDocument();
	});

	it('shows floating scroll buttons on prefecture tab and scrolls to top and bottom', async () => {
		const scrollSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
		Object.defineProperty(document.documentElement, 'scrollHeight', {
			configurable: true,
			value: 3200
		});

		render(TerminalSelectionPage);

		await page.getByRole('tab', { name: '都道府県' }).click();

		const upButton = page.getByRole('button', { name: '一覧の先頭へスクロール' });
		const downButton = page.getByRole('button', { name: '一覧の末尾へスクロール' });
		await expect.element(upButton).toBeInTheDocument();
		await expect.element(downButton).toBeInTheDocument();

		await upButton.click();
		await downButton.click();

		expect(scrollSpy).toHaveBeenNthCalledWith(1, { top: 0, behavior: 'smooth' });
		expect(scrollSpy).toHaveBeenNthCalledWith(2, { top: 3200, behavior: 'smooth' });

		scrollSpy.mockRestore();
	});

it.todo('allows deleting history entries via swipe gesture');
});
