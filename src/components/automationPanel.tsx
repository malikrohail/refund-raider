"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  AutomationEventRecord,
  AutomationSessionRecord,
  BrowserCommandRecord,
  BrowserSnapshotRecord
} from "@/lib/contracts/domain";
import {
  formatAutomationEventTypeLabel,
  formatAutomationSessionStatusLabel,
  formatBrowserActionTypeLabel,
  formatBrowserCommandStatusLabel
} from "@/lib/presentation/labels";

type AutomationPanelProps = {
  caseId: string;
  merchantName: string;
  browserRuntimeRequired?: boolean;
  currentAutomationSession: AutomationSessionRecord | null;
  browserSnapshots: BrowserSnapshotRecord[];
  browserCommands: BrowserCommandRecord[];
  automationEvents: AutomationEventRecord[];
  onCaseRefresh?: () => Promise<void>;
};

type LocalAutomationPanelState = {
  sessionOverride: AutomationSessionRecord | null;
  localSnapshots: BrowserSnapshotRecord[];
  localCommands: BrowserCommandRecord[];
  localEvents: AutomationEventRecord[];
};

function emptyLocalAutomationPanelState(): LocalAutomationPanelState {
  return {
    sessionOverride: null,
    localSnapshots: [],
    localCommands: [],
    localEvents: []
  };
}

function storageKey(caseId: string) {
  return `refund-raider:automation-panel:${caseId}`;
}

function clipText(value: string | null | undefined, limit = 160) {
  if (!value) {
    return "No text captured yet.";
  }

  const trimmed = value.replace(/\s+/g, " ").trim();
  if (trimmed.length <= limit) {
    return trimmed;
  }

  return `${trimmed.slice(0, limit - 1)}…`;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "Not yet recorded";
  }

  return new Date(value).toLocaleString();
}

function formatJsonPreview(value: Record<string, unknown> | undefined) {
  if (!value || Object.keys(value).length === 0) {
    return "No extra metadata";
  }

  try {
    return clipText(JSON.stringify(value), 180);
  } catch {
    return "Metadata captured";
  }
}

function sortByCreatedAt<T extends { createdAt: string }>(items: T[]) {
  return [...items].sort((left, right) => left.createdAt.localeCompare(right.createdAt));
}

function resolveAppBaseUrl() {
  if (typeof window === "undefined") {
    return "";
  }

  return window.location.origin;
}

