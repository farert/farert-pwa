/**
 * SvelteKit の base path を URL 組み立て用に正規化するユーティリティです。
 * 先頭スラッシュの付与と末尾スラッシュの除去を一箇所に集約します。
 */

/**
 * base path を「先頭スラッシュあり・末尾スラッシュなし」へ正規化します。
 *
 * @param path - SvelteKit の base（例: ''、'/'、'/farert'）
 * @returns 正規化された base path。ルート相当は空文字
 */
export function normalizeBasePath(path: string | undefined): string {
	if (!path || path === '/') return '';
	const prefixed = path.startsWith('/') ? path : `/${path}`;
	return prefixed.endsWith('/') ? prefixed.slice(0, -1) : prefixed;
}
