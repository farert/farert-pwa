export function shouldCacheNetworkResponse(status: number): boolean {
	return status === 200;
}

export function shouldServeShellFallback(requestMode: RequestMode, status?: number): boolean {
	if (requestMode !== 'navigate') {
		return false;
	}

	if (status === undefined) {
		return true;
	}

	return status >= 400;
}
