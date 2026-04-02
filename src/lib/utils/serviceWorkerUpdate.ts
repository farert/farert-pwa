export interface PendingWorkerResult {
	registration: ServiceWorkerRegistration;
	worker: ServiceWorker | null;
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
