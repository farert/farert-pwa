import { afterEach, describe, expect, it, vi } from 'vitest';
import { getReadyServiceWorkerRegistration, waitForPendingWorker } from './serviceWorkerUpdate';

function createWorker(initialState: ServiceWorkerState) {
	let state = initialState;
	const listeners = new Set<() => void>();

	return {
		worker: {
			get state() {
				return state;
			},
			addEventListener: (_event: string, listener: () => void) => {
				listeners.add(listener);
			},
			removeEventListener: (_event: string, listener: () => void) => {
				listeners.delete(listener);
			}
		} as unknown as ServiceWorker,
		setState(nextState: ServiceWorkerState) {
			state = nextState;
			for (const listener of listeners) {
				listener();
			}
		}
	};
}

function createRegistration() {
	let waiting: ServiceWorker | null = null;
	let installing: ServiceWorker | null = null;
	const listeners = new Set<() => void>();

	return {
		registration: {
			get waiting() {
				return waiting;
			},
			get installing() {
				return installing;
			},
			addEventListener: (_event: string, listener: () => void) => {
				listeners.add(listener);
			},
			removeEventListener: (_event: string, listener: () => void) => {
				listeners.delete(listener);
			}
		} as unknown as ServiceWorkerRegistration,
		setWaiting(worker: ServiceWorker | null) {
			waiting = worker;
		},
		setInstalling(worker: ServiceWorker | null) {
			installing = worker;
		},
		emitUpdateFound() {
			for (const listener of listeners) {
				listener();
			}
		}
	};
}

describe('serviceWorkerUpdate', () => {
	afterEach(() => {
		vi.useRealTimers();
		vi.unstubAllGlobals();
	});

	it('returns waiting worker immediately when already present', async () => {
		const { registration, setWaiting } = createRegistration();
		const { worker } = createWorker('installed');
		setWaiting(worker);

		await expect(waitForPendingWorker(registration, 50)).resolves.toBe(worker);
	});

	it('waits for installing worker to become installed', async () => {
		const { registration, setInstalling, setWaiting } = createRegistration();
		const candidate = createWorker('installing');
		setInstalling(candidate.worker);

		const pending = waitForPendingWorker(registration, 100);
		setWaiting(candidate.worker);
		candidate.setState('installed');

		await expect(pending).resolves.toBe(candidate.worker);
	});

	it('waits for updatefound when no worker is present yet', async () => {
		vi.useFakeTimers();
		const { registration, setInstalling, setWaiting, emitUpdateFound } = createRegistration();
		const candidate = createWorker('installing');

		const pending = waitForPendingWorker(registration, 1000);
		setInstalling(candidate.worker);
		emitUpdateFound();
		setWaiting(candidate.worker);
		candidate.setState('installed');

		await expect(pending).resolves.toBe(candidate.worker);
	});

	it('falls back to getRegistration when serviceWorker.ready does not resolve promptly', async () => {
		vi.useFakeTimers();
		const registration = { scope: '/' } as ServiceWorkerRegistration;
		const getRegistration = vi.fn().mockResolvedValue(registration);
		const register = vi.fn().mockResolvedValue(registration);
		vi.stubGlobal('navigator', {
			serviceWorker: {
				ready: new Promise<ServiceWorkerRegistration>(() => {}),
				getRegistration,
				register
			}
		});

		const pending = getReadyServiceWorkerRegistration();
		await vi.advanceTimersByTimeAsync(1500);

		await expect(pending).resolves.toBe(registration);
		expect(getRegistration).toHaveBeenCalledWith('/');
		expect(register).not.toHaveBeenCalled();
	});

	it('returns ready registration immediately when it resolves before timeout', async () => {
		vi.useFakeTimers();
		const registration = { scope: '/' } as ServiceWorkerRegistration;
		const getRegistration = vi.fn().mockResolvedValue(null);
		const register = vi.fn().mockResolvedValue(registration);
		vi.stubGlobal('navigator', {
			serviceWorker: {
				ready: Promise.resolve(registration),
				getRegistration,
				register
			}
		});

		await expect(getReadyServiceWorkerRegistration()).resolves.toBe(registration);
		expect(getRegistration).toHaveBeenCalledWith('/');
		expect(register).toHaveBeenCalledWith('/service-worker.js', { scope: '/' });
	});

	it('registers service worker with base path aware URL when missing', async () => {
		vi.useFakeTimers();
		const registration = { scope: '/farert-pwa/' } as ServiceWorkerRegistration;
		const getRegistration = vi.fn().mockResolvedValue(null);
		const register = vi.fn().mockResolvedValue(registration);
		vi.stubGlobal('navigator', {
			serviceWorker: {
				ready: Promise.resolve(registration),
				getRegistration,
				register
			}
		});

		await expect(getReadyServiceWorkerRegistration('/farert-pwa')).resolves.toBe(registration);
		expect(getRegistration).toHaveBeenCalledWith('/farert-pwa/');
		expect(register).toHaveBeenCalledWith('/farert-pwa/service-worker.js', {
			scope: '/farert-pwa/'
		});
	});
});
