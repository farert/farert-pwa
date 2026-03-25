import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import { writable, type Writable } from 'svelte/store';
import type { FaretClass } from '$lib/wasm/types';

class MockFarert implements FaretClass {
	script = '';
	addRouteMock = vi.fn<[string, string], number>();

	addStartRoute(station: string): number {
		this.script = station;
		return 0;
	}

	addRoute(line: string, station: string): number {
		this.addRouteMock(line, station);
		if (!this.script) {
			this.script = station;
		} else {
			this.script += `,${line},${station}`;
		}
		return 0;
	}

	autoRoute(): number {
		return 0;
	}

	getRouteCount(): number {
		return Math.max(0, (this.script.split(',').length - 1) / 2);
	}

	departureStationName(): string {
		return this.script.split(',')[0] ?? '';
	}

	arrivevalStationName(): string {
		const tokens = this.script.split(',');
		return tokens[tokens.length - 1] ?? '';
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

class DuplicateRouteFarert extends MockFarert {
	override addRoute(): number {
		return -1;
	}
}

const gotoMock = vi.fn();

vi.mock('$app/navigation', () => ({
	goto: (...args: unknown[]) => gotoMock(...args)
}));

const wasmApi = {
	initFarert: vi.fn<[], Promise<void>>(),
	getBranchStationsByLine: vi.fn<[string, string], string>(),
	getStationsByLine: vi.fn<[string], string>(),
	getKanaByStation: vi.fn<[string], string>(),
	getLinesByStation: vi.fn<[string], string>(),
	executeSql: vi.fn<[string], string>()
};

vi.mock('$lib/wasm', () => ({
	initFarert: () => wasmApi.initFarert(),
	getBranchStationsByLine: (line: string, station: string) =>
		wasmApi.getBranchStationsByLine(line, station),
	getStationsByLine: (line: string) => wasmApi.getStationsByLine(line),
	getKanaByStation: (station: string) => wasmApi.getKanaByStation(station),
	getLinesByStation: (station: string) => wasmApi.getLinesByStation(station),
	executeSql: (sql: string) => wasmApi.executeSql(sql)
}));

const mainRouteStore: Writable<FaretClass | null> = writable(null);

vi.mock('$lib/stores', () => ({
	mainRoute: mainRouteStore
}));

const { default: RouteStationSelectPage } = await import('./+page.svelte');

describe('/route-station-select/+page.svelte', () => {
	beforeEach(() => {
		gotoMock.mockReset();
		wasmApi.initFarert.mockResolvedValue(undefined);
		wasmApi.getBranchStationsByLine.mockReset();
		wasmApi.getStationsByLine.mockReset();
		wasmApi.getKanaByStation.mockReset();
		wasmApi.getLinesByStation.mockReset();
		wasmApi.executeSql.mockReset();
		wasmApi.executeSql.mockReturnValue('{"columns":["samename"],"rows":[],"rowCount":0}');
		mainRouteStore.set(null);
	});

	it('shows branch stations first and toggles to destination list', async () => {
		wasmApi.getBranchStationsByLine.mockReturnValue(
			JSON.stringify(['北上', '水沢', '一ノ関'])
		);
		wasmApi.getStationsByLine.mockReturnValue(
			JSON.stringify(['北上', '水沢', '一ノ関', '盛岡'])
		);
		wasmApi.getKanaByStation.mockImplementation((station: string) => `${station}かな`);
		wasmApi.getLinesByStation.mockImplementation((station: string) =>
			JSON.stringify(station === '水沢' ? ['東北本線', '北上線'] : ['東北新幹線'])
		);

		render(RouteStationSelectPage, {
			presetParams: { from: 'main', station: '北上', line: '東北新幹線' }
		});

		const branchButton = page.getByRole('button', { name: '水沢' });
		await expect.element(branchButton).toBeInTheDocument();

		const toggleButton = page.getByRole('button', { name: '着駅選択' });
		await toggleButton.click();

		const destinationButton = page.getByRole('button', { name: '盛岡' });
		await expect.element(destinationButton).toBeInTheDocument();

		expect(wasmApi.getStationsByLine).toHaveBeenCalledWith('東北新幹線');
	});

	it('shows a readable header with the selected line name', async () => {
		wasmApi.getBranchStationsByLine.mockReturnValue(
			JSON.stringify(['北上', '水沢'])
		);
		wasmApi.getStationsByLine.mockReturnValue(JSON.stringify(['北上', '水沢']));
		wasmApi.getKanaByStation.mockReturnValue('きたかみ');
		wasmApi.getLinesByStation.mockReturnValue(JSON.stringify(['東北新幹線']));

		render(RouteStationSelectPage, {
			presetParams: { from: 'main', station: '北上', line: '東北新幹線' }
		});

		const heading = page.getByRole('heading', { name: /分岐駅選択.*東北新幹線/ });
		await expect.element(heading).toBeInTheDocument();
	});

	it('adds a new route segment and returns to the main screen', async () => {
		const seededRoute = new MockFarert();
		seededRoute.addStartRoute('柏木平');
		mainRouteStore.set(seededRoute);

		wasmApi.getBranchStationsByLine.mockReturnValue(JSON.stringify(['水沢']));
		wasmApi.getStationsByLine.mockReturnValue(JSON.stringify(['水沢']));
		wasmApi.getKanaByStation.mockReturnValue('みずさわ');
		wasmApi.getLinesByStation.mockReturnValue(JSON.stringify(['東北本線']));

		render(RouteStationSelectPage, {
			presetParams: { from: 'main', station: '北上', line: '東北新幹線' }
		});

		await page.getByTestId('station-option-水沢').click();

		expect(seededRoute.addRouteMock).toHaveBeenCalledWith('東北新幹線', '水沢');
		expect(gotoMock).toHaveBeenCalledWith('/');
	});

	it('shows station lines after kana in branch station selection', async () => {
		wasmApi.getBranchStationsByLine.mockReturnValue(JSON.stringify(['北上', '水沢']));
		wasmApi.getStationsByLine.mockReturnValue(JSON.stringify(['北上', '水沢']));
		wasmApi.getKanaByStation.mockImplementation((station: string) => `${station}かな`);
		wasmApi.getLinesByStation.mockImplementation((station: string) =>
			JSON.stringify(station === '水沢' ? ['東北新幹線', '東北本線', '北上線'] : ['東北新幹線'])
		);

		render(RouteStationSelectPage, {
			presetParams: { from: 'main', station: '北上', line: '東北新幹線' }
		});

		const stationMeta = page.getByText('(水沢かな) / 東北本線 / 北上線');
		await expect.element(stationMeta).toBeInTheDocument();
		await expect.element(page.getByText('(北上かな)')).toBeInTheDocument();
		expect(wasmApi.getLinesByStation).toHaveBeenCalledWith('水沢');
	});

	it('sorts branch stations by line order and inserts the route start station with prefix', async () => {
		const seededRoute = new MockFarert();
		seededRoute.buildRoute('伊香牛,石北線,新旭川');
		mainRouteStore.set(seededRoute);

		wasmApi.getBranchStationsByLine.mockReturnValue(
			JSON.stringify(['新旭川', '網走', '旭川'])
		);
		wasmApi.getStationsByLine.mockReturnValue(
			JSON.stringify(['旭川', '新旭川', '伊香牛', '網走'])
		);
		wasmApi.getKanaByStation.mockImplementation((station: string) => {
			const names: Record<string, string> = {
				旭川: 'あさひかわ',
				新旭川: 'しんあさひかわ',
				伊香牛: 'いかうし',
				網走: 'あばしり'
			};
			return names[station] ?? `${station}かな`;
		});
		wasmApi.getLinesByStation.mockReturnValue(JSON.stringify(['石北線']));

		render(RouteStationSelectPage, {
			presetParams: { from: 'main', station: '新旭川', line: '石北線' }
		});

		const stationList = page.getByTestId('station-list');
		const stationButtons = stationList.locator('button');
		await expect.element(stationButtons.nth(0)).toHaveAttribute('data-testid', 'station-option-旭川');
		await expect.element(stationButtons.nth(1)).toHaveAttribute('data-testid', 'station-option-新旭川');
		await expect.element(stationButtons.nth(2)).toHaveAttribute('data-testid', 'station-option-伊香牛');
		await expect.element(stationButtons.nth(3)).toHaveAttribute('data-testid', 'station-option-網走');
		await expect.element(page.getByText('<発駅>')).toBeInTheDocument();
		await expect.element(page.getByText('(いかうし)')).toBeInTheDocument();
		expect(wasmApi.getBranchStationsByLine).toHaveBeenCalledWith('石北線', '伊香牛');
	});

	it('同名駅はサフィックスを付与し、同名駅のかなをベース名で補完する', async () => {
		wasmApi.getBranchStationsByLine.mockReturnValue(JSON.stringify(['金山']));
		wasmApi.getStationsByLine.mockReturnValue(JSON.stringify(['金山']));
		wasmApi.getKanaByStation.mockImplementation((station: string) => {
			if (station === '金山(中)') return '';
			return station === '金山' ? 'かなやま' : `${station}かな`;
		});
		wasmApi.getLinesByStation.mockReturnValue(JSON.stringify(['東海道本線']));
		wasmApi.executeSql.mockReturnValue(JSON.stringify({
			columns: ['samename'],
			rows: [['中']],
			rowCount: 1
		}));

		render(RouteStationSelectPage, {
			presetParams: { from: 'main', station: '川崎', line: '東海道本線' }
		});

		const stationButton = page.getByRole('button', { name: '金山(中)' });
		await expect.element(stationButton).toBeInTheDocument();
		await expect.element(page.getByText('(かなやま)')).toBeInTheDocument();
	});

	it('同名駅の識別子を経由して路線追加を実行する', async () => {
		const seededRoute = new MockFarert();
		seededRoute.addStartRoute('柏木平');
		mainRouteStore.set(seededRoute);

		wasmApi.getBranchStationsByLine.mockReturnValue(JSON.stringify(['金山']));
		wasmApi.getStationsByLine.mockReturnValue(JSON.stringify(['金山']));
		wasmApi.getKanaByStation.mockImplementation((station: string) => {
			if (station === '金山(中)') return '';
			return station === '金山' ? 'かなやま' : `${station}かな`;
		});
		wasmApi.getLinesByStation.mockReturnValue(JSON.stringify(['東海道本線']));
		wasmApi.executeSql.mockReturnValue(JSON.stringify({
			columns: ['samename'],
			rows: [['中']],
			rowCount: 1
		}));

		render(RouteStationSelectPage, {
			presetParams: { from: 'main', station: '柏木平', line: '東海道本線' }
		});

		await page.getByTestId('station-option-金山').click();
		expect(seededRoute.addRouteMock).toHaveBeenCalledWith('東海道本線', '金山(中)');
	});

	it('shows duplicate route message when addRoute returns duplicate error', async () => {
		const seededRoute = new DuplicateRouteFarert();
		seededRoute.addStartRoute('柏木平');
		mainRouteStore.set(seededRoute);

		wasmApi.getBranchStationsByLine.mockReturnValue(JSON.stringify(['水沢']));
		wasmApi.getStationsByLine.mockReturnValue(JSON.stringify(['水沢']));
		wasmApi.getKanaByStation.mockReturnValue('みずさわ');
		wasmApi.getLinesByStation.mockReturnValue(JSON.stringify(['東北本線']));

		render(RouteStationSelectPage, {
			presetParams: { from: 'main', station: '北上', line: '東北新幹線' }
		});

		await page.getByTestId('station-option-水沢').click();

		await expect.element(page.getByText('経路が重複しています')).toBeInTheDocument();
		expect(gotoMock).not.toHaveBeenCalled();
	});
});
