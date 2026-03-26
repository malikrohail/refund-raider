"use client";

import { useMemo, type ReactNode } from "react";
import { useIntakeWorkspace } from "@/components/intakeWorkspaceProvider";

type IntegrationCardProps = {
  logoSrc: string;
  name: string;
  description: string;
  status: string;
  statusTone: "ready" | "neutral" | "planned";
  actionLabel?: string;
  onAction?: () => void;
  disabled?: boolean;
  helper?: string;
  children?: ReactNode;
};

function statusClass(statusTone: IntegrationCardProps["statusTone"]) {
  switch (statusTone) {
    case "ready":
      return "bg-[var(--secondary-soft)] text-[var(--secondary)]";
    case "planned":
      return "bg-[var(--accent-soft)] text-[var(--accent-strong)]";
    default:
      return "bg-slate-100 text-[var(--muted)]";
  }
}

function IntegrationCard({
  logoSrc,
  name,
  description,
  status,
  statusTone,
  actionLabel,
  onAction,
  disabled,
  helper,
  children
}: IntegrationCardProps) {
  return (
    <article className="rounded-[1.6rem] border border-[var(--border)] bg-white/94 p-5 shadow-token-md">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)]">
            <img src={logoSrc} alt="" className="h-7 w-7" />
          </span>
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-base font-semibold text-[var(--foreground)]">{name}</p>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(statusTone)}`}>
                {status}
              </span>
            </div>
            <p className="max-w-xl text-sm leading-6 text-[var(--muted)]">{description}</p>
          </div>
        </div>

        {actionLabel ? (
          <button
            type="button"
            onClick={onAction}
            disabled={disabled}
            className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold shadow-token-md disabled:opacity-50"
          >
            {actionLabel}
          </button>
        ) : null}
      </div>

      {helper ? <p className="mt-4 text-xs leading-5 text-[var(--muted)]">{helper}</p> : null}
      {children ? <div className="mt-4">{children}</div> : null}
    </article>
  );
}

function formatGmailTimestamp(value: string | null) {
  if (!value) {
    return "Unknown date";
  }

  return new Date(value).toLocaleDateString();
}

