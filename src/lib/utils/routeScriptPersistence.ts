/**
 * WASM の経路オブジェクトから永続化用文字列を取り出す補助です。
 * 保存や共有で使う routeScript の取得ルールを一本化します。
 */
import type { FaretClass } from '$lib/wasm/types';

/**
 * `getSerializedRouteScript` を取得します。
 *
 * @param route 対象の経路または経路文字列です。
 * @returns 文字列結果を返します。
 */
export function getSerializedRouteScript(route: FaretClass): string {
	try {
		return route.routeScript().trim();
	} catch {
		return '';
	}
}

