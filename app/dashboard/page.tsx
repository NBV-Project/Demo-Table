"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  BetEntry,
  buildBetSummary,
  buildNumberSummaries,
  digitsOnly,
  readEntriesFromStorage,
} from "@/lib/sheet-data";

export default function DashboardPage() {
  const [entries, setEntries] = useState<BetEntry[]>([]);
  const [keyword, setKeyword] = useState("");

  useEffect(() => {
    const sync = () => {
      setEntries(readEntriesFromStorage());
    };

    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("focus", sync);

    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("focus", sync);
    };
  }, []);

  const summary = useMemo(() => buildBetSummary(entries), [entries]);
  const numberSummaries = useMemo(() => buildNumberSummaries(entries), [entries]);
  const normalizedKeyword = digitsOnly(keyword).slice(0, 2);

  const filteredSummaries = useMemo(() => {
    if (!normalizedKeyword) return numberSummaries;

    return numberSummaries.filter((item) =>
      item.number.includes(normalizedKeyword),
    );
  }, [normalizedKeyword, numberSummaries]);

  const formatMoney = (value: number) =>
    `${new Intl.NumberFormat("th-TH").format(value)} บาท`;

  const formatDateTime = (value: string) =>
    new Intl.DateTimeFormat("th-TH", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(value));

  return (
    <main className="min-h-[100dvh] bg-slate-100 px-3 py-4 sm:px-6 sm:py-6">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-4">
        <header className="rounded-2xl border border-slate-300 bg-slate-900 p-4 text-white shadow-sm sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-xl font-black tracking-tight sm:text-2xl">
                สรุปรายเลขทั้งหมด
              </h1>
              <p className="mt-1 text-sm text-slate-200">
                ดูว่าเลขไหนมีคนแทงกี่คน และเปิดดูรายละเอียดรายชื่อได้
              </p>
            </div>
            <Link
              href="/"
              className="inline-flex h-10 items-center justify-center rounded-lg border border-white/40 px-4 text-sm font-bold text-white transition hover:bg-white/10"
            >
              กลับหน้าบันทึก
            </Link>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <article className="rounded-xl border border-slate-300 bg-white p-3">
            <p className="text-xs text-slate-500">ลูกค้าทั้งหมด</p>
            <p className="mt-1 text-lg font-black text-slate-900">
              {summary.uniquePeople}
            </p>
          </article>
          <article className="rounded-xl border border-slate-300 bg-white p-3">
            <p className="text-xs text-slate-500">รายการทั้งหมด</p>
            <p className="mt-1 text-lg font-black text-slate-900">
              {summary.totalEntries}
            </p>
          </article>
          <article className="rounded-xl border border-slate-300 bg-white p-3">
            <p className="text-xs text-slate-500">เลขที่มีคนแทง</p>
            <p className="mt-1 text-lg font-black text-slate-900">
              {summary.activeNumbers}
            </p>
          </article>
          <article className="rounded-xl border border-slate-300 bg-white p-3">
            <p className="text-xs text-slate-500">ยอดรวม</p>
            <p className="mt-1 text-lg font-black text-slate-900">
              {formatMoney(summary.totalAmount)}
            </p>
          </article>
        </section>

        <section className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm sm:p-5">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">
              ค้นหาเลข
            </span>
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              inputMode="numeric"
              placeholder="เช่น 01"
              className="h-11 w-full rounded-lg border border-slate-300 px-3 text-base outline-none focus:border-blue-500 sm:max-w-xs"
            />
          </label>
        </section>

        <section className="space-y-2">
          {filteredSummaries.length === 0 ? (
            <div className="rounded-2xl border border-slate-300 bg-white px-4 py-6 text-center text-sm text-slate-500 shadow-sm">
              ไม่พบข้อมูลเลขที่ค้นหา
            </div>
          ) : (
            filteredSummaries.map((item) => (
              <details
                key={item.number}
                className="rounded-2xl border border-slate-300 bg-white shadow-sm"
              >
                <summary className="cursor-pointer list-none px-4 py-3 sm:px-5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-base font-black text-slate-900">
                        เลข {item.number}
                      </p>
                      <p className="text-sm text-slate-600">
                        มีคนแทง {item.peopleCount} คน | {item.betCount} รายการ
                      </p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-sm font-semibold text-slate-800">
                        รวม {formatMoney(item.totalAmount)}
                      </p>
                      <p className="text-xs text-slate-500">
                        บน {formatMoney(item.topAmount)} | ล่าง{" "}
                        {formatMoney(item.bottomAmount)}
                      </p>
                    </div>
                  </div>
                </summary>

                <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 sm:px-5">
                  <p className="mb-2 text-xs font-semibold text-slate-500">
                    รายละเอียดคนที่แทงเลข {item.number}
                  </p>
                  <div className="space-y-2">
                    {item.entries.map((entry) => (
                      <article
                        key={entry.id}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2"
                      >
                        <p className="text-sm font-semibold text-slate-900">
                          {entry.customerName}
                        </p>
                        <p className="text-xs text-slate-600">
                          แทงเลข {entry.number} ({entry.type === "top" ? "บน" : "ล่าง"}){" "}
                          {formatMoney(entry.amount)}
                        </p>
                        <p className="text-xs text-slate-500">
                          เวลา {formatDateTime(entry.createdAt)}
                        </p>
                      </article>
                    ))}
                  </div>
                </div>
              </details>
            ))
          )}
        </section>
      </section>
    </main>
  );
}
