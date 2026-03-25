import { describe, expect, it } from 'vitest';
import { resolvePageTransition } from './pageTransition';

describe('pageTransition utilities', () => {
	it('returns forward transition when navigating from main to detail', () => {
		expect(resolvePageTransition('/', '/detail')).toBe('main-detail-forward');
	});

	it('returns backward transition when navigating from detail to main', () => {
		expect(resolvePageTransition('/detail', '/')).toBe('detail-main-back');
	});

	it('normalizes base path before comparing routes', () => {
		expect(resolvePageTransition('/farert-pwa/', '/farert-pwa/detail', '/farert-pwa/')).toBe(
			'main-detail-forward'
		);
		expect(resolvePageTransition('/farert-pwa/detail', '/farert-pwa/', '/farert-pwa/')).toBe(
			'detail-main-back'
		);
	});

	it('returns none for unrelated routes', () => {
		expect(resolvePageTransition('/save', '/detail')).toBe('none');
		expect(resolvePageTransition('/', '/save')).toBe('none');
	});

	it('returns forward transition when navigating from main to line selection', () => {
		expect(resolvePageTransition('/', '/line-selection')).toBe('main-detail-forward');
	});

	it('returns backward transition when navigating from line selection to main', () => {
		expect(resolvePageTransition('/line-selection', '/')).toBe('detail-main-back');
	});

	it('returns forward transition when navigating from line selection to route station selection', () => {
		expect(resolvePageTransition('/line-selection', '/route-station-select')).toBe(
			'main-detail-forward'
		);
	});

	it('returns backward transition when navigating from route station selection to line selection', () => {
		expect(resolvePageTransition('/route-station-select', '/line-selection')).toBe(
			'detail-main-back'
		);
	});
});
