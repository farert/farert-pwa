import type { FaretClass } from '$lib/wasm/types';

export function getSerializedRouteScript(route: FaretClass): string {
	try {
		return route.routeScript().trim();
	} catch {
		return '';
	}
}

