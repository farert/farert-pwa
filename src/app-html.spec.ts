import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('app.html', () => {
	it('loads external fonts and analytics only through online-gated dynamic injection', () => {
		const source = readFileSync(new URL('./app.html', import.meta.url), 'utf-8');

		expect(source).not.toContain('<link\n\t\t\trel="stylesheet"\n\t\t\thref="https://fonts.googleapis.com');
		expect(source).not.toContain('<script async src="https://www.googletagmanager.com/gtag/js');
		expect(source).toContain('navigator.onLine === false');
		expect(source).toContain("document.createElement('link')");
		expect(source).toContain("document.createElement('script')");
	});
});
