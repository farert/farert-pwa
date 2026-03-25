export type PageTransitionKind = 'none' | 'main-detail-forward' | 'detail-main-back';

function normalizeBasePath(basePath: string): string {
	if (!basePath || basePath === '/') return '';
	return basePath.endsWith('/') ? basePath.slice(0, -1) : basePath;
}

function normalizePathname(pathname: string, basePath: string): string {
	const normalizedBase = normalizeBasePath(basePath);
	if (!normalizedBase) {
		return pathname || '/';
	}
	if (pathname === normalizedBase) return '/';
	if (pathname.startsWith(`${normalizedBase}/`)) {
		return pathname.slice(normalizedBase.length) || '/';
	}
	return pathname || '/';
}

export function resolvePageTransition(
	fromPathname: string,
	toPathname: string,
	basePath: string = '/'
): PageTransitionKind {
	const from = normalizePathname(fromPathname, basePath);
	const to = normalizePathname(toPathname, basePath);

	if (from === '/' && to === '/detail') {
		return 'main-detail-forward';
	}
	if (from === '/detail' && to === '/') {
		return 'detail-main-back';
	}
	if (from === '/' && to === '/line-selection') {
		return 'main-detail-forward';
	}
	if (from === '/line-selection' && to === '/') {
		return 'detail-main-back';
	}
	if (from === '/line-selection' && to === '/route-station-select') {
		return 'main-detail-forward';
	}
	if (from === '/route-station-select' && to === '/line-selection') {
		return 'detail-main-back';
	}
	return 'none';
}
