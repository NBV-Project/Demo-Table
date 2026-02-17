export type BetType = "top" | "bottom";

export type BetEntry = {
  id: string;
  customerName: string;
  number: string;
  amount: number;
  type: BetType;
  createdAt: string;
};

type LegacySheetRow = {
  leftTop: number;
  leftBottom: number;
  rightTop: number;
  rightBottom: number;
};

export type NumberSummary = {
  number: string;
  peopleCount: number;
  betCount: number;
  totalAmount: number;
  topAmount: number;
  bottomAmount: number;
  entries: BetEntry[];
};

export const STORAGE_KEY = "up-down-bets-v1";
const LEGACY_STORAGE_KEYS = [
  "up-down-sheet-v4",
  "up-down-sheet-v3",
  "up-down-sheet-v2",
  "up-down-sheet-mockup-v1",
] as const;

export const pad = (n: number) => n.toString().padStart(2, "0");
export const digitsOnly = (value: string) => value.replace(/\D/g, "");

export const toInt = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.trunc(value));
  }

  const cleaned = digitsOnly(String(value ?? ""));
  if (cleaned === "") return 0;
  return Math.max(0, Number(cleaned));
};

export const toNumberInRange = (
  value: unknown,
  min: number,
  max: number,
): number | null => {
  const parsed = toInt(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) return null;
  return parsed;
};

const normalizeName = (value: unknown): string =>
  String(value ?? "").replace(/\s+/g, " ").trim();

const normalizeEntries = (value: unknown): BetEntry[] | null => {
  if (!Array.isArray(value)) return null;

  const normalized = value
    .map((entry, index) => {
      if (typeof entry !== "object" || entry === null) return null;
      const source = entry as Record<string, unknown>;

      const customerName = normalizeName(source.customerName);
      const parsedNumber = toNumberInRange(source.number, 0, 99);
      const amount = toInt(source.amount);
      const type = source.type === "bottom" ? "bottom" : "top";

      if (!customerName || parsedNumber === null || amount <= 0) {
        return null;
      }

      return {
        id: String(source.id ?? `entry-${index}-${Date.now()}`),
        customerName,
        number: pad(parsedNumber),
        amount,
        type,
        createdAt:
          typeof source.createdAt === "string" && source.createdAt.length > 0
            ? source.createdAt
            : new Date().toISOString(),
      } satisfies BetEntry;
    })
    .filter((item): item is BetEntry => item !== null);

  return normalized;
};

const normalizeLegacyRows = (value: unknown): LegacySheetRow[] | null => {
  if (!Array.isArray(value) || value.length !== 50) return null;

  return value.map((row) => {
    const source =
      typeof row === "object" && row !== null
        ? (row as Record<string, unknown>)
        : {};

    return {
      leftTop: toInt(source.leftTop),
      leftBottom: toInt(source.leftBottom),
      rightTop: toInt(source.rightTop),
      rightBottom: toInt(source.rightBottom),
    };
  });
};

const convertLegacyRowsToEntries = (rows: LegacySheetRow[]): BetEntry[] => {
  const now = new Date().toISOString();
  const legacyOwner = "Legacy Data";
  const entries: BetEntry[] = [];

  rows.forEach((row, index) => {
    if (row.leftTop > 0) {
      entries.push({
        id: `legacy-${index}-top`,
        customerName: legacyOwner,
        number: pad(index),
        amount: row.leftTop,
        type: "top",
        createdAt: now,
      });
    }

    if (row.leftBottom > 0) {
      entries.push({
        id: `legacy-${index}-bottom`,
        customerName: legacyOwner,
        number: pad(index),
        amount: row.leftBottom,
        type: "bottom",
        createdAt: now,
      });
    }

    if (row.rightTop > 0) {
      entries.push({
        id: `legacy-${index + 50}-top`,
        customerName: legacyOwner,
        number: pad(index + 50),
        amount: row.rightTop,
        type: "top",
        createdAt: now,
      });
    }

    if (row.rightBottom > 0) {
      entries.push({
        id: `legacy-${index + 50}-bottom`,
        customerName: legacyOwner,
        number: pad(index + 50),
        amount: row.rightBottom,
        type: "bottom",
        createdAt: now,
      });
    }
  });

  return entries;
};

export const readEntriesFromStorage = (): BetEntry[] => {
  if (typeof window === "undefined") return [];

  const keysToTry = [STORAGE_KEY, ...LEGACY_STORAGE_KEYS];

  for (const key of keysToTry) {
    const raw = window.localStorage.getItem(key);
    if (!raw) continue;

    try {
      const parsed = JSON.parse(raw) as unknown;

      const candidate =
        typeof parsed === "object" && parsed !== null && "entries" in parsed
          ? (parsed as { entries: unknown }).entries
          : parsed;

      const entries = normalizeEntries(candidate);
      if (entries) return entries;

      const legacyCandidate =
        typeof parsed === "object" && parsed !== null && "rows" in parsed
          ? (parsed as { rows: unknown }).rows
          : parsed;
      const legacyRows = normalizeLegacyRows(legacyCandidate);
      if (legacyRows) return convertLegacyRowsToEntries(legacyRows);
    } catch {
      // Try the next key.
    }
  }

  return [];
};

export const saveEntriesToStorage = (entries: BetEntry[]) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ entries }));
};

export const buildNumberSummaries = (entries: BetEntry[]): NumberSummary[] => {
  const map = new Map<string, NumberSummary>();

  entries.forEach((entry) => {
    const number = entry.number;
    const current = map.get(number);

    if (!current) {
      map.set(number, {
        number,
        peopleCount: 1,
        betCount: 1,
        totalAmount: entry.amount,
        topAmount: entry.type === "top" ? entry.amount : 0,
        bottomAmount: entry.type === "bottom" ? entry.amount : 0,
        entries: [entry],
      });
      return;
    }

    current.betCount += 1;
    current.totalAmount += entry.amount;
    current.topAmount += entry.type === "top" ? entry.amount : 0;
    current.bottomAmount += entry.type === "bottom" ? entry.amount : 0;
    current.entries.push(entry);
  });

  return [...map.values()]
    .map((summary) => {
      const uniquePeople = new Set(
        summary.entries.map((entry) => entry.customerName.toLowerCase().trim()),
      );

      return {
        ...summary,
        peopleCount: uniquePeople.size,
        entries: [...summary.entries].sort((a, b) =>
          b.createdAt.localeCompare(a.createdAt),
        ),
      };
    })
    .sort((a, b) => Number(a.number) - Number(b.number));
};

export const buildBetSummary = (entries: BetEntry[]) => {
  const topTotal = entries
    .filter((entry) => entry.type === "top")
    .reduce((acc, entry) => acc + entry.amount, 0);
  const bottomTotal = entries
    .filter((entry) => entry.type === "bottom")
    .reduce((acc, entry) => acc + entry.amount, 0);
  const uniquePeople = new Set(
    entries.map((entry) => entry.customerName.toLowerCase().trim()),
  );
  const activeNumbers = new Set(entries.map((entry) => entry.number));

  return {
    topTotal,
    bottomTotal,
    totalAmount: topTotal + bottomTotal,
    totalEntries: entries.length,
    uniquePeople: uniquePeople.size,
    activeNumbers: activeNumbers.size,
  };
};
