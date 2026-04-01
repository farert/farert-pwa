export const WIDE_SCREEN_MIN_WIDTH = 900;

export function isWideScreenViewport(): boolean {
	if (typeof window === 'undefined') {
		return false;
	}
	return window.innerWidth >= WIDE_SCREEN_MIN_WIDTH;
}

export function observeWideScreenViewport(callback: (isWide: boolean) => void): () => void {
	if (typeof window === 'undefined') {
		callback(false);
		return () => {};
	}

	const sync = () => callback(isWideScreenViewport());
	sync();
	window.addEventListener('resize', sync);
	return () => {
		window.removeEventListener('resize', sync);
	};
}

export function scrollPageToTop(): void {
	window.scrollTo({ top: 0, behavior: 'smooth' });
}

export function scrollPageToBottom(): void {
	const scrollHeight = Math.max(
		document.documentElement.scrollHeight,
		document.body?.scrollHeight ?? 0
	);
	window.scrollTo({ top: scrollHeight, behavior: 'smooth' });
}
