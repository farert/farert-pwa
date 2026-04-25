export interface PendingWorkerResult {
	registration: ServiceWorkerRegistration;
	worker: ServiceWorker | null;
}

export interface StartupServiceWorkerUpdateCheckOptions {
	basePath?: string;
	timeoutMs?: number;
	onPendingWorker(worker: ServiceWorker): void;
}

const READY_REGISTRATION_TIMEOUT_MS = 1500;

function normalizeBasePath(basePath = ''): string {
	if (!basePath || basePath === '/') {
		return '';
	}

	const prefixed = basePath.startsWith('/') ? basePath : `/${basePath}`;
	return prefixed.endsWith('/') ? prefixed.slice(0, -1) : prefixed;
}

export async function getReadyServiceWorkerRegistration(
	basePath = ''
): Promise<ServiceWorkerRegistration | null> {
	if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
		return null;
	}

	const normalizedBase = normalizeBasePath(basePath);
	const scope = `${normalizedBase}/`;
	const scriptUrl = `${normalizedBase}/service-worker.js`;

	try {
		const existingRegistration = await navigator.serviceWorker.getRegistration(scope);
		if (!existingRegistration) {
			await navigator.serviceWorker.register(scriptUrl, { scope });
		}
	} catch {
		// 登録確認失敗時も ready/getRegistration フォールバックへ進む
	}

	try {
		const readyRegistration = await Promise.race<ServiceWorkerRegistration | null>([
			navigator.serviceWorker.ready,
			new Promise<null>((resolve) => {
				setTimeout(() => resolve(null), READY_REGISTRATION_TIMEOUT_MS);
			})
		]);
		if (readyRegistration) {
			return readyRegistration;
		}
	} catch {
		// ready 待機失敗時は通常取得へフォールバック
	}

	try {
		return await navigator.serviceWorker.getRegistration(scope);
	} catch {
		return null;
	}
}

export async function waitForPendingWorker(
	registration: ServiceWorkerRegistration,
	timeoutMs = 3000
): Promise<ServiceWorker | null> {
	if (registration.waiting) {
		return registration.waiting;
	}

	const installingWorker = registration.installing;
	if (installingWorker) {
		return waitForInstalledWorker(registration, installingWorker, timeoutMs);
	}

	return new Promise<ServiceWorker | null>((resolve) => {
		let resolved = false;
		let timeoutId: ReturnType<typeof setTimeout> | null = null;

		const finish = (worker: ServiceWorker | null) => {
			if (resolved) return;
			resolved = true;
			if (timeoutId) clearTimeout(timeoutId);
			registration.removeEventListener('updatefound', onUpdateFound);
			resolve(worker);
		};

		const onUpdateFound = () => {
			const nextInstalling = registration.installing;
			if (!nextInstalling) {
				finish(registration.waiting ?? null);
				return;
			}
			void waitForInstalledWorker(registration, nextInstalling, timeoutMs).then(finish);
		};

		registration.addEventListener('updatefound', onUpdateFound);
		timeoutId = setTimeout(() => {
			finish(registration.waiting ?? null);
		}, timeoutMs);
	});
}

export async function detectPendingServiceWorkerUpdate(
	registration: ServiceWorkerRegistration,
	timeoutMs = 4000
): Promise<ServiceWorker | null> {
	if (registration.waiting) {
		return registration.waiting;
	}

	const pendingWorkerPromise = waitForPendingWorker(registration, timeoutMs);

	try {
		await registration.update();
	} catch {
		// 更新確認失敗時も、既に待機中 worker があれば拾う
	}

	return (await pendingWorkerPromise) ?? registration.waiting ?? null;
}

export function startStartupServiceWorkerUpdateCheck({
	basePath = '',
	timeoutMs = 4000,
	onPendingWorker
}: StartupServiceWorkerUpdateCheckOptions): () => void {
	if (
		typeof navigator === 'undefined' ||
		typeof window === 'undefined' ||
		!('serviceWorker' in navigator)
	) {
		return () => {};
	}

	let disposed = false;
	let checking = false;

	const runCheck = async () => {
		if (checking || disposed) return;
		checking = true;

		try {
			const registration = await getReadyServiceWorkerRegistration(basePath);
			if (!registration || disposed) return;

			const worker = await detectPendingServiceWorkerUpdate(registration, timeoutMs);
			if (worker && !disposed) {
				onPendingWorker(worker);
			}
		} catch {
			// 起動時更新確認失敗時は通常利用を継続する
		} finally {
			checking = false;
		}
	};

	const onOnline = () => {
		void runCheck();
	};

	void runCheck();
	window.addEventListener('online', onOnline);

	return () => {
		disposed = true;
		window.removeEventListener('online', onOnline);
	};
}

async function waitForInstalledWorker(
	registration: ServiceWorkerRegistration,
	worker: ServiceWorker,
	timeoutMs: number
): Promise<ServiceWorker | null> {
	if (worker.state === 'installed') {
		return registration.waiting ?? worker;
	}

	return new Promise<ServiceWorker | null>((resolve) => {
		let resolved = false;
		const timeoutId = setTimeout(() => {
			if (resolved) return;
			resolved = true;
			worker.removeEventListener('statechange', onStateChange);
			resolve(registration.waiting ?? null);
		}, timeoutMs);

		const onStateChange = () => {
			if (resolved) return;
			if (worker.state === 'installed') {
				resolved = true;
				clearTimeout(timeoutId);
				worker.removeEventListener('statechange', onStateChange);
				resolve(registration.waiting ?? worker);
			}
			if (worker.state === 'redundant') {
				resolved = true;
				clearTimeout(timeoutId);
				worker.removeEventListener('statechange', onStateChange);
				resolve(registration.waiting ?? null);
			}
		};

		worker.addEventListener('statechange', onStateChange);
	});
}
