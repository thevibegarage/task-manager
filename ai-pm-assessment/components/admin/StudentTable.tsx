"use client";

import { useEffect, useMemo, useState } from "react";

type Row = {
  submissionId: string;
  name: string;
  email: string;
  score: number;
  maxScore: number;
  percentage: number;
  submittedAt: string;
};

type Key = "name" | "email" | "score" | "percentage" | "submittedAt";

const columns: { key: Key; label: string; numeric?: boolean }[] = [
  { key: "name", label: "Student Name" },
  { key: "email", label: "Email" },
  { key: "score", label: "Score", numeric: true },
  { key: "percentage", label: "Percentage", numeric: true },
  { key: "submittedAt", label: "Submission Time" },
];

// Server render uses a fixed UTC format; after mount, switch to the viewer's locale/timezone
// (avoids a hydration mismatch between server and browser locales).
const formatTime = (iso: string, local: boolean) =>
  local
    ? new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
    : `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`;

export function StudentTable({ rows }: { rows: Row[] }) {
  const [sort, setSort] = useState<{ key: Key; dir: 1 | -1 }>({ key: "submittedAt", dir: 1 });
  const [query, setQuery] = useState("");
  const [local, setLocal] = useState(false);
  useEffect(() => setLocal(true), []);

  const sorted = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter((r) => !q || r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q))
      .sort((a, b) => {
        const av = a[sort.key];
        const bv = b[sort.key];
        return (typeof av === "number" ? av - (bv as number) : String(av).localeCompare(String(bv))) * sort.dir;
      });
  }, [rows, sort, query]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-6">
        <h2 className="font-serif text-lg font-semibold">Students</h2>
        <input
          type="search"
          placeholder="Filter by name or email"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="field max-w-xs py-1.5 text-sm"
          aria-label="Filter students"
        />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-y border-line bg-paper/60 text-left text-xs uppercase tracking-wide text-muted">
              {columns.map((c) => {
                const active = sort.key === c.key;
                return (
                  <th
                    key={c.key}
                    scope="col"
                    aria-sort={active ? (sort.dir === 1 ? "ascending" : "descending") : "none"}
                    className={`px-5 py-2.5 font-semibold sm:px-6 ${c.numeric ? "text-right" : ""}`}
                  >
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 uppercase hover:text-ink"
                      onClick={() => setSort({ key: c.key, dir: active ? (sort.dir === 1 ? -1 : 1) : 1 })}
                    >
                      {c.label}
                      <span aria-hidden className="text-[10px]">{active ? (sort.dir === 1 ? "▲" : "▼") : ""}</span>
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r.submissionId} className="border-b border-line last:border-0">
                <td className="px-5 py-2.5 font-medium sm:px-6">{r.name}</td>
                <td className="px-5 py-2.5 text-ink-soft sm:px-6">{r.email}</td>
                <td className="px-5 py-2.5 text-right tabular-nums sm:px-6">{r.score} / {r.maxScore}</td>
                <td className="px-5 py-2.5 text-right tabular-nums sm:px-6">{r.percentage}%</td>
                <td className="whitespace-nowrap px-5 py-2.5 text-ink-soft sm:px-6">{formatTime(r.submittedAt, local)}</td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-6 py-10 text-center text-muted">
                  {rows.length ? "No students match the filter." : "No submissions yet."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
