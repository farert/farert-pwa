import { describe, expect, it, vi } from 'vitest';
import { buildStationDisplayMeta, buildStationDisplayName, normalizeStationName } from './stationDisplay';

describe('stationDisplay', () => {
	it('normalizes nested station suffix parentheses to the base station name', () => {
		expect(normalizeStationName('追分((奥))')).toBe('追分');
		expect(normalizeStationName('追分（（奥））')).toBe('追分');
		expect(normalizeStationName('追分(奥)')).toBe('追分');
	});

	it('formats same-name suffixes with a single set of parentheses', () => {
		const executeSql = vi.fn((sql: string) => {
			if (sql.includes("t.name='追分'")) {
				return JSON.stringify({ columns: ['samename'], rows: [['((奥))']], rowCount: 1 });
			}
			return JSON.stringify({ columns: ['samename'], rows: [], rowCount: 0 });
		});
		const getKanaByStation = vi.fn((station: string) => {
			if (station === '追分(奥)') return 'おいわけ';
			if (station === '追分') return '';
			return '';
		});
		const getLinesByStation = vi.fn((station: string) => {
			if (station === '追分(奥)') return JSON.stringify(['奥羽本線']);
			if (station === '追分') return JSON.stringify([]);
			return JSON.stringify([]);
		});

		const info = buildStationDisplayMeta(['追分'], '奥羽本線', {
			executeSql,
			getKanaByStation,
			getLinesByStation,
			parseList: (payload: string) => JSON.parse(payload) as string[]
		});

		expect(info['追分']).toEqual({
			name: '追分(奥)',
			kana: 'おいわけ',
			lines: ['奥羽本線']
		});
		expect(getKanaByStation).toHaveBeenCalledWith('追分(奥)');
		expect(getLinesByStation).toHaveBeenCalledWith('追分(奥)');
	});

	it('normalizes already-suffixed station names from raw station lists', () => {
		const info = buildStationDisplayMeta(['追分((奥))'], '奥羽本線', {
			executeSql: vi.fn(() => JSON.stringify({ columns: ['samename'], rows: [], rowCount: 0 })),
			getKanaByStation: vi.fn((station: string) => (station === '追分(奥)' ? 'おいわけ' : '')),
			getLinesByStation: vi.fn((station: string) =>
				station === '追分(奥)' ? JSON.stringify(['奥羽本線']) : JSON.stringify([])
			),
			parseList: (payload: string) => JSON.parse(payload) as string[]
		});

		expect(info['追分((奥))']).toEqual({
			name: '追分(奥)',
			kana: 'おいわけ',
			lines: ['奥羽本線']
		});
	});

	it('builds search display names with normalized suffix parentheses', () => {
		expect(buildStationDisplayName('追分', '((奥))')).toBe('追分(奥)');
		expect(buildStationDisplayName('追分((奥))', '((奥))')).toBe('追分(奥)');
	});
});
