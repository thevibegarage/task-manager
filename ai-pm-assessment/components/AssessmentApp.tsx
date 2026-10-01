"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { AssessmentOverview, PublicAssessment, PublicQuestion } from "@/types";
import { ConfirmDialog } from "./ConfirmDialog";
import { QuestionCard } from "./QuestionCard";

type Answers = Record<string, string[]>;

type Session = {
  name: string;
  email: string;
  submissionId: string;
  assessment: PublicAssessment;
  answers: Answers;
  current: number;
};

// sessionStorage keeps progress (and the shuffled option order) across a refresh,
// without leaving answers behind on a shared computer once the tab is closed.
const STORAGE_KEY = "ai-pm-assessment:session:v1";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function loadSession(): Session | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

function saveSession(session: Session | null) {
  try {
    if (session) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* storage unavailable (private mode) — progress just won't survive a refresh */
  }
}

const isComplete = (q: PublicQuestion, answers: Answers) => (answers[q.id]?.length ?? 0) === q.selectCount;

export function AssessmentApp({ overview }: { overview: AssessmentOverview }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    setSession(loadSession());
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) saveSession(session);
  }, [ready, session]);

  if (!ready) return <div className="card h-64 animate-pulse" aria-busy="true" />;

  if (!session) return <IntroForm overview={overview} onStart={setSession} />;

  return (
    <Quiz
      session={session}
      onChange={setSession}
      onSubmitted={(id) => {
        saveSession(null);
        router.replace(`/result/${id}`);
      }}
    />
  );
}

function IntroForm({ overview, onStart }: { overview: AssessmentOverview; onStart: (s: Session) => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<{ name?: string; email?: string; form?: string }>({});
  const [loading, setLoading] = useState(false);

  async function start(e: React.FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};
    if (!name.trim()) next.name = "Please enter your name.";
    if (!email.trim()) next.email = "Please enter your email.";
    else if (!EMAIL_RE.test(email.trim())) next.email = "Please enter a valid email address.";
    setErrors(next);
    if (next.name || next.email) return;

    setLoading(true);
    try {
      const res = await fetch("/api/assessment", { cache: "no-store" });
      if (!res.ok) throw new Error();
      const assessment = (await res.json()) as PublicAssessment;
      onStart({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        submissionId: crypto.randomUUID(),
        assessment,
        answers: {},
        current: 0,
      });
    } catch {
      setErrors({ form: "Could not load the assessment. Check your connection and try again." });
      setLoading(false);
    }
  }

  return (
    <div className="card overflow-hidden">
      <div className="border-b border-line bg-brand-tint/50 px-6 py-8 sm:px-10">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-accent">Assessment</p>
        <h1 className="font-serif text-2xl font-semibold leading-snug text-ink sm:text-3xl">
          {overview.title}
        </h1>
        <p className="mt-3 max-w-prose text-[15px] leading-relaxed text-ink-soft">{overview.description}</p>
        <ul className="mt-5 grid gap-2 text-sm text-ink-soft sm:grid-cols-3">
          <li className="flex items-center gap-2"><Dot />{overview.questionCount} questions</li>
          <li className="flex items-center gap-2"><Dot />Maximum score: {overview.maxScore}</li>
          <li className="flex items-center gap-2"><Dot />One submission only</li>
        </ul>
      </div>

      <form onSubmit={start} noValidate className="space-y-5 px-6 py-8 sm:px-10">
        <div>
          <label htmlFor="name" className="label">Student Name</label>
          <input
            id="name"
            className="field"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? "name-error" : undefined}
            maxLength={120}
            required
          />
          {errors.name && <p id="name-error" className="mt-1.5 text-sm text-danger">{errors.name}</p>}
        </div>
        <div>
          <label htmlFor="email" className="label">Student Email</label>
          <input
            id="email"
            type="email"
            inputMode="email"
            className="field"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "email-error" : undefined}
            maxLength={254}
            required
          />
          {errors.email && <p id="email-error" className="mt-1.5 text-sm text-danger">{errors.email}</p>}
        </div>
        {errors.form && <p role="alert" className="text-sm text-danger">{errors.form}</p>}
        <button type="submit" className="btn-primary w-full py-3 text-base sm:w-auto" disabled={loading}>
          {loading ? "Loading…" : "Start Assessment"}
        </button>
      </form>
    </div>
  );
}

