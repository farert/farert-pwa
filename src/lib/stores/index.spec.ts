/**
 * 駅選択履歴ストアの件数上限と並び順を検証します。
 * 発駅・着駅で共有する履歴が最大50件に制限される契約を固定します。
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { get } from 'svelte/store';
import { addToStationHistory, stationHistory } from './index';

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
