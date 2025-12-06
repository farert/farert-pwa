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

const gotoMock = vi.fn();

vi.mock('$app/navigation', () => ({
	goto: (...args: unknown[]) => gotoMock(...args)
}));

const wasmApi = {
	initFarert: vi.fn<[], Promise<void>>(),
	getBranchStationsByLine: vi.fn<[string, string], string>(),
	getStationsByLine: vi.fn<[string], string>(),
	getKanaByStation: vi.fn<[string], string>()
};

vi.mock('$lib/wasm', () => ({
	initFarert: () => wasmApi.initFarert(),
	getBranchStationsByLine: (line: string, station: string) =>
		wasmApi.getBranchStationsByLine(line, station),
	getStationsByLine: (line: string) => wasmApi.getStationsByLine(line),
	getKanaByStation: (station: string) => wasmApi.getKanaByStation(station)
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

		render(RouteStationSelectPage, {
			presetParams: { from: 'main', station: '北上', line: '東北新幹線' }
		});

		const destinationButton = page.getByRole('button', { name: '水沢' });
		await destinationButton.click();

		expect(seededRoute.addRouteMock).toHaveBeenCalledWith('東北新幹線', '水沢');
		expect(gotoMock).toHaveBeenCalledWith('/');
	});
});
