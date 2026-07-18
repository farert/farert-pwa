/**
 * グローバルストアの永続化・復元契約を検証します。
 * 駅選択履歴の件数上限と、現在経路の localStorage 復元（rc 規約・失敗時のデータ保全）を固定します。
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';
import type { FaretClass } from '$lib/wasm/types';
import { STORAGE_KEYS } from '$lib/types';
import { addToStationHistory, initStores, mainRoute, stationHistory } from './index';

describe('stationHistory', () => {
	beforeEach(() => {
		stationHistory.set([]);
	});

	it('発駅・着駅の履歴を最近順で最大50件まで保持する', () => {
		for (let index = 1; index <= 51; index += 1) {
			addToStationHistory(`駅${index}`);
		}

		const history = get(stationHistory);

		expect(history).toHaveLength(50);
		expect(history[0]).toBe('駅51');
		expect(history.at(-1)).toBe('駅2');
	});

	it('復元された履歴も最大50件に制限する', () => {
		const restoredHistory = Array.from({ length: 51 }, (_, index) => `駅${index + 1}`);

		stationHistory.set(restoredHistory);

		expect(get(stationHistory)).toEqual(restoredHistory.slice(0, 50));
	});
});

/**
 * Creates an in-memory localStorage substitute for the node test environment.
 *
 * @returns A Storage-compatible object backed by a Map
 */
function createLocalStorageStub(): Storage {
	const entries = new Map<string, string>();
	return {
		get length() {
			return entries.size;
		},
		clear: () => entries.clear(),
		getItem: (key: string) => entries.get(key) ?? null,
		key: (index: number) => [...entries.keys()][index] ?? null,
		removeItem: (key: string) => {
			entries.delete(key);
		},
		setItem: (key: string, value: string) => {
			entries.set(key, String(value));
		}
	};
}

describe('initStores - 現在経路の復元', () => {
	const STORED_SCRIPT = '東京,東海道,大阪';
	let buildRouteResult: number | string;

	/** Minimal Farert stand-in exposing only the members initStores touches. */
	class FakeFarert {
		private script = '';

		/**
		 * Records the script and returns the configured rc for the test case.
		 *
		 * @param routeStr - routeScript string to rebuild
		 * @returns The rc value configured by the current test
		 */
		buildRoute(routeStr: string): number | string {
			this.script = routeStr;
			return buildRouteResult;
		}

		/**
		 * Returns the script captured by buildRoute.
		 *
		 * @returns routeScript string
		 */
		routeScript(): string {
			return this.script;
		}
	}

	const FakeFarertCtor = FakeFarert as unknown as new () => FaretClass;

	beforeEach(() => {
		vi.stubGlobal('window', {});
		vi.stubGlobal('localStorage', createLocalStorageStub());
		localStorage.setItem(STORAGE_KEYS.CURRENT_ROUTE, STORED_SCRIPT);
		mainRoute.set(null);
	});

	afterEach(() => {
		mainRoute.set(null);
		vi.unstubAllGlobals();
	});

	it('終端 rc(4) の完成経路も復元する', () => {
		buildRouteResult = 4;

		initStores(FakeFarertCtor);

		expect(get(mainRoute)).not.toBeNull();
		expect(localStorage.getItem(STORAGE_KEYS.CURRENT_ROUTE)).toBe(STORED_SCRIPT);
	});

	it('JSON 文字列で返る rc も成功として復元する', () => {
		buildRouteResult = '{"rc":5}';

		initStores(FakeFarertCtor);

		expect(get(mainRoute)).not.toBeNull();
		expect(localStorage.getItem(STORAGE_KEYS.CURRENT_ROUTE)).toBe(STORED_SCRIPT);
	});

	it('復元に失敗しても保存済みの経路データを削除しない', () => {
		buildRouteResult = -1;

		initStores(FakeFarertCtor);

		expect(get(mainRoute)).toBeNull();
		expect(localStorage.getItem(STORAGE_KEYS.CURRENT_ROUTE)).toBe(STORED_SCRIPT);
	});
});
