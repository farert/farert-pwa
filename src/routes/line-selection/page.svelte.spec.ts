import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';

const gotoMock = vi.fn();

vi.mock('$app/navigation', () => ({
	goto: (...args: unknown[]) => gotoMock(...args)
}));

const wasmApi = {
	initFarert: vi.fn<[], Promise<void>>(),
	getLinesByStation: vi.fn<[string], string>(),
	getLinesByPrefect: vi.fn<[string], string>(),
	getLinesByCompany: vi.fn<[string], string>()
};

vi.mock('$lib/wasm', () => ({
	initFarert: () => wasmApi.initFarert(),
	getLinesByStation: (station: string) => wasmApi.getLinesByStation(station),
	getLinesByPrefect: (prefecture: string) => wasmApi.getLinesByPrefect(prefecture),
	getLinesByCompany: (company: string) => wasmApi.getLinesByCompany(company)
}));

const { default: LineSelectionPage } = await import('./+page.svelte');

describe('/line-selection/+page.svelte', () => {
	beforeEach(() => {
		gotoMock.mockReset();
		wasmApi.initFarert.mockResolvedValue(undefined);
		wasmApi.getLinesByStation.mockReset();
		wasmApi.getLinesByPrefect.mockReset();
		wasmApi.getLinesByCompany.mockReset();
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
});
