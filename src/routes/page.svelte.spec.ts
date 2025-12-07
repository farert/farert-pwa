import { beforeEach, describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import { writable, type Writable } from 'svelte/store';
import type { FaretClass } from '$lib/wasm/types';

class MockFarert implements FaretClass {
	script = '';
	private osakaDetour = false;
	private notSameKokura = false;
	fareInfoJson = JSON.stringify({
		fare: 1520,
		totalSalesKm: 120,
		ticketAvailDays: 3
	});

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

	setDetour(enabled: boolean): number {
		this.osakaDetour = enabled;
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
		return this.notSameKokura;
	}

	isAvailableReverse(): boolean {
		return this.getRouteCount() > 0;
	}

	isOsakakanDetourEnable(): boolean {
		return true;
	}

	isOsakakanDetour(): boolean {
		return this.osakaDetour;
	}

	setNotSameKokuraHakataShinZai(enabled: boolean): void {
		this.notSameKokura = enabled;
	}

	getFareInfoObjectJson(): string {
		return this.fareInfoJson;
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
		gotoMock.mockReset();
	});

	it('shows placeholder when start station is empty', async () => {
		render(Page);

		const placeholder = page.getByText('発駅を指定してください');
		await expect.element(placeholder).toBeInTheDocument();
	});

it('hides fare summary card before route selection', async () => {
	render(Page);

	const locator = page.getByRole('button', { name: '運賃サマリー' });
	let isVisible = false;
	try {
		isVisible = await locator.isVisible();
	} catch (err) {
		isVisible = false;
	}
	expect(isVisible).toBe(false);
});

	it('renders a material train icon on the start station card', async () => {
		render(Page);

		const icon = page.getByTestId('start-station-train-icon');
		await expect.element(icon).toBeInTheDocument();
	});

	it('recovers from trailing commas in fare info JSON', async () => {
		const seededRoute = new MockFarert();
		seededRoute.addStartRoute('東京');
		seededRoute.addRoute('山手線', '品川');
		seededRoute.addRoute('東海道線', '横浜');
		seededRoute.fareInfoJson = '{"fare":2000,"messages":["テスト"],}';
		mainRouteStore.set(seededRoute);

		render(Page);

		const summary = page.getByRole('button', { name: '運賃サマリー' });
		await expect.element(summary).toBeEnabled();
	});

	it('recovers from empty elements in arrays', async () => {
		const seededRoute = new MockFarert();
		seededRoute.addStartRoute('東京');
		seededRoute.addRoute('山手線', '品川');
		seededRoute.addRoute('東海道線', '横浜');
		seededRoute.fareInfoJson = '{"fare":2000,"messages":["a",,"b",],"stockDiscounts":[{"stockDiscountTitle":"x","stockDiscountFare":500},,]}';
		mainRouteStore.set(seededRoute);

		render(Page);

		const summary = page.getByRole('button', { name: '運賃サマリー' });
		await expect.element(summary).toBeEnabled();
	});

	it('clears the start station when pressing the bottom back button without segments', async () => {
		const seededRoute = new MockFarert();
		seededRoute.addStartRoute('仙台');
		mainRouteStore.set(seededRoute);

		render(Page);

		const undoButton = page.getByRole('button', { name: '戻る' });
		await expect.element(undoButton).not.toBeDisabled();
		await undoButton.click();

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
		seededRoute.addRoute('山陽新幹線', '博多');
		mainRouteStore.set(seededRoute);

		render(Page);

		const detailButton = page.getByRole('button', { name: '運賃サマリー' });
		await expect.element(detailButton).not.toBeDisabled();
		await expect.element(detailButton.getByText('普通運賃')).toBeInTheDocument();
		await expect.element(detailButton.getByText('営業キロ')).toBeInTheDocument();
		await expect.element(detailButton.getByText('有効日数')).toBeInTheDocument();
	});

	it('navigates to line selection with encoded params when adding a route', async () => {
		const seededRoute = new MockFarert();
		seededRoute.addStartRoute('柏木平');
		seededRoute.addRoute('北上線', '北上');
		mainRouteStore.set(seededRoute);

		render(Page);

		const addButton = page.getByRole('button', { name: '経路を追加' });
		await addButton.click();

		const calledUrl = gotoMock.mock.calls.at(-1)?.[0] as string;
		const parsed = new URL(calledUrl, 'https://example.com');
		expect(parsed.pathname).toBe('/line-selection');
		expect(parsed.searchParams.get('from')).toBe('main');
		expect(parsed.searchParams.get('station')).toBe('北上');
		expect(parsed.searchParams.get('line')).toBe('北上線');
	});

	it('opens the app menu and navigates to version info from the menu item', async () => {
		render(Page);

		const menuButton = page.getByRole('button', { name: 'メニュー' });
		await menuButton.click();

		const versionItem = page.getByRole('menuitem', { name: 'バージョン情報' });
		await versionItem.click();

		expect(gotoMock).toHaveBeenCalledWith('/version');
	});

	it('provides Osaka and Kokura toggles inside the option menu', async () => {
		const seededRoute = new MockFarert();
		seededRoute.buildRoute('小倉,鹿児島本線,博多,大阪環状線,大阪');
		mainRouteStore.set(seededRoute);

		render(Page);

		const optionsButton = page.getByRole('button', { name: 'オプション' });
		await optionsButton.click();

		const osakaEnable = page.getByRole('menuitem', { name: '大阪環状線遠回り' });
		await expect.element(osakaEnable).toBeInTheDocument();
		await osakaEnable.click();

		await optionsButton.click();
		const osakaDisable = page.getByRole('menuitem', { name: '大阪環状線近回り' });
		await expect.element(osakaDisable).toBeInTheDocument();
		const kokuraItem = page.getByRole('menuitem', { name: '小倉博多間新幹線・在来線同一視' });
		await expect.element(kokuraItem).not.toBeDisabled();
	});
});
