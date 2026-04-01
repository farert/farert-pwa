export function shouldCacheNetworkResponse(status: number): boolean {
	return status === 200;
}

function isDocumentRequest(
	requestMode: RequestMode,
	requestDestination?: RequestDestination,
	acceptHeader?: string | null
): boolean {
	if (requestMode === 'navigate') {
		return true;
	}

	if (requestDestination === 'document') {
		return true;
	}

	return Boolean(acceptHeader?.includes('text/html'));
}

export function shouldServeShellFallback(
	requestMode: RequestMode,
	status?: number,
	requestDestination?: RequestDestination,
	acceptHeader?: string | null
): boolean {
	if (!isDocumentRequest(requestMode, requestDestination, acceptHeader)) {
		return false;
	}

	if (status === undefined) {
		return true;
	}

	return status >= 400;
}
