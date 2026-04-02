import { expect, test, type Page } from '@playwright/test';
import LZString from 'lz-string';

const BASE_PATH = '/farert-pwa';
const DETAIL_ROUTE = LZString.compressToEncodedURIComponent('東京,東海道線,熱海');

async function openControlledPage(page: Page): Promise<Page> {
	await page.goto(`${BASE_PATH}/`);
	await page.waitForLoadState('load');
	await page.waitForFunction(async () => {
		const registration = await navigator.serviceWorker.getRegistration();
		return Boolean(registration?.active);
	});

	const controlledPage = await page.context().newPage();
	await controlledPage.goto(`${BASE_PATH}/`);
	await controlledPage.waitForLoadState('load');
	await controlledPage.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
	return controlledPage;
}

test('service worker keeps main, save, detail, and terminal-selection usable offline', async ({
	page,
	context
}) => {
	const controlledPage = await openControlledPage(page);

	await context.setOffline(true);

	await controlledPage.goto(`${BASE_PATH}/`);
	await expect(controlledPage.getByRole('heading', { name: '経路運賃営業キロ計算' })).toBeVisible();

	await controlledPage.goto(`${BASE_PATH}/save`);
	await expect(controlledPage.getByRole('heading', { name: '経路保存' })).toBeVisible();

	await controlledPage.goto(`${BASE_PATH}/detail?r=${DETAIL_ROUTE}`);
	await expect(controlledPage.getByRole('heading', { name: '東京 → 熱海' })).toBeVisible();
	await expect(controlledPage.getByRole('heading', { name: '運賃' })).toBeVisible();

	await controlledPage.goto(`${BASE_PATH}/terminal-selection?mode=departure`);
	await expect(controlledPage.getByRole('heading', { name: '発駅選択' })).toBeVisible();
});
