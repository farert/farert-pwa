import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import { writable, get, type Writable } from 'svelte/store';
import type { FaretClass } from '$lib/wasm/types';

class MockFarert implements FaretClass {
	script = '';

	addStartRoute(station: string): number {
		this.script = station;
		return 0;
	}

	addRoute(line: string, station: string): number {
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

const initFarertMock = vi.fn().mockResolvedValue(undefined);
const pasteRouteFromClipboardMock = vi.fn();

vi.mock('$lib/wasm', () => ({
	initFarert: () => initFarertMock(),
	Farert: MockFarert
}));

vi.mock('$lib/storage', () => ({
	pasteRouteFromClipboard: (...args: unknown[]) => pasteRouteFromClipboardMock(...args)
}));

const mainRouteStore: Writable<FaretClass | null> = writable(null);
const savedRoutesStore: Writable<string[]> = writable([]);
const ticketHolderStore: Writable<unknown[]> = writable([]);
const initStoresMock = vi.fn();

vi.mock('$lib/stores', () => ({
	mainRoute: mainRouteStore,
	savedRoutes: savedRoutesStore,
	ticketHolder: ticketHolderStore,
	initStores: (...args: unknown[]) => initStoresMock(...args)
}));

const { default: SavePage } = await import('./+page.svelte');

describe('/save/+page.svelte', () => {
	beforeEach(() => {
		vi.unstubAllGlobals();
		gotoMock.mockReset();
		initFarertMock.mockResolvedValue(undefined);
		pasteRouteFromClipboardMock.mockReset();
		mainRouteStore.set(null);
		savedRoutesStore.set([]);
		ticketHolderStore.set([]);
	});

	it('現在の経路と保存済み経路を表示する', async () => {
		const current = new MockFarert();
		current.addStartRoute('東京');
		current.addRoute('東海道新幹線', '新大阪');
		current.addRoute('山陽新幹線', '博多');
		mainRouteStore.set(current);
		savedRoutesStore.set(['柏木平,釜石線,陸羽東線']);

		render(SavePage);

		await expect
			.element(page.getByText('東京,東海道新幹線,新大阪,山陽新幹線,博多'))
			.toBeInTheDocument();
		await expect.element(page.getByText('柏木平,釜石線,陸羽東線')).toBeInTheDocument();
	});

	it('保存ボタンで現在の経路を保存する', async () => {
		const current = new MockFarert();
		current.addStartRoute('東京');
		current.addRoute('東海道線', '熱海');
		current.addRoute('伊東線', '伊東');
		current.addRoute('伊豆急行', '伊豆急下田');
		mainRouteStore.set(current);

		render(SavePage);

		const saveButton = page.getByRole('button', { name: '保存', exact: true });
		await saveButton.click();

		expect(get(savedRoutesStore)).toContain('東京,東海道線,熱海,伊東線,伊東,伊豆急行,伊豆急下田');
	});

	it('既存の保存経路重複を初期表示時に解消する', async () => {
		savedRoutesStore.set(['東京,東海道線,熱海', ' 東京,東海道線,熱海 ', '', '仙台,東北線,盛岡']);
		render(SavePage);

		await expect.element(page.getByText('東京,東海道線,熱海')).toBeInTheDocument();
		expect(get(savedRoutesStore)).toEqual(['東京,東海道線,熱海', '仙台,東北線,盛岡']);
	});

	it('同一経路が保存済みなら保存時に重複追加しない', async () => {
		const current = new MockFarert();
		current.buildRoute('東京,東海道線,熱海,伊東線,伊東');
		mainRouteStore.set(current);
		savedRoutesStore.set([' 東京,東海道線,熱海,伊東線,伊東 ']);
		render(SavePage);

		const saveButton = page.getByRole('button', { name: '保存', exact: true });
		await saveButton.click();

		expect(get(savedRoutesStore)).toEqual(['東京,東海道線,熱海,伊東線,伊東']);
	});

	it('現在経路と保存経路が同一でも表示は1行にする', async () => {
		const current = new MockFarert();
		current.buildRoute('東京,東海道線,熱海,伊東線,伊東');
		mainRouteStore.set(current);
		savedRoutesStore.set(['東京,東海道線,熱海,伊東線,伊東']);
		render(SavePage);

		const routeButton = page.getByRole('button', {
			name: '経路 東京,東海道線,熱海,伊東線,伊東'
		});
		await expect.element(routeButton).toBeInTheDocument();
	});

	it('編集モードで削除できる', async () => {
		savedRoutesStore.set(['R1', 'R2']);

		render(SavePage);

		const editButton = page.getByRole('button', { name: '編集' });
		await editButton.click();

		const deleteButton = page.getByRole('button', { name: '削除' }).first();
		await deleteButton.click();

		expect(get(savedRoutesStore)).toEqual(['R2']);
	});

	it('経路が2区間以上あるとき保存経路選択で確認し、Noなら何もしない', async () => {
		const current = new MockFarert();
		current.buildRoute('東京,東海道線,熱海,伊東線,伊東');
		mainRouteStore.set(current);
		savedRoutesStore.set(['仙台,東北線,盛岡']);

		render(SavePage);

		await page.getByText('仙台,東北線,盛岡').click();
		await page.getByRole('button', { name: 'いいえ' }).click();

		expect(gotoMock).not.toHaveBeenCalled();
		expect(get(mainRouteStore)?.routeScript()).toBe('東京,東海道線,熱海,伊東線,伊東');
	});

	it('経路が2区間以上あるとき保存経路選択で確認し、Yesなら適用する', async () => {
		const current = new MockFarert();
		current.buildRoute('東京,東海道線,熱海,伊東線,伊東');
		mainRouteStore.set(current);
		savedRoutesStore.set(['仙台,東北線,盛岡']);

		render(SavePage);

		await page.getByText('仙台,東北線,盛岡').click();
		await page.getByRole('button', { name: 'はい' }).click();

		expect(gotoMock).toHaveBeenCalledWith('/');
		expect(get(mainRouteStore)?.routeScript()).toBe('仙台,東北線,盛岡');
	});
});
