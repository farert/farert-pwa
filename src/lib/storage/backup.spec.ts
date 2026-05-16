import { describe, expect, it, vi } from 'vitest';
import { FareType, type AppStorage } from '$lib/types';
import {
	downloadAppBackupAsFile,
	exportAppBackup,
	importAppBackup,
	importAppBackupFromFile
} from './backup';

describe('backup helpers', () => {
	it('AppStorage をバックアップ JSON に変換する', () => {
		const storage: AppStorage = {
			currentRoute: ' 東京,東海道線,熱海 ',
			savedRoutes: [' 東京,東海道線,熱海 ', '', '仙台,東北線,盛岡', '仙台,東北線,盛岡'],
			ticketHolder: [
				{ order: 2, routeScript: ' 東京,東海道線,熱海 ', fareType: FareType.NORMAL },
				{ order: 1, routeScript: '仙台,東北線,盛岡', fareType: FareType.CHILD }
			],
			stationHistory: [' 東京 ', '仙台', '東京']
		};

		const json = exportAppBackup(storage);
		const parsed = JSON.parse(json) as {
			version: string;
			storage: AppStorage;
		};

		expect(parsed.version).toBe('1.0');
		expect(parsed.storage.currentRoute).toBe('東京,東海道線,熱海');
		expect(parsed.storage.savedRoutes).toEqual(['東京,東海道線,熱海', '仙台,東北線,盛岡']);
		expect(parsed.storage.ticketHolder).toEqual([
			{ order: 2, routeScript: '東京,東海道線,熱海', fareType: FareType.NORMAL },
			{ order: 1, routeScript: '仙台,東北線,盛岡', fareType: FareType.CHILD }
		]);
		expect(parsed.storage.stationHistory).toEqual(['東京', '仙台']);
	});

	it('バックアップ JSON を復元する', () => {
		const backup = importAppBackup(`{
  "version": "1.0",
  "exportedAt": "2026-05-16T00:00:00.000Z",
  "storage": {
    "currentRoute": " 東京,東海道線,熱海 ",
    "savedRoutes": [" 東京,東海道線,熱海 ", "仙台,東北線,盛岡", "東京,東海道線,熱海"],
    "ticketHolder": [{"order": 1, "routeScript": " 東京,東海道線,熱海 ", "fareType": "NORMAL"}],
    "stationHistory": [" 東京 ", "仙台", "東京"]
  }
}`);

		expect(backup.version).toBe('1.0');
		expect(backup.exportedAt).toBe('2026-05-16T00:00:00.000Z');
		expect(backup.storage.currentRoute).toBe('東京,東海道線,熱海');
		expect(backup.storage.savedRoutes).toEqual(['東京,東海道線,熱海', '仙台,東北線,盛岡']);
		expect(backup.storage.ticketHolder).toEqual([
			{ order: 1, routeScript: '東京,東海道線,熱海', fareType: FareType.NORMAL }
		]);
		expect(backup.storage.stationHistory).toEqual(['東京', '仙台']);
	});

	it('不正なJSONや互換性のないバージョンは失敗する', () => {
		expect(() => importAppBackup('{')).toThrow('JSONの解析に失敗しました');
		expect(() =>
			importAppBackup(
				JSON.stringify({
					version: '2.0',
					storage: {
						currentRoute: null,
						savedRoutes: [],
						ticketHolder: [],
						stationHistory: []
					}
				})
			)
		).toThrow('互換性のないバージョンです');
	});

	it('バックアップファイルを保存できる', () => {
		const clickMock = vi.fn();
		vi.stubGlobal('document', {
			createElement: vi.fn().mockReturnValue({
				href: '',
				download: '',
				click: clickMock
			})
		});
		const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:backup');
		const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);

		downloadAppBackupAsFile({
			currentRoute: null,
			savedRoutes: [],
			ticketHolder: [],
			stationHistory: []
		});

		expect(createObjectURLSpy).toHaveBeenCalled();
		expect(document.createElement).toHaveBeenCalledWith('a');
		expect(clickMock).toHaveBeenCalledTimes(1);
		expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:backup');

		vi.unstubAllGlobals();
		createObjectURLSpy.mockRestore();
		revokeObjectURLSpy.mockRestore();
	});

	it('バックアップファイルから復元できる', async () => {
		const file = new File(
			[
				JSON.stringify({
					version: '1.0',
					storage: {
						currentRoute: null,
						savedRoutes: [],
						ticketHolder: [],
						stationHistory: []
					}
				})
			],
			'farert-backup.json',
			{ type: 'application/json' }
		);

		const backup = await importAppBackupFromFile(file);
		expect(backup.version).toBe('1.0');
	});
});