export function IntegrationsWorkspace() {
  const {
    sessionUser,
    authAvailable,
    gmailAvailable,
    gmailStatus,
    gmailQuery,
    setGmailQuery,
    gmailResults,
    isSearchingGmail,
    gmailFlash,
    authFlash,
    handleAppSignIn,
    handleAppSignOut,
    handleConnectGmail,
    handleDisconnectGmail,
    handleSearchGmail,
    useGmailMessageById,
    error,
    setError
  } = useIntakeWorkspace();

  const liveAgentReady = useMemo(() => {
    return [
      sessionUser.mode === "authenticated" ? "Google identity" : "Guest mode",
      gmailStatus?.connected ? "Inbox linked" : "Inbox not linked",
      "Email-first action flow after case open"
    ];
  }, [gmailStatus?.connected, sessionUser.mode]);

  return (
    <section className="grid gap-6">
      <header className="grid gap-6 rounded-[2rem] border border-[var(--border)] bg-token-panel p-6 shadow-token-lg lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--secondary)]">
            Integrations
          </p>
          <h1 className="max-w-3xl font-[var(--font-display)] text-5xl leading-[0.94] tracking-[-0.06em] text-[var(--foreground)]">
            Set up the tools the live agent can borrow when the conversation needs more leverage.
          </h1>
          <p className="max-w-2xl text-sm leading-7 text-[var(--muted)]">
            Keep connector setup out of the live call. Come here when the agent needs identity
            and inbox context to finish the job.
          </p>
        </div>

        <div className="rounded-[1.5rem] border border-[var(--border)] bg-white/92 p-5 shadow-token-md">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
            Available to the agent
          </p>
          <div className="mt-4 grid gap-3">
            {liveAgentReady.map((item) => (
              <div key={item} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-3 text-sm text-[var(--foreground)]">
                {item}
              </div>
            ))}
          </div>
        </div>
      </header>

      {gmailFlash === "connected" ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          Gmail connected. The live agent can now search your inbox for receipts and support threads.
        </div>
      ) : null}

      {gmailFlash === "error" ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          Gmail connect did not complete. You can retry from this page.
        </div>
      ) : null}

      {authFlash === "error" ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          Google sign-in did not complete. The deployment still needs a valid callback exchange.
        </div>
      ) : null}

      <div className="grid gap-4">
        <IntegrationCard
          logoSrc="/integrations/google.svg"
          name="Google account"
          description="Gives the agent a real identity, unlocks Gmail, and keeps personal actions scoped to your account."
          status={sessionUser.mode === "authenticated" ? "Connected" : authAvailable ? "Available" : "Unavailable"}
          statusTone={sessionUser.mode === "authenticated" ? "ready" : "neutral"}
          actionLabel={sessionUser.mode === "authenticated" ? "Sign out" : "Sign in"}
          onAction={() => {
            const runner =
              sessionUser.mode === "authenticated" ? handleAppSignOut : handleAppSignIn;
            runner().catch((actionError) => {
              setError(actionError instanceof Error ? actionError.message : "Failed to update Google auth.");
            });
          }}
          disabled={!authAvailable && sessionUser.mode !== "authenticated"}
          helper={
            sessionUser.mode === "authenticated"
              ? `Signed in as ${sessionUser.email}`
              : "You can keep using the live call without this, but Gmail search stays disabled."
          }
        />

        <IntegrationCard
          logoSrc="/integrations/gmail.svg"
          name="Gmail"
          description="Lets the agent search receipts, renewal notices, cancellation emails, and support threads by voice."
          status={gmailStatus?.connected ? "Linked" : gmailAvailable ? "Optional" : "Unavailable"}
          statusTone={gmailStatus?.connected ? "ready" : "neutral"}
          actionLabel={gmailStatus?.connected ? "Disconnect" : "Connect"}
          onAction={() => {
            const runner =
              gmailStatus?.connected ? handleDisconnectGmail : async () => handleConnectGmail();
            Promise.resolve(runner()).catch((actionError) => {
              setError(actionError instanceof Error ? actionError.message : "Failed to update Gmail.");
            });
          }}
          disabled={!gmailAvailable || sessionUser.mode !== "authenticated"}
          helper={
            gmailStatus?.connected
              ? `Connected as ${gmailStatus.email}`
              : "Connect it only if the agent should search your inbox during the conversation."
          }
        >
          {gmailStatus?.connected ? (
            <div className="grid gap-3">
              <div className="flex flex-wrap gap-3">
                <input
                  value={gmailQuery}
                  onChange={(event) => setGmailQuery(event.target.value)}
                  className="min-w-[18rem] flex-1 rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm"
                  placeholder="Search Gmail for Brooklinen torn sheets order"
                />
                <button
                  type="button"
                  onClick={() => {
                    handleSearchGmail().catch((gmailError) => {
                      setError(gmailError instanceof Error ? gmailError.message : "Failed to search Gmail.");
                    });
                  }}
                  disabled={isSearchingGmail}
                  className="rounded-full bg-[var(--foreground)] px-4 py-2 text-sm font-semibold text-white shadow-token-md disabled:opacity-60"
                >
                  {isSearchingGmail ? "Searching..." : "Search Gmail"}
                </button>
              </div>

              {gmailResults.length > 0 ? (
                <div className="grid gap-3">
                  {gmailResults.map((result) => (
                    <article key={result.messageId} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-[var(--foreground)]">
                            {result.subject || "Untitled Gmail message"}
                          </p>
                          <p className="mt-1 text-xs text-[var(--muted)]">
                            {result.from || "Unknown sender"} · {formatGmailTimestamp(result.receivedAt)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            useGmailMessageById(result.messageId).catch((gmailError) => {
                              setError(gmailError instanceof Error ? gmailError.message : "Failed to use Gmail message.");
                            });
                          }}
                          className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold shadow-token-md"
                        >
                          Use this email
                        </button>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{result.snippet}</p>
                    </article>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </IntegrationCard>

        <IntegrationCard
          logoSrc="/integrations/onePassword.svg"
          name="1Password"
          description="Planned secure credential handoff so the agent can request access without asking users to paste secrets into chat."
          status="Planned"
          statusTone="planned"
          helper="This card is intentional product scaffolding only. No 1Password backend flow exists in the current repo."
        />
      </div>

      {error ? (
        <section className="rounded-[1.5rem] border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </section>
      ) : null}
    </section>
  );
}
