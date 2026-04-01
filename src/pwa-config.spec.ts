import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('PWA config', () => {
	it('includes farert.data in the PWA precache glob pattern', () => {
		const source = readFileSync(new URL('../vite.config.ts', import.meta.url), 'utf-8');

		expect(source).toContain('globPatterns');
		expect(source).toContain('wasm,data');
	});
});
