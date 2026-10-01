"use client";

import type { PublicQuestion } from "@/types";

export function QuestionCard({
  question,
  selected,
  onChange,
}: {
  question: PublicQuestion;
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const multiple = question.type === "multiple";
  const limitReached = multiple && selected.length >= question.selectCount;

  function toggle(id: string) {
    if (!multiple) return onChange([id]);
    if (selected.includes(id)) return onChange(selected.filter((s) => s !== id));
    if (!limitReached) onChange([...selected, id]);
  }

  return (
    <fieldset className="card px-5 py-6 sm:px-8 sm:py-8">
      <legend className="sr-only">Question {question.number}</legend>
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-accent">
        Question {question.number}
      </p>
      <h2 className="font-serif text-lg leading-relaxed text-ink sm:text-xl">{question.text}</h2>

      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <span className="font-medium text-brand">
          {multiple ? `Select exactly ${question.selectCount} answers.` : "Select one answer."}
        </span>
        {multiple && (
          <span className="tabular-nums text-muted" aria-live="polite">
            {selected.length} of {question.selectCount} selected
          </span>
        )}
      </div>

      <div className="mt-5 space-y-2.5">
        {question.options.map((option, i) => {
          const checked = selected.includes(option.id);
          const disabled = multiple && !checked && limitReached;
          return (
            <label
              key={option.id}
              className={[
                "flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3.5 transition-colors",
                checked ? "border-brand bg-brand-tint/60" : "border-line bg-white hover:border-brand/40",
                disabled ? "cursor-not-allowed opacity-50 hover:border-line" : "",
              ].join(" ")}
            >
              <input
                type={multiple ? "checkbox" : "radio"}
                name={question.id}
                value={option.id}
                checked={checked}
                disabled={disabled}
                onChange={() => toggle(option.id)}
                className="mt-1 size-4 shrink-0 accent-brand"
              />
              <span className="flex gap-2 text-[15px] leading-relaxed text-ink">
                <span className="font-semibold text-ink-soft">{String.fromCharCode(65 + i)}.</span>
                <span>{option.text}</span>
              </span>
            </label>
          );
        })}
      </div>
      {limitReached && (
        <p className="mt-3 text-xs text-muted">
          Maximum reached. Deselect an answer to choose a different one.
        </p>
      )}
    </fieldset>
  );
}
