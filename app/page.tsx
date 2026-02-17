"use client";

import { KeyboardEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  SheetRow,
  buildNumberSummaries,
  buildSheetSummary,
  digitsOnly,
  pad,
  readRowsFromStorage,
  saveRowsToStorage,
  toInt,
} from "@/lib/sheet-data";

function Home() {
  const [rows, setRows] = useState<SheetRow[]>(readRowsFromStorage);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [lastAction, setLastAction] = useState("");
  const [lastSavedAt, setLastSavedAt] = useState(new Date());
  const [quickFind, setQuickFind] = useState("");

  useEffect(() => {
    saveRowsToStorage(rows);
  }, [rows]);

  const numberSummaries = useMemo(() => buildNumberSummaries(rows), [rows]);
  const summary = useMemo(() => buildSheetSummary(rows), [rows]);

  const formatAmount = (value: number) =>
    `${new Intl.NumberFormat("th-TH").format(value)} บาท`;
  const formatCompact = (value: number) =>
    new Intl.NumberFormat("th-TH", { maximumFractionDigits: 1 }).format(value);
  const formatTime = (value: Date) =>
    new Intl.DateTimeFormat("th-TH", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(value);

  const getCellId = (rowIndex: number, key: keyof SheetRow) => `${rowIndex}:${key}`;

  const setDraftValue = (rowIndex: number, key: keyof SheetRow, value: string) => {
    const id = getCellId(rowIndex, key);
    setDrafts((prev) => ({ ...prev, [id]: digitsOnly(value) }));
  };

  const clearDraft = (rowIndex: number, key: keyof SheetRow) => {
    const id = getCellId(rowIndex, key);
    setDrafts((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const getNumberLabel = (rowIndex: number, key: keyof SheetRow) =>
    key.startsWith("left") ? pad(rowIndex) : pad(rowIndex + 50);
  const getTypeLabel = (key: keyof SheetRow) => (key.endsWith("Top") ? "บน" : "ล่าง");

  const parseCellId = (id: string): { rowIndex: number; key: keyof SheetRow } | null => {
    const [rowPart, keyPart] = id.split(":");
    const rowIndex = Number(rowPart);

    if (!Number.isInteger(rowIndex) || rowIndex < 0 || rowIndex > 49) {
      return null;
    }

    if (
      keyPart !== "leftTop" &&
      keyPart !== "leftBottom" &&
      keyPart !== "rightTop" &&
      keyPart !== "rightBottom"
    ) {
      return null;
    }

    return { rowIndex, key: keyPart };
  };

  const commitAdd = (rowIndex: number, key: keyof SheetRow): boolean => {
    const id = getCellId(rowIndex, key);
    const amount = toInt(drafts[id]);

    if (amount <= 0) {
      clearDraft(rowIndex, key);
      return false;
    }

    setRows((prev) => {
      const next = [...prev];
      const target = next[rowIndex];
      if (!target) return prev;
      next[rowIndex] = { ...target, [key]: target[key] + amount };
      return next;
    });

    clearDraft(rowIndex, key);
    setLastSavedAt(new Date());
    setLastAction(
      `บวกเลข ${getNumberLabel(rowIndex, key)} ${getTypeLabel(key)} +${formatAmount(amount)} สำเร็จ`,
    );
    return true;
  };

  const focusNextCell = (cellIndex: number) => {
    const totalCells = rows.length * 4;
    const nextIndex = (cellIndex + 1) % totalCells;
    const nextInput = document.querySelector<HTMLInputElement>(
      `input[data-cell-index="${nextIndex}"]`,
    );
    nextInput?.focus();
    nextInput?.select();
  };

  const handleCellKeyDown = (
    event: KeyboardEvent<HTMLInputElement>,
    rowIndex: number,
    key: keyof SheetRow,
    cellIndex: number,
  ) => {
    if (event.key !== "Enter") return;
    event.preventDefault();

    const committed = commitAdd(rowIndex, key);
    if (committed) {
      focusNextCell(cellIndex);
    }
  };

  const handleManualSave = () => {
    const pendingAdds = Object.entries(drafts)
      .map(([id, value]) => {
        const parsed = parseCellId(id);
        if (!parsed) return null;

        const amount = toInt(value);
        if (amount <= 0) return null;

        return { ...parsed, amount };
      })
      .filter((item): item is { rowIndex: number; key: keyof SheetRow; amount: number } =>
        Boolean(item),
      );

    if (pendingAdds.length === 0) {
      saveRowsToStorage(rows);
      setLastSavedAt(new Date());
      setLastAction("บันทึกข้อมูลล่าสุดเรียบร้อย");
      return;
    }

    const nextRows = [...rows];
    for (const item of pendingAdds) {
      const target = nextRows[item.rowIndex];
      if (!target) continue;
      nextRows[item.rowIndex] = {
        ...target,
        [item.key]: target[item.key] + item.amount,
      };
    }

    setRows(nextRows);
    setDrafts({});
    saveRowsToStorage(nextRows);
    setLastSavedAt(new Date());
    setLastAction(`บันทึกและบวกยอดค้าง ${pendingAdds.length} ช่องเรียบร้อย`);
  };

  const filterValue = digitsOnly(quickFind).slice(0, 2);
  const filterNumber = filterValue === "" ? null : Number(filterValue);

  return (
    <main className="flex min-h-[100dvh] flex-col overflow-hidden bg-[#f6f6f8] text-slate-900">
      <header className="shrink-0 border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-[#1152d4] text-sm font-bold text-white">
            DM
            </div>
            <div>
              <h1 className="text-sm font-extrabold tracking-tight sm:text-base">
                กระดานจัดการข้อมูลตัวเลข
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex h-9 min-w-[170px] grow items-center rounded border border-slate-200 bg-slate-100 px-2 sm:w-56 sm:grow-0">
            <input
              type="text"
              value={quickFind}
              onChange={(event) => setQuickFind(event.target.value)}
              placeholder="ค้นหาเลขด่วน..."
              className="w-full border-0 bg-transparent text-sm outline-none placeholder:text-slate-400"
            />
            </div>
            <button
              type="button"
              onClick={handleManualSave}
              className="h-9 rounded bg-[#1152d4] px-4 text-sm font-bold text-white transition hover:bg-blue-700"
            >
              บันทึกข้อมูล
            </button>
            <Link
              href="/dashboard"
              className="inline-flex h-9 items-center rounded bg-gradient-to-r from-slate-900 via-slate-800 to-[#1152d4] px-4 text-sm font-bold text-white shadow-sm transition hover:from-slate-800 hover:to-blue-600"
            >
              หน้าสรุป
            </Link>
          </div>
        </div>
      </header>

      <section className="flex min-h-0 flex-1 flex-col gap-4 p-3 sm:p-4">
        <div className="grid shrink-0 grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded border border-slate-200 bg-white p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              จำนวนเลขที่มีรายการ
            </p>
            <p className="mt-1 text-xl font-black text-[#1152d4]">
              {numberSummaries.length}
            </p>
          </div>
          <div className="rounded border border-slate-200 bg-white p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              ยอดรวมบน
            </p>
            <p className="mt-1 text-xl font-black text-slate-900">
              {formatCompact(summary.topTotal)}
            </p>
          </div>
          <div className="rounded border border-slate-200 bg-white p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              ยอดรวมล่าง
            </p>
            <p className="mt-1 text-xl font-black text-slate-900">
              {formatCompact(summary.bottomTotal)}
            </p>
          </div>
          <div className="rounded border border-slate-200 bg-white p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              สถานะระบบ
            </p>
            <p className="mt-1 flex items-center gap-2 text-xl font-black text-emerald-500">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              ปกติ
            </p>
          </div>
        </div>

        {lastAction ? (
          <div className="shrink-0 rounded border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
            {lastAction}
          </div>
        ) : null}

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 md:grid-cols-2">
          <section className="flex min-h-0 flex-col overflow-hidden rounded border border-slate-200 bg-white">
            <div className="flex shrink-0 items-center border-b border-slate-200 bg-slate-50 px-4 py-3">
              <h2 className="text-sm font-bold text-slate-900">ช่วงเลข 00 - 49</h2>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <table className="w-full border-collapse text-left">
                <thead className="sticky top-0 z-10 bg-white">
                  <tr className="text-sm font-extrabold tracking-wide text-white">
                    <th className="w-14 border border-[#0f48b8] bg-[#1152d4] px-3 py-2 text-center">
                      เลข
                    </th>
                    <th className="border border-[#0f48b8] bg-[#1152d4] px-3 py-2 text-center">บน</th>
                    <th className="border border-[#0f48b8] bg-[#1152d4] px-3 py-2 text-center">
                      ล่าง
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, rowIndex) => {
                    const rowNumber = rowIndex;
                    const isFocus = filterNumber === rowNumber;
                    return (
                      <tr key={`left-${rowIndex}`} className={isFocus ? "bg-blue-50" : ""}>
                        <td className="border border-slate-300 bg-slate-50 px-3 py-2 text-center text-sm font-bold text-slate-500">
                          {pad(rowNumber)}
                        </td>
                        <td className="border border-slate-300 p-1.5">
                          <input
                            type="text"
                            inputMode="numeric"
                            value={drafts[getCellId(rowIndex, "leftTop")] ?? ""}
                            onChange={(event) =>
                              setDraftValue(rowIndex, "leftTop", event.target.value)
                            }
                            onKeyDown={(event) =>
                              handleCellKeyDown(event, rowIndex, "leftTop", rowIndex * 4)
                            }
                            onBlur={() => clearDraft(rowIndex, "leftTop")}
                            placeholder={formatCompact(row.leftTop)}
                            data-cell-index={rowIndex * 4}
                            className="h-8 w-full rounded border border-slate-300 bg-white px-2 text-right text-sm outline-none focus:border-[#1152d4]"
                          />
                        </td>
                        <td className="border border-slate-300 p-1.5">
                          <input
                            type="text"
                            inputMode="numeric"
                            value={drafts[getCellId(rowIndex, "leftBottom")] ?? ""}
                            onChange={(event) =>
                              setDraftValue(rowIndex, "leftBottom", event.target.value)
                            }
                            onKeyDown={(event) =>
                              handleCellKeyDown(event, rowIndex, "leftBottom", rowIndex * 4 + 1)
                            }
                            onBlur={() => clearDraft(rowIndex, "leftBottom")}
                            placeholder={formatCompact(row.leftBottom)}
                            data-cell-index={rowIndex * 4 + 1}
                            className="h-8 w-full rounded border border-slate-300 bg-white px-2 text-right text-sm outline-none focus:border-[#1152d4]"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="flex min-h-0 flex-col overflow-hidden rounded border border-slate-200 bg-white">
            <div className="flex shrink-0 items-center border-b border-slate-200 bg-slate-50 px-4 py-3">
              <h2 className="text-sm font-bold text-slate-900">ช่วงเลข 50 - 99</h2>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <table className="w-full border-collapse text-left">
                <thead className="sticky top-0 z-10 bg-white">
                  <tr className="text-sm font-extrabold tracking-wide text-white">
                    <th className="w-14 border border-[#0f48b8] bg-[#1152d4] px-3 py-2 text-center">
                      เลข
                    </th>
                    <th className="border border-[#0f48b8] bg-[#1152d4] px-3 py-2 text-center">บน</th>
                    <th className="border border-[#0f48b8] bg-[#1152d4] px-3 py-2 text-center">
                      ล่าง
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, rowIndex) => {
                    const rowNumber = rowIndex + 50;
                    const isFocus = filterNumber === rowNumber;
                    return (
                      <tr key={`right-${rowIndex}`} className={isFocus ? "bg-blue-50" : ""}>
                        <td className="border border-slate-300 bg-slate-50 px-3 py-2 text-center text-sm font-bold text-slate-500">
                          {pad(rowNumber)}
                        </td>
                        <td className="border border-slate-300 p-1.5">
                          <input
                            type="text"
                            inputMode="numeric"
                            value={drafts[getCellId(rowIndex, "rightTop")] ?? ""}
                            onChange={(event) =>
                              setDraftValue(rowIndex, "rightTop", event.target.value)
                            }
                            onKeyDown={(event) =>
                              handleCellKeyDown(event, rowIndex, "rightTop", rowIndex * 4 + 2)
                            }
                            onBlur={() => clearDraft(rowIndex, "rightTop")}
                            placeholder={formatCompact(row.rightTop)}
                            data-cell-index={rowIndex * 4 + 2}
                            className="h-8 w-full rounded border border-slate-300 bg-white px-2 text-right text-sm outline-none focus:border-[#1152d4]"
                          />
                        </td>
                        <td className="border border-slate-300 p-1.5">
                          <input
                            type="text"
                            inputMode="numeric"
                            value={drafts[getCellId(rowIndex, "rightBottom")] ?? ""}
                            onChange={(event) =>
                              setDraftValue(rowIndex, "rightBottom", event.target.value)
                            }
                            onKeyDown={(event) =>
                              handleCellKeyDown(event, rowIndex, "rightBottom", rowIndex * 4 + 3)
                            }
                            onBlur={() => clearDraft(rowIndex, "rightBottom")}
                            placeholder={formatCompact(row.rightBottom)}
                            data-cell-index={rowIndex * 4 + 3}
                            className="h-8 w-full rounded border border-slate-300 bg-white px-2 text-right text-sm outline-none focus:border-[#1152d4]"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </section>

      <footer className="flex h-10 shrink-0 items-center justify-between border-t border-slate-200 bg-white px-4 text-xs font-medium text-slate-500 sm:px-6">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            การเชื่อมต่อ: ปลอดภัย (SSL)
          </span>
          <span>บันทึกล่าสุด: {formatTime(lastSavedAt)}</span>
        </div>
        <div className="hidden items-center gap-3 sm:flex">
          <span className="rounded border border-slate-200 bg-slate-100 px-2 py-0.5">
            รวมบน: {formatAmount(summary.topTotal)}
          </span>
          <span className="rounded border border-slate-200 bg-slate-100 px-2 py-0.5">
            รวมล่าง: {formatAmount(summary.bottomTotal)}
          </span>
        </div>
      </footer>
    </main>
  );
}

export default dynamic(() => Promise.resolve(Home), {
  ssr: false,
});
