import { FareType } from '$lib/types';
import type { AppBackup, AppStorage, TicketHolderItem } from '$lib/types';
import { normalizeRouteScript } from '$lib/utils/urlRoute';

const BACKUP_VERSION = '1.0';
const VALID_FARE_TYPES = new Set([
	FareType.NORMAL,
	FareType.CHILD,
	FareType.ROUND_TRIP,
	FareType.STOCK_DISCOUNT,
	FareType.STOCK_DISCOUNT_X2,
	FareType.STUDENT,
	FareType.STUDENT_ROUND_TRIP,
	FareType.DISABLED
]);

function isValidFareType(value: unknown): value is FareType {
	return typeof value === 'string' && VALID_FARE_TYPES.has(value as FareType);
}

function normalizeUniqueStrings(values: unknown[]): string[] {
	const seen = new Set<string>();
	const normalized: string[] = [];

	for (const value of values) {
		if (typeof value !== 'string') continue;
		const script = normalizeRouteScript(value);
		if (!script || seen.has(script)) continue;
		seen.add(script);
		normalized.push(script);
	}

	return normalized;
}

function normalizeTicketHolder(values: unknown[]): TicketHolderItem[] {
	const normalized: TicketHolderItem[] = [];

	for (const value of values) {
		if (!value || typeof value !== 'object') continue;
		const item = value as Partial<TicketHolderItem>;
		if (typeof item.order !== 'number' || !Number.isFinite(item.order)) continue;
		if (typeof item.routeScript !== 'string') continue;
		if (!isValidFareType(item.fareType)) continue;

		const routeScript = normalizeRouteScript(item.routeScript);
		if (!routeScript) continue;

		normalized.push({
			order: item.order,
			routeScript,
			fareType: item.fareType
		});
	}

	return normalized;
}

export function exportAppBackup(storage: AppStorage): string {
	const backup: AppBackup = {
		version: BACKUP_VERSION,
		exportedAt: new Date().toISOString(),
		storage: {
			currentRoute: storage.currentRoute
				? normalizeRouteScript(storage.currentRoute) || null
				: null,
			savedRoutes: normalizeUniqueStrings(storage.savedRoutes),
			ticketHolder: normalizeTicketHolder(storage.ticketHolder),
			stationHistory: normalizeUniqueStrings(storage.stationHistory)
		}
	};

	return JSON.stringify(backup, null, 2);
}

export function importAppBackup(jsonString: string): AppBackup {
	try {
		const parsed = JSON.parse(jsonString) as Partial<AppBackup>;
		if (!parsed.version) {
			throw new Error('バージョン情報がありません');
		}

		const importMajorVersion = parsed.version.split('.')[0];
		const currentMajorVersion = BACKUP_VERSION.split('.')[0];

		if (importMajorVersion !== currentMajorVersion) {
			throw new Error(
				`互換性のないバージョンです（インポートデータ: ${parsed.version}, 現在: ${BACKUP_VERSION}）`
			);
		}

		const storage = parsed.storage;
		if (!storage || typeof storage !== 'object') {
			throw new Error('保存データが不正です');
		}

		const currentRoute =
			typeof storage.currentRoute === 'string' ? normalizeRouteScript(storage.currentRoute) || null : null;
		const savedRoutes = Array.isArray(storage.savedRoutes)
			? normalizeUniqueStrings(storage.savedRoutes)
			: [];
		const ticketHolder = Array.isArray(storage.ticketHolder)
			? normalizeTicketHolder(storage.ticketHolder)
			: [];
		const stationHistory = Array.isArray(storage.stationHistory)
			? normalizeUniqueStrings(storage.stationHistory)
			: [];

		return {
			version: parsed.version,
			exportedAt: typeof parsed.exportedAt === 'string' ? parsed.exportedAt : undefined,
			storage: {
				currentRoute,
				savedRoutes,
				ticketHolder,
				stationHistory
			}
		};
	} catch (error) {
		if (error instanceof SyntaxError) {
			throw new Error('JSONの解析に失敗しました: ' + error.message);
		}
		throw error;
	}
}
