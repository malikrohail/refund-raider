import type { ProviderRuntimeState } from "@/lib/config/env";

type AgentHealth = {
  label: string;
  mode: "configured" | "mock" | "misconfigured";
  configurationState: string;
  agentId: string;
  expectedToolNames: string[];
  toolNames: string[];
  missingToolNames: string[];
  workflowNodeCount: number;
};

function tone(mode: AgentHealth["mode"] | ProviderRuntimeState["readiness"]) {
  if (mode === "configured" || mode === "ready") {
    return "bg-emerald-100 text-emerald-800";
  }

  if (mode === "misconfigured" || mode === "provider_failure") {
    return "bg-amber-100 text-amber-800";
  }

  return "bg-slate-100 text-slate-700";
}

function providerTitle(provider: string) {
  return provider
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function ProductionHealthPanel({
  intakeAgent,
  caseAgent,
  providers
}: {
  intakeAgent: AgentHealth;
  caseAgent: AgentHealth;
  providers: Array<ProviderRuntimeState & { provider: string }>;
}) {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-8 md:px-10 md:py-10">
      <header className="grid gap-4 border-t border-[var(--border)] pt-8">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--secondary)]">
          Production health
        </p>
        <h1 className="font-[var(--font-display)] text-5xl leading-[0.94] tracking-[-0.06em] text-[var(--foreground)]">
          One page for the whole voice and action stack.
        </h1>
        <p className="max-w-3xl text-sm leading-7 text-[var(--muted)]">
          This page shows whether the intake agent, case agent, Gmail, Firecrawl, and send path
          are actually ready instead of merely configured in theory.
        </p>
      </header>

      <section className="grid gap-4 lg:grid-cols-2">
        {[intakeAgent, caseAgent].map((agent) => (
          <article key={agent.label} className="rounded-[1.8rem] border border-[var(--border)] bg-white/92 p-5 shadow-token-md">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">{agent.label}</p>
                <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">{agent.agentId}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${tone(agent.mode)}`}>
                {agent.mode}
              </span>
            </div>

            <div className="mt-4 grid gap-3 text-sm text-[var(--muted)]">
              <p>Configuration state: {agent.configurationState}</p>
              <p>Workflow nodes: {agent.workflowNodeCount}</p>
              <p>Attached tools: {agent.toolNames.length}</p>
              <p>Missing tools: {agent.missingToolNames.length === 0 ? "none" : agent.missingToolNames.join(", ")}</p>
            </div>
          </article>
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {providers.map((provider) => (
          <article key={provider.provider} className="rounded-[1.6rem] border border-[var(--border)] bg-white/92 p-5 shadow-token-md">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-[var(--foreground)]">{providerTitle(provider.provider)}</p>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${tone(provider.readiness)}`}>
                {provider.readiness}
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{provider.message}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
