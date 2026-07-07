/**
 * 運賃情報 JSON 解析ユーティリティのテストです。
 * km 小数の素通し、NUL 除去、不正 JSON の扱いを固定します。
 */
import { describe, expect, it } from 'vitest';
import { parseFareInfoJson } from './fareInfo';

describe('parseFareInfoJson', () => {
	it('parses fare info and keeps kilometer values as-is (km unit contract)', () => {
		const raw = JSON.stringify({
			fareResultCode: 0,
			totalSalesKm: 104.6,
			jrCalcKm: 104.6,
			fare: 2090,
			messages: ['msg']
		});

		const info = parseFareInfoJson(raw);
		expect(info).not.toBeNull();
		expect(info?.totalSalesKm).toBe(104.6);
		expect(info?.jrCalcKm).toBe(104.6);
		expect(info?.fare).toBe(2090);
	});

	it('does not rescale integer kilometer values', () => {
		const raw = JSON.stringify({ fareResultCode: 0, totalSalesKm: 120, fare: 1980 });

		const info = parseFareInfoJson(raw);
		expect(info?.totalSalesKm).toBe(120);
	});

	it('strips NUL characters before parsing', () => {
		const raw = `${JSON.stringify({ fareResultCode: 0, fare: 500 })}\u0000`;

		const info = parseFareInfoJson(raw);
		expect(info?.fare).toBe(500);
	});

	it('normalizes missing messages to an empty array', () => {
		const info = parseFareInfoJson(JSON.stringify({ fareResultCode: 0 }));
		expect(info?.messages).toEqual([]);
	});

	it('returns null for non-string, empty, or invalid input', () => {
		expect(parseFareInfoJson(undefined)).toBeNull();
		expect(parseFareInfoJson('')).toBeNull();
		expect(parseFareInfoJson('{ broken json')).toBeNull();
	});
});
