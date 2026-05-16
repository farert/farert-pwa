/**
 * アプリ全体で共有するグローバル型とビルド時定数を宣言します。
 * SvelteKit とビルド生成値の型境界をここでまとめます。
 */
// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	const __APP_VERSION__: string;
	const __BUILD_AT__: string;
	const __GIT_COMMIT_AT__: string;
	const __GIT_SHA__: string;
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
