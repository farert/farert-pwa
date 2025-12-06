import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import LZString from 'lz-string';
import { compressRouteForUrl, decompressRouteFromUrl, generateShareUrl } from './urlRoute';
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

	it('decompresses a route successfully', () => {
		const script = '東京,東海道線,新大阪';
		const compressed = LZString.compressToEncodedURIComponent(script);

		const result = decompressRouteFromUrl(compressed, FakeFarert);
		expect(result).not.toBeNull();
		expect(result?.routeScript()).toBe(script);
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

	it('generates a share URL with the provided base URL', () => {
		const route = new FakeFarert('東京,東海道線,新大阪');

		const url = generateShareUrl(route, -1, { baseUrl: 'https://app.test', ctor: FakeFarert });
		expect(url.startsWith('https://app.test/detail?r=')).toBe(true);
	});

	it('falls back to window.location.origin when base URL is omitted', () => {
		const route = new FakeFarert('東京,東海道線,新大阪');
		globalThis.window = { location: { origin: 'https://farert.example' } } as Window;

		const url = generateShareUrl(route, -1, { ctor: FakeFarert });
		expect(url.startsWith('https://farert.example/detail?r=')).toBe(true);
	});
});
