export type SheetRow = {
  leftTop: number;
  leftBottom: number;
  rightTop: number;
  rightBottom: number;
};

export type NumberSummary = {
  number: string;
  top: number;
  bottom: number;
};

export const STORAGE_KEY = "up-down-sheet-v4";
const LEGACY_STORAGE_KEYS = [
  "up-down-sheet-v3",
  "up-down-sheet-v2",
  "up-down-sheet-mockup-v1",
] as const;

export const pad = (n: number) => n.toString().padStart(2, "0");
export const digitsOnly = (value: string) => value.replace(/\D/g, "");

export const createEmptyRows = (): SheetRow[] =>
  Array.from({ length: 50 }, () => ({
    leftTop: 0,
    leftBottom: 0,
    rightTop: 0,
    rightBottom: 0,
  }));

export const toInt = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.trunc(value));
  }

  const cleaned = digitsOnly(String(value ?? ""));
  if (cleaned === "") return 0;
  return Math.max(0, Number(cleaned));
};

const normalizeRows = (value: unknown): SheetRow[] | null => {
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

export const readRowsFromStorage = (): SheetRow[] => {
  if (typeof window === "undefined") return createEmptyRows();

  const keysToTry = [STORAGE_KEY, ...LEGACY_STORAGE_KEYS];

  for (const key of keysToTry) {
    const raw = window.localStorage.getItem(key);
    if (!raw) continue;

    try {
      const parsed = JSON.parse(raw) as unknown;
      const candidate =
        typeof parsed === "object" && parsed !== null && "rows" in parsed
          ? (parsed as { rows: unknown }).rows
          : parsed;

      const rows = normalizeRows(candidate);
      if (rows) return rows;
    } catch {
      // Try the next key.
    }
  }

  return createEmptyRows();
};

export const saveRowsToStorage = (rows: SheetRow[]) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ rows }));
};

export const buildNumberSummaries = (rows: SheetRow[]): NumberSummary[] =>
  rows
    .flatMap((row, i) => [
      {
        number: pad(i),
        top: row.leftTop,
        bottom: row.leftBottom,
      },
      {
        number: pad(i + 50),
        top: row.rightTop,
        bottom: row.rightBottom,
      },
    ])
    .filter((item) => item.top > 0 || item.bottom > 0)
    .sort((a, b) => Number(a.number) - Number(b.number));

export const buildSheetSummary = (rows: SheetRow[]) => {
  const leftTop = rows.reduce((acc, row) => acc + row.leftTop, 0);
  const leftBottom = rows.reduce((acc, row) => acc + row.leftBottom, 0);
  const rightTop = rows.reduce((acc, row) => acc + row.rightTop, 0);
  const rightBottom = rows.reduce((acc, row) => acc + row.rightBottom, 0);

  return {
    leftTop,
    leftBottom,
    rightTop,
    rightBottom,
    topTotal: leftTop + rightTop,
    bottomTotal: leftBottom + rightBottom,
  };
};
