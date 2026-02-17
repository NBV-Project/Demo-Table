"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import {
  SheetRow,
  buildNumberSummaries,
  buildSheetSummary,
  readRowsFromStorage,
} from "@/lib/sheet-data";

function DashboardPage() {
  const [rows, setRows] = useState<SheetRow[]>(readRowsFromStorage);
  const [lastSync, setLastSync] = useState<Date>(new Date());

  useEffect(() => {
    const sync = () => {
      setRows(readRowsFromStorage());
      setLastSync(new Date());
    };

    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("focus", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("focus", sync);
    };
  }, []);

  const summary = useMemo(() => buildSheetSummary(rows), [rows]);
  const numberSummaries = useMemo(() => buildNumberSummaries(rows), [rows]);

  const topLeaders = useMemo(
    () =>
      [...numberSummaries]
        .filter((item) => item.top > 0)
        .sort((a, b) => b.top - a.top)
        .slice(0, 10),
    [numberSummaries],
  );

  const bottomLeaders = useMemo(
    () =>
      [...numberSummaries]
        .filter((item) => item.bottom > 0)
        .sort((a, b) => b.bottom - a.bottom)
        .slice(0, 10),
    [numberSummaries],
  );

  const formatAmount = (value: number) =>
    `${new Intl.NumberFormat("th-TH").format(value)} บาท`;

  return (
    <main className="min-h-screen px-4 py-5 sm:px-5 lg:px-8 lg:py-8">
      <section className="mx-auto flex w-full max-w-[1500px] flex-col gap-4">
        <header className="rounded-2xl border border-slate-300 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 p-5 text-white shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
                Dashboard สรุปยอดแทง
              </h1>
              <p className="mt-1 text-sm text-slate-200">
                แสดงภาพรวมยอดบน/ล่างแยกชัดเจน พร้อมอันดับเลขที่มียอดสูงสุด
              </p>
              <p className="mt-1 text-xs text-slate-300">
                อัปเดตล่าสุด{" "}
                {new Intl.DateTimeFormat("th-TH", {
                  dateStyle: "short",
                  timeStyle: "medium",
                }).format(lastSync)}
              </p>
            </div>
            <Link
              href="/"
              className="rounded-lg border border-white/60 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
            >
              กลับหน้าตารางกรอก
            </Link>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <article className="rounded-xl border border-slate-300 bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">ยอดบนทั้งหมด</p>
            <p className="mt-2 text-lg font-bold text-slate-900 sm:text-xl">
              {formatAmount(summary.topTotal)}
            </p>
          </article>
          <article className="rounded-xl border border-slate-300 bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">ยอดล่างทั้งหมด</p>
            <p className="mt-2 text-lg font-bold text-slate-900 sm:text-xl">
              {formatAmount(summary.bottomTotal)}
            </p>
          </article>
          <article className="rounded-xl border border-slate-300 bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">บน 00-49</p>
            <p className="mt-2 text-lg font-bold text-slate-900 sm:text-xl">
              {formatAmount(summary.leftTop)}
            </p>
          </article>
          <article className="rounded-xl border border-slate-300 bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">ล่าง 00-49</p>
            <p className="mt-2 text-lg font-bold text-slate-900 sm:text-xl">
              {formatAmount(summary.leftBottom)}
            </p>
          </article>
          <article className="rounded-xl border border-slate-300 bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">บน 50-99</p>
            <p className="mt-2 text-lg font-bold text-slate-900 sm:text-xl">
              {formatAmount(summary.rightTop)}
            </p>
          </article>
          <article className="rounded-xl border border-slate-300 bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">ล่าง 50-99</p>
            <p className="mt-2 text-lg font-bold text-slate-900 sm:text-xl">
              {formatAmount(summary.rightBottom)}
            </p>
          </article>
          <article className="rounded-xl border border-slate-900 bg-slate-900 p-4 text-white shadow-sm">
            <p className="text-xs text-slate-300">เลขที่มีรายการ</p>
            <p className="mt-2 text-lg font-bold sm:text-xl">{numberSummaries.length} ตัว</p>
          </article>
          <article className="rounded-xl border border-cyan-700 bg-cyan-700 p-4 text-white shadow-sm">
            <p className="text-xs text-cyan-100">สถานะระบบ</p>
            <p className="mt-2 text-lg font-bold sm:text-xl">พร้อมใช้งาน</p>
          </article>
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <article className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm">
            <h2 className="text-base font-bold text-slate-900">อันดับยอดบนสูงสุด</h2>
            {topLeaders.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">ยังไม่มีข้อมูลยอดบน</p>
            ) : (
              <div className="mt-3 space-y-2">
                {topLeaders.map((item, index) => (
                  <div
                    key={`top-${item.number}`}
                    className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                  >
                    <div className="text-sm text-slate-700">
                      <span className="mr-2 inline-block w-6 text-slate-400">
                        #{index + 1}
                      </span>
                      เลข {item.number}
                    </div>
                    <div className="text-sm font-semibold text-slate-900">
                      {formatAmount(item.top)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </article>

          <article className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm">
            <h2 className="text-base font-bold text-slate-900">อันดับยอดล่างสูงสุด</h2>
            {bottomLeaders.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">ยังไม่มีข้อมูลยอดล่าง</p>
            ) : (
              <div className="mt-3 space-y-2">
                {bottomLeaders.map((item, index) => (
                  <div
                    key={`bottom-${item.number}`}
                    className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                  >
                    <div className="text-sm text-slate-700">
                      <span className="mr-2 inline-block w-6 text-slate-400">
                        #{index + 1}
                      </span>
                      เลข {item.number}
                    </div>
                    <div className="text-sm font-semibold text-slate-900">
                      {formatAmount(item.bottom)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </article>
        </section>

        <section className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm">
          <h2 className="text-base font-bold text-slate-900">รายการเลขที่มียอดทั้งหมด</h2>
          {numberSummaries.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">ยังไม่มีข้อมูลยอดสะสม</p>
          ) : (
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {numberSummaries.map((item) => (
                <div
                  key={item.number}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                >
                  <div className="text-sm font-semibold text-slate-700">เลข {item.number}</div>
                  <div className="mt-1 text-xs text-slate-600">
                    บน {formatAmount(item.top)}
                  </div>
                  <div className="mt-0.5 text-xs text-slate-600">
                    ล่าง {formatAmount(item.bottom)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

export default dynamic(() => Promise.resolve(DashboardPage), {
  ssr: false,
});
