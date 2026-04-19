export interface StationDisplayMeta {
	name: string;
	kana: string;
	lines: string[];
	prefecture: string;
}

interface StationDisplayDeps {
	executeSql?: ((sql: string) => string) | null;
	getKanaByStation: (station: string) => string;
	getLinesByStation: (station: string) => string;
	getPrefectureByStation?: (station: string) => string;
	parseList: (raw: string) => string[];
}

export function normalizeStationName(raw: string): string {
	const trimmed = raw.trim();
	const suffixStart = findTrailingSuffixStart(trimmed);
	if (suffixStart === null) {
		return trimmed.replace(/[（(][^（）()]*[）)]$/g, '').trim();
	}
	return trimmed.slice(0, suffixStart).trim();
}

export function buildStationDisplayName(name: string, rawSuffix?: string): string {
	const base = normalizeStationName(name);
	const suffix = formatSamenameSuffix(rawSuffix ?? '');
	return suffix ? `${base}${suffix}` : base;
}

export function buildStationDisplayNameFromCandidates(
	name: string,
	rawSuffixes?: string[]
): string {
	const suffix = rawSuffixes?.find((value) => value.trim().length > 0) ?? '';
	return buildStationDisplayName(name, suffix);
}

function hasSamenameSuffix(raw: string): boolean {
	return findTrailingSuffixStart(raw.trim()) !== null;
}

function formatSamenameSuffix(raw: string): string {
	const value = unwrapSamenameLabel(raw);
	return value ? `(${value})` : '';
}

function unwrapSamenameLabel(raw: string): string {
	const trimmed = raw.trim();
	if (!trimmed) return '';
	let value = trimmed;
	while (
		(value.startsWith('(') || value.startsWith('（'))
		&& (value.endsWith(')') || value.endsWith('）'))
	) {
		value = value.slice(1, -1).trim();
	}
	return value;
}

function findTrailingSuffixStart(raw: string): number | null {
	const trimmed = raw.trim();
	if (!trimmed.endsWith(')') && !trimmed.endsWith('）')) return null;
	const normalized = trimmed.replaceAll('（', '(').replaceAll('）', ')');
	let depth = 0;
	for (let i = normalized.length - 1; i >= 0; i -= 1) {
		const char = normalized[i];
		if (char === ')') {
			depth += 1;
			continue;
		}
		if (char === '(') {
			depth -= 1;
			if (depth === 0) return i;
		}
	}
	return null;
}

function dedupe(values: string[]): string[] {
	return [...new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))];
}

function parseSqlRows(payload: string): string[] {
	try {
		const parsed = JSON.parse(payload) as { rows?: Array<[string]> };
		if (!Array.isArray(parsed.rows)) return [];
		return parsed.rows
			.map((row) => row?.[0])
			.filter((value): value is string => typeof value === 'string');
	} catch {
		return [];
	}
}

function resolveSameNameSuffix(
	stationNames: string[],
	lineName: string,
	executeSql?: ((sql: string) => string) | null
): Record<string, string> {
	const result: Record<string, string> = {};
	if (typeof executeSql !== 'function') {
		return result;
	}

	const query = (name: string, useLineFilter: boolean): string => {
		const escapedName = name.replace(/'/g, "''");
		const escapedLine = lineName.replace(/'/g, "''");
		const lineClause = useLineFilter ? ` and ln.name='${escapedLine}'` : '';
		return (
			`select distinct t.samename from t_station t`
			+ ` left join t_lines l on t.rowid=l.station_id`
			+ ` left join t_line ln on ln.rowid=l.line_id`
			+ ` where t.name='${escapedName}'${lineClause}`
			+ ` and t.samename<>'' and (t.sflg&(1<<18))=0`
		);
	};

	const lookupSuffix = (station: string, useLineFilter: boolean): string => {
		const response = executeSql(query(station, useLineFilter));
		const values = parseSqlRows(response).filter((value) => value.length > 0);
		const suffix = values[0] ?? '';
		return suffix ? formatSamenameSuffix(suffix) : '';
	};

	for (const station of stationNames) {
		try {
			const suffix = lookupSuffix(station, true);
			if (suffix) {
				result[station] = suffix;
				continue;
			}
		} catch {
			// line 条件付きの問い合わせ失敗時は全体検索へフォールバックする
		}
		try {
			const fallbackSuffix = lookupSuffix(station, false);
			if (fallbackSuffix) {
				result[station] = fallbackSuffix;
			}
		} catch {
			// SQL クエリ失敗時は無視する
		}
	}

	return result;
}

function resolveDisplayNames(
	stations: string[],
	lineName: string,
	executeSql?: ((sql: string) => string) | null
): Record<string, string> {
	const map: Record<string, string> = {};
	const stationBaseNames = [...new Set(stations.map((station) => normalizeStationName(station)))];
	const sameNameByBase = resolveSameNameSuffix(stationBaseNames, lineName, executeSql);

	for (const station of stations) {
		if (map[station] !== undefined) continue;
		if (hasSamenameSuffix(station)) {
			const suffixStart = findTrailingSuffixStart(station.trim());
			const rawSuffix = suffixStart === null ? '' : station.trim().slice(suffixStart);
			map[station] = buildStationDisplayName(station, rawSuffix);
			continue;
		}
		const base = normalizeStationName(station);
		const suffix = sameNameByBase[base] ?? '';
		map[station] = suffix ? buildStationDisplayName(base, suffix) : station;
	}

	return map;
}

export function buildStationDisplayMeta(
	stations: string[],
	lineName: string,
	deps: StationDisplayDeps
): Record<string, StationDisplayMeta> {
	const info: Record<string, StationDisplayMeta> = {};
	const stationNameMap = resolveDisplayNames(stations, lineName, deps.executeSql);

	for (const station of stations) {
		const displayName = stationNameMap[station] ?? station;
		const normalized = normalizeStationName(displayName);
		let kana = '';
		let lines: string[] = [];
		let prefecture = '';

		try {
			kana = (deps.getKanaByStation(displayName) ?? '').trim();
		} catch {
			kana = '';
		}
		if (!kana && normalized !== displayName) {
			try {
				kana = (deps.getKanaByStation(normalized) ?? '').trim();
			} catch {
				kana = '';
			}
		}

		try {
			lines = dedupe(deps.parseList(deps.getLinesByStation(displayName)));
		} catch {
			lines = [];
		}
		if (lines.length === 0 && normalized !== displayName) {
			try {
				lines = dedupe(deps.parseList(deps.getLinesByStation(normalized)));
			} catch {
				lines = [];
			}
		}

		if (deps.getPrefectureByStation) {
			try {
				prefecture = (deps.getPrefectureByStation(displayName) ?? '').trim();
			} catch {
				prefecture = '';
			}
			if (!prefecture && normalized !== displayName) {
				try {
					prefecture = (deps.getPrefectureByStation(normalized) ?? '').trim();
				} catch {
					prefecture = '';
				}
			}
		}

		info[station] = { name: displayName, kana, lines, prefecture };
	}

	return info;
}
