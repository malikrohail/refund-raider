"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { CaseDetailPayload } from "@/lib/contracts/domain";
import { AgentPanel } from "@/components/agentPanel";
import { OperatorStatusPanel } from "@/components/operatorStatusPanel";
import { ProviderReadinessPanel } from "@/components/providerReadinessPanel";
import { clearCaseHandoff, readCaseHandoff } from "@/lib/intake/caseHandoff";
import {
  formatActionTypeLabel,
  formatActionRunKindLabel,
  formatActionRunStatusLabel,
  formatArtifactKindLabel,
  formatCaseKindLabel,
  formatCaseStatusLabel,
  formatExecutionChannelLabel,
  formatFollowUpStatusLabel,
  formatEligibilityLabel,
  formatPolicySourceTypeLabel,
  formatRecommendedPathLabel
} from "@/lib/presentation/labels";

type AgentConfig = {
  agentId: string;
  mode: "configured" | "mock" | "misconfigured";
  preferredTransport?: "websocket" | "webrtc";
  configurationState?: "mock" | "live_ready" | "missing_tools" | "missing_credentials" | "inspect_failed";
  missingToolNames?: string[];
  conversationToken?: string;
  signedUrl?: string;
};

type CaseWorkspaceProps = {
  initialCaseDetail: CaseDetailPayload;
  initialAgentConfig: AgentConfig;
};

type ProviderRuntimeState = {
  provider: string;
  mode: "live" | "mock";
  readiness: "ready" | "demo_safe" | "missing_config" | "provider_failure";
  configured: boolean;
  demoSafe: boolean;
  label: string;
  message: string;
};

type ProviderRuntimePayload = {
  runtime: {
    demoSafeMode: boolean;
    defaultProviderMode: "live" | "mock";
    message: string;
  };
  providers: Record<string, ProviderRuntimeState>;
  missingServerEnv: string[];
};

