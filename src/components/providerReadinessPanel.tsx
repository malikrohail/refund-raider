type ProviderRuntimeItem = {
  provider: string;
  mode: "live" | "mock";
  readiness: "ready" | "demo_safe" | "missing_config" | "provider_failure";
  configured: boolean;
  demoSafe: boolean;
  label: string;
  message: string;
};

type ProviderReadinessPanelProps = {
  runtime: {
    demoSafeMode: boolean;
    defaultProviderMode: "live" | "mock";
    message: string;
  };
  providers: ProviderRuntimeItem[];
  missingServerEnv: string[];
};

function formatProviderName(provider: string) {
  return provider
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function readinessLabel(readiness: ProviderRuntimeItem["readiness"]) {
  switch (readiness) {
    case "ready":
      return "Ready";
    case "demo_safe":
      return "Demo safe";
    case "provider_failure":
      return "Fallback";
    default:
      return "Missing config";
  }
}

export function ProviderReadinessPanel({
  runtime,
  providers,
  missingServerEnv
}: ProviderReadinessPanelProps) {
  return (
    <section className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-token-md">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Runtime readiness</p>
          <h2 className="mt-1 text-xl font-semibold tracking-[-0.03em]">Demo-safe provider status</h2>
          <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">{runtime.message}</p>
        </div>
        <span className="rounded-full border border-[var(--border-strong)] bg-white/80 px-3 py-1 text-xs font-medium">
          Default mode: {runtime.defaultProviderMode}
        </span>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {providers.map((provider) => (
          <article key={provider.provider} className="rounded-[1.4rem] border border-[var(--border)] bg-white/92 p-4 shadow-token-md">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold">{formatProviderName(provider.provider)}</h3>
              <span className="rounded-full bg-[var(--accent-soft)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--foreground)]">
                {readinessLabel(provider.readiness)}
              </span>
            </div>
            <p className="mt-2 text-sm text-[var(--muted)]">{provider.message}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-white px-2.5 py-1">mode: {provider.mode}</span>
              <span className="rounded-full bg-white px-2.5 py-1">
                configured: {provider.configured ? "yes" : "no"}
              </span>
              <span className="rounded-full bg-white px-2.5 py-1">
                demo safe: {provider.demoSafe ? "yes" : "no"}
              </span>
            </div>
          </article>
        ))}
      </div>

      {missingServerEnv.length > 0 ? (
        <div className="mt-5 rounded-[1.4rem] border border-dashed border-[var(--border)] bg-white/70 p-4">
          <p className="text-sm font-medium">Still missing for full live mode</p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {missingServerEnv.join(", ")}
          </p>
        </div>
      ) : null}
    </section>
  );
}
