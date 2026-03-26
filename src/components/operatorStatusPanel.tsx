"use client";

import type { CaseDetailPayload } from "@/lib/contracts/domain";
import {
  deriveOperatorStatus,
  type OperatorRuntimePayload
} from "@/lib/operator/operatorStatus";

function getStepClasses(state: "complete" | "active" | "pending" | "blocked") {
  switch (state) {
    case "complete":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "active":
      return "border-[var(--border-strong)] bg-white text-[var(--foreground)]";
    case "blocked":
      return "border-rose-200 bg-rose-50 text-rose-800";
    default:
      return "border-[var(--border)] bg-white/70 text-[var(--muted)]";
  }
}

function getServiceClasses(state: "ready" | "missing" | "waiting" | "active") {
  switch (state) {
    case "ready":
      return "bg-emerald-100 text-emerald-800";
    case "active":
      return "bg-[var(--accent-soft)] text-[var(--accent-strong)]";
    case "missing":
      return "bg-rose-100 text-rose-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export function OperatorStatusPanel({
  caseDetail,
  providerRuntime,
  handoffMerchantName
}: {
  caseDetail: CaseDetailPayload;
  providerRuntime: OperatorRuntimePayload;
  handoffMerchantName?: string | null;
}) {
  const operatorStatus = deriveOperatorStatus(caseDetail, providerRuntime);

  return (
    <section className="rounded-[2rem] border border-[var(--border-strong)] bg-token-panel-soft p-6 shadow-token-lg">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
            Operator status
          </p>
          <h2 className="text-2xl font-semibold tracking-[-0.04em]">
            The app drives one deterministic service chain at a time.
          </h2>
          <p className="text-sm leading-6 text-[var(--muted)]">
            The operator only moves to the next rung after the current one is visibly ready. No vague takeover claims.
          </p>
        </div>

        <div className="rounded-full border border-[var(--border-strong)] bg-white/85 px-4 py-2 text-sm font-semibold text-[var(--foreground)]">
          Active channel: {operatorStatus.activeChannel}
        </div>
      </div>

      {handoffMerchantName ? (
        <div className="mt-5 rounded-[1.35rem] border border-[var(--border)] bg-white/90 px-4 py-3 text-sm text-[var(--foreground)]">
          Live intake captured <span className="font-semibold">{handoffMerchantName}</span>. The case workspace has taken over from the intake screen.
        </div>
      ) : null}

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        {operatorStatus.steps.map((step) => (
          <article
            key={step.label}
            className={`rounded-[1.25rem] border p-4 shadow-token-md ${getStepClasses(step.state)}`}
          >
            <div className="text-xs font-semibold uppercase tracking-[0.16em]">
              {step.label}
            </div>
            <div className="mt-3 text-xs leading-5">
              {step.detail}
            </div>
          </article>
        ))}
      </div>

      <div className="mt-5 rounded-[1.35rem] border border-[var(--border)] bg-white/92 p-4 shadow-token-md">
        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
          Next deterministic action
        </div>
        <p className="mt-3 text-sm font-semibold text-[var(--foreground)]">
          {operatorStatus.nextAction}
        </p>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        {operatorStatus.services.map((service) => (
          <article key={service.label} className="rounded-[1.2rem] border border-[var(--border)] bg-white/92 p-4 shadow-token-md">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                {service.label}
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getServiceClasses(service.state)}`}>
                {service.state}
              </span>
            </div>
            <p className="mt-3 text-xs leading-5 text-[var(--muted)]">
              {service.detail}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
