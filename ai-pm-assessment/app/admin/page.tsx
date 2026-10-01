import Link from "next/link";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/admin/LogoutButton";
import { StudentTable } from "@/components/admin/StudentTable";
import { Header } from "@/components/Header";
import { getDashboardData } from "@/lib/analytics";
import { getAdminSession } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Instructor Dashboard" };

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0$/, ""));

function accuracyTone(pct: number) {
  if (pct < 50) return "bg-danger";
  if (pct < 75) return "bg-accent";
  return "bg-success";
}

export default async function AdminPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  const data = await getDashboardData();
  if (!data) {
    return (
      <main className="mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="font-serif text-2xl font-semibold">Assessment not found</h1>
        <p className="mt-2 text-ink-soft">Run <code>npx prisma db seed</code> to create it.</p>
      </main>
    );
  }

  const { summary, distribution, questionAnalysis, students } = data;
  const maxBucket = Math.max(1, ...distribution.map((d) => d.count));
  const stats = [
    { label: "Total submissions", value: String(summary.totalSubmissions) },
    { label: "Average score", value: `${fmt(summary.averageScore)} / ${summary.maxScore}` },
    { label: "Median score", value: `${fmt(summary.medianScore)} / ${summary.maxScore}` },
    { label: "Highest score", value: `${summary.highestScore} / ${summary.maxScore}` },
    { label: "Lowest score", value: `${summary.lowestScore} / ${summary.maxScore}` },
    { label: "Average percentage", value: `${fmt(summary.averagePercentage)}%` },
  ];

  return (
    <>
      <Header
        subtitle="Instructor dashboard"
        right={
          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-muted sm:inline">{session.email}</span>
            <LogoutButton />
          </div>
        }
      />
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-serif text-2xl font-semibold">{data.assessment.title}</h1>
            <p className="mt-1 text-sm text-muted">Results update as students submit.</p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin" prefetch={false} className="btn-secondary">Refresh</Link>
            <a href="/api/admin/export" className="btn-primary">Export CSV</a>
          </div>
        </div>

        <section aria-label="Summary" className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {stats.map((s) => (
            <div key={s.label} className="card px-4 py-4">
              <p className="text-xs font-medium text-muted">{s.label}</p>
              <p className="mt-1 font-serif text-2xl font-semibold tabular-nums">{s.value}</p>
            </div>
          ))}
        </section>

        <section className="card px-5 py-5 sm:px-6">
          <h2 className="font-serif text-lg font-semibold">Score distribution</h2>
          <p className="text-xs text-muted">Number of students at each score (0–{summary.maxScore})</p>
          <div className="mt-5 overflow-x-auto">
            <div className="flex h-40 min-w-[520px] items-end gap-1" role="img" aria-label="Score distribution chart">
              {distribution.map((d) => (
                <div key={d.score} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                  {d.count > 0 && <span className="text-[11px] font-medium tabular-nums text-ink-soft">{d.count}</span>}
                  <div
                    className="w-full rounded-t-[3px] bg-brand"
                    style={{ height: `${(d.count / maxBucket) * 100}%`, minHeight: d.count ? 2 : 0 }}
                    title={`${d.count} student(s) scored ${d.score}`}
                  />
                </div>
              ))}
            </div>
            <div className="mt-1 flex min-w-[520px] gap-1 border-t border-line pt-1">
              {distribution.map((d) => (
                <span key={d.score} className="flex-1 text-center text-[11px] tabular-nums text-muted">{d.score}</span>
              ))}
            </div>
          </div>
        </section>

        <section className="card overflow-hidden">
          <div className="px-5 py-4 sm:px-6">
            <h2 className="font-serif text-lg font-semibold">Question analysis</h2>
            <p className="text-xs text-muted">
              Sorted from lowest to highest accuracy. Accuracy = correct ÷ total submissions (no partial credit).
              Expand a row to see how often each option was chosen.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-y border-line bg-paper/60 text-left text-xs uppercase tracking-wide text-muted">
                  <th scope="col" className="px-5 py-2.5 font-semibold sm:px-6">Question</th>
                  <th scope="col" className="px-3 py-2.5 font-semibold">Concept</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-semibold">Responses</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-semibold">Correct</th>
                  <th scope="col" className="px-5 py-2.5 font-semibold sm:px-6">Accuracy</th>
                </tr>
              </thead>
              <tbody>
                {questionAnalysis.map((q) => (
                  <tr key={q.id} className="border-b border-line align-top last:border-0">
                    <td className="px-5 py-3 font-semibold tabular-nums sm:px-6">Q{q.number}</td>
                    <td className="px-3 py-3">
                      <details>
                        <summary className="cursor-pointer font-medium text-ink marker:text-muted">
                          {q.label}{" "}
                          <span className="text-xs font-normal text-muted">
                            ({q.type === "single" ? "single" : "multi"}, {q.points} pt{q.points > 1 ? "s" : ""})
                          </span>
                        </summary>
                        <p className="mt-2 text-xs leading-relaxed text-ink-soft">{q.text}</p>
                        <ul className="mt-2 space-y-1">
                          {q.options.map((o) => (
                            <li key={o.letter} className="flex gap-2 text-xs leading-relaxed">
                              <span className={`w-5 shrink-0 font-semibold ${o.isCorrect ? "text-success" : "text-muted"}`}>
                                {o.letter}{o.isCorrect ? "✓" : ""}
                              </span>
                              <span className="flex-1 text-ink-soft">{o.text}</span>
                              <span className="shrink-0 tabular-nums text-muted">{o.picks}</span>
                            </li>
                          ))}
                        </ul>
                      </details>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">{q.responses}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{q.correct}</td>
                    <td className="px-5 py-3 sm:px-6">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 overflow-hidden rounded-full bg-line">
                          <div className={`h-full ${accuracyTone(q.accuracy)}`} style={{ width: `${q.accuracy}%` }} />
                        </div>
                        <span className="w-12 text-right tabular-nums">{fmt(q.accuracy)}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card overflow-hidden">
          <StudentTable rows={students.map(({ perQuestion: _omit, ...s }) => s)} />
        </section>
      </main>
    </>
  );
}
