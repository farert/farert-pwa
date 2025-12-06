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
	searchStationByKeyword: vi.fn<[string], string>(),
	getKanaByStation: vi.fn<[string], string>(),
	getPrefectureByStation: vi.fn<[string], string>()
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
	searchStationByKeyword: (keyword: string) => wasmApi.searchStationByKeyword(keyword),
	getKanaByStation: (station: string) => wasmApi.getKanaByStation(station),
	getPrefectureByStation: (station: string) => wasmApi.getPrefectureByStation(station)
}));

const mainRouteStore: Writable<FaretClass | null> = writable(null);
const stationHistoryStore: Writable<string[]> = writable([]);
const addToStationHistorySpy = vi.fn((station: string) => {
	stationHistoryStore.update((history) => {
		const filtered = history.filter((item) => item !== station);
		return [station, ...filtered].slice(0, 100);
	});
});

vi.mock('$lib/stores', () => ({
	mainRoute: mainRouteStore,
	stationHistory: stationHistoryStore,
	addToStationHistory: (station: string) => addToStationHistorySpy(station)
}));

const { default: TerminalSelectionPage } = await import('./+page.svelte');

describe('/terminal-selection/+page.svelte', () => {
	beforeEach(() => {
		gotoMock.mockReset();
		addToStationHistorySpy.mockClear();
		mainRouteStore.set(null);
		stationHistoryStore.set([]);
		wasmApi.initFarert.mockReset();
		wasmApi.getCompanys.mockReset();
		wasmApi.getPrefects.mockReset();
		wasmApi.getLinesByCompany.mockReset();
		wasmApi.getLinesByPrefect.mockReset();
		wasmApi.getStationsByLine.mockReset();
		wasmApi.getStationsByCompanyAndLine.mockReset();
		wasmApi.getStationsByPrefectureAndLine.mockReset();
		wasmApi.searchStationByKeyword.mockReset();
		wasmApi.getKanaByStation.mockReset();
		wasmApi.getPrefectureByStation.mockReset();

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
		wasmApi.searchStationByKeyword.mockReturnValue(JSON.stringify(['東京', '品川']));
		wasmApi.getKanaByStation.mockImplementation((station: string) => `${station}かな`);
		wasmApi.getPrefectureByStation.mockImplementation((station: string) =>
			station === '品川' ? '東京都' : '宮城県'
		);
	});

	it('shows destination mode title when requested', async () => {
		render(TerminalSelectionPage, { initialMode: 'destination' });

		const heading = page.getByRole('heading', { name: '着駅指定（最短経路）' });
		await expect.element(heading).toBeInTheDocument();
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

	it('filters stations via search input and shows metadata', async () => {
		render(TerminalSelectionPage);

		const searchField = page.getByPlaceholder('駅名を検索');
		await searchField.click();
		await searchField.fill('東京');

		const tokyoButton = page.getByRole('button', { name: /^東京$/ });
		await expect.element(tokyoButton).toBeInTheDocument();

		const kanaText = page.getByText('東京かな (宮城県)');
		await expect.element(kanaText).toBeInTheDocument();

		const clearButton = page.getByRole('button', { name: '検索をクリア' });
		await clearButton.click();

		await expect.element(tokyoButton).not.toBeInTheDocument();
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

it.todo('allows deleting history entries via swipe gesture');
});
