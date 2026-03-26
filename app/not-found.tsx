import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col items-start justify-center gap-6 px-6 py-12 md:px-10">
      <p className="text-sm uppercase tracking-[0.2em] text-[var(--muted)]">Case not found</p>
      <h1 className="text-4xl font-semibold tracking-tight" data-testid="case-not-found">
        This Refund Raider case does not exist.
      </h1>
      <p className="max-w-2xl text-[var(--muted)]">
        The link may be wrong, the case may have been removed, or you may be looking for a case
        from another environment.
      </p>
      <Link
        href="/cases/new"
        className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-medium text-[var(--accent-foreground)]"
      >
        Start a new case
      </Link>
    </main>
  );
}
