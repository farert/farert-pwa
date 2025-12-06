import { beforeEach, describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import { writable, type Writable } from 'svelte/store';
import type { FaretClass } from '$lib/wasm/types';

class MockFarert implements FaretClass {
	script = '';

	addStartRoute(station: string): number {
		this.script = station;
		return 0;
	}

	addRoute(line: string, station: string): number {
		if (!this.script) return -1;
		this.script += `,${line},${station}`;
		return 0;
	}

	autoRoute(): number {
		return 0;
	}

	getRouteCount(): number {
		if (!this.script) return 0;
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
		const tokens = this.script.split(',');
		if (tokens.length <= 1) return;
		this.script = tokens.slice(0, -2).join(',');
	}

	reverse(): number {
		const tokens = this.script.split(',');
		if (tokens.length <= 1) return 0;
		const start = tokens[0];
		const pairs: string[] = [];
		for (let i = 1; i < tokens.length; i += 2) {
			pairs.push(tokens[i]);
			pairs.push(tokens[i + 1] ?? '');
		}
		const reversedStations: string[] = [];
		let currentStation = tokens[tokens.length - 1] ?? start;
		reversedStations.push(currentStation);
		for (let i = pairs.length - 2; i >= 0; i -= 2) {
			reversedStations.push(pairs[i]);
		}
		const reversedLines: string[] = [];
		for (let i = pairs.length - 2; i >= 0; i -= 2) {
			reversedLines.push(pairs[i + 1]);
			reversedLines.push(pairs[i]);
		}
		const rebuilt: string[] = [];
		rebuilt.push(currentStation);
		let stationIndex = 1;
		for (let i = 0; i < reversedLines.length; i += 2) {
			const line = reversedLines[i];
			const station = reversedStations[stationIndex] ?? start;
			rebuilt.push(line, station);
			stationIndex += 1;
		}
		this.script = rebuilt.join(',');
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
		return this.getRouteCount() > 0;
	}

	isOsakakanDetourEnable(): boolean {
		return false;
	}

	isOsakakanDetour(): boolean {
		return false;
	}

	setNotSameKokuraHakataShinZai(): void {
		return;
	}

	getFareInfoObjectJson(): string {
		return JSON.stringify({
			fare: 1520,
			totalSalesKm: 120,
			ticketAvailDays: 3
		});
	}

	getRoutesJson(): string {
		return '[]';
	}

	getRouteRecord(): string {
		return this.script;
	}
}

const initFarertMock = vi.fn().mockResolvedValue(undefined);
const initStoresMock = vi.fn();
const mainRouteStore: Writable<FaretClass | null> = writable(null);

vi.mock('$lib/wasm', () => ({
	initFarert: () => initFarertMock(),
	Farert: MockFarert
}));

vi.mock('$lib/stores', () => ({
	mainRoute: mainRouteStore,
	initStores: (...args: unknown[]) => initStoresMock(...args)
}));

const { default: Page } = await import('./+page.svelte');

describe('/+page.svelte', () => {
	beforeEach(() => {
		mainRouteStore.set(null);
		initFarertMock.mockClear();
		initStoresMock.mockClear();
	});

	it('shows placeholder when start station is empty', async () => {
		render(Page);

		const placeholder = page.getByText('発駅を指定してください');
		await expect.element(placeholder).toBeInTheDocument();
	});

	it('keeps the add route button disabled until start station is set', async () => {
		render(Page);
		const addButton = page.getByRole('button', { name: '経路を追加' });
		await expect.element(addButton).toBeDisabled();

		const seededRoute = new MockFarert();
		seededRoute.addStartRoute('東京');
		mainRouteStore.set(seededRoute);

		await expect.element(addButton).not.toBeDisabled();
	});

	it('renders route segments as tappable cards when the store has data', async () => {
		const seededRoute = new MockFarert();
		seededRoute.addStartRoute('東京');
		seededRoute.addRoute('東海道新幹線', '新大阪');
		mainRouteStore.set(seededRoute);

		render(Page);

		const segmentButton = page.getByRole('button', {
			name: '区間 1 (東海道新幹線 → 新大阪)'
		});
		await expect.element(segmentButton).toBeInTheDocument();
	});

	it('shows FareSummaryCard with detail action once fare info is available', async () => {
		const seededRoute = new MockFarert();
		seededRoute.addStartRoute('東京');
		seededRoute.addRoute('東海道新幹線', '新大阪');
		mainRouteStore.set(seededRoute);

		render(Page);

		const fareLabel = page.getByText('普通運賃');
		await expect.element(fareLabel).toBeInTheDocument();
		const distanceLabel = page.getByText('営業キロ');
		await expect.element(distanceLabel).toBeInTheDocument();
		const validityLabel = page.getByText('有効日数');
		await expect.element(validityLabel).toBeInTheDocument();
		const detailButton = page.getByRole('button', { name: '詳細>>' });
		await expect.element(detailButton).toBeInTheDocument();
	});
});
