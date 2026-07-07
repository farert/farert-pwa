/**
 * WASM が返す運賃情報 JSON の解析ユーティリティです。
 * NUL 除去と messages の配列正規化を行い FareInfo に変換します。
 */
import type { FareInfo } from '$lib/types';

/**
 * getFareInfoObjectJson の生文字列を FareInfo に解析します。
 *
 * 距離系フィールドは WASM 側で km 単位（0.1km 精度の小数）に
 * 正規化されて出力されるため、追加の換算は行いません。
 *
 * @param raw - WASM から取得した JSON 文字列
 * @returns 解析結果。解析できない場合は null
 */
export function parseFareInfoJson(raw: unknown): FareInfo | null {
	if (typeof raw !== 'string') return null;
	const cleaned = raw.replaceAll('\u0000', '').trim();
	if (!cleaned) return null;

	try {
		const parsed = JSON.parse(cleaned) as FareInfo;
		parsed.messages = Array.isArray(parsed.messages) ? [...parsed.messages] : [];
		return parsed;
	} catch {
		return null;
	}
}
