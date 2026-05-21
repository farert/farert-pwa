/**
 * PWA 設定値を検証するテストです。
 * マニフェストや Service Worker 設定の想定値を固定します。
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function readPngSize(path: string): { width: number; height: number } {
	const bytes = readFileSync(new URL(path, import.meta.url));
	return {
		width: bytes.readUInt32BE(16),
		height: bytes.readUInt32BE(20)
	};
}

describe('PWA config', () => {
	it('includes farert.data in the PWA precache glob pattern', () => {
		const source = readFileSync(new URL('../vite.config.ts', import.meta.url), 'utf-8');

		expect(source).toContain('globPatterns');
		expect(source).toContain('wasm,data');
	});

	it('defines properly sized app icons for the manifest', () => {
		const source = readFileSync(new URL('../vite.config.ts', import.meta.url), 'utf-8');

		expect(source).toContain("src: 'icon-192.png'");
		expect(source).toContain("sizes: '192x192'");
		expect(source).toContain("src: 'icon-512.png'");
		expect(source).toContain("sizes: '512x512'");
		expect(source).toContain("purpose: 'any'");
		expect(source).toContain("src: 'maskable-icon-192.png'");
		expect(source).toContain("src: 'maskable-icon-512.png'");
		expect(source).toContain("purpose: 'maskable'");
	});

	it('provides a static manifest for development requests', () => {
		const source = readFileSync(new URL('../static/manifest.webmanifest', import.meta.url), 'utf-8');

		expect(source).toContain('"short_name": "Farert"');
		expect(source).toContain('"start_url": "/"');
		expect(source).toContain('"src": "icon-192.png"');
		expect(source).toContain('"src": "icon-512.png"');
		expect(source).toContain('"src": "maskable-icon-192.png"');
		expect(source).toContain('"src": "maskable-icon-512.png"');
	});

	it('provides platform-specific home screen icons', () => {
		expect(readPngSize('../static/apple-touch-icon.png')).toEqual({ width: 180, height: 180 });
		expect(readPngSize('../static/maskable-icon-192.png')).toEqual({ width: 192, height: 192 });
		expect(readPngSize('../static/maskable-icon-512.png')).toEqual({ width: 512, height: 512 });
	});
});
