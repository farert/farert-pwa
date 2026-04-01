import { describe, expect, it } from 'vitest';
import { shouldCacheNetworkResponse, shouldServeShellFallback } from './serviceWorkerNavigation';

describe('serviceWorkerNavigation', () => {
	it('caches only successful 200 responses', () => {
		expect(shouldCacheNetworkResponse(200)).toBe(true);
		expect(shouldCacheNetworkResponse(204)).toBe(false);
		expect(shouldCacheNetworkResponse(500)).toBe(false);
	});

	it('serves shell fallback for navigate requests when network throws', () => {
		expect(shouldServeShellFallback('navigate')).toBe(true);
	});

	it('serves shell fallback for HTML document requests even when mode is not navigate', () => {
		expect(shouldServeShellFallback('same-origin', undefined, 'document')).toBe(true);
		expect(shouldServeShellFallback('same-origin', undefined, '', 'text/html,application/xhtml+xml')).toBe(
			true
		);
	});

	it('serves shell fallback for navigate requests with 4xx/5xx responses', () => {
		expect(shouldServeShellFallback('navigate', 404)).toBe(true);
		expect(shouldServeShellFallback('navigate', 500)).toBe(true);
	});

	it('does not serve shell fallback for successful navigate responses', () => {
		expect(shouldServeShellFallback('navigate', 200)).toBe(false);
		expect(shouldServeShellFallback('navigate', 302)).toBe(false);
	});

	it('does not serve shell fallback for non-navigate requests', () => {
		expect(shouldServeShellFallback('same-origin', 500)).toBe(false);
		expect(shouldServeShellFallback('cors')).toBe(false);
		expect(shouldServeShellFallback('same-origin', 500, 'script', 'text/javascript')).toBe(false);
	});
});
