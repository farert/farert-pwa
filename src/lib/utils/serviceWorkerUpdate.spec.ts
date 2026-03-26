import { describe, expect, it, vi } from 'vitest';
import { waitForPendingWorker } from './serviceWorkerUpdate';

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
		vi.useRealTimers();
	});
});
