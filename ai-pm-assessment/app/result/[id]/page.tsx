import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { getSubmissionResult } from "@/lib/assessment";
import { resultMessage } from "@/lib/result-message";

export const dynamic = "force-dynamic";
export const metadata = { title: "Assessment Submitted" };

// Read-only view of a stored result: refreshing this page never creates a submission.
export default async function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = id.length <= 64 ? await getSubmissionResult(id) : null;
  if (!result) notFound();

  const pct = Number.isInteger(result.percentage) ? result.percentage : result.percentage.toFixed(1);

  return (
    <>
      <Header subtitle="RAG & AI Application Assessment" />
      <main className="mx-auto max-w-xl px-4 py-10 sm:py-16">
        <div className="card overflow-hidden text-center">
          <div className="border-b border-line bg-brand-tint/50 px-6 py-8">
            <div className="mx-auto mb-4 grid size-12 place-items-center rounded-full bg-success/10 text-success" aria-hidden>
              <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12.5l4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h1 className="font-serif text-2xl font-semibold text-ink sm:text-3xl">Assessment Submitted</h1>
            <p className="mt-2 text-ink-soft">{result.student_name}</p>
          </div>
          <dl className="grid grid-cols-2 divide-x divide-line">
            <div className="px-4 py-6">
              <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Score</dt>
              <dd className="mt-1 font-serif text-3xl font-semibold tabular-nums text-ink">
                {result.score} / {result.max_score}
              </dd>
            </div>
            <div className="px-4 py-6">
              <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Percentage</dt>
              <dd className="mt-1 font-serif text-3xl font-semibold tabular-nums text-ink">{pct}%</dd>
            </div>
          </dl>
          <p className="border-t border-line px-6 py-5 text-[15px] text-ink-soft">{resultMessage(result.percentage)}</p>
        </div>
        <p className="mt-6 text-center text-sm text-muted">
          Your responses have been recorded. You may close this page.{" "}
          <Link href="/" className="sr-only">Home</Link>
        </p>
      </main>
    </>
  );
}