export function CaseWorkspace({ initialCaseDetail, initialAgentConfig }: CaseWorkspaceProps) {
  const router = useRouter();
  const [caseDetail, setCaseDetail] = useState(initialCaseDetail);
  const [agentConfig, setAgentConfig] = useState(initialAgentConfig);
  const [draftSubject, setDraftSubject] = useState(initialCaseDetail.activeDraft?.subject ?? "");
  const [draftBody, setDraftBody] = useState(initialCaseDetail.activeDraft?.body ?? "");
  const [merchantEmail, setMerchantEmail] = useState(initialCaseDetail.case.merchantContactEmail ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [providerRuntime, setProviderRuntime] = useState<ProviderRuntimePayload | null>(null);
  const [handoffMerchantName, setHandoffMerchantName] = useState<string | null>(null);

  const activeStrategy = caseDetail.activeStrategy;
  const activeActionPlan = caseDetail.activeActionPlan;
  const activeDraft = caseDetail.activeDraft;
  const proofSummary = useMemo(() => {
    return caseDetail.artifacts
      .filter((artifact) => artifact.sourceText && artifact.sourceText.trim().length > 0)
      .slice(0, 2)
      .map((artifact) => artifact.sourceText?.replace(/\s+/g, " ").trim().slice(0, 140))
      .filter(Boolean)
      .join(" | ");
  }, [caseDetail.artifacts]);

  const deadlineLabel = useMemo(() => {
    return activeStrategy?.deadlineAt
      ? new Date(activeStrategy.deadlineAt).toLocaleDateString()
      : "Not extracted";
  }, [activeStrategy?.deadlineAt]);

  const verdictLabel = activeStrategy?.eligibility?.replaceAll("_", " ") ?? "research required";
  const proofArtifacts = useMemo(() => {
    return caseDetail.artifacts.filter((artifact) => artifact.sourceText && artifact.sourceText.trim().length > 0);
  }, [caseDetail.artifacts]);
  const verdictSummary =
    activeStrategy?.plainEnglishSummary ??
    "Run research to gather policy evidence and produce the verdict.";
  const evidenceCount = caseDetail.policySources.length;
  const verdictBadge =
    activeStrategy?.eligibility === "eligible" || activeStrategy?.eligibility === "likely_eligible"
      ? "Strong refund path"
      : activeStrategy?.eligibility === "likely_ineligible"
        ? "Low confidence"
        : activeStrategy
          ? "Needs more evidence"
          : "Research pending";
  const verdictBadgeClasses =
    activeStrategy?.eligibility === "eligible" || activeStrategy?.eligibility === "likely_eligible"
      ? "bg-emerald-100 text-emerald-800"
      : activeStrategy?.eligibility === "likely_ineligible"
        ? "bg-rose-100 text-rose-700"
        : "bg-amber-100 text-amber-800";
  const evidencePanelTitle =
    evidenceCount > 0 ? `${evidenceCount} evidence source${evidenceCount === 1 ? "" : "s"}` : "No evidence yet";
  const latestAction = caseDetail.timeline.at(-1);
  const latestActionLabel = latestAction ? formatActionTypeLabel(latestAction.actionType) : "No actions yet";
  const supportChannelLabel = merchantEmail || "Support address still missing";

  useEffect(() => {
    let isMounted = true;

    async function hydrateAgentConfig() {
      const response = await fetch("/api/v1/agent/session", {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          caseId: caseDetail.case.id
        })
      });

      const body = await response.json();
      if (!response.ok) {
        return;
      }

      if (isMounted) {
        setAgentConfig(body.data.agent);
      }
    }

    hydrateAgentConfig().catch(() => undefined);

    return () => {
      isMounted = false;
    };
  }, [caseDetail.case.id]);

  useEffect(() => {
    let isMounted = true;

    async function hydrateProviderRuntime() {
      const response = await fetch("/api/v1/runtime/providers");
      const body = await response.json();

      if (!response.ok || !isMounted) {
        return;
      }

      setProviderRuntime(body.data as ProviderRuntimePayload);
    }

    hydrateProviderRuntime().catch(() => undefined);

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const handoff = readCaseHandoff();
    if (!handoff || handoff.caseId !== caseDetail.case.id) {
      return;
    }

    setHandoffMerchantName(handoff.merchantName);
    clearCaseHandoff();
  }, [caseDetail.case.id]);

  async function refreshCaseDetail() {
    const response = await fetch(`/api/v1/cases/${caseDetail.case.id}`);
    const body = await response.json();

    if (!response.ok) {
      throw new Error(body.error?.message ?? "Failed to refresh case.");
    }

    const nextCaseDetail = body.data.caseDetail as CaseDetailPayload;
    setCaseDetail(nextCaseDetail);
    setDraftSubject(nextCaseDetail.activeDraft?.subject ?? "");
    setDraftBody(nextCaseDetail.activeDraft?.body ?? "");
    setMerchantEmail(nextCaseDetail.case.merchantContactEmail ?? "");
    router.refresh();
  }

  async function runAction(actionName: string, runner: () => Promise<void>) {
    setBusyAction(actionName);
    setError(null);

    try {
      await runner();
      await refreshCaseDetail();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unexpected case error.");
    } finally {
      setBusyAction(null);
    }
  }

  async function runResearchAndStrategy() {
    await fetch(`/api/v1/cases/${caseDetail.case.id}/research`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ forceRefresh: true })
    }).then(async (response) => {
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error?.message ?? "Failed to run research.");
      }
    });

    await fetch(`/api/v1/cases/${caseDetail.case.id}/strategy`, {
      method: "POST"
    }).then(async (response) => {
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error?.message ?? "Failed to generate strategy.");
      }
    });
  }

  async function createDraft() {
    await fetch(`/api/v1/cases/${caseDetail.case.id}/drafts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ tone: "firm_polite" })
    }).then(async (response) => {
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error?.message ?? "Failed to create draft.");
      }
    });
  }

  async function saveDraft() {
    if (!activeDraft) {
      throw new Error("No active draft to save.");
    }

    await fetch(`/api/v1/cases/${caseDetail.case.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        merchantContactEmail: merchantEmail
      })
    }).then(async (response) => {
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error?.message ?? "Failed to save merchant contact email.");
      }
    });

    await fetch(`/api/v1/drafts/${activeDraft.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        subject: draftSubject,
        body: draftBody
      })
    }).then(async (response) => {
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error?.message ?? "Failed to save draft.");
      }
    });
  }

  async function approveDraft() {
    if (!activeDraft) {
      throw new Error("No active draft to approve.");
    }

    await saveDraft();

    await fetch(`/api/v1/drafts/${activeDraft.id}/approve`, {
      method: "POST"
    }).then(async (response) => {
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error?.message ?? "Failed to approve draft.");
      }
    });
  }

  async function sendDraft() {
    if (!activeDraft) {
      throw new Error("No active draft to send.");
    }

    if (!merchantEmail.trim()) {
      throw new Error("A merchant support email is required before sending.");
    }

    await fetch(`/api/v1/drafts/${activeDraft.id}/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        to: [merchantEmail.trim()],
        ccUser: true
      })
    }).then(async (response) => {
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error?.message ?? "Failed to send draft.");
      }
    });
  }

  async function refreshActionPlan() {
    await fetch(`/api/v1/cases/${caseDetail.case.id}/plan`, {
      method: "POST"
    }).then(async (response) => {
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error?.message ?? "Failed to refresh the action plan.");
      }
    });
  }

  async function approveAction(actionId: string) {
    await fetch(`/api/v1/actions/${actionId}/approve`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({})
    }).then(async (response) => {
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error?.message ?? "Failed to approve the action.");
      }
    });
  }

  async function executeAction(actionId: string) {
    await fetch(`/api/v1/actions/${actionId}/run`, {
      method: "POST"
    }).then(async (response) => {
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error?.message ?? "Failed to run the action.");
      }
    });
  }

  async function scheduleFollowUp() {
    await fetch(`/api/v1/cases/${caseDetail.case.id}/follow-ups`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({})
    }).then(async (response) => {
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error?.message ?? "Failed to schedule the follow-up.");
      }
    });
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="grid gap-6">
        <section className="relative overflow-hidden rounded-[2rem] border border-[var(--border)] bg-token-panel p-6 shadow-token-lg">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(20,100,109,0.36)] to-transparent" />
          <div className="pointer-events-none absolute -right-16 top-0 h-36 w-36 rounded-full bg-[rgba(20,100,109,0.12)] blur-3xl" />

          <div className="relative mb-5 flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
                Verdict and evidence
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--muted)]">
                <span>Case status: {formatCaseStatusLabel(caseDetail.case.status)}</span>
                <span className="h-1 w-1 rounded-full bg-[rgba(115,115,115,0.35)]" />
                <span>Deadline: {deadlineLabel}</span>
                <span className="h-1 w-1 rounded-full bg-[rgba(115,115,115,0.35)]" />
                <span>{evidencePanelTitle}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => runAction("research", runResearchAndStrategy)}
              disabled={busyAction !== null}
              data-testid="refresh-research"
              className="rounded-full border border-[var(--border-strong)] bg-white/90 px-4 py-2 text-sm font-medium text-[var(--secondary)] shadow-sm transition hover:-translate-y-0.5 hover:bg-white disabled:translate-y-0 disabled:opacity-60"
            >
              {busyAction === "research" ? "Researching..." : "Refresh research"}
            </button>
          </div>

          <div className="relative grid gap-4">
            <div className="grid gap-4 lg:grid-cols-[1.08fr_0.92fr]">
              <div
                className="rounded-[1.25rem] border border-[var(--border)] bg-white/92 p-5 shadow-token-md backdrop-blur-sm"
                data-testid="eligibility-card"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
                    Eligibility
                  </p>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${verdictBadgeClasses}`}>
                    {verdictBadge}
                  </span>
                </div>
                <p className="mt-4 text-3xl font-semibold tracking-tight text-[var(--foreground)]">
                  {activeStrategy ? formatEligibilityLabel(activeStrategy.eligibility) : verdictLabel}
                </p>
                <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--muted)]">{verdictSummary}</p>
                <div className="mt-5 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-[var(--secondary-soft)] px-3 py-1 text-[var(--muted)]">
                    Research path: {activeStrategy ? formatRecommendedPathLabel(activeStrategy.recommendedPath) : "Pending"}
                  </span>
                  <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-[var(--muted)]">
                    Deadline: {deadlineLabel}
                  </span>
                </div>
              </div>

              <div className="rounded-[1.25rem] border border-[var(--border)] bg-[rgba(255,255,255,0.74)] p-5 backdrop-blur-sm">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
                    Case snapshot
                  </p>
                  <p className="text-lg font-semibold text-[var(--foreground)]">What matters right now</p>
                </div>
                <div className="mt-5 grid gap-4 border-t border-[var(--border)] pt-4 text-sm text-[var(--muted)]">
                  <div className="flex items-start justify-between gap-4">
                    <span>Latest step</span>
                    <span className="text-right font-semibold text-[var(--foreground)]">{latestActionLabel}</span>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <span>Support channel</span>
                    <span className="max-w-[16rem] text-right font-semibold text-[var(--foreground)]">{supportChannelLabel}</span>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <span>Case status</span>
                    <span className="font-semibold capitalize text-[var(--foreground)]">
                      {caseDetail.case.status.replaceAll("_", " ")}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <span>Evidence collected</span>
                    <span className="font-semibold text-[var(--foreground)]">
                      {evidenceCount} source{evidenceCount === 1 ? "" : "s"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-3">
              {caseDetail.policySources.length > 0 ? (
                caseDetail.policySources.map((source, index) => (
                  <article
                    key={source.id}
                    className="rounded-[1.25rem] border border-[var(--border)] bg-white/94 p-4 shadow-[0_12px_32px_-28px_rgba(0,0,0,0.28)] transition hover:-translate-y-0.5"
                    data-testid="evidence-card"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="max-w-[70ch]">
                        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent-strong)]">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          <span>Evidence</span>
                        </div>
                        <h3 className="text-sm font-semibold text-[var(--foreground)]">{source.title ?? source.url}</h3>
                      </div>
                      <span className="rounded-full bg-[var(--secondary-soft)] px-3 py-1 text-xs font-medium text-[var(--muted)]">
                        {formatPolicySourceTypeLabel(source.sourceType)}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{source.quoteText}</p>
                    {source.url.startsWith("artifact://") ? null : (
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex items-center text-sm font-medium text-[var(--accent)] transition hover:translate-x-0.5"
                      >
                        Open source
                      </a>
                    )}
                  </article>
                ))
              ) : (
                <div className="rounded-[1.25rem] border border-dashed border-[var(--border-strong)] bg-white/78 p-4 text-sm text-[var(--muted)]">
                  No evidence yet. Use the research button to fetch refund policy and support sources.
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-token-md">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-medium text-[var(--muted)]">Uploaded proof</div>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Parsed uploads and pasted context that helped build this case.
              </p>
            </div>
            <span className="rounded-full border border-[var(--border)] px-3 py-1 text-xs text-[var(--muted)]">
              {proofArtifacts.length} proof item{proofArtifacts.length === 1 ? "" : "s"}
            </span>
          </div>

          {proofArtifacts.length > 0 ? (
            <div className="grid gap-3">
              {proofArtifacts.map((artifact) => (
                <article key={artifact.id} className="rounded-2xl border border-[var(--border)] bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[var(--foreground)]">
                        {artifact.fileName ?? formatArtifactKindLabel(artifact.kind)}
                      </p>
                      <p className="mt-1 text-xs text-[var(--muted)]">{formatArtifactKindLabel(artifact.kind)}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                    {artifact.sourceText?.replace(/\s+/g, " ").trim().slice(0, 260)}
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[var(--border)] p-4 text-sm text-[var(--muted)]">
              No extracted proof is attached to this case yet.
            </div>
          )}
        </section>

        <section className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-token-md">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-medium text-[var(--muted)]">Draft and approval</div>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Generate, review, approve, and send the refund request from one place.
              </p>
            </div>
            <button
              type="button"
              onClick={() => runAction("draft", createDraft)}
              disabled={busyAction !== null || !activeStrategy}
              data-testid="generate-draft"
              className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm font-medium shadow-token-md disabled:opacity-60"
            >
              {busyAction === "draft" ? "Generating..." : activeDraft ? "Regenerate draft" : "Generate draft"}
            </button>
          </div>

          {activeDraft ? (
            <div className="grid gap-4">
              <div className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-[var(--border)] bg-white p-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                    Draft status
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">
                    {activeDraft.status === "approved"
                      ? "Approved and ready to send"
                      : activeDraft.status === "sent"
                        ? "Sent"
                        : "Needs review"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => runAction("save-draft", saveDraft)}
                    disabled={busyAction !== null}
                    data-testid="save-draft"
                    className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm font-medium shadow-token-md disabled:opacity-60"
                  >
                    {busyAction === "save-draft" ? "Saving..." : "Save draft"}
                  </button>
                  <button
                    type="button"
                    onClick={() => runAction("approve-draft", approveDraft)}
                    disabled={busyAction !== null}
                    data-testid="approve-draft"
                    className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm font-medium shadow-token-md disabled:opacity-60"
                  >
                    {busyAction === "approve-draft" ? "Approving..." : "Approve draft"}
                  </button>
                  <button
                    type="button"
                    onClick={() => runAction("send-draft", sendDraft)}
                    disabled={busyAction !== null}
                    data-testid="send-draft"
                    className="rounded-full bg-[var(--foreground)] px-4 py-2 text-sm font-medium text-white shadow-token-md disabled:opacity-60"
                  >
                    {busyAction === "send-draft" ? "Sending..." : "Send refund email"}
                  </button>
                </div>
              </div>
              <label className="grid gap-2 text-sm">
                <span>Merchant support email</span>
                <input
                  data-testid="merchant-email"
                  value={merchantEmail}
                  onChange={(event) => setMerchantEmail(event.target.value)}
                  className="rounded-xl border border-[var(--border)] bg-white px-4 py-3"
                  placeholder="support@example.com"
                />
              </label>
              <label className="grid gap-2 text-sm">
                <span>Subject</span>
                <input
                  data-testid="draft-subject"
                  value={draftSubject}
                  onChange={(event) => setDraftSubject(event.target.value)}
                  className="rounded-xl border border-[var(--border)] bg-white px-4 py-3"
                />
              </label>
              <label className="grid gap-2 text-sm">
                <span>Body</span>
                <textarea
                  data-testid="draft-body"
                  value={draftBody}
                  onChange={(event) => setDraftBody(event.target.value)}
                  className="min-h-64 rounded-xl border border-[var(--border)] bg-white px-4 py-3"
                />
              </label>
            </div>
          ) : (
            <div className="rounded-2xl border border-[var(--border)] p-4 text-sm text-[var(--muted)]">
              Generate a draft after the strategy is ready.
            </div>
          )}
        </section>
      </div>

      <div className="grid gap-6">
        <OperatorStatusPanel
          caseDetail={caseDetail}
          providerRuntime={providerRuntime}
          handoffMerchantName={handoffMerchantName}
        />

        {providerRuntime ? (
          <ProviderReadinessPanel
            runtime={providerRuntime.runtime}
            providers={Object.values(providerRuntime.providers)}
            missingServerEnv={providerRuntime.missingServerEnv}
          />
        ) : null}

        <AgentPanel
          caseId={caseDetail.case.id}
          merchantName={caseDetail.case.merchantName}
          summary={
            activeStrategy?.plainEnglishSummary ??
            "Run research first so Refund Raider can explain the strongest refund path."
          }
          proofSummary={proofSummary || null}
          deadlineAt={activeStrategy?.deadlineAt ?? null}
          merchantEmail={merchantEmail || null}
          mode={agentConfig.mode}
          agentId={agentConfig.agentId}
          preferredTransport={agentConfig.preferredTransport}
          conversationToken={agentConfig.conversationToken}
          signedUrl={agentConfig.signedUrl}
          onCaseRefresh={refreshCaseDetail}
        />

        <section className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-token-md">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-medium text-[var(--muted)]">Autopilot action plan</div>
              <p className="mt-1 text-sm text-[var(--muted)]">
                The voice agent now works from a stored plan instead of ad-hoc case advice.
              </p>
            </div>
            <button
              type="button"
              onClick={() => runAction("refresh-plan", refreshActionPlan)}
              disabled={busyAction !== null}
              className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm font-medium shadow-token-md disabled:opacity-60"
            >
              {busyAction === "refresh-plan" ? "Refreshing..." : activeActionPlan ? "Refresh plan" : "Build plan"}
            </button>
          </div>

          {activeActionPlan ? (
            <div className="grid gap-4">
              <div className="rounded-2xl border border-[var(--border)] bg-white p-4">
                <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-[var(--muted)]">
                  <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1">
                    {formatCaseKindLabel(caseDetail.case.caseKind)}
                  </span>
                  <span className="rounded-full bg-[#f7f7f5] px-3 py-1">
                    Primary: {formatExecutionChannelLabel(activeActionPlan.primaryChannel)}
                  </span>
                  <span className="rounded-full bg-[#f7f7f5] px-3 py-1">
                    Confidence: {activeActionPlan.automationConfidence}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{activeActionPlan.summary}</p>
                {activeActionPlan.opsFallbackReason ? (
                  <p className="mt-3 text-xs text-[var(--muted)]">
                    Ops fallback: {activeActionPlan.opsFallbackReason}
                  </p>
                ) : null}
              </div>

              <div className="grid gap-3">
                {caseDetail.actionRuns.map((actionRun) => {
                  const approval = caseDetail.approvals.find(
                    (candidate) => candidate.actionRunId === actionRun.id
                  );

                  return (
                    <article key={actionRun.id} className="rounded-2xl border border-[var(--border)] bg-white p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-[var(--foreground)]">
                            {formatActionRunKindLabel(actionRun.actionKind)}
                          </p>
                          <p className="mt-1 text-sm text-[var(--muted)]">{actionRun.description}</p>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs font-medium text-[var(--muted)]">
                          <span className="rounded-full bg-[var(--secondary-soft)] px-3 py-1">
                            {formatExecutionChannelLabel(actionRun.executionChannel)}
                          </span>
                          <span className="rounded-full bg-[#f7f7f5] px-3 py-1">
                            {formatActionRunStatusLabel(actionRun.status)}
                          </span>
                          {approval ? (
                            <span className="rounded-full bg-[#f7f7f5] px-3 py-1">
                              Approval: {approval.status}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-3">
                        {actionRun.requiresConsent ? (
                          <button
                            type="button"
                            onClick={() => runAction(`approve-action-${actionRun.id}`, () => approveAction(actionRun.id))}
                            disabled={busyAction !== null}
                            className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm font-medium shadow-token-md disabled:opacity-60"
                          >
                            {busyAction === `approve-action-${actionRun.id}` ? "Approving..." : "Approve action"}
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => runAction(`execute-action-${actionRun.id}`, () => executeAction(actionRun.id))}
                          disabled={busyAction !== null}
                          className="rounded-full bg-[var(--foreground)] px-4 py-2 text-sm font-medium text-white shadow-token-md disabled:opacity-60"
                        >
                          {busyAction === `execute-action-${actionRun.id}` ? "Running..." : "Run action"}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[var(--border)] p-4 text-sm text-[var(--muted)]">
              Build the action plan after research so the agent can request consent, run the next step,
              and queue follow-ups.
            </div>
          )}
        </section>

        <section className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-token-md">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-medium text-[var(--muted)]">Follow-up queue</div>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Track what should happen after the first merchant touchpoint.
              </p>
            </div>
            <button
              type="button"
              onClick={() => runAction("schedule-follow-up", scheduleFollowUp)}
              disabled={busyAction !== null}
              className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm font-medium shadow-token-md disabled:opacity-60"
            >
              {busyAction === "schedule-follow-up" ? "Scheduling..." : "Add follow-up"}
            </button>
          </div>

          <div className="grid gap-3">
            {caseDetail.followUps.length > 0 ? (
              caseDetail.followUps.map((followUp) => (
                <article key={followUp.id} className="rounded-2xl border border-[var(--border)] bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[var(--foreground)]">{followUp.title}</p>
                      <p className="mt-1 text-xs text-[var(--muted)]">Due {new Date(followUp.dueAt).toLocaleString()}</p>
                    </div>
                    <span className="rounded-full bg-[#f7f7f5] px-3 py-1 text-xs font-medium text-[var(--muted)]">
                      {formatFollowUpStatusLabel(followUp.status)}
                    </span>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-[var(--border)] p-4 text-sm text-[var(--muted)]">
                No follow-up tasks are scheduled yet.
              </div>
            )}
          </div>
        </section>

        <section className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-token-md">
          <div className="mb-4 text-sm font-medium text-[var(--muted)]">Timeline</div>
          <div className="grid gap-3">
            {caseDetail.timeline.length > 0 ? (
              caseDetail.timeline.map((action) => (
                <div
                  key={action.id}
                  className="rounded-[1.4rem] border border-[var(--border)] bg-white/94 p-4"
                  data-testid="timeline-event"
                >
                  <p className="text-sm font-medium">{formatActionTypeLabel(action.actionType)}</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">{action.createdAt}</p>
                  <p className="mt-2 text-sm text-[var(--muted)]">{action.status}</p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-[var(--border)] p-4 text-sm text-[var(--muted)]">
                No actions yet.
              </div>
            )}
          </div>
        </section>

        {error ? (
          <section className="rounded-[1.5rem] border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </section>
        ) : null}
      </div>
    </div>
  );
}
