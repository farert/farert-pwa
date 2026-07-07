/**
 * 画面遷移時に使うアニメーション方向を判定するユーティリティです。
 * base path を吸収しつつ pathname の関係から遷移種別を返します。
 */
import { normalizeBasePath } from './basePath';

export type PageTransitionKind = 'none' | 'main-detail-forward' | 'detail-main-back';

/**
 * `normalizePathname` を正規化します。
 *
 * @param pathname 処理に必要な入力値です。
 * @param basePath 処理に必要な入力値です。
 * @returns 文字列結果を返します。
 */
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

/**
 * `resolvePageTransition` の解決結果を返します。
 *
 * @param fromPathname 処理に必要な入力値です。
 * @param toPathname 処理に必要な入力値です。
 * @param basePath 処理に必要な入力値です。
 * @returns 処理結果を返します。
 */
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
