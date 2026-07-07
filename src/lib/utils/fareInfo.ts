/**
 * WASM が返す運賃情報 JSON の解析・正規化ユーティリティです。
 * 欠損カンマの修復と 1/10 キロ換算の正規化を一箇所に集約します。
 */
import type { FareInfo } from '$lib/types';

/** 1/10 キロ表現の可能性がある距離系フィールド */
const KM_KEYS: Array<keyof FareInfo> = [
	'totalSalesKm',
	'jrSalesKm',
	'jrCalcKm',
	'companySalesKm',
	'brtSalesKm',
	'salesKmForHokkaido',
	'calcKmForHokkaido',
	'salesKmForEast',
	'calcKmForEast',
	'salesKmForShikoku',
	'calcKmForShikoku',
	'salesKmForKyusyu',
	'calcKmForKyusyu',
	'rule114SalesKm',
	'rule114CalcKm'
];

/**
 * 距離系フィールドがすべて整数の場合、1/10 キロ表現とみなして km 値へ変換します。
 *
 * @param info - 解析済みの運賃情報
 * @returns 距離を km に正規化した運賃情報
 */
function normalizeKilometers(info: FareInfo): FareInfo {
	const kmValues = KM_KEYS.map((key) => info[key]).filter(
		(value): value is number => typeof value === 'number' && Number.isFinite(value)
	);
	if (!kmValues.length) return info;
	if (!kmValues.every((value) => Number.isInteger(value))) return info;
	const normalized: FareInfo = { ...info };
	for (const key of KM_KEYS) {
		const value = normalized[key];
		if (typeof value === 'number' && Number.isFinite(value)) {
			Object.assign(normalized, { [key]: value / 10 });
		}
	}
	return normalized;
}

/**
 * WASM 出力に混入する余分なカンマ（連続・閉じ括弧直前など）を除去します。
 *
 * @param input - 修復対象の JSON 文字列
 * @returns 修復後の JSON 文字列
 */
function collapseCommas(input: string): string {
	let output = input.replace(/,\s*([}\]])/g, '$1').replace(/([[{])\s*,/g, '$1');
	while (/,(\s*,)+/.test(output)) {
		output = output.replace(/,\s*,+/g, ',');
	}
	return output;
}

/**
 * getFareInfoObjectJson の生文字列を FareInfo に解析します。
 *
 * NUL 文字の除去、カンマ修復のリトライ、距離の正規化を行います。
 *
 * @param raw - WASM から取得した JSON 文字列
 * @returns 解析結果。解析できない場合は null
 */
export function parseFareInfoJson(raw: unknown): FareInfo | null {
	if (typeof raw !== 'string') return null;
	const cleaned = raw.replaceAll('\u0000', '').trim();
	if (!cleaned) return null;

	const candidates = [cleaned, collapseCommas(cleaned), collapseCommas(collapseCommas(cleaned))];
	for (const candidate of candidates) {
		try {
			const parsed = JSON.parse(candidate) as FareInfo;
			const normalized = normalizeKilometers(parsed);
			normalized.messages = Array.isArray(normalized.messages) ? [...normalized.messages] : [];
			return normalized;
		} catch {
			continue;
		}
	}
	return null;
}
