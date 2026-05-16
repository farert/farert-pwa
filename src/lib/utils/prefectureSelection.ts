/**
 * 都道府県ラベルと路線一覧の対応付けを補助するユーティリティです。
 * WASM 由来の揺れを吸収し、都道府県ベースの絞り込みを支えます。
 */
type PrefectureLookup = {
	aliases: Set<string>;
};

/**
 * `normalizePrefectureToken` を正規化します。
 *
 * @param label 処理に必要な入力値です。
 * @returns 文字列結果を返します。
 */
export function normalizePrefectureToken(label: string): string {
	const trimmed = label?.trim() ?? '';
	if (!trimmed) return '';
	return trimmed.replace(/[都府県]$/u, '');
}

/**
 * `toWasmPrefecture` を処理します。
 *
 * @param prefecture 処理に必要な入力値です。
 * @returns 文字列結果を返します。
 */
export function toWasmPrefecture(prefecture: string): string {
	const trimmed = prefecture?.trim() ?? '';
	if (!trimmed) return '';
	const normalized = normalizePrefectureToken(trimmed);
	return normalized || trimmed;
}

/**
 * `createPrefectureLookup` を生成します。
 *
 * @param prefecture 処理に必要な入力値です。
 * @returns 処理結果を返します。
 */
export function createPrefectureLookup(prefecture: string): PrefectureLookup {
	const aliases = new Set<string>();
	const trimmed = prefecture?.trim() ?? '';
	if (trimmed) {
		aliases.add(trimmed);
		const normalized = normalizePrefectureToken(trimmed);
		if (normalized && normalized !== trimmed) {
			aliases.add(normalized);
		}
	}
	return { aliases };
}

/**
 * `matchesPrefectureLabel` を処理します。
 *
 * @param label 処理に必要な入力値です。
 * @param lookup 処理に必要な入力値です。
 * @returns 判定結果を返します。
 */
export function matchesPrefectureLabel(label: string, lookup: PrefectureLookup): boolean {
	const trimmed = label?.trim() ?? '';
	if (!trimmed) return false;
	if (lookup.aliases.has(trimmed)) return true;
	const normalized = normalizePrefectureToken(trimmed);
	return normalized ? lookup.aliases.has(normalized) : false;
}

/**
 * `coerceLineList` を処理します。
 *
 * @param value 処理対象の値です。
 * @returns 文字列結果を返します。
 */
function coerceLineList(value: unknown): string[] {
	if (!Array.isArray(value)) return [];
	const seen = new Set<string>();
	const result: string[] = [];
	for (const entry of value) {
		if (typeof entry !== 'string') continue;
		const trimmed = entry.trim();
		if (!trimmed || seen.has(trimmed)) continue;
		seen.add(trimmed);
		result.push(trimmed);
	}
	return result;
}

/**
 * `extractPrefectureLabel` を処理します。
 *
 * @param record 処理に必要な入力値です。
 * @returns 文字列結果を返します。
 */
function extractPrefectureLabel(record: Record<string, unknown>): string {
	const candidates = ['prefecture', 'pref', 'prefName', 'name', 'title', 'label'];
	for (const key of candidates) {
		const value = record[key];
		if (typeof value === 'string' && value.trim()) {
			return value.trim();
		}
	}
	return '';
}

/**
 * `extractLinesFromRecord` を処理します。
 *
 * @param record 処理に必要な入力値です。
 * @returns 文字列結果を返します。
 */
function extractLinesFromRecord(record: Record<string, unknown>): string[] {
	const keys = ['lines', 'list', 'routes', 'items', 'values'];
	for (const key of keys) {
		const lines = coerceLineList(record[key]);
		if (lines.length > 0) return lines;
	}
	return [];
}

/**
 * `findLinesForPrefecture` を処理します。
 *
 * @param node 処理に必要な入力値です。
 * @param lookup 処理に必要な入力値です。
 * @param allowDirect 処理に必要な入力値です。
 * @returns 文字列結果を返します。
 */
function findLinesForPrefecture(
	node: unknown,
	lookup: PrefectureLookup,
	allowDirect: boolean
): string[] {
	if (!node) return [];
	if (typeof node === 'string') {
		return allowDirect ? (node.trim() ? [node.trim()] : []) : [];
	}
	if (Array.isArray(node)) {
		let sawNonString = false;
		for (const entry of node) {
			if (typeof entry !== 'string') {
				sawNonString = true;
			}
			const nested = findLinesForPrefecture(entry, lookup, allowDirect);
			if (nested.length > 0) return nested;
		}
		return !sawNonString && allowDirect ? coerceLineList(node) : [];
	}
	if (typeof node !== 'object') {
		return [];
	}
	const record = node as Record<string, unknown>;
	const label = extractPrefectureLabel(record);
	if (label && matchesPrefectureLabel(label, lookup)) {
		const fromRecord = extractLinesFromRecord(record);
		if (fromRecord.length > 0) {
			return fromRecord;
		}
	}
	const directValues: unknown[] = [];
	for (const alias of lookup.aliases) {
		if (!alias) continue;
		const direct = record[alias];
		if (direct !== undefined) {
			directValues.push(direct);
			const directLines = coerceLineList(direct);
			if (directLines.length > 0) {
				return directLines;
			}
		}
	}
	const nestedCandidates = [
		record.prefectures,
		record.prefects,
		record.items,
		record.children,
		record.groups,
		record.routes,
		record.categories
	];
	for (const candidate of nestedCandidates) {
		const nested = findLinesForPrefecture(candidate, lookup, false);
		if (nested.length > 0) return nested;
	}
	for (const value of Object.values(record)) {
		if (directValues.includes(value)) continue;
		if (nestedCandidates.includes(value)) continue;
		const nested = findLinesForPrefecture(value, lookup, false);
		if (nested.length > 0) return nested;
	}
	return [];
}

/**
 * `extractLinesFromPrefecturePayload` を処理します。
 *
 * @param payload 処理対象の文字列です。
 * @param prefecture 処理に必要な入力値です。
 * @returns 文字列結果を返します。
 */
export function extractLinesFromPrefecturePayload(payload: string, prefecture: string): string[] {
	try {
		if (!payload) return [];
		const parsed = JSON.parse(payload);
		const lookup = createPrefectureLookup(prefecture);
		const lines = findLinesForPrefecture(parsed, lookup, true);
		return lines.length > 0 ? lines : [];
	} catch {
		return [];
	}
}
