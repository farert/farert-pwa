import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import { writable, type Writable } from 'svelte/store';
import type { FaretClass } from '$lib/wasm/types';

const gotoMock = vi.fn();

vi.mock('$app/navigation', () => ({
	goto: (...args: unknown[]) => gotoMock(...args)
}));

const wasmApi = {
	initFarert: vi.fn<[], Promise<void>>(),
	getLinesByStation: vi.fn<[string], string>(),
	getLinesByPrefect: vi.fn<[string], string>(),
	getLinesByCompany: vi.fn<[string], string>(),
	getBranchStationsByLine: vi.fn<[string, string], string>(),
	getStationsByLine: vi.fn<[string], string>(),
	getKanaByStation: vi.fn<[string], string>(),
	executeSql: vi.fn<[string], string>()
};

vi.mock('$lib/wasm', () => ({
	initFarert: () => wasmApi.initFarert(),
	getLinesByPrefect: (prefecture: string) => wasmApi.getLinesByPrefect(prefecture),
	getLinesByCompany: (company: string) => wasmApi.getLinesByCompany(company),
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

const { default: LineSelectionPage } = await import('./+page.svelte');

describe('/line-selection/+page.svelte', () => {
	beforeEach(() => {
		gotoMock.mockReset();
		wasmApi.initFarert.mockResolvedValue(undefined);
		wasmApi.getLinesByStation.mockReset();
		wasmApi.getLinesByPrefect.mockReset();
		wasmApi.getLinesByCompany.mockReset();
		wasmApi.getBranchStationsByLine.mockReset();
		wasmApi.getStationsByLine.mockReset();
		wasmApi.getKanaByStation.mockReset();
		wasmApi.executeSql.mockReset();
		wasmApi.executeSql.mockReturnValue('{"columns":["samename"],"rows":[],"rowCount":0}');
		mainRouteStore.set(null);
	});

	it('loads lines for a station and disables the currently selected line', async () => {
		wasmApi.getLinesByStation.mockReturnValue(JSON.stringify(['北上線', '東北新幹線']));

		render(LineSelectionPage, {
			presetParams: { from: 'main', station: '北上', line: '東北新幹線' }
		});

		const firstLine = page.getByRole('button', { name: '北上線' });
		await expect.element(firstLine).toBeInTheDocument();

		const disabledLine = page.getByRole('button', { name: '東北新幹線' });
		await expect.element(disabledLine).toBeDisabled();
	});

	it('navigates to station selection with encoded parameters on tap', async () => {
		wasmApi.getLinesByStation.mockReturnValue(JSON.stringify(['北上線', '東北新幹線']));

		render(LineSelectionPage, {
			presetParams: { from: 'main', station: '北上', line: '東北新幹線' }
		});

		const selectableLine = page.getByRole('button', { name: '北上線' });
		await selectableLine.click();

		const calledUrl = gotoMock.mock.calls.at(-1)?.[0] as string;
		const parsed = new URL(calledUrl, 'https://example.com');
		expect(parsed.pathname).toBe('/route-station-select');
		expect(parsed.searchParams.get('from')).toBe('main');
		expect(parsed.searchParams.get('station')).toBe('北上');
		expect(parsed.searchParams.get('line')).toBe('北上線');
	});

	it('uses prefecture and group filters when provided', async () => {
		wasmApi.getLinesByPrefect.mockReturnValue(
			JSON.stringify({
				prefectures: [
					{ prefecture: '北海道', lines: ['宗谷線'] },
					{ prefecture: '岩手県', lines: ['釜石線'] }
				]
			})
		);

		render(LineSelectionPage, {
			presetParams: { from: 'start', prefecture: '岩手県' }
		});

		const lineButton = page.getByRole('button', { name: '釜石線' });
		await expect.element(lineButton).toBeInTheDocument();

		expect(wasmApi.getLinesByPrefect).toHaveBeenCalledWith('岩手');
	});

	it('handles prefecture payloads that drop suffixes like 県や府', async () => {
		wasmApi.getLinesByPrefect.mockReturnValue(
			JSON.stringify({
				prefectures: [
					{ prefecture: '北海道', lines: ['宗谷線'] },
					{ prefecture: '岩手', lines: ['釜石線'] }
				]
			})
		);

		render(LineSelectionPage, {
			presetParams: { from: 'start', prefecture: '岩手県' }
		});

		const lineButton = page.getByRole('button', { name: '釜石線' });
		await expect.element(lineButton).toBeInTheDocument();

		expect(wasmApi.getLinesByPrefect).toHaveBeenCalledWith('岩手');
	});

	it('retries prefecture lookup with the original label when normalization fails', async () => {
		wasmApi.getLinesByPrefect.mockImplementation((prefecture: string) => {
			if (prefecture === '宮城') {
				return JSON.stringify([]);
			}
			if (prefecture === '宮城県') {
				return JSON.stringify(['仙山線']);
			}
			return JSON.stringify([]);
		});

		render(LineSelectionPage, {
			presetParams: { from: 'start', prefecture: '宮城県' }
		});

		const lineButton = page.getByRole('button', { name: '仙山線' });
		await expect.element(lineButton).toBeInTheDocument();

		expect(wasmApi.getLinesByPrefect).toHaveBeenCalledWith('宮城');
		expect(wasmApi.getLinesByPrefect).toHaveBeenCalledWith('宮城県');
	});

	it('shows station selection in a split pane on wide screens instead of navigating', async () => {
		Object.defineProperty(window, 'innerWidth', {
			configurable: true,
			value: 1280
		});

		wasmApi.getLinesByStation.mockReturnValue(JSON.stringify(['北上線', '東北新幹線']));
		wasmApi.getBranchStationsByLine.mockReturnValue(JSON.stringify(['水沢', '一ノ関']));
		wasmApi.getStationsByLine.mockReturnValue(JSON.stringify(['北上', '水沢', '一ノ関']));
		wasmApi.getKanaByStation.mockImplementation((station: string) => `${station}かな`);

		render(LineSelectionPage, {
			presetParams: { from: 'main', station: '北上', line: '東北新幹線' }
		});

		await expect.element(page.getByText('路線を選ぶと駅候補を表示します。')).toBeInTheDocument();

		await page.getByRole('button', { name: '北上線' }).click();

		await expect.element(page.getByRole('heading', { name: /分岐駅選択.*北上線/ })).toBeInTheDocument();
		await expect.element(page.getByTestId('station-option-水沢')).toBeInTheDocument();
		expect(gotoMock).not.toHaveBeenCalled();
	});

	it('shows embedded station selection for start mode when opened from prefecture flow on wide screens', async () => {
		Object.defineProperty(window, 'innerWidth', {
			configurable: true,
			value: 1280
		});

		wasmApi.getLinesByPrefect.mockReturnValue(
			JSON.stringify({
				prefectures: [{ prefecture: '岩手県', lines: ['釜石線'] }]
			})
		);
		wasmApi.getStationsByLine.mockReturnValue(JSON.stringify(['花巻', '遠野', '釜石']));
		wasmApi.getKanaByStation.mockImplementation((station: string) => `${station}かな`);
		wasmApi.getLinesByStation.mockReturnValue(JSON.stringify(['釜石線']));

		render(LineSelectionPage, {
			presetParams: { from: 'start', prefecture: '岩手県' }
		});

		await page.getByRole('button', { name: '釜石線' }).click();

		await expect.element(page.getByRole('heading', { name: /発駅指定.*釜石線/ })).toBeInTheDocument();
		await expect.element(page.getByTestId('station-option-花巻')).toBeInTheDocument();
		await expect.element(page.getByRole('button', { name: '一覧の先頭へスクロール' })).toBeInTheDocument();
		expect(gotoMock).not.toHaveBeenCalled();
	});

	it('shows embedded station selection for destination mode when opened from group flow on wide screens', async () => {
		Object.defineProperty(window, 'innerWidth', {
			configurable: true,
			value: 1280
		});

		wasmApi.getLinesByCompany.mockReturnValue(JSON.stringify(['山手線']));
		wasmApi.getStationsByLine.mockReturnValue(JSON.stringify(['東京', '新宿', '渋谷']));
		wasmApi.getKanaByStation.mockImplementation((station: string) => `${station}かな`);
		wasmApi.getLinesByStation.mockReturnValue(JSON.stringify(['山手線']));

		render(LineSelectionPage, {
			presetParams: { from: 'destination', group: 'JR東日本' }
		});

		await page.getByRole('button', { name: '山手線' }).click();

		await expect.element(page.getByRole('heading', { name: /着駅指定.*山手線/ })).toBeInTheDocument();
		await expect.element(page.getByTestId('station-option-新宿')).toBeInTheDocument();
		expect(gotoMock).not.toHaveBeenCalled();
	});
});
