import { NewCaseForm } from "@/components/newCaseForm";

export default function NewCasePage() {
  return (
    <section className="grid gap-6">
      <header className="grid gap-6 rounded-[2rem] border border-[var(--border)] bg-token-panel p-6 shadow-token-lg lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--secondary)]">
            Live call
          </p>
          <h1 className="max-w-4xl font-[var(--font-display)] text-5xl leading-[0.94] tracking-[-0.06em] md:text-6xl">
            Start the conversation here. Let the agent decide when it needs tools, not the other way around.
          </h1>
        </div>

        <div className="space-y-3 text-sm leading-7 text-[var(--muted)]">
          <p>
            This is the main product surface: voice first, transcript second, manual correction third.
            The integrations tab exists so the live call does not get buried under setup widgets.
          </p>
          <p>
            Best current fit: cancellations, refunds, replacements, and billing-fix cases where the
            agent can progress through policy evidence, inbox context, and a clean email-first path.
          </p>
        </div>
      </header>

      <NewCaseForm />
    </section>
  );
}
