import Link from "next/link";

export function Header({ subtitle, right }: { subtitle?: string; right?: React.ReactNode }) {
  return (
    <header className="border-b border-line bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-md bg-brand font-serif text-sm font-bold text-white">
            AI
          </span>
          <span className="min-w-0">
            <span className="block truncate font-serif text-[15px] font-semibold leading-tight text-ink">
              AI Product Management
            </span>
            {subtitle && <span className="block truncate text-xs text-muted">{subtitle}</span>}
          </span>
        </Link>
        {right}
      </div>
    </header>
  );
}
