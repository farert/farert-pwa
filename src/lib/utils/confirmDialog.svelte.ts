/**
 * 確認ダイアログの開閉状態と Promise 応答を管理するコントローラです。
 * 各画面で重複していた open/resolve のパターンを一箇所に集約します。
 */

/**
 * ConfirmDialog コンポーネントと組で使う状態コントローラ。
 *
 * `request()` が返す Promise は、ユーザーの「はい/いいえ」選択で解決されます。
 * 応答待ちの間に再度 `request()` された場合、先行の Promise は false で解決されます。
 */
export class ConfirmDialogController {
	/** ダイアログの表示状態 */
	open = $state(false);
	/** 表示するメッセージ */
	message = $state('');
	#resolver: ((result: boolean) => void) | null = null;

	/**
	 * 確認ダイアログを表示し、ユーザーの選択を待ちます。
	 *
	 * @param message - 表示する確認メッセージ
	 * @returns 「はい」で true、「いいえ」で false
	 */
	request(message: string): Promise<boolean> {
		if (this.#resolver) {
			this.#resolver(false);
			this.#resolver = null;
		}
		this.message = message;
		this.open = true;
		return new Promise((resolve) => {
			this.#resolver = resolve;
		});
	}

	/**
	 * ダイアログを閉じ、待機中の Promise を解決します。
	 *
	 * @param result - ユーザーの選択結果
	 * @returns この処理は戻り値を持ちません。
	 */
	resolve(result: boolean): void {
		this.open = false;
		this.message = '';
		const resolver = this.#resolver;
		this.#resolver = null;
		resolver?.(result);
	}
}
