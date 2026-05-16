/**
 * テスト実行基盤の疎通を確認する最小のサンプルテストです。
 * Vitest の基本動作が保たれていることを確認します。
 */
import { describe, it, expect } from 'vitest';

describe('sum test', () => {
	it('adds 1 + 2 to equal 3', () => {
		expect(1 + 2).toBe(3);
	});
});
