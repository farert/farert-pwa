import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

describe('/terminal-selection/+page.svelte styles', () => {
	it('uses the purple theme gradient for the title bar', () => {
		const pagePath = fileURLToPath(new URL('./+page.svelte', import.meta.url));
		const source = readFileSync(pagePath, 'utf-8');

		expect(source).toContain(
			'background: linear-gradient(135deg, var(--station-grad-start), var(--station-grad-end));'
		);
	});

	it('uses the purple theme gradient for the active tab background', () => {
		const pagePath = fileURLToPath(new URL('./+page.svelte', import.meta.url));
		const source = readFileSync(pagePath, 'utf-8');

		expect(source).toContain('.tabs button.active');
		expect(source).toContain(
			'background: linear-gradient(135deg, var(--station-grad-start), var(--station-grad-end));'
		);
	});
});
