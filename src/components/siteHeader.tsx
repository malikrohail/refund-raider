import Link from "next/link";

export function SiteHeader({
  actionHref = "/cases/new",
  actionLabel = "Talk to Refund Raider"
}: {
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <header className="flex items-center justify-between gap-4">
      <Link
        href="/"
        className="inline-flex items-center gap-3 rounded-[1.2rem] border border-[var(--border)] bg-white/70 px-4 py-3 shadow-token-md backdrop-blur-sm"
      >
        <img
          src="/refund-raider-logo.svg"
          alt="Refund Raider logo"
          className="h-11 w-11 rounded-2xl"
        />
        <span className="flex flex-col">
          <span className="text-[0.68rem] uppercase tracking-[0.3em] text-[var(--secondary)]">
            Refund Raider
          </span>
          <span className="mt-1 font-[var(--font-display)] text-xl tracking-[-0.04em] text-[var(--foreground)]">
            Consumer action, with teeth
          </span>
        </span>
      </Link>

      <Link
        href={actionHref}
        className="rounded-full border border-[var(--accent-strong)] bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold shadow-token-md transition hover:-translate-y-0.5 hover:bg-[var(--accent-strong)] hover:shadow-[0_16px_36px_-26px_rgba(0,0,0,0.45)]"
        style={{ color: "var(--accent-foreground)" }}
      >
        {actionLabel}
      </Link>
    </header>
  );
}
