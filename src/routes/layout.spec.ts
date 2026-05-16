/**
 * レイアウト設定の基本挙動を検証するテストです。
 * アプリ共通レイアウトの前提条件が保たれることを確認します。
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

describe('/+layout.svelte', () => {
	it('does not hint transform on the page transition shell to keep fixed bottom bars anchored to the viewport', () => {
		const layoutPath = fileURLToPath(new URL('./+layout.svelte', import.meta.url));
		const source = readFileSync(layoutPath, 'utf-8');

		expect(source).not.toContain('will-change: transform, opacity;');
		expect(source).not.toContain('will-change: transform;');
	});

	it('resolves the favicon path from the app base path', () => {
		const layoutPath = fileURLToPath(new URL('./+layout.svelte', import.meta.url));
		const source = readFileSync(layoutPath, 'utf-8');

		expect(source).toContain('<link rel="icon" href={`${base}/favicon.png`} />');
	});

	it('does not require an active controller before showing the update notification', () => {
		const layoutPath = fileURLToPath(new URL('./+layout.svelte', import.meta.url));
		const source = readFileSync(layoutPath, 'utf-8');

		expect(source).not.toContain("if (!navigator.serviceWorker.controller)");
	});
});
