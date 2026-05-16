import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import { writable, get, type Writable } from 'svelte/store';
import type { FaretClass } from '$lib/wasm/types';
import { FareType } from '$lib/types';

class MockFarert implements FaretClass {
	script = '';
	static buildRouteMock = vi.fn<[string], number | string>(() => 0);
	static addRouteMock = vi.fn<[string, string], number>(() => 0);

	addStartRoute(station: string): number {
		this.script = station;
		return 0;
	}

	addRoute(line: string, station: string): number {
		const result = MockFarert.addRouteMock(line, station);
		if (result < 0) {
			return result;
		}
		if (!this.script) {
			this.script = station;
		} else {
			this.script += `,${line},${station}`;
		}
		return 0;
	}

	autoRoute(): number {
		return 0;
	}

	getRouteCount(): number {
		return Math.max(0, (this.script.split(',').length - 1) / 2);
	}

	departureStationName(): string {
		return this.script.split(',')[0] ?? '';
	}

	arrivevalStationName(): string {
		const tokens = this.script.split(',');
		return tokens[tokens.length - 1] ?? '';
	}

	buildRoute(routeStr: string): number | string {
		this.script = routeStr;
		return MockFarert.buildRouteMock(routeStr);
	}

	routeScript(): string {
		return this.script;
	}

	removeAll(): void {
		this.script = '';
	}

	removeTail(): void {
		return;
	}

	reverse(): number {
		return 0;
	}

	assign(): void {
		return;
	}

	typeOfPassedLine(): number {
		return 0;
	}

	setDetour(): number {
		return 0;
	}

	setNoRule(): void {
		return;
	}

	showFare(): string {
		return '';
	}

	setLongRoute(): void {
		return;
	}

	setJrTokaiStockApply(): void {
		return;
	}

	setStartAsCity(): void {
		return;
	}

	setArrivalAsCity(): void {
		return;
	}

	setSpecificTermRule115(): void {
		return;
	}

	isNotSameKokuraHakataShinZai(): boolean {
		return true;
	}

	isAvailableReverse(): boolean {
		return true;
	}

	isOsakakanDetourEnable(): boolean {
		return true;
	}

	isOsakakanDetour(): boolean {
		return false;
	}

	setNotSameKokuraHakataShinZai(): void {
		return;
	}

	getFareInfoObjectJson(): string {
		return '{}';
	}

	getRoutesJson(): string {
		return '[]';
	}

	getRouteRecord(): string {
		return this.script;
	}
}

const gotoMock = vi.fn();

vi.mock('$app/navigation', () => ({
	goto: (...args: unknown[]) => gotoMock(...args)
}));

const initFarertMock = vi.fn().mockResolvedValue(undefined);

vi.mock('$lib/wasm', () => ({
	initFarert: () => initFarertMock(),
	Farert: MockFarert
}));

const mainRouteStore: Writable<FaretClass | null> = writable(null);
const savedRoutesStore: Writable<string[]> = writable([]);
const ticketHolderStore: Writable<unknown[]> = writable([]);
const stationHistoryStore: Writable<string[]> = writable([]);
const initStoresMock = vi.fn();

vi.mock('$lib/stores', () => ({
	mainRoute: mainRouteStore,
	savedRoutes: savedRoutesStore,
	ticketHolder: ticketHolderStore,
	stationHistory: stationHistoryStore,
	initStores: (...args: unknown[]) => initStoresMock(...args)
}));

const { default: SavePage } = await import('./+page.svelte');

