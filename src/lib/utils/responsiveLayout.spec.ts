import { describe, expect, it, vi } from 'vitest';
import {
	WIDE_SCREEN_MIN_WIDTH,
	isWideScreenViewport,
	observeWideScreenViewport
} from './responsiveLayout';

describe('responsiveLayout', () => {
	it('treats landscape phone widths around 700px as wide layout', () => {
		vi.stubGlobal('window', {
			innerWidth: WIDE_SCREEN_MIN_WIDTH,
			innerHeight: 390,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn()
		});

		expect(isWideScreenViewport()).toBe(true);
	});

	it('does not treat portrait viewports as wide layout even if width threshold is met', () => {
		vi.stubGlobal('window', {
			innerWidth: WIDE_SCREEN_MIN_WIDTH,
			innerHeight: 900,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn()
		});

		expect(isWideScreenViewport()).toBe(false);
	});

	it('observes viewport width changes through resize listeners', () => {
		const addEventListener = vi.fn();
		const removeEventListener = vi.fn();
		vi.stubGlobal('window', {
			innerWidth: WIDE_SCREEN_MIN_WIDTH - 1,
			innerHeight: 900,
			addEventListener,
			removeEventListener
		});

		const callback = vi.fn();
		const stop = observeWideScreenViewport(callback);

		expect(callback).toHaveBeenCalledWith(false);
		expect(addEventListener).toHaveBeenCalledWith('resize', expect.any(Function));

		stop();

		expect(removeEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
	});
});
