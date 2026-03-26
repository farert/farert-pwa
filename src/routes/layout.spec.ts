import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

describe('/+layout.svelte', () => {
	it('does not hint transform on the page transition shell to keep fixed bottom bars anchored to the viewport', () => {
		const layoutPath = fileURLToPath(new URL('./+layout.svelte', import.meta.url));
		const source = readFileSync(layoutPath, 'utf-8');

		expect(source).not.toContain('will-change: transform, opacity;');
		expect(source).not.toContain('will-change: transform;');
	});
});