describe('/save/+page.svelte', () => {
	beforeEach(() => {
		vi.unstubAllGlobals();
		gotoMock.mockReset();
		initFarertMock.mockResolvedValue(undefined);
		MockFarert.buildRouteMock.mockReset();
		MockFarert.buildRouteMock.mockReturnValue(0);
		MockFarert.addRouteMock.mockReset();
		MockFarert.addRouteMock.mockReturnValue(0);
		mainRouteStore.set(null);
		savedRoutesStore.set([]);
		ticketHolderStore.set([]);
		stationHistoryStore.set([]);
	});

	it('現在の経路と保存済み経路を表示する', async () => {
		const current = new MockFarert();
		current.addStartRoute('東京');
		current.addRoute('東海道新幹線', '新大阪');
		current.addRoute('山陽新幹線', '博多');
		mainRouteStore.set(current);
		savedRoutesStore.set(['柏木平,釜石線,陸羽東線']);

		render(SavePage);

		await expect
			.element(page.getByText('東京,東海道新幹線,新大阪,山陽新幹線,博多'))
			.toBeInTheDocument();
		await expect.element(page.getByText('柏木平,釜石線,陸羽東線')).toBeInTheDocument();
	});

	it('保存ボタンで現在の経路を保存する', async () => {
		const current = new MockFarert();
		current.addStartRoute('東京');
		current.addRoute('東海道線', '熱海');
		current.addRoute('伊東線', '伊東');
		current.addRoute('伊豆急行', '伊豆急下田');
		mainRouteStore.set(current);

		render(SavePage);

		const saveButton = page.getByRole('button', { name: '保存', exact: true });
		await saveButton.click();

		expect(get(savedRoutesStore)).toContain('東京,東海道線,熱海,伊東線,伊東,伊豆急行,伊豆急下田');
	});

	it('保存通知は数秒後に自動で消える', async () => {
		vi.useFakeTimers();
		try {
			const current = new MockFarert();
			current.buildRoute('東京,東海道線,熱海,伊東線,伊東');
			mainRouteStore.set(current);
			savedRoutesStore.set(['東京,東海道線,熱海,伊東線,伊東']);

			render(SavePage);

			await page.getByRole('button', { name: '保存', exact: true }).click();
			await expect.element(page.getByText('すでに保存済みです。')).toBeInTheDocument();

			await vi.advanceTimersByTimeAsync(3000);
			await expect.element(page.getByText('すでに保存済みです。')).not.toBeInTheDocument();
		} finally {
			vi.useRealTimers();
		}
	});

	it('保存済み経路が30件以上あると上下スクロールボタンを表示する', async () => {
		const routes = Array.from({ length: 30 }, (_, index) => `東京,東海道線,熱海${index}`);
		savedRoutesStore.set(routes);
		const scrollSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});

		try {
			render(SavePage);

			await expect
				.element(page.getByRole('button', { name: '一覧の先頭へスクロール' }))
				.toBeInTheDocument();
			await expect
				.element(page.getByRole('button', { name: '一覧の末尾へスクロール' }))
				.toBeInTheDocument();

			await page.getByRole('button', { name: '一覧の先頭へスクロール' }).click();
			expect(scrollSpy).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });

			await page.getByRole('button', { name: '一覧の末尾へスクロール' }).click();
			expect(scrollSpy).toHaveBeenCalled();
		} finally {
			scrollSpy.mockRestore();
		}
	});

	it('既存の保存経路重複を初期表示時に解消する', async () => {
		savedRoutesStore.set(['東京,東海道線,熱海', ' 東京,東海道線,熱海 ', '', '仙台,東北線,盛岡']);
		render(SavePage);

		await expect.element(page.getByText('東京,東海道線,熱海')).toBeInTheDocument();
		expect(get(savedRoutesStore)).toEqual(['東京,東海道線,熱海', '仙台,東北線,盛岡']);
	});

	it('同一経路が保存済みなら保存時に重複追加しない', async () => {
		const current = new MockFarert();
		current.buildRoute('東京,東海道線,熱海,伊東線,伊東');
		mainRouteStore.set(current);
		savedRoutesStore.set([' 東京,東海道線,熱海,伊東線,伊東 ']);
		render(SavePage);

		const saveButton = page.getByRole('button', { name: '保存', exact: true });
		await saveButton.click();

		expect(get(savedRoutesStore)).toEqual(['東京,東海道線,熱海,伊東線,伊東']);
	});

	it('現在経路と保存経路が同一でも表示は1行にする', async () => {
		const current = new MockFarert();
		current.buildRoute('東京,東海道線,熱海,伊東線,伊東');
		mainRouteStore.set(current);
		savedRoutesStore.set(['東京,東海道線,熱海,伊東線,伊東']);
		render(SavePage);

		const routeButton = page.getByRole('button', {
			name: '経路 東京,東海道線,熱海,伊東線,伊東'
		});
		await expect.element(routeButton).toBeInTheDocument();
	});

	it('編集モードで削除できる', async () => {
		savedRoutesStore.set(['R1', 'R2']);

		render(SavePage);

		const editButton = page.getByRole('button', { name: '編集' });
		await editButton.click();

		const deleteButton = page.getByRole('button', { name: '削除' }).first();
		await deleteButton.click();

		expect(get(savedRoutesStore)).toEqual(['R2']);
	});

	it('編集モード中は保存経路カードを押してもメイン画面へ戻らない', async () => {
		const current = new MockFarert();
		current.buildRoute('東京,東海道線,熱海,伊東線,伊東');
		mainRouteStore.set(current);
		savedRoutesStore.set(['仙台,東北線,盛岡']);

		render(SavePage);

		await page.getByRole('button', { name: '編集' }).click();
		await page.getByText('仙台,東北線,盛岡').click();

		expect(gotoMock).not.toHaveBeenCalled();
		expect(get(mainRouteStore)?.routeScript()).toBe('東京,東海道線,熱海,伊東線,伊東');
		await expect
			.element(page.getByRole('button', { name: '削除' }).first())
			.toBeInTheDocument();
	});

	it('経路が2区間以上あるとき保存経路選択で確認し、Noなら何もしない', async () => {
		const current = new MockFarert();
		current.buildRoute('東京,東海道線,熱海,伊東線,伊東');
		mainRouteStore.set(current);
		savedRoutesStore.set(['仙台,東北線,盛岡']);

		render(SavePage);

		await page.getByText('仙台,東北線,盛岡').click();
		await page.getByRole('button', { name: 'いいえ' }).click();

		expect(gotoMock).not.toHaveBeenCalled();
		expect(get(mainRouteStore)?.routeScript()).toBe('東京,東海道線,熱海,伊東線,伊東');
	});

	it('経路が2区間以上あるとき保存経路選択で確認し、Yesなら適用する', async () => {
		const current = new MockFarert();
		current.buildRoute('東京,東海道線,熱海,伊東線,伊東');
		mainRouteStore.set(current);
		savedRoutesStore.set(['東京,東海道線,熱海', '仙台,東北線,盛岡', '長野,信越線,直江津']);

		render(SavePage);

		await page.getByText('仙台,東北線,盛岡').click();
		await page.getByRole('button', { name: 'はい' }).click();

		expect(gotoMock).toHaveBeenCalledWith('/');
		expect(get(mainRouteStore)?.routeScript()).toBe('仙台,東北線,盛岡');
		expect(get(savedRoutesStore)).toEqual([
			'仙台,東北線,盛岡',
			'東京,東海道線,熱海',
			'長野,信越線,直江津'
		]);
	});

	it('確認なしで保存経路を選択した場合も選択経路を先頭へ移動する', async () => {
		const current = new MockFarert();
		current.buildRoute('東京,東海道線,熱海');
		mainRouteStore.set(current);
		savedRoutesStore.set(['東京,東海道線,熱海', '仙台,東北線,盛岡', '長野,信越線,直江津']);

		render(SavePage);

		await page.getByText('長野,信越線,直江津').click();

		expect(gotoMock).toHaveBeenCalledWith('/');
		expect(get(mainRouteStore)?.routeScript()).toBe('長野,信越線,直江津');
		expect(get(savedRoutesStore)).toEqual([
			'長野,信越線,直江津',
			'東京,東海道線,熱海',
			'仙台,東北線,盛岡'
		]);
	});

	it('インポート時に buildRoute rc=1 を成功扱いにする', async () => {
		MockFarert.buildRouteMock.mockReturnValueOnce(1);
		render(SavePage);

		await page.getByRole('button', { name: 'インポート' }).click();
		const textArea = page.getByRole('textbox', { name: '経路テキスト' });
		await textArea.fill('東京,東海道線,熱海');
		await page.getByRole('button', { name: 'インポート実行', exact: true }).click();

		expect(get(savedRoutesStore)).toContain('東京,東海道線,熱海');
		await expect.element(page.getByText('インポートしました。')).toBeInTheDocument();
	});

	it('インポート時に改行区切りの複数経路を取り込む', async () => {
		render(SavePage);

		await page.getByRole('button', { name: 'インポート' }).click();
		const textArea = page.getByRole('textbox', { name: '経路テキスト' });
		await textArea.fill('東京,東海道線,熱海\n仙台,東北線,盛岡\n');
		await page.getByRole('button', { name: 'インポート実行', exact: true }).click();

		expect(get(savedRoutesStore)).toEqual(['東京,東海道線,熱海', '仙台,東北線,盛岡']);
		await expect.element(page.getByText('2件インポートしました。')).toBeInTheDocument();
	});

	it('インポートダイアログで入力してインポートできる', async () => {
		render(SavePage);

		await page.getByRole('button', { name: 'インポート' }).click();
		const dialog = page.getByRole('dialog', { name: '経路インポート' });
		await expect.element(dialog).toBeInTheDocument();

		const textArea = page.getByRole('textbox', { name: '経路テキスト' });
		await textArea.fill('横浜,相鉄本線,町田');
		const importButton = page.getByRole('button', { name: 'インポート実行', exact: true });
		await importButton.click();

		expect(get(savedRoutesStore)).toEqual(['横浜,相鉄本線,町田']);
		await expect.element(page.getByText('インポートしました。')).toBeInTheDocument();
	});

	it('インポート時に azusa が受理した省略経路を取り込める', async () => {
		const originalBuildRoute = MockFarert.prototype.buildRoute;
		MockFarert.prototype.buildRoute = function (routeStr: string): number | string {
			if (routeStr === '長崎 西九州新幹線 諫早 長崎線 長与') {
				this.script = '長崎,西九州新幹線,諫早,長崎線(長与経由),長与';
				return 0;
			}
			return originalBuildRoute.call(this, routeStr);
		};
		render(SavePage);
		try {
			await page.getByRole('button', { name: 'インポート' }).click();
			const textArea = page.getByRole('textbox', { name: '経路テキスト' });
			await textArea.fill('長崎 西九州新幹線 諫早 長崎線 長与');
			await page.getByRole('button', { name: 'インポート実行', exact: true }).click();

			expect(get(savedRoutesStore)).toEqual(['長崎,西九州新幹線,諫早,長崎線(長与経由),長与']);
			await expect.element(page.getByText('インポートしました。')).toBeInTheDocument();
		} finally {
			MockFarert.prototype.buildRoute = originalBuildRoute;
		}
	});

	it('インポート時に全角スペース区切りの経路を正規化して取り込める', async () => {
		const originalBuildRoute = MockFarert.prototype.buildRoute;
		MockFarert.prototype.buildRoute = function (routeStr: string): number | string {
			if (routeStr === '千歳 千歳線 白石 函館線 岩見沢 室蘭線 追分') {
				this.script = '千歳(千),千歳線,白石(函),函館線,岩見沢,室蘭線,追分(室)';
				return 0;
			}
			return -200;
		};
		render(SavePage);
		try {
			await page.getByRole('button', { name: 'インポート' }).click();
			const textArea = page.getByRole('textbox', { name: '経路テキスト' });
			await textArea.fill('千歳　千歳線　白石　函館線　岩見沢　室蘭線　追分');
			await page.getByRole('button', { name: 'インポート実行', exact: true }).click();

			expect(get(savedRoutesStore)).toEqual([
				'千歳(千),千歳線,白石(函),函館線,岩見沢,室蘭線,追分(室)'
			]);
			await expect.element(page.getByText('インポートしました。')).toBeInTheDocument();
		} finally {
			MockFarert.prototype.buildRoute = originalBuildRoute;
		}
	});

	it('インポート時に全角カンマ区切りの経路を正規化して取り込める', async () => {
		const originalBuildRoute = MockFarert.prototype.buildRoute;
		MockFarert.prototype.buildRoute = function (routeStr: string): number | string {
			if (routeStr === '上越妙高,えちごトキめき鉄道（妙高はねうま）,直江津') {
				this.script = '上越妙高,えちごトキめき鉄道（妙高はねうま）,直江津';
				return 0;
			}
			return -200;
		};
		render(SavePage);
		try {
			await page.getByRole('button', { name: 'インポート' }).click();
			const textArea = page.getByRole('textbox', { name: '経路テキスト' });
			await textArea.fill('上越妙高，えちごトキめき鉄道（妙高はねうま），直江津');
			await page.getByRole('button', { name: 'インポート実行', exact: true }).click();

			expect(get(savedRoutesStore)).toEqual(['上越妙高,えちごトキめき鉄道（妙高はねうま）,直江津']);
			await expect.element(page.getByText('インポートしました。')).toBeInTheDocument();
		} finally {
			MockFarert.prototype.buildRoute = originalBuildRoute;
		}
	});

	it('インポート時にbuildRoute成功後の同名駅正規化を受け入れる', async () => {
		MockFarert.buildRouteMock.mockImplementation((routeStr: string) => {
			if (routeStr === '千歳 千歳線 白石 函館線 岩見沢 室蘭線 追分') {
				return 0;
			}
			return -200;
		});
		render(SavePage);

		await page.getByRole('button', { name: 'インポート' }).click();
		const textArea = page.getByRole('textbox', { name: '経路テキスト' });
		await textArea.fill('千歳 千歳線 白石 函館線 岩見沢 室蘭線 追分');

		const originalBuildRoute = MockFarert.prototype.buildRoute;
		const originalRouteScript = MockFarert.prototype.routeScript;
		MockFarert.prototype.buildRoute = function (routeStr: string): number | string {
			if (routeStr === '千歳 千歳線 白石 函館線 岩見沢 室蘭線 追分') {
				this.script = '千歳(千),千歳線,白石(函),函館線,岩見沢,室蘭線,追分(室)';
				return 0;
			}
			return originalBuildRoute.call(this, routeStr);
		};
		MockFarert.prototype.routeScript = function (): string {
			return this.script;
		};

		await page.getByRole('button', { name: 'インポート実行', exact: true }).click();

		expect(get(savedRoutesStore)).toEqual([
			'千歳(千),千歳線,白石(函),函館線,岩見沢,室蘭線,追分(室)'
		]);
		await expect.element(page.getByText('インポートしました。')).toBeInTheDocument();

		MockFarert.prototype.buildRoute = originalBuildRoute;
		MockFarert.prototype.routeScript = originalRouteScript;
	});

	it('インポート時に確認ダイアログを出さずに取り込む', async () => {
		render(SavePage);

		await page.getByRole('button', { name: 'インポート' }).click();
		const textArea = page.getByRole('textbox', { name: '経路テキスト' });
		await textArea.fill('東京,東海道線,熱海');
		await page.getByRole('button', { name: 'インポート実行', exact: true }).click();

		expect(get(savedRoutesStore)).toEqual(['東京,東海道線,熱海']);
		await expect
			.element(page.getByRole('dialog', { name: '確認ダイアログ' }))
			.not.toBeInTheDocument();
		await expect.element(page.getByText('インポートしました。')).toBeInTheDocument();
	});

	it('不正な経路は失敗一覧として入力経路全文と詳細を表示する', async () => {
		MockFarert.buildRouteMock.mockReturnValue('{"rc":-200,"failItem":"？？","offset":2}');
		render(SavePage);

		await page.getByRole('button', { name: 'インポート' }).click();
		const textArea = page.getByRole('textbox', { name: '経路テキスト' });
		await textArea.fill('東京,東海道線,？？');
		await page.getByRole('button', { name: 'インポート実行', exact: true }).click();

		await expect.element(page.getByText('以下の経路はインポートに失敗しました。')).toBeInTheDocument();
		await expect.element(page.getByText('東京,東海道線,？？')).toBeInTheDocument();
		await expect.element(page.getByText('1 行目、？？（3番目のワード）')).toBeInTheDocument();
		expect(get(savedRoutesStore)).toEqual([]);
	});

	it('複数の不正な経路は全件表示し成功分は取り込む', async () => {
		MockFarert.buildRouteMock.mockImplementation((routeStr: string) => {
			if (routeStr === '東京,東海道線,熱海') return 0;
			if (routeStr === '戸畑,鹿児島線,小倉,山陽新幹線,x厚狭,美祢線,長門市,山陰線,三保三隅') {
				return '{"rc":-200,"failItem":"x厚狭","offset":4}';
			}
			if (routeStr === '戸畑,鹿児島線,x小倉,山陽新幹線,厚狭,美祢線,長門市,山陰線,三保三隅') {
				return '{"rc":-200,"failItem":"x小倉","offset":2}';
			}
			if (routeStr === 'x戸畑,鹿児島線,小倉,山陽新幹線,厚狭,美祢線,長門市,山陰線,三保三隅') {
				return '{"rc":-200,"failItem":"x戸畑","offset":0}';
			}
			return 0;
		});
		render(SavePage);

		await page.getByRole('button', { name: 'インポート' }).click();
		const textArea = page.getByRole('textbox', { name: '経路テキスト' });
		await textArea.fill(`東京,東海道線,熱海
戸畑,鹿児島線,小倉,山陽新幹線,x厚狭,美祢線,長門市,山陰線,三保三隅
東京,東海道線,熱海
東京,東海道線,熱海
戸畑,鹿児島線,x小倉,山陽新幹線,厚狭,美祢線,長門市,山陰線,三保三隅
東京,東海道線,熱海
x戸畑,鹿児島線,小倉,山陽新幹線,厚狭,美祢線,長門市,山陰線,三保三隅`);
		await page.getByRole('button', { name: 'インポート実行', exact: true }).click();

		expect(get(savedRoutesStore)).toEqual(['東京,東海道線,熱海']);
		await expect.element(page.getByText('4件インポートしました。')).toBeInTheDocument();
		await expect.element(page.getByText('以下の経路はインポートに失敗しました。')).toBeInTheDocument();
		await expect
			.element(page.getByText('戸畑,鹿児島線,小倉,山陽新幹線,x厚狭,美祢線,長門市,山陰線,三保三隅'))
			.toBeInTheDocument();
		await expect.element(page.getByText('2 行目、x厚狭（5番目のワード）')).toBeInTheDocument();
		await expect
			.element(page.getByText('戸畑,鹿児島線,x小倉,山陽新幹線,厚狭,美祢線,長門市,山陰線,三保三隅'))
			.toBeInTheDocument();
		await expect.element(page.getByText('5 行目、x小倉（3番目のワード）')).toBeInTheDocument();
		await expect
			.element(page.getByText('x戸畑,鹿児島線,小倉,山陽新幹線,厚狭,美祢線,長門市,山陰線,三保三隅'))
			.toBeInTheDocument();
		await expect.element(page.getByText('7 行目、x戸畑（1番目のワード）')).toBeInTheDocument();
	});

	it('Clipboard API が失敗してもフォールバックでエクスポートできる', async () => {
		savedRoutesStore.set(['東京,東海道線,熱海', '仙台,東北線,盛岡']);
		const writeTextMock = vi.fn().mockRejectedValue(new Error('denied'));
		const execCommandMock = vi.fn().mockReturnValue(true);
		const appendChildSpy = vi.spyOn(document.body, 'appendChild');
		const removeChildSpy = vi.spyOn(document.body, 'removeChild');
		const createElementSpy = vi.spyOn(document, 'createElement');
		const execCommandSpy = vi
			.spyOn(document, 'execCommand')
			.mockImplementation(execCommandMock as (commandId: string) => boolean);

		vi.stubGlobal('navigator', {
			clipboard: { writeText: writeTextMock }
		});

		render(SavePage);

		await page.getByRole('button', { name: 'エクスポート' }).click();

		expect(writeTextMock).toHaveBeenCalledWith('東京,東海道線,熱海\n仙台,東北線,盛岡');
		expect(execCommandMock).toHaveBeenCalledWith('copy');
		expect(createElementSpy).toHaveBeenCalledWith('textarea');
		expect(appendChildSpy).toHaveBeenCalled();
		expect(removeChildSpy).toHaveBeenCalled();
		execCommandSpy.mockRestore();
		await expect.element(page.getByText('クリップボードへコピーしました。')).toBeInTheDocument();
	});

	it('バックアップをファイルとして保存できる', async () => {
		const current = new MockFarert();
		current.buildRoute('東京,東海道線,熱海,伊東線,伊東');
		mainRouteStore.set(current);
		savedRoutesStore.set(['東京,東海道線,熱海']);
		ticketHolderStore.set([
			{ order: 1, routeScript: '東京,東海道線,熱海', fareType: FareType.NORMAL }
		]);
		stationHistoryStore.set(['東京', '新大阪']);

		render(SavePage);

		const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:backup');
		const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
		const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

		await page.getByRole('button', { name: 'バックアップメニュー' }).click();
		await expect.element(page.getByRole('button', { name: 'バックアップを書き出す' })).toBeInTheDocument();
		await page.getByRole('button', { name: 'バックアップを書き出す' }).click();

		expect(createObjectURLSpy).toHaveBeenCalled();
		expect(clickSpy).toHaveBeenCalledTimes(1);
		expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:backup');
		await expect.element(page.getByText('バックアップファイルを保存しました。')).toBeInTheDocument();

		createObjectURLSpy.mockRestore();
		revokeObjectURLSpy.mockRestore();
		clickSpy.mockRestore();
	});

	it('バックアップファイルを読み込んで全体状態を復元できる', async () => {
		const current = new MockFarert();
		current.buildRoute('旧,旧線,旧終点');
		mainRouteStore.set(current);
		savedRoutesStore.set(['旧,旧線,旧終点']);
		ticketHolderStore.set([
			{ order: 9, routeScript: '旧,旧線,旧終点', fareType: FareType.CHILD }
		]);
		stationHistoryStore.set(['旧']);
		render(SavePage);

		const file = new File(
			[
				JSON.stringify({
					version: '1.0',
					storage: {
						currentRoute: '東京,東海道線,熱海,伊東線,伊東',
						savedRoutes: ['東京,東海道線,熱海', '東京,東海道線,熱海 ', '仙台,東北線,盛岡'],
						ticketHolder: [
							{ order: 1, routeScript: '東京,東海道線,熱海', fareType: 'NORMAL' },
							{ order: 2, routeScript: '仙台,東北線,盛岡', fareType: 'CHILD' }
						],
						stationHistory: ['東京', '仙台', '東京']
					}
				})
			],
			'farert-backup.json',
			{ type: 'application/json' }
		);
		const fileInput = document.querySelector(
			'input[type="file"][aria-label="バックアップファイル"]'
		) as HTMLInputElement;
		Object.defineProperty(fileInput, 'files', {
			configurable: true,
			value: [file]
		});

		await page.getByRole('button', { name: 'バックアップメニュー' }).click();
		await expect
			.element(page.getByRole('button', { name: 'バックアップファイルを読み込む' }))
			.toBeInTheDocument();
		await page.getByRole('button', { name: 'バックアップファイルを読み込む' }).click();
		await fileInput.dispatchEvent(new Event('change', { bubbles: true }));
		await page.getByRole('button', { name: 'はい' }).click();

		expect(get(mainRouteStore)?.routeScript()).toBe('東京,東海道線,熱海,伊東線,伊東');
		expect(get(savedRoutesStore)).toEqual(['東京,東海道線,熱海', '仙台,東北線,盛岡']);
		expect(get(ticketHolderStore)).toEqual([
			{ order: 1, routeScript: '東京,東海道線,熱海', fareType: FareType.NORMAL },
			{ order: 2, routeScript: '仙台,東北線,盛岡', fareType: FareType.CHILD }
		]);
		expect(get(stationHistoryStore)).toEqual(['東京', '仙台']);
		await expect.element(page.getByText('バックアップを復元しました。')).toBeInTheDocument();
	});
});
