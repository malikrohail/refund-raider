import Link from "next/link";
import { SiteHeader } from "@/components/siteHeader";

const steps = [
  "Start talking: tell Refund Raider what you want fixed, canceled, replaced, or refunded.",
  "The agent extracts the facts, finds policy evidence, and builds an executable action plan.",
  "Approve the draft, send the first message fast, and keep the follow-up loop alive."
];

const pillars = [
  {
    title: "Talk first",
    body: "Start with the live agent, not a form. Describe the problem in plain English and let the case take shape from there."
  },
  {
    title: "Prove the case",
    body: "Every recommendation is backed by visible policy evidence so the user sees why the path should work."
  },
  {
    title: "Run the plan",
    body: "Refund Raider drafts, queues approvals, runs the strongest action path, and tracks the follow-up state."
  }
];

export default function HomePage() {
  return (
    <main className="relative overflow-hidden">
      <section className="relative">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[44rem] bg-[radial-gradient(circle_at_78%_18%,rgba(255,106,61,0.12),transparent_0,transparent_34%),radial-gradient(circle_at_18%_12%,rgba(20,100,109,0.12),transparent_0,transparent_28%)]" />

        <div className="mx-auto flex w-full max-w-7xl flex-col gap-20 px-6 pb-24 pt-8 md:px-10 md:pb-32">
          <SiteHeader />

          <section className="grid gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div className="space-y-8">
              <div className="space-y-5">
                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[var(--muted)]">
                  Voice-first consumer action agent
                </p>
                <div className="space-y-3">
                  <p className="font-[var(--font-display)] text-[clamp(2.8rem,7vw,6rem)] leading-[0.92] tracking-[-0.05em] text-[var(--foreground)]">
                    Refund Raider
                  </p>
                  <h1 className="max-w-4xl text-[clamp(2.2rem,5vw,4.8rem)] font-semibold leading-[0.96] tracking-[-0.06em] text-[var(--foreground)]">
                    Talk to an agent that can fix refunds, cancellations, replacements, and billing fights.
                  </h1>
                </div>
                <p className="max-w-2xl text-lg leading-8 text-[var(--muted)] md:text-xl">
                  Start with voice or chat. Refund Raider turns messy merchant problems into a live
                  action case with evidence, approvals, execution, and follow-up instead of another
                  support script the user has to finish alone.
                </p>
              </div>

              <div className="flex flex-wrap gap-4">
                <Link
                  href="/cases/new"
                  className="rounded-full bg-[var(--foreground)] px-6 py-3.5 text-sm font-semibold text-white shadow-token-md transition hover:-translate-y-0.5 hover:bg-[var(--accent-strong)]"
                >
                  Talk to Refund Raider
                </Link>
                <Link
                  href="#flow"
                  className="rounded-full border border-[var(--border-strong)] bg-white/70 px-6 py-3.5 text-sm font-semibold backdrop-blur transition hover:-translate-y-0.5 hover:bg-white"
                >
                  See the 60-second flow
                </Link>
              </div>

              <div className="grid max-w-3xl gap-4 border-y border-[var(--border)] py-5 text-sm text-[var(--muted)] md:grid-cols-3">
                <div>
                  <p className="font-semibold text-[var(--foreground)]">Input</p>
                  <p className="mt-2 leading-6">Live voice/chat, Gmail, screenshots, merchant URLs, and uploaded proof that turn into one clear email-first action case.</p>
                </div>
                <div>
                  <p className="font-semibold text-[var(--foreground)]">Output</p>
                  <p className="mt-2 leading-6">Policy evidence, action plan, approvals, execution, and follow-up timeline.</p>
                </div>
                <div>
                  <p className="font-semibold text-[var(--foreground)]">Stack</p>
                  <p className="mt-2 leading-6">Firecrawl Search, ElevenLabs, Supabase, Resend.</p>
                </div>
              </div>
            </div>

            <div className="relative min-h-[34rem] overflow-hidden rounded-[2.6rem] border border-[var(--border)] bg-token-panel-hero p-8 shadow-token-lg">
              <div className="absolute inset-x-10 top-8 h-24 rounded-full bg-[rgba(20,100,109,0.12)] blur-3xl" />
              <div className="relative flex h-full flex-col justify-between">
                <div className="space-y-6">
                  <div className="flex items-center justify-between text-sm text-[var(--muted)]">
                    <span>Live agent flow</span>
                    <span>Talk → plan → draft → send</span>
                  </div>

                  <div className="space-y-4 border-b border-[var(--border)] pb-6">
                    <p className="font-[var(--font-display)] text-4xl leading-none tracking-[-0.05em] text-[var(--foreground)]">
                      Action ready
                    </p>
                    <p className="max-w-lg text-sm leading-7 text-[var(--muted)]">
                      “I canceled the trial, still got charged, and want the fastest path to fix it.”
                    </p>
                  </div>

                  <div className="grid gap-5 text-sm text-[var(--muted)] md:grid-cols-[0.9fr_1.1fr]">
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
                        Evidence
                      </p>
                      <p className="font-semibold text-[var(--foreground)]">
                        Billing path and cancellation evidence line up.
                      </p>
                      <p className="leading-7">
                        Policy, account clues, and prior messages are enough to choose the first
                        action path and line up the follow-up fallback.
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div className="border-b border-[var(--border)] pb-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
                          Plan
                        </p>
                        <p className="mt-2 text-base font-semibold text-[var(--foreground)]">
                          Primary channel, consent gate, and follow-up queue
                        </p>
                      </div>
                      <p className="leading-7">
                        Refund Raider stops at the exact user-approval edge, then runs the action
                        and keeps the case alive after the first send and follow-up step.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-6 text-sm">
                  <p className="font-semibold text-[var(--foreground)]">
                    Built to grow from a sharp demo into a real startup product.
                  </p>
                  <Link href="/cases/new" className="font-semibold text-[var(--secondary)]">
                    Open the live intake →
                  </Link>
                </div>
              </div>
            </div>
          </section>

          <section
            id="flow"
            className="grid gap-10 border-t border-[var(--border)] pt-10 lg:grid-cols-[0.9fr_1.1fr]"
          >
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[var(--muted)]">
                Why voice works
              </p>
              <h2 className="max-w-xl text-3xl font-semibold tracking-[-0.05em] md:text-4xl">
                The story lands fast because the agent is the shell, not a decorative side panel.
              </h2>
              <p className="max-w-xl text-base leading-8 text-[var(--muted)]">
                No dashboard mosaic. No noisy SaaS chrome. Just conversation, evidence, plan,
                approvals, execution, and a clean follow-up state.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {pillars.map((pillar) => (
                <article
                  key={pillar.title}
                  className="border-t border-[var(--border-strong)] pt-4 text-sm leading-7 text-[var(--muted)]"
                >
                  <p className="font-semibold text-[var(--foreground)]">{pillar.title}</p>
                  <p className="mt-3">{pillar.body}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="grid gap-8 rounded-[2.2rem] border border-[var(--border)] bg-white/82 px-6 py-8 shadow-token-md backdrop-blur-sm md:px-8 md:py-10 lg:grid-cols-[0.85fr_1.15fr]">
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--muted)]">
                Startup flow
              </p>
              <h2 className="max-w-md text-3xl font-semibold tracking-[-0.05em]">
                Show the agent first, then prove it with one real action case.
              </h2>
            </div>

            <ol className="grid gap-5 text-sm leading-7 text-[var(--muted)] md:grid-cols-3">
              {steps.map((step, index) => (
                <li key={step} className="border-t border-[var(--border-strong)] pt-4">
                  <span className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
                    Step {index + 1}
                  </span>
                  <p className="mt-3">{step}</p>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </section>
    </main>
  );
}
