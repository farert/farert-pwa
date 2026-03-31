type PrefectureLookup = {
	aliases: Set<string>;
};

export function normalizePrefectureToken(label: string): string {
	const trimmed = label?.trim() ?? '';
	if (!trimmed) return '';
	return trimmed.replace(/[都府県]$/u, '');
}

export function toWasmPrefecture(prefecture: string): string {
	const trimmed = prefecture?.trim() ?? '';
	if (!trimmed) return '';
	const normalized = normalizePrefectureToken(trimmed);
	return normalized || trimmed;
}

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

export function matchesPrefectureLabel(label: string, lookup: PrefectureLookup): boolean {
	const trimmed = label?.trim() ?? '';
	if (!trimmed) return false;
	if (lookup.aliases.has(trimmed)) return true;
	const normalized = normalizePrefectureToken(trimmed);
	return normalized ? lookup.aliases.has(normalized) : false;
}

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

function extractLinesFromRecord(record: Record<string, unknown>): string[] {
	const keys = ['lines', 'list', 'routes', 'items', 'values'];
	for (const key of keys) {
		const lines = coerceLineList(record[key]);
		if (lines.length > 0) return lines;
	}
	return [];
}

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
