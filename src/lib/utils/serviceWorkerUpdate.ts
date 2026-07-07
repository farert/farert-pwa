/**
 * Service Worker 更新確認と適用待機を扱うユーティリティです。
 * 起動時チェックと pending worker の検知ロジックをまとめます。
 */
import { normalizeBasePath } from './basePath';

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

/**
 * `getReadyServiceWorkerRegistration` を取得します。
 *
 * @param basePath 処理に必要な入力値です。
 * @returns 非同期処理の結果を返します。
 */
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
		return (await navigator.serviceWorker.getRegistration(scope)) ?? null;
	} catch {
		return null;
	}
}

/**
 * `waitForPendingWorker` の完了を待機します。
 *
 * @param registration 処理に必要な入力値です。
 * @param timeoutMs 処理に必要な入力値です。
 * @returns 非同期処理の結果を返します。
 */
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

		/**
		 * `finish` を処理します。
		 *
		 * @param worker 処理に必要な入力値です。
		 * @returns この処理は戻り値を持ちません。
		 */
		const finish = (worker: ServiceWorker | null) => {
			if (resolved) return;
			resolved = true;
			if (timeoutId) clearTimeout(timeoutId);
			registration.removeEventListener('updatefound', onUpdateFound);
			resolve(worker);
		};

		/**
		 * `onUpdateFound` を処理します。
		 *
		 * @returns この処理は戻り値を持ちません。
		 */
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

/**
 * `detectPendingServiceWorkerUpdate` を処理します。
 *
 * @param registration 処理に必要な入力値です。
 * @param timeoutMs 処理に必要な入力値です。
 * @returns 非同期処理の結果を返します。
 */
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

/**
 * `startStartupServiceWorkerUpdateCheck` を処理します。
 *
 * @param options 受け取り値のまとまりです。
 * @returns 処理結果を返します。
 */
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

	/**
	 * `runCheck` を処理します。
	 *
	 * @returns この処理は戻り値を持ちません。
	 */
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

	/**
	 * `onOnline` を処理します。
	 *
	 * @returns この処理は戻り値を持ちません。
	 */
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

/**
 * `waitForInstalledWorker` の完了を待機します。
 *
 * @param registration 処理に必要な入力値です。
 * @param worker 処理に必要な入力値です。
 * @param timeoutMs 処理に必要な入力値です。
 * @returns 非同期処理の結果を返します。
 */
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

		/**
		 * `onStateChange` を処理します。
		 *
		 * @returns この処理は戻り値を持ちません。
		 */
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
