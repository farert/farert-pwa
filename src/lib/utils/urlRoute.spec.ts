import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import LZString from 'lz-string';
import {
	compressRouteForUrl,
	decompressRouteFromUrl,
	generateShareUrl,
	restoreRouteFromScript
} from './urlRoute';
import type { FaretClass } from '$lib/wasm/types';

class FakeFarert implements FaretClass {
	script: string;
	nextBuildResult = 0;

	constructor(script = '') {
		this.script = script;
	}

	addStartRoute(): number {
		return 0;
	}

	addRoute(): number {
		return 0;
	}

	autoRoute(): number {
		return 0;
	}

	getRouteCount(): number {
		return this.script ? (this.script.split(',').length - 1) / 2 : 0;
	}

	departureStationName(): string {
		return this.script.split(',')[0] ?? '';
	}

	arrivevalStationName(): string {
		const fields = this.script.split(',');
		return fields[fields.length - 1] ?? '';
	}

	buildRoute(routeStr: string): number {
		this.script = routeStr;
		const result = this.nextBuildResult;
		this.nextBuildResult = 0;
		return result;
	}

	routeScript(): string {
		return this.script;
	}

	removeAll(): void {
		this.script = '';
	}

	removeTail(): void {
		const fields = this.script.split(',');
		if (fields.length > 3) {
			this.script = fields.slice(0, -2).join(',');
		}
	}

	reverse(): number {
		this.script = this.script.split(',').reverse().join(',');
		return 0;
	}

