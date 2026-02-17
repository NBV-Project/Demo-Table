"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  BetEntry,
  BetType,
  buildBetSummary,
  buildNumberSummaries,
  digitsOnly,
  pad,
  readEntriesFromStorage,
  saveEntriesToStorage,
  toInt,
  toNumberInRange,
} from "@/lib/sheet-data";

type BetDraft = {
  id: string;
  number: string;
  amount: string;
};

type BetFormState = {
  customerName: string;
  topBets: BetDraft[];
  bottomBets: BetDraft[];
};

const createId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const createDraft = (): BetDraft => ({
  id: createId(),
  number: "",
  amount: "",
});

const createInitialForm = (): BetFormState => ({
  customerName: "",
  topBets: [{ id: "top-initial", number: "", amount: "" }],
  bottomBets: [{ id: "bottom-initial", number: "", amount: "" }],
});

type ParsedDraft = {
  number: string;
  amount: number;
  type: BetType;
};

export default function HomePage() {
  const [entries, setEntries] = useState<BetEntry[]>([]);
  const [form, setForm] = useState<BetFormState>(() => createInitialForm());
  const [status, setStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

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

  const formatMoney = (value: number) =>
    `${new Intl.NumberFormat("th-TH").format(value)} บาท`;

  const updateCustomerName = (value: string) => {
    setForm((prev) => ({ ...prev, customerName: value.slice(0, 80) }));
  };

  const updateDraftField = (
    type: BetType,
    draftId: string,
    field: "number" | "amount",
    value: string,
  ) => {
    const cleaned = digitsOnly(value);
    const nextValue = field === "number" ? cleaned.slice(0, 2) : cleaned.slice(0, 9);
    const targetKey = type === "top" ? "topBets" : "bottomBets";

    setForm((prev) => ({
      ...prev,
      [targetKey]: prev[targetKey].map((draft) =>
        draft.id === draftId ? { ...draft, [field]: nextValue } : draft,
      ),
    }));
  };

  const addDraft = (type: BetType) => {
    const targetKey = type === "top" ? "topBets" : "bottomBets";
    setForm((prev) => ({
      ...prev,
      [targetKey]: [...prev[targetKey], createDraft()],
    }));
  };

  const removeDraft = (type: BetType, draftId: string) => {
    const targetKey = type === "top" ? "topBets" : "bottomBets";
    setForm((prev) => {
      const nextItems = prev[targetKey].filter((draft) => draft.id !== draftId);
      return {
        ...prev,
        [targetKey]: nextItems.length > 0 ? nextItems : [createDraft()],
      };
    });
  };

  const parseDrafts = (
    drafts: BetDraft[],
    type: BetType,
    min: number,
    max: number,
    label: "บน" | "ล่าง",
  ): { parsed: ParsedDraft[]; error: string | null } => {
    const parsed: ParsedDraft[] = [];

    for (let i = 0; i < drafts.length; i += 1) {
      const draft = drafts[i];
      const row = i + 1;
      const hasNumber = draft.number !== "";
      const hasAmount = draft.amount !== "";

      if (!hasNumber && !hasAmount) {
        continue;
      }

      if (!hasNumber || !hasAmount) {
        return {
          parsed: [],
          error: `${label} แถวที่ ${row} ต้องกรอกเลขและจำนวนเงินให้ครบ`,
        };
      }

      const number = toNumberInRange(draft.number, min, max);
      if (number === null) {
        return {
          parsed: [],
          error: `เลข${label}แถวที่ ${row} ต้องอยู่ในช่วง ${pad(min)}-${pad(max)}`,
        };
      }

      const amount = toInt(draft.amount);
      if (amount <= 0) {
        return {
          parsed: [],
          error: `จำนวนเงิน${label}แถวที่ ${row} ต้องมากกว่า 0`,
        };
      }

      parsed.push({
        number: pad(number),
        amount,
        type,
      });
    }

    return { parsed, error: null };
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);

    const customerName = form.customerName.replace(/\s+/g, " ").trim();
    if (!customerName) {
      setStatus({ type: "error", message: "กรุณากรอกชื่อลูกค้า" });
      return;
    }

    const topParsed = parseDrafts(form.topBets, "top", 0, 49, "บน");
    if (topParsed.error) {
      setStatus({ type: "error", message: topParsed.error });
      return;
    }

    const bottomParsed = parseDrafts(form.bottomBets, "bottom", 50, 99, "ล่าง");
    if (bottomParsed.error) {
      setStatus({ type: "error", message: bottomParsed.error });
      return;
    }

    const allDrafts = [...topParsed.parsed, ...bottomParsed.parsed];
    if (allDrafts.length === 0) {
      setStatus({
        type: "error",
        message: "กรุณากรอกอย่างน้อย 1 รายการ (บนหรือล่าง)",
      });
      return;
    }

    const now = new Date().toISOString();
    const nextEntries: BetEntry[] = allDrafts.map((item) => ({
      id: createId(),
      customerName,
      number: item.number,
      amount: item.amount,
      type: item.type,
      createdAt: now,
    }));

    setEntries((prev) => {
      const updated = [...nextEntries, ...prev];
      saveEntriesToStorage(updated);
      return updated;
    });

    setStatus({
      type: "success",
      message: `บันทึกสำเร็จ ${customerName} จำนวน ${nextEntries.length} รายการ`,
    });
    setForm(createInitialForm());
  };

  return (
    <main className="min-h-[100dvh] bg-slate-100 px-3 py-4 sm:px-6 sm:py-6">
      <section className="mx-auto flex w-full max-w-4xl flex-col gap-4">
        <header className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
                บันทึกแทงเลขรายลูกค้า
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                ลูกค้า 1 คนเพิ่มได้หลายเลขทั้งบนและล่าง แล้วบันทึกทีเดียว
              </p>
            </div>
            <Link
              href="/dashboard"
              className="inline-flex h-10 items-center justify-center rounded-lg bg-slate-900 px-4 text-sm font-bold text-white transition hover:bg-slate-800"
            >
              ไปหน้าสรุป
            </Link>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <article className="rounded-xl border border-slate-300 bg-white p-3">
            <p className="text-xs text-slate-500">ลูกค้าทั้งหมด</p>
            <p className="mt-1 text-lg font-black text-slate-900">{summary.uniquePeople}</p>
          </article>
          <article className="rounded-xl border border-slate-300 bg-white p-3">
            <p className="text-xs text-slate-500">รายการทั้งหมด</p>
            <p className="mt-1 text-lg font-black text-slate-900">{summary.totalEntries}</p>
          </article>
          <article className="rounded-xl border border-slate-300 bg-white p-3">
            <p className="text-xs text-slate-500">เลขที่มีคนแทง</p>
            <p className="mt-1 text-lg font-black text-slate-900">{summary.activeNumbers}</p>
          </article>
          <article className="rounded-xl border border-slate-300 bg-white p-3">
            <p className="text-xs text-slate-500">ยอดรวม</p>
            <p className="mt-1 text-lg font-black text-slate-900">
              {formatMoney(summary.totalAmount)}
            </p>
          </article>
        </section>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm sm:p-5"
        >
          <div className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-slate-700">
                ชื่อลูกค้า
              </span>
              <input
                value={form.customerName}
                onChange={(event) => updateCustomerName(event.target.value)}
                placeholder="เช่น สมชาย ใจดี"
                className="h-11 w-full rounded-lg border border-slate-300 px-3 text-base outline-none focus:border-blue-500"
              />
            </label>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <section className="rounded-xl border border-blue-200 bg-blue-50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-bold text-blue-900">ช่องบน (00-49)</h2>
                  <button
                    type="button"
                    onClick={() => addDraft("top")}
                    className="rounded-md bg-blue-600 px-3 py-1 text-xs font-bold text-white hover:bg-blue-700"
                  >
                    + เพิ่มเลขบน
                  </button>
                </div>
                <div className="mt-2 space-y-2">
                  {form.topBets.map((draft, index) => (
                    <div
                      key={draft.id}
                      className="grid grid-cols-[1fr_1fr_auto] items-end gap-2"
                    >
                      <label className="block">
                        <span className="mb-1 block text-xs font-semibold text-blue-900">
                          เลขบน #{index + 1}
                        </span>
                        <input
                          inputMode="numeric"
                          value={draft.number}
                          onChange={(event) =>
                            updateDraftField("top", draft.id, "number", event.target.value)
                          }
                          placeholder="00"
                          className="h-11 w-full rounded-lg border border-blue-200 bg-white px-3 text-base outline-none focus:border-blue-500"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-xs font-semibold text-blue-900">
                          จำนวนเงิน
                        </span>
                        <input
                          inputMode="numeric"
                          value={draft.amount}
                          onChange={(event) =>
                            updateDraftField("top", draft.id, "amount", event.target.value)
                          }
                          placeholder="0"
                          className="h-11 w-full rounded-lg border border-blue-200 bg-white px-3 text-base outline-none focus:border-blue-500"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => removeDraft("top", draft.id)}
                        className="h-11 rounded-lg border border-blue-300 px-3 text-sm font-semibold text-blue-700 hover:bg-blue-100"
                      >
                        ลบ
                      </button>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-bold text-emerald-900">ช่องล่าง (50-99)</h2>
                  <button
                    type="button"
                    onClick={() => addDraft("bottom")}
                    className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-bold text-white hover:bg-emerald-700"
                  >
                    + เพิ่มเลขล่าง
                  </button>
                </div>
                <div className="mt-2 space-y-2">
                  {form.bottomBets.map((draft, index) => (
                    <div
                      key={draft.id}
                      className="grid grid-cols-[1fr_1fr_auto] items-end gap-2"
                    >
                      <label className="block">
                        <span className="mb-1 block text-xs font-semibold text-emerald-900">
                          เลขล่าง #{index + 1}
                        </span>
                        <input
                          inputMode="numeric"
                          value={draft.number}
                          onChange={(event) =>
                            updateDraftField(
                              "bottom",
                              draft.id,
                              "number",
                              event.target.value,
                            )
                          }
                          placeholder="50"
                          className="h-11 w-full rounded-lg border border-emerald-200 bg-white px-3 text-base outline-none focus:border-emerald-500"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-xs font-semibold text-emerald-900">
                          จำนวนเงิน
                        </span>
                        <input
                          inputMode="numeric"
                          value={draft.amount}
                          onChange={(event) =>
                            updateDraftField(
                              "bottom",
                              draft.id,
                              "amount",
                              event.target.value,
                            )
                          }
                          placeholder="0"
                          className="h-11 w-full rounded-lg border border-emerald-200 bg-white px-3 text-base outline-none focus:border-emerald-500"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => removeDraft("bottom", draft.id)}
                        className="h-11 rounded-lg border border-emerald-300 px-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
                      >
                        ลบ
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {status ? (
              <p
                className={`rounded-lg px-3 py-2 text-sm ${
                  status.type === "success"
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-rose-50 text-rose-700"
                }`}
              >
                {status.message}
              </p>
            ) : null}

            <button
              type="submit"
              className="h-12 w-full rounded-lg bg-blue-600 text-base font-bold text-white transition hover:bg-blue-700"
            >
              บันทึก
            </button>
          </div>
        </form>

        <section className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-bold text-slate-900">เลขที่มีคนแทง</h2>
            <span className="text-xs text-slate-500">{numberSummaries.length} เลข</span>
          </div>
          {numberSummaries.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">ยังไม่มีรายการแทง</p>
          ) : (
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {numberSummaries.map((item) => (
                <div
                  key={item.number}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                >
                  <p className="text-sm font-bold text-slate-900">เลข {item.number}</p>
                  <p className="text-xs text-slate-600">
                    มีคนแทง {item.peopleCount} คน | {item.betCount} รายการ
                  </p>
                  <p className="text-xs text-slate-600">
                    รวม {formatMoney(item.totalAmount)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