export function AutomationPanel({
  caseId,
  merchantName,
  browserRuntimeRequired = false,
  currentAutomationSession,
  browserSnapshots,
  browserCommands,
  automationEvents,
  onCaseRefresh
}: AutomationPanelProps) {
  const [localState, setLocalState] = useState<LocalAutomationPanelState>(emptyLocalAutomationPanelState);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied-session" | "copied-url" | "copy-failed">("idle");
  const [appBaseUrl, setAppBaseUrl] = useState("");

  useEffect(() => {
    setLocalState(emptyLocalAutomationPanelState());

    if (typeof window === "undefined") {
      return;
    }

    const rawState = window.localStorage.getItem(storageKey(caseId));
    if (!rawState) {
      return;
    }

    try {
      const parsed = JSON.parse(rawState) as LocalAutomationPanelState;
      setLocalState({
        sessionOverride: parsed.sessionOverride ?? null,
        localSnapshots: Array.isArray(parsed.localSnapshots) ? parsed.localSnapshots : [],
        localCommands: Array.isArray(parsed.localCommands) ? parsed.localCommands : [],
        localEvents: Array.isArray(parsed.localEvents) ? parsed.localEvents : []
      });
    } catch {
      window.localStorage.removeItem(storageKey(caseId));
    }
  }, [caseId]);

  useEffect(() => {
    setAppBaseUrl(resolveAppBaseUrl());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const hasLocalData =
      localState.sessionOverride !== null ||
      localState.localSnapshots.length > 0 ||
      localState.localCommands.length > 0 ||
      localState.localEvents.length > 0;

    if (!hasLocalData) {
      window.localStorage.removeItem(storageKey(caseId));
      return;
    }

    window.localStorage.setItem(storageKey(caseId), JSON.stringify(localState));
  }, [caseId, localState]);

  const session = localState.sessionOverride ?? currentAutomationSession;
  const snapshots = useMemo(
    () => sortByCreatedAt([...browserSnapshots, ...localState.localSnapshots]),
    [browserSnapshots, localState.localSnapshots]
  );
  const commands = useMemo(
    () => sortByCreatedAt([...browserCommands, ...localState.localCommands]),
    [browserCommands, localState.localCommands]
  );
  const events = useMemo(
    () => sortByCreatedAt([...automationEvents, ...localState.localEvents]),
    [automationEvents, localState.localEvents]
  );

  const latestSnapshot = snapshots.at(-1) ?? null;
  const queuedCommands = commands.filter((command) => command.status === "pending" || command.status === "claimed");
  const latestEvent = events.at(-1) ?? null;
  const browserRuntimeAttached = Boolean(
    session &&
      ["connected", "observing", "ready", "executing", "completed"].includes(session.status)
  );
  const browserRuntimeBlocked = browserRuntimeRequired && !browserRuntimeAttached;
  const hasSession = Boolean(session?.id);
  const sessionBadgeClasses =
    session?.status === "connected" || session?.status === "observing"
      ? "bg-emerald-100 text-emerald-800"
      : session?.status === "ready"
        ? "bg-sky-100 text-sky-800"
        : session?.status === "executing"
          ? "bg-amber-100 text-amber-800"
          : session?.status === "failed"
            ? "bg-rose-100 text-rose-800"
            : "bg-slate-100 text-slate-700";
  const sessionSummary =
    session?.status === "connected" || session?.status === "observing"
      ? "Browser extension connected and ready to observe commands."
      : session
        ? "Session exists but has not been connected to the browser extension yet."
        : "Create a browser automation session to start tracking snapshots, commands, and events.";
  const primaryActionLabel = !hasSession
    ? "Create browser session"
    : browserRuntimeAttached
      ? "Refresh extension state"
      : "Refresh after pairing";
  const checklistStepClasses = "rounded-2xl border border-[var(--border)] bg-white p-4 shadow-token-md";

  function updateLocalState(nextState: LocalAutomationPanelState) {
    setLocalState(nextState);
    setActionError(null);
  }

  async function copyText(value: string, successState: "copied-session" | "copied-url") {
    try {
      await navigator.clipboard.writeText(value);
      setCopyState(successState);
    } catch {
      setCopyState("copy-failed");
    }
  }

  function hydrateWorkspace(workspace: {
    automationSession?: AutomationSessionRecord | null;
    browserSnapshots?: BrowserSnapshotRecord[];
    browserCommands?: BrowserCommandRecord[];
    automationEvents?: AutomationEventRecord[];
  }) {
    updateLocalState({
      sessionOverride: workspace.automationSession ?? null,
      localSnapshots: workspace.browserSnapshots ?? [],
      localCommands: workspace.browserCommands ?? [],
      localEvents: workspace.automationEvents ?? []
    });
  }

  async function handleCreateSession() {
    setIsBusy(true);
    setActionError(null);

    try {
      const response = await fetch(`/api/v1/cases/${caseId}/automation`, {
        method: "POST"
      });
      const body = await response.json();

      if (!response.ok) {
        throw new Error(body.error?.message ?? "Failed to create an automation session.");
      }

      hydrateWorkspace(body.data ?? {});
      await onCaseRefresh?.();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to create an automation session.");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleConnectSession() {
    setIsBusy(true);
    setActionError(null);

    try {
      const response = await fetch(`/api/v1/cases/${caseId}/automation`);
      const body = await response.json();

      if (!response.ok) {
        throw new Error(body.error?.message ?? "Failed to refresh the automation session.");
      }

      hydrateWorkspace(body.data ?? {});
      await onCaseRefresh?.();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to connect the automation session.");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleRefreshCase() {
    setIsBusy(true);
    setActionError(null);

    try {
      await onCaseRefresh?.();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to refresh case data.");
    } finally {
      setIsBusy(false);
    }
  }

  useEffect(() => {
    if (!session?.id) {
      return;
    }

    const eventSource = new EventSource(`/api/v1/automation/sessions/${session.id}/events`);

    eventSource.addEventListener("snapshot", (event) => {
      try {
        const payload = JSON.parse((event as MessageEvent).data) as {
          automationSession?: AutomationSessionRecord | null;
          browserSnapshots?: BrowserSnapshotRecord[];
          browserCommands?: BrowserCommandRecord[];
          automationEvents?: AutomationEventRecord[];
        };

        hydrateWorkspace(payload);
      } catch {
        // ignore malformed snapshot payloads
      }
    });

    eventSource.addEventListener("automation-event", (event) => {
      try {
        const payload = JSON.parse((event as MessageEvent).data) as AutomationEventRecord;
        setLocalState((current) => ({
          ...current,
          localEvents: sortByCreatedAt([
            ...current.localEvents.filter((entry) => entry.id !== payload.id),
            payload
          ])
        }));
      } catch {
        // ignore malformed incremental events
      }
    });

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [session?.id]);

  return (
    <section className="rounded-[2rem] border border-[var(--border)] bg-token-panel-soft p-6 shadow-token-lg">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Automation panel</p>
          <h2 className="mt-1 text-xl font-semibold tracking-[-0.03em]">Pair one tab and watch the session state</h2>
          <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">{sessionSummary}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={hasSession ? handleConnectSession : handleCreateSession}
            disabled={isBusy}
            className="rounded-full bg-[var(--foreground)] px-4 py-2 text-sm font-medium text-white shadow-token-md disabled:opacity-60"
          >
            {isBusy ? "Working..." : primaryActionLabel}
          </button>
          {!hasSession ? (
            <button
              type="button"
              onClick={handleCreateSession}
              disabled={isBusy}
              className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm font-medium shadow-token-md disabled:opacity-60"
            >
              Create session
            </button>
          ) : null}
          <button
            type="button"
            onClick={handleRefreshCase}
            disabled={isBusy}
            className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm font-medium shadow-token-md disabled:opacity-60"
          >
            Sync case
          </button>
        </div>
      </div>

      {browserRuntimeBlocked ? (
        <div className="mt-5 rounded-[1.4rem] border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          The current action plan wants browser takeover, but no browser runtime is attached yet. Pair the extension to this session first or the case agent must stay on email/manual fallback.
        </div>
      ) : null}

      <div className="mt-5 grid gap-3 xl:grid-cols-4">
        <article className={checklistStepClasses}>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Step 1</p>
          <h3 className="mt-2 text-sm font-semibold text-[var(--foreground)]">Create the browser session</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            {hasSession ? "A session already exists for this case." : "Create the session first so the page can give you a real automation session ID."}
          </p>
        </article>
        <article className={checklistStepClasses}>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Step 2</p>
          <h3 className="mt-2 text-sm font-semibold text-[var(--foreground)]">Copy the app URL</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Use the origin only. Do not paste a full case URL into the extension popup.
          </p>
        </article>
        <article className={checklistStepClasses}>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Step 3</p>
          <h3 className="mt-2 text-sm font-semibold text-[var(--foreground)]">Copy the session ID</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            The extension expects an ID that starts with <span className="font-mono text-xs">automation_session_</span>.
          </p>
        </article>
        <article className={checklistStepClasses}>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Step 4</p>
          <h3 className="mt-2 text-sm font-semibold text-[var(--foreground)]">Pair the merchant tab</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Open the extension on the target support tab, click <span className="font-medium text-[var(--foreground)]">Pair current tab</span>, then return here and refresh.
          </p>
        </article>
      </div>

      <div className="mt-5 rounded-[1.4rem] border border-[var(--border)] bg-white/92 p-4 shadow-token-md">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Pair the browser runtime</p>
            <h3 className="mt-1 text-base font-semibold text-[var(--foreground)]">Use the extension popup with these exact values</h3>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${browserRuntimeAttached ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
            {browserRuntimeAttached ? "Runtime attached" : "Runtime not attached"}
          </span>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-[var(--border)] bg-white p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">App base URL</p>
            <p className="mt-2 break-all font-mono text-sm font-medium text-[var(--foreground)]">
              {appBaseUrl || "Loading browser origin..."}
            </p>
            <button
              type="button"
              disabled={!appBaseUrl}
              onClick={() => {
                if (appBaseUrl) {
                  void copyText(appBaseUrl, "copied-url");
                }
              }}
              className="mt-3 rounded-full border border-[var(--border)] bg-white px-3 py-2 text-xs font-semibold text-[var(--foreground)] disabled:opacity-50"
            >
              Copy app URL
            </button>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-white p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Automation session ID</p>
            <p className="mt-2 break-all font-mono text-sm font-medium text-[var(--foreground)]">
              {session?.id ?? "Create a session first."}
            </p>
            <button
              type="button"
              disabled={!session?.id}
              onClick={() => {
                if (session?.id) {
                  void copyText(session.id, "copied-session");
                }
              }}
              className="mt-3 rounded-full border border-[var(--border)] bg-white px-3 py-2 text-xs font-semibold text-[var(--foreground)] disabled:opacity-50"
            >
              Copy session ID
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-2 text-sm text-[var(--muted)]">
          <p>1. Load the unpacked extension from the repo’s `browser-extension/` folder.</p>
          <p>2. Open the extension popup on the merchant or support tab you want to control.</p>
          <p>3. Paste only the app origin plus the automation session ID shown above.</p>
          <p>4. Click `Pair current tab`, then return here and click `Refresh after pairing`.</p>
        </div>

        {copyState !== "idle" ? (
          <p className="mt-3 text-xs text-[var(--muted)]">
            {copyState === "copied-session"
              ? "Copied session ID."
              : copyState === "copied-url"
                ? "Copied app URL."
                : "Copy failed."}
          </p>
        ) : null}
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <div className="rounded-[1.4rem] border border-[var(--border)] bg-white/90 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Session status</p>
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${sessionBadgeClasses}`}>
              {session ? formatAutomationSessionStatusLabel(session.status) : "No session"}
            </span>
          </div>
          <p className="mt-3 text-sm text-[var(--muted)]">
            {session?.tabId ? `Tab ${session.tabId}` : "Waiting for the browser extension to connect."}
          </p>
          {session?.id ? (
            <p className="mt-2 break-all text-xs text-[var(--muted)]">Session ID: {session.id}</p>
          ) : null}
        </div>

        <div className="rounded-[1.4rem] border border-[var(--border)] bg-white/90 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Heartbeat</p>
          <p className="mt-3 text-sm font-medium text-[var(--foreground)]">{formatDateTime(session?.lastHeartbeatAt)}</p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {session?.runtime === "browser_extension" ? "Browser extension runtime" : "No runtime selected"}
          </p>
        </div>

        <div className="rounded-[1.4rem] border border-[var(--border)] bg-white/90 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Case linkage</p>
          <p className="mt-3 text-sm font-medium text-[var(--foreground)]">{merchantName}</p>
          <p className="mt-1 text-sm text-[var(--muted)]">Case {caseId}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-4">
        <article className="rounded-[1.4rem] border border-[var(--border)] bg-white/90 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Latest snapshot</p>
              <h3 className="mt-1 text-base font-semibold text-[var(--foreground)]">
                {latestSnapshot ? latestSnapshot.pageTitle ?? latestSnapshot.pageUrl : "No snapshot captured yet"}
              </h3>
            </div>
            {latestSnapshot ? (
              <span className="rounded-full bg-[#f7f7f5] px-3 py-1 text-xs font-medium text-[var(--muted)]">
                {formatDateTime(latestSnapshot.createdAt)}
              </span>
            ) : null}
          </div>

          {latestSnapshot ? (
            <div className="mt-4 grid gap-3 text-sm text-[var(--muted)]">
              <div className="rounded-2xl border border-[var(--border)] bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Page URL</p>
                <p className="mt-1 break-all text-sm text-[var(--foreground)]">{latestSnapshot.pageUrl}</p>
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Visible text</p>
                <p className="mt-1 text-sm leading-6 text-[var(--foreground)]">
                  {clipText(latestSnapshot.visibleText)}
                </p>
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Metadata</p>
                <p className="mt-1 text-sm leading-6 text-[var(--foreground)]">
                  {formatJsonPreview(latestSnapshot.metadata)}
                </p>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-[var(--muted)]">
              Capture the first browser snapshot after the extension connects.
            </p>
          )}
        </article>

        <div className="grid gap-4 xl:grid-cols-2">
          <article className="rounded-[1.4rem] border border-[var(--border)] bg-white/90 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Command queue</p>
                <h3 className="mt-1 text-base font-semibold text-[var(--foreground)]">Queued browser commands</h3>
              </div>
              <span className="rounded-full bg-[#f7f7f5] px-3 py-1 text-xs font-medium text-[var(--muted)]">
                {queuedCommands.length} pending
              </span>
            </div>

            <div className="mt-4 grid gap-3">
              {commands.length > 0 ? (
                commands.map((command) => (
                  <article key={command.id} className="rounded-2xl border border-[var(--border)] bg-white p-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-[var(--foreground)]">
                          {formatBrowserActionTypeLabel(command.actionType)}
                        </p>
                        <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{command.description}</p>
                      </div>
                      <span className="rounded-full bg-[#f7f7f5] px-3 py-1 text-xs font-medium text-[var(--muted)]">
                        {formatBrowserCommandStatusLabel(command.status)}
                      </span>
                    </div>
                    <div className="mt-3 grid gap-2 text-xs text-[var(--muted)]">
                      {command.waitForText ? <p>Wait for text: {command.waitForText}</p> : null}
                      {command.selector ? <p>Selector: {command.selector}</p> : null}
                      {command.targetUrl ? <p className="break-all">Target: {command.targetUrl}</p> : null}
                      {command.resultSummary ? <p>Result: {command.resultSummary}</p> : null}
                    </div>
                  </article>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-[var(--border)] p-4 text-sm text-[var(--muted)]">
                  No commands are queued yet.
                </div>
              )}
            </div>
          </article>

          <article className="rounded-[1.4rem] border border-[var(--border)] bg-white/90 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Event log</p>
                <h3 className="mt-1 text-base font-semibold text-[var(--foreground)]">Automation activity</h3>
                {latestEvent ? (
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    Latest: {formatAutomationEventTypeLabel(latestEvent.eventType)} at{" "}
                    {formatDateTime(latestEvent.createdAt)}
                  </p>
                ) : null}
              </div>
              <span className="rounded-full bg-[#f7f7f5] px-3 py-1 text-xs font-medium text-[var(--muted)]">
                {events.length} events
              </span>
            </div>

            <div className="mt-4 grid gap-3">
              {events.length > 0 ? (
                [...events]
                  .reverse()
                  .map((event) => (
                    <article key={event.id} className="rounded-2xl border border-[var(--border)] bg-white p-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-[var(--foreground)]">
                            {formatAutomationEventTypeLabel(event.eventType)}
                          </p>
                          <p className="mt-1 text-xs text-[var(--muted)]">{formatDateTime(event.createdAt)}</p>
                        </div>
                        <span className="rounded-full bg-[#f7f7f5] px-3 py-1 text-xs font-medium text-[var(--muted)]">
                          {event.id}
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                        {formatJsonPreview(event.payload)}
                      </p>
                    </article>
                  ))
              ) : (
                <div className="rounded-2xl border border-dashed border-[var(--border)] p-4 text-sm text-[var(--muted)]">
                  No automation events recorded yet.
                </div>
              )}
            </div>
          </article>
        </div>
      </div>

      {actionError ? (
        <div className="mt-5 rounded-[1.4rem] border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {actionError}
        </div>
      ) : null}
    </section>
  );
}