	assign(sourceRoute: FaretClass, count: number): void {
		const tokens = sourceRoute.routeScript().split(',');
		if (count < 0) {
			this.script = sourceRoute.routeScript();
			return;
		}

		const sliceLength = Math.min(tokens.length, 1 + count * 2);
		this.script = tokens.slice(0, sliceLength).join(',');
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
		return false;
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

class FailingBuildFarert extends FakeFarert {
	override buildRoute(routeStr: string): number {
		super.buildRoute(routeStr);
		return -1;
	}
}

class NonZeroSuccessFarert extends FakeFarert {
	override buildRoute(routeStr: string): number {
		super.buildRoute(routeStr);
		return 1;
	}
}

class NonZeroFailFarert extends FakeFarert {
	override buildRoute(routeStr: string): number {
		super.buildRoute(routeStr);
		return 2;
	}
}

class JsonBuildFarert extends FakeFarert {
	override buildRoute(routeStr: string): string {
		super.buildRoute(routeStr);
		return JSON.stringify({ rc: 0 });
	}
}

class JsonFailFarert extends FakeFarert {
	override buildRoute(routeStr: string): string {
		super.buildRoute(routeStr);
		return JSON.stringify({ rc: -2 });
	}
}

class JsonNullFarert extends FakeFarert {
	override buildRoute(routeStr: string): string {
		super.buildRoute(routeStr);
		return `${JSON.stringify({ rc: 0 })}\u0000`;
	}
}

class StickyStateFarert extends FakeFarert {
	override buildRoute(routeStr: string): number {
		this.script = this.script ? `${this.script},${routeStr}` : routeStr;
		return 0;
	}
}

class CanonicalizingFarert extends FakeFarert {
	override addStartRoute(station: string): number {
		this.script = station;
		return 0;
	}

	override buildRoute(routeStr: string): number {
		if (routeStr === '長崎,西九州新幹線,諫早,長崎線,長与') {
			this.script = '長崎,西九州新幹線,諫早,長崎線(長与経由),長与';
			return 0;
		}
		return super.buildRoute(routeStr);
	}

	override addRoute(line: string, station: string): number {
		if (!this.script) {
			return -1;
		}

		const fields = this.script ? this.script.split(',') : [];
		if (line === '西九州新幹線' && station === '諫早') {
			this.script = [...fields, line, station].join(',');
			return 0;
		}
		if (line === '長崎線' && station === '長与') {
			this.script = [...fields, '長崎線(長与経由)', station].join(',');
			return 0;
		}
		return -1;
	}
}

class SameNameCanonicalizingFarert extends FakeFarert {
	override buildRoute(routeStr: string): number {
		if (routeStr === '千歳 千歳線 白石 函館線 岩見沢 室蘭線 追分') {
			this.script = '千歳(千),千歳線,白石(函),函館線,岩見沢,室蘭線,追分(室)';
			return 0;
		}
		return super.buildRoute(routeStr);
	}

	override addStartRoute(station: string): number {
		if (station !== '千歳') {
			return -200;
		}
		this.script = station;
		return 0;
	}

	override addRoute(line: string, station: string): number {
		if (line === '千歳線' && station === '白石') {
			return -200;
		}
		if (line === '室蘭線' && station === '追分') {
			return -200;
		}
		const fields = this.script ? this.script.split(',') : [];
		this.script = [...fields, line, station].join(',');
		return 0;
	}
}

class AssignThrowFarert extends FakeFarert {
	override assign(): void {
		throw new Error('assign should not be called');
	}
}

describe('urlRoute utilities', () => {
	const originalWindow = globalThis.window;

	beforeEach(() => {
		delete (globalThis as { window?: unknown }).window;
	});

	afterEach(() => {
		globalThis.window = originalWindow;
	});

	it('compresses the entire route when no segment limit is specified', () => {
		const route = new FakeFarert('東京,東海道線,新大阪');
		const compressed = compressRouteForUrl(route, -1, FakeFarert);
		const decompressed = LZString.decompressFromEncodedURIComponent(compressed);

		expect(decompressed).toBe('東京,東海道線,新大阪');
	});

	it('respects the segmentCount when provided', () => {
		const route = new FakeFarert('東京,東海道線,名古屋,東海道線,新大阪');
		const compressed = compressRouteForUrl(route, 1, FakeFarert);
		const decompressed = LZString.decompressFromEncodedURIComponent(compressed);

		expect(decompressed).toBe('東京,東海道線,名古屋');
	});

	it('does not depend on assign even when segmentCount is provided', () => {
		const route = new AssignThrowFarert('東京,東海道線,名古屋,東海道線,新大阪');
		const compressed = compressRouteForUrl(route, 1, AssignThrowFarert);
		const decompressed = LZString.decompressFromEncodedURIComponent(compressed);

		expect(decompressed).toBe('東京,東海道線,名古屋');
	});

	it('decompresses a route successfully', () => {
		const script = '東京,東海道線,新大阪';
		const compressed = LZString.compressToEncodedURIComponent(script);

		const result = decompressRouteFromUrl(compressed, FakeFarert);
		expect(result).not.toBeNull();
		expect(result?.routeScript()).toBe(script);
	});

	it('clears existing route state before restoring from URL', () => {
		const script = '夜ノ森,常磐線,日暮里';
		const compressed = LZString.compressToEncodedURIComponent(script);

		const result = decompressRouteFromUrl(compressed, StickyStateFarert);
		expect(result).not.toBeNull();
		expect(result?.routeScript()).toBe(script);
	});

	it('treats positive buildRoute codes as success', () => {
		const script = '東京,総武線,千葉';
		const compressed = LZString.compressToEncodedURIComponent(script);

		const result = decompressRouteFromUrl(compressed, NonZeroSuccessFarert);
		expect(result).not.toBeNull();
		expect(result?.routeScript()).toBe(script);
	});

	it('rejects non-success numeric codes', () => {
		const script = '東京,中央線,高尾';
		const compressed = LZString.compressToEncodedURIComponent(script);

		const result = decompressRouteFromUrl(compressed, NonZeroFailFarert);
		expect(result).toBeNull();
	});

	it('returns null when decompression fails', () => {
		const result = decompressRouteFromUrl('@@@', FakeFarert);
		expect(result).toBeNull();
	});

	it('returns null when buildRoute returns non-zero', () => {
		const script = '東京,東海道線,新大阪';
		const compressed = LZString.compressToEncodedURIComponent(script);

		const result = decompressRouteFromUrl(compressed, FailingBuildFarert);
		expect(result).toBeNull();
	});

	it('accepts buildRoute results that return JSON success payloads', () => {
		const script = '東京,東海道線,新大阪';
		const compressed = LZString.compressToEncodedURIComponent(script);

		const result = decompressRouteFromUrl(compressed, JsonBuildFarert);
		expect(result).not.toBeNull();
	});

	it('rejects buildRoute JSON payloads with non-zero rc', () => {
		const script = '東京,東海道線,新大阪';
		const compressed = LZString.compressToEncodedURIComponent(script);

		const result = decompressRouteFromUrl(compressed, JsonFailFarert);
		expect(result).toBeNull();
	});

	it('accepts buildRoute payloads that include null terminators', () => {
		const script = '東京,東海道線,新大阪';
		const compressed = LZString.compressToEncodedURIComponent(script);

		const result = decompressRouteFromUrl(compressed, JsonNullFarert);
		expect(result).not.toBeNull();
	});

	it('restores successfully when wasm canonicalizes omitted qualifiers', () => {
		const script = '長崎,西九州新幹線,諫早,長崎線,長与';
		const compressed = LZString.compressToEncodedURIComponent(script);

		const result = decompressRouteFromUrl(compressed, CanonicalizingFarert);
		expect(result).not.toBeNull();
		expect(result?.routeScript()).toBe('長崎,西九州新幹線,諫早,長崎線(長与経由),長与');
	});

	it('buildRoute成功後に同名駅を正式名へ正規化した場合も復元成功とみなす', () => {
		const route = new SameNameCanonicalizingFarert();

		const restored = restoreRouteFromScript(
			route,
			'千歳 千歳線 白石 函館線 岩見沢 室蘭線 追分'
		);

		expect(restored).toBe(true);
		expect(route.routeScript()).toBe(
			'千歳(千),千歳線,白石(函),函館線,岩見沢,室蘭線,追分(室)'
		);
	});

	it('全角区切りを正規化してからbuildRouteへ渡す', () => {
		const route = new FakeFarert();

		const restored = restoreRouteFromScript(
			route,
			'上越妙高，えちごトキめき鉄道（妙高はねうま），直江津'
		);

		expect(restored).toBe(true);
		expect(route.routeScript()).toBe('上越妙高,えちごトキめき鉄道（妙高はねうま）,直江津');
	});

	it('generates a share URL with the provided base URL', () => {
		const route = new FakeFarert('東京,東海道線,新大阪');

		const url = generateShareUrl(route, -1, { baseUrl: 'https://app.test', ctor: FakeFarert });
		expect(url.startsWith('https://app.test/detail?r=')).toBe(true);
	});

	it('generates a share URL with the provided base path', () => {
		const route = new FakeFarert('東京,東海道線,新大阪');

		const url = generateShareUrl(route, -1, {
			baseUrl: 'https://app.test',
			basePath: '/farert-pwa',
			ctor: FakeFarert
		});
		expect(url.startsWith('https://app.test/farert-pwa/detail?r=')).toBe(true);
	});

	it('normalizes base path delimiters when generating share URL', () => {
		const route = new FakeFarert('東京,東海道線,新大阪');

		const url = generateShareUrl(route, -1, {
			baseUrl: 'https://app.test',
			basePath: '/farert-pwa/',
			ctor: FakeFarert
		});
		expect(url.startsWith('https://app.test/farert-pwa/detail?r=')).toBe(true);
	});

	it('falls back to window.location.origin when base URL is omitted', () => {
		const route = new FakeFarert('東京,東海道線,新大阪');
		globalThis.window = { location: { origin: 'https://farert.example' } } as Window;

		const url = generateShareUrl(route, -1, { ctor: FakeFarert });
		expect(url.startsWith('https://farert.example/detail?r=')).toBe(true);
	});
});
