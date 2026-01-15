export const APP_VERSION: string =
	typeof __APP_VERSION__ === 'string' && __APP_VERSION__ ? __APP_VERSION__ : 'dev';

export const BUILD_AT: string =
	typeof __BUILD_AT__ === 'string' && __BUILD_AT__ ? __BUILD_AT__ : '';

export const GIT_COMMIT_AT: string =
	typeof __GIT_COMMIT_AT__ === 'string' && __GIT_COMMIT_AT__ ? __GIT_COMMIT_AT__ : '';

export const GIT_SHA: string =
	typeof __GIT_SHA__ === 'string' && __GIT_SHA__ ? __GIT_SHA__ : '';
