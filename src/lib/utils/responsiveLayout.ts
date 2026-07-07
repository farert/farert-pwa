/**
 * 画面幅に応じたレイアウト分岐とスクロール補助を提供するユーティリティです。
 * ワイド画面判定とページ上下スクロールを共通化します。
 */
export const WIDE_SCREEN_MIN_WIDTH = 700;

/**
 * `isWideScreenViewport` の判定結果を返します。
 *
 * @returns 判定結果を返します。
 */
export function isWideScreenViewport(): boolean {
	if (typeof window === 'undefined') {
		return false;
	}
	return window.innerWidth >= WIDE_SCREEN_MIN_WIDTH && window.innerWidth > window.innerHeight;
}

/**
 * `observeWideScreenViewport` を処理します。
 *
 * @param callback 処理結果を受け取るコールバックです。
 * @returns 処理結果を返します。
 */
export function observeWideScreenViewport(callback: (isWide: boolean) => void): () => void {
	if (typeof window === 'undefined') {
		callback(false);
		return () => {};
	}

	/**
	 * `sync` を処理します。
	 *
	 * @returns この処理は戻り値を持ちません。
	 */
	const sync = () => callback(isWideScreenViewport());
	sync();
	window.addEventListener('resize', sync);
	return () => {
		window.removeEventListener('resize', sync);
	};
}

/**
 * `scrollPageToTop` を処理します。
 *
 * @returns この処理は戻り値を持ちません。
 */
export function scrollPageToTop(): void {
	window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * `scrollPageToBottom` を処理します。
 *
 * @returns この処理は戻り値を持ちません。
 */
export function scrollPageToBottom(): void {
	const scrollHeight = Math.max(
		document.documentElement.scrollHeight,
		document.body?.scrollHeight ?? 0
	);
	window.scrollTo({ top: scrollHeight, behavior: 'smooth' });
}
