"use client";

import Link from "next/link";
import { VoiceIntakePanel } from "@/components/voiceIntakePanel";
import { useIntakeWorkspace } from "@/components/intakeWorkspaceProvider";
import {
  formatArtifactKindLabel,
  formatDesiredOutcomeLabel,
  formatIssueTypeLabel,
  formatPaymentMethodLabel
} from "@/lib/presentation/labels";
import type { IntakeSubmitStage } from "@/lib/intake/types";

function getSubmitLabel(stage: IntakeSubmitStage) {
  switch (stage) {
    case "autofilling":
      return "Reading your order context...";
    case "creating":
      return "Creating your case...";
    case "saving_context":
      return "Saving your evidence...";
    case "saving_proof":
      return "Uploading your proof...";
    case "researching":
      return "Gathering policy evidence...";
    case "drafting":
      return "Preparing the first action...";
    case "opening_workspace":
      return "Opening your case workspace...";
    default:
      return "Open my action case";
  }
}

export function NewCaseForm() {
  const {
    sessionUser,
    gmailStatus,
    form,
    setForm,
    autopilotContext,
    setAutopilotContext,
    suggestion,
    submitStage,
    captureVoiceProblem,
    handleConnectGmail,
    searchGmailResults,
    useGmailMessageById,
    createCaseFromCurrentIntake,
    file,
    setFile,
    setSuggestion,
    setIntakeSource,
    runAutofill,
    isAutofillRunning,
    error,
    setError,
    handleSubmit
  } = useIntakeWorkspace();

  const connectorSummary = [
    sessionUser.mode === "authenticated" ? "Google linked" : "Google missing",
    gmailStatus?.connected ? "Gmail linked" : "Gmail optional",
    "Email path after case open"
  ];

  return (
    <form className="grid gap-6" onSubmit={handleSubmit}>
      <section className="grid gap-4 rounded-[1.5rem] border border-[var(--border)] bg-white/92 p-4 shadow-token-md md:grid-cols-[1fr_auto] md:items-center">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--secondary)]">
            Live agent mode
          </p>
          <div className="flex flex-wrap gap-2 text-xs font-medium text-[var(--muted)]">
            {connectorSummary.map((item) => (
              <span key={item} className="rounded-full bg-[var(--secondary-soft)] px-3 py-1">
                {item}
              </span>
            ))}
          </div>
        </div>

        <Link
          href="/cases/new/integrations"
          className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold shadow-token-md transition hover:-translate-y-0.5"
        >
          Manage integrations
        </Link>
      </section>

      <VoiceIntakePanel
        sessionUser={sessionUser}
        gmailStatus={gmailStatus}
        form={form}
        autopilotContext={autopilotContext}
        suggestion={suggestion}
        submitStage={submitStage}
        onConnectGmail={handleConnectGmail}
        onSearchGmail={searchGmailResults}
        onSelectGmailMessage={useGmailMessageById}
        onCaptureProblem={captureVoiceProblem}
        onUpdateFields={(patch) => setForm((current) => ({ ...current, ...patch }))}
        onCreateCase={createCaseFromCurrentIntake}
      />

      <section className="grid gap-4 rounded-[1.5rem] border border-[var(--border-strong)] bg-white/76 p-5 shadow-token-md">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--secondary)]">
            Context drop
          </p>
          <h2 className="font-[var(--font-display)] text-3xl tracking-[-0.05em]">
            Paste the messy context only if the call needs more signal.
          </h2>
          <p className="max-w-3xl text-sm leading-6 text-[var(--muted)]">
            Use this when the live agent needs an order email, support reply, merchant URL, or a
            screenshot-derived clue to structure the case faster.
          </p>
        </div>

        <label className="grid gap-2 text-sm">
          <span>Order email, support message, or refund summary</span>
          <textarea
            data-testid="autopilot-context"
            value={autopilotContext}
            onChange={(event) => {
              setAutopilotContext(event.target.value);
              setSuggestion(null);
              setIntakeSource("paste");
            }}
            className="min-h-48 rounded-2xl border border-[var(--border)] bg-white px-4 py-4"
            placeholder={
              "From: Merchant Support <support@example.com>\nOrder placed on March 18, 2026\nMy headphones arrived cracked and I want a refund."
            }
          />
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            data-testid="autofill-case"
            disabled={isAutofillRunning}
            onClick={() => {
              runAutofill().catch((autofillError) => {
                setError(autofillError instanceof Error ? autofillError.message : "Failed to parse context.");
              });
            }}
            className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm font-medium shadow-token-md disabled:opacity-60"
          >
            {isAutofillRunning ? "Extracting case..." : "Extract from context or file"}
          </button>
          <span className="text-xs text-[var(--muted)]">
            Best inputs: order email, support reply, merchant URL, screenshot, PDF receipt, or a short complaint.
          </span>
        </div>

        {suggestion ? (
          <div className="grid gap-3 rounded-2xl border border-[var(--border)] bg-white p-4">
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-[var(--muted)]">
              <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-[var(--accent-strong)]">
                Confidence: {suggestion.confidence}
              </span>
              {suggestion.merchantContactEmail ? (
                <span className="rounded-full bg-slate-100 px-3 py-1">
                  Support email: {suggestion.merchantContactEmail}
                </span>
              ) : null}
              <span className="rounded-full bg-slate-100 px-3 py-1">
                Artifact: {formatArtifactKindLabel(suggestion.artifactKind)}
              </span>
            </div>
            <ul className="grid gap-2 text-sm text-[var(--muted)]">
              {suggestion.signals.map((signal) => (
                <li key={signal}>• {signal}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <section className="grid gap-5 rounded-[1.5rem] border border-[var(--border)] bg-white/92 p-5 shadow-token-md md:grid-cols-2">
        <div className="md:col-span-2">
          <div className="mb-2 text-sm font-medium text-[var(--foreground)]">Review what the agent understood</div>
          <p className="text-sm text-[var(--muted)]">
            The call stays primary. These fields are here so you can correct the case before it opens.
          </p>
        </div>

        <label className="grid gap-2 text-sm">
          <span>Merchant name</span>
          <input
            data-testid="merchant-name"
            value={form.merchantName}
            onChange={(event) => setForm((current) => ({ ...current, merchantName: event.target.value }))}
            className="rounded-xl border border-[var(--border)] bg-white px-4 py-3"
            placeholder="Best Buy"
          />
        </label>

        <label className="grid gap-2 text-sm">
          <span>Merchant URL</span>
          <input
            data-testid="merchant-url"
            value={form.merchantUrl}
            onChange={(event) => {
              setSuggestion(null);
              setForm((current) => ({ ...current, merchantUrl: event.target.value }));
            }}
            className="rounded-xl border border-[var(--border)] bg-white px-4 py-3"
            placeholder="https://www.bestbuy.com"
          />
        </label>

        <label className="grid gap-2 text-sm md:col-span-2">
          <span>Issue summary</span>
          <textarea
            data-testid="issue-summary"
            value={form.issueSummary}
            onChange={(event) => setForm((current) => ({ ...current, issueSummary: event.target.value }))}
            className="min-h-32 rounded-xl border border-[var(--border)] bg-white px-4 py-3"
            placeholder="My headphones arrived cracked and I want a refund."
          />
        </label>

        <label className="grid gap-2 text-sm">
          <span>Issue type</span>
          <select
            data-testid="issue-type"
            value={form.issueType}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                issueType: event.target.value as typeof form.issueType
              }))
            }
            className="rounded-xl border border-[var(--border)] bg-white px-4 py-3"
          >
            <option value="damaged_item">{formatIssueTypeLabel("damaged_item")}</option>
            <option value="missing_item">{formatIssueTypeLabel("missing_item")}</option>
            <option value="wrong_item">{formatIssueTypeLabel("wrong_item")}</option>
            <option value="late_delivery">{formatIssueTypeLabel("late_delivery")}</option>
            <option value="service_not_rendered">{formatIssueTypeLabel("service_not_rendered")}</option>
            <option value="subscription_cancellation">{formatIssueTypeLabel("subscription_cancellation")}</option>
            <option value="other">{formatIssueTypeLabel("other")}</option>
          </select>
        </label>

        <label className="grid gap-2 text-sm">
          <span>Desired outcome</span>
          <select
            data-testid="desired-outcome"
            value={form.desiredOutcome}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                desiredOutcome: event.target.value as typeof form.desiredOutcome
              }))
            }
            className="rounded-xl border border-[var(--border)] bg-white px-4 py-3"
          >
            <option value="full_refund">{formatDesiredOutcomeLabel("full_refund")}</option>
            <option value="partial_refund">{formatDesiredOutcomeLabel("partial_refund")}</option>
            <option value="replacement">{formatDesiredOutcomeLabel("replacement")}</option>
            <option value="refund_or_replacement">{formatDesiredOutcomeLabel("refund_or_replacement")}</option>
          </select>
        </label>

        <label className="grid gap-2 text-sm">
          <span>Payment method</span>
          <select
            data-testid="payment-method"
            value={form.paymentMethod}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                paymentMethod: event.target.value as typeof form.paymentMethod
              }))
            }
            className="rounded-xl border border-[var(--border)] bg-white px-4 py-3"
          >
            <option value="credit_card">{formatPaymentMethodLabel("credit_card")}</option>
            <option value="debit_card">{formatPaymentMethodLabel("debit_card")}</option>
            <option value="paypal">{formatPaymentMethodLabel("paypal")}</option>
            <option value="apple_pay">{formatPaymentMethodLabel("apple_pay")}</option>
            <option value="shop_pay">{formatPaymentMethodLabel("shop_pay")}</option>
            <option value="other">{formatPaymentMethodLabel("other")}</option>
            <option value="unknown">{formatPaymentMethodLabel("unknown")}</option>
          </select>
        </label>

        <label className="grid gap-2 text-sm">
          <span>Purchase date</span>
          <input
            type="date"
            data-testid="purchase-date"
            value={form.purchaseDate}
            onChange={(event) => setForm((current) => ({ ...current, purchaseDate: event.target.value }))}
            className="rounded-xl border border-[var(--border)] bg-white px-4 py-3"
          />
        </label>

        <label className="grid gap-2 text-sm md:col-span-2">
          <span>Merchant support email</span>
          <input
            data-testid="merchant-contact-email"
            value={form.merchantContactEmail}
            onChange={(event) => setForm((current) => ({ ...current, merchantContactEmail: event.target.value }))}
            className="rounded-xl border border-[var(--border)] bg-white px-4 py-3"
            placeholder="support@example.com"
          />
        </label>

        <label className="grid gap-2 text-sm md:col-span-2">
          <span>Proof upload</span>
          <input
            type="file"
            data-testid="proof-upload"
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null);
              setSuggestion(null);
              setIntakeSource("upload");
            }}
            className="rounded-xl border border-dashed border-[var(--border)] bg-white px-4 py-6"
          />
          <span className="text-xs text-[var(--muted)]">
            Attach a receipt, screenshot, or PDF. Text-like files work now; screenshots and PDFs still depend on OCR provider setup.
          </span>
        </label>
      </section>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={submitStage !== "idle"}
          data-testid="create-case"
          className="rounded-full bg-[var(--foreground)] px-5 py-3 text-sm font-medium text-white shadow-token-md disabled:opacity-60"
        >
          {getSubmitLabel(submitStage)}
        </button>
        <p className="text-sm text-[var(--muted)]">
          Once the case opens, the agent can build the plan, draft the message, and move straight into approval.
        </p>
      </div>
    </form>
  );
}
