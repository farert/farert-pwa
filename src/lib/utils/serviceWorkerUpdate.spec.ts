/**
 * Service Worker 更新検知のユーティリティを検証するテストです。
 * 登録取得、待機 worker 監視、更新通知の流れを固定します。
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as serviceWorkerUpdate from './serviceWorkerUpdate';

/**
 * `createWorker` を生成します。
 *
 * @param initialState 処理に必要な入力値です。
 * @returns この処理は戻り値を持ちません。
 */
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

/**
 * `createRegistration` を生成します。
 *
 * @returns この処理は戻り値を持ちません。
 */
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

		await expect(serviceWorkerUpdate.waitForPendingWorker(registration, 50)).resolves.toBe(worker);
	});

	it('waits for installing worker to become installed', async () => {
		const { registration, setInstalling, setWaiting } = createRegistration();
		const candidate = createWorker('installing');
		setInstalling(candidate.worker);

		const pending = serviceWorkerUpdate.waitForPendingWorker(registration, 100);
		setWaiting(candidate.worker);
		candidate.setState('installed');

		await expect(pending).resolves.toBe(candidate.worker);
	});

	it('waits for updatefound when no worker is present yet', async () => {
		vi.useFakeTimers();
		const { registration, setInstalling, setWaiting, emitUpdateFound } = createRegistration();
		const candidate = createWorker('installing');

		const pending = serviceWorkerUpdate.waitForPendingWorker(registration, 1000);
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

		const pending = serviceWorkerUpdate.getReadyServiceWorkerRegistration();
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

		await expect(serviceWorkerUpdate.getReadyServiceWorkerRegistration()).resolves.toBe(registration);
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

		await expect(serviceWorkerUpdate.getReadyServiceWorkerRegistration('/farert-pwa')).resolves.toBe(registration);
		expect(getRegistration).toHaveBeenCalledWith('/farert-pwa/');
		expect(register).toHaveBeenCalledWith('/farert-pwa/service-worker.js', {
			scope: '/farert-pwa/'
		});
	});

	it('checks registration.update and returns a newly waiting worker', async () => {
		const { registration, setWaiting } = createRegistration();
		const { worker } = createWorker('installed');
		const update = vi.fn().mockImplementation(async () => {
			setWaiting(worker);
		});
		const registrationWithUpdate = Object.assign(registration, { update });

		await expect(
			serviceWorkerUpdate.detectPendingServiceWorkerUpdate(registrationWithUpdate, 50)
		).resolves.toBe(worker);
		expect(update).toHaveBeenCalledOnce();
	});

	it('notifies about a waiting worker on startup even when no controller is present', async () => {
		const { registration, setWaiting } = createRegistration();
		const { worker } = createWorker('installed');
		setWaiting(worker);
		const registrationWithUpdate = Object.assign(registration, {
			update: vi.fn().mockResolvedValue(undefined)
		});
		const getRegistration = vi.fn().mockResolvedValue(registrationWithUpdate);
		const register = vi.fn().mockResolvedValue(registrationWithUpdate);
		const onPendingWorker = vi.fn();
		const addEventListener = vi.fn();
		const removeEventListener = vi.fn();

		vi.stubGlobal('navigator', {
			serviceWorker: {
				controller: null,
				ready: Promise.resolve(registrationWithUpdate),
				getRegistration,
				register
			}
		});
		vi.stubGlobal('window', {
			addEventListener,
			removeEventListener
		});

		const dispose = serviceWorkerUpdate.startStartupServiceWorkerUpdateCheck({
			basePath: '/farert-pwa',
			onPendingWorker
		});

		await vi.waitFor(() => {
			expect(onPendingWorker).toHaveBeenCalledWith(worker);
		});
		expect(getRegistration).toHaveBeenCalledWith('/farert-pwa/');
		expect(addEventListener).toHaveBeenCalledWith('online', expect.any(Function));

		dispose();
		expect(removeEventListener).toHaveBeenCalledWith('online', expect.any(Function));
	});

	it('retries the startup update check when the browser comes online', async () => {
		const { registration, setWaiting } = createRegistration();
		const { worker } = createWorker('installed');
		setWaiting(worker);
		const registrationWithUpdate = Object.assign(registration, {
			update: vi.fn().mockResolvedValue(undefined)
		});
		const onPendingWorker = vi.fn();
		const getRegistration = vi.fn().mockResolvedValue(registrationWithUpdate);
		const listeners = new Map<string, () => void>();

		vi.stubGlobal('navigator', {
			serviceWorker: {}
		});
		Object.assign((globalThis.navigator as { serviceWorker: Record<string, unknown> }).serviceWorker, {
			ready: Promise.resolve(registrationWithUpdate),
			getRegistration,
			register: vi.fn().mockResolvedValue(registrationWithUpdate)
		});
		vi.stubGlobal('window', {
			addEventListener: vi.fn((event: string, listener: () => void) => {
				listeners.set(event, listener);
			}),
			removeEventListener: vi.fn((event: string) => {
				listeners.delete(event);
			})
		});

		const dispose = serviceWorkerUpdate.startStartupServiceWorkerUpdateCheck({
			onPendingWorker
		});

		await vi.waitFor(() => {
			expect(getRegistration).toHaveBeenCalledTimes(1);
		});
		await vi.waitFor(() => {
			expect(onPendingWorker).toHaveBeenCalledTimes(1);
		});
		await new Promise((resolve) => setTimeout(resolve, 0));

		listeners.get('online')?.();

		await vi.waitFor(() => {
			expect(getRegistration).toHaveBeenCalledTimes(2);
		});
		await vi.waitFor(() => {
			expect(onPendingWorker).toHaveBeenCalledTimes(2);
		});
		expect(onPendingWorker).toHaveBeenLastCalledWith(worker);

		dispose();
	});
});