function Dot() {
  return <span className="size-1.5 rounded-full bg-accent" aria-hidden />;
}

function Quiz({
  session,
  onChange,
  onSubmitted,
}: {
  session: Session;
  onChange: (s: Session) => void;
  onSubmitted: (submissionId: string) => void;
}) {
  const { assessment, answers, current } = session;
  const questions = assessment.questions;
  const question = questions[current];
  const isLast = current === questions.length - 1;
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const completed = useMemo(() => questions.filter((q) => isComplete(q, answers)).length, [questions, answers]);
  const incomplete = questions.length - completed;

  const goTo = (index: number) => {
    onChange({ ...session, current: Math.max(0, Math.min(questions.length - 1, index)) });
    window.scrollTo({ top: 0 });
  };

  const setSelection = (ids: string[]) => onChange({ ...session, answers: { ...answers, [question.id]: ids } });

  async function submit() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId: session.submissionId,
          name: session.name,
          email: session.email,
          answers: questions.map((q) => ({ questionId: q.id, selectedOptionIds: answers[q.id] ?? [] })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSubmitError(data.error ?? "Submission failed. Please try again.");
        setSubmitting(false);
        return;
      }
      onSubmitted(data.submission_id);
    } catch {
      // Safe to retry: the same submission ID is reused, so the server never double-counts.
      setSubmitError("Network error. Your answers are saved in this tab — please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="card px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm font-semibold text-ink">
            Question {current + 1} of {questions.length}
          </p>
          <p className="text-xs text-muted">
            {completed} of {questions.length} answered · {session.name}
          </p>
        </div>
        <div
          className="mt-3 h-1.5 overflow-hidden rounded-full bg-line"
          role="progressbar"
          aria-label="Progress"
          aria-valuemin={0}
          aria-valuemax={questions.length}
          aria-valuenow={current + 1}
        >
          <div
            className="h-full rounded-full bg-brand transition-[width]"
            style={{ width: `${((current + 1) / questions.length) * 100}%` }}
          />
        </div>
        <nav aria-label="Jump to question" className="mt-3 flex flex-wrap gap-1.5">
          {questions.map((q, i) => {
            const done = isComplete(q, answers);
            return (
              <button
                key={q.id}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Question ${i + 1}${done ? ", answered" : ""}`}
                aria-current={i === current ? "step" : undefined}
                className={[
                  "size-7 rounded-md text-xs font-medium tabular-nums transition-colors",
                  i === current
                    ? "bg-brand text-white"
                    : done
                      ? "bg-brand-tint text-brand"
                      : "border border-line bg-white text-muted hover:border-brand/40",
                ].join(" ")}
              >
                {i + 1}
              </button>
            );
          })}
        </nav>
      </div>

      <QuestionCard key={question.id} question={question} selected={answers[question.id] ?? []} onChange={setSelection} />

      <div className="flex items-center justify-between gap-3">
        <button type="button" className="btn-secondary" onClick={() => goTo(current - 1)} disabled={current === 0}>
          ← Previous
        </button>
        {isLast ? (
          <button type="button" className="btn-primary" onClick={() => setConfirming(true)}>
            Submit Assessment
          </button>
        ) : (
          <button type="button" className="btn-primary" onClick={() => goTo(current + 1)}>
            Next →
          </button>
        )}
      </div>

      {confirming && (
        <ConfirmDialog
          title="Submit assessment?"
          confirmLabel={submitting ? "Submitting…" : "Submit Assessment"}
          busy={submitting}
          onCancel={() => !submitting && setConfirming(false)}
          onConfirm={submit}
        >
          <p>You are about to submit your assessment. You will not be able to change your answers after submission.</p>
          {incomplete > 0 && (
            <p className="mt-3 rounded-lg border border-accent/30 bg-accent/5 px-3 py-2 text-sm text-ink">
              {incomplete === 1 ? "1 question is" : `${incomplete} questions are`} not fully answered:{" "}
              {questions
                .map((q, i) => (isComplete(q, answers) ? null : `Q${i + 1}`))
                .filter(Boolean)
                .join(", ")}
              . Incomplete questions receive no points.
            </p>
          )}
          {submitError && (
            <p role="alert" className="mt-3 text-sm text-danger">{submitError}</p>
          )}
        </ConfirmDialog>
      )}
    </div>
  );
}
