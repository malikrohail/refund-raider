"use client";

import { useConversation } from "@elevenlabs/react";
import type { DisconnectionDetails } from "@elevenlabs/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { VoiceDiagnosticsPanel } from "@/components/voiceDiagnosticsPanel";
import {
  buildVoiceFailureSummary,
  createVoiceSessionDebugState,
  getElevenLabsBrowserFailureMessage,
  recordVoiceAttemptResult,
  recordVoiceAttemptStart,
  recordVoiceConnect,
  recordVoiceDebugData,
  recordVoiceDisconnect,
  recordVoiceError,
  recordVoiceStatusChange,
  serializeDisconnectDetails,
  type VoiceSessionDebugState
} from "@/lib/agent/voiceSessionDiagnostics";
import {
  startVoiceSessionWithFallback,
  type VoiceTransportPreference
} from "@/lib/agent/voiceSessionBootstrap";
import type { GmailSearchResult, IntakeSuggestion } from "@/lib/contracts/api";
import type { IntakeFormState, IntakeSubmitStage } from "@/lib/intake/types";

type SessionUserSnapshot = {
  email: string;
  mode: "demo" | "authenticated";
};

type GmailStatus = {
  available: boolean;
  connected: boolean;
  email: string | null;
  requiresAuth: boolean;
};

type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

type IntakeAgentConfig = {
  agentId: string;
  mode: "configured" | "mock" | "misconfigured";
  preferredTransport?: VoiceTransportPreference;
  configurationState?: "mock" | "live_ready" | "missing_tools" | "missing_credentials" | "inspect_failed";
  missingToolNames?: string[];
  conversationToken?: string;
  signedUrl?: string;
};

type MicPermissionState = "unknown" | "granted" | "denied" | "prompt" | "unsupported";
type SessionTransportMode = "voice" | "typed-fallback" | null;

const quickPrompts = [
  "I was charged by Cursor after canceling and want it fixed.",
  "Search my Gmail for the receipt or cancellation email.",
  "What details do you still need before you open the case?"
];

function buildIntakeSnapshot({
  form,
  gmailStatus,
  sessionUser,
  autopilotContext,
  suggestion
}: {
  form: IntakeFormState;
  gmailStatus: GmailStatus | null;
  sessionUser: SessionUserSnapshot;
  autopilotContext: string;
  suggestion: IntakeSuggestion | null;
}) {
  return [
    `signed_in=${sessionUser.mode === "authenticated" ? "yes" : "no"}`,
    `gmail_connected=${gmailStatus?.connected ? "yes" : "no"}`,
    `merchant_name=${form.merchantName || "missing"}`,
    `issue_summary=${form.issueSummary || "missing"}`,
    `desired_outcome=${form.desiredOutcome}`,
    `purchase_date=${form.purchaseDate || "missing"}`,
    `payment_method=${form.paymentMethod}`,
    `merchant_contact_email=${form.merchantContactEmail || "missing"}`,
    `autopilot_context_present=${autopilotContext.trim() ? "yes" : "no"}`,
    `parser_confidence=${suggestion?.confidence ?? "none"}`
  ].join("; ");
}

function buildMockVoiceAnswer(input: string, form: IntakeFormState, gmailStatus: GmailStatus | null) {
  const lower = input.toLowerCase();

  if (lower.includes("gmail") || lower.includes("receipt")) {
    if (!gmailStatus?.connected) {
      return "Gmail is not connected yet. Tap Connect Gmail once, then I can search your inbox.";
    }

    return "Use the Gmail search box right below and I will help you turn the right message into a case.";
  }

  if (lower.includes("need") || lower.includes("missing")) {
    const missing = [];
    if (!form.merchantName.trim()) missing.push("merchant");
    if (!form.issueSummary.trim()) missing.push("issue summary");
    if (!form.purchaseDate.trim()) missing.push("purchase date");

    return missing.length > 0
      ? `I still need: ${missing.join(", ")}.`
      : "The intake looks complete enough to create the case now.";
  }

  if (
    lower.includes("create") ||
    lower.includes("open the case") ||
    lower.includes("go ahead") ||
    lower.includes("continue") ||
    lower.includes("submit")
  ) {
    return "Say create the case once the merchant and issue are clear, and I can do the rest.";
  }

  return "Tell me what happened in plain English, and I will structure the action case for you.";
}

function applySuggestionToFormPreview(current: IntakeFormState, suggestion: IntakeSuggestion): IntakeFormState {
  return {
    ...current,
    merchantName: suggestion.merchantName || current.merchantName,
    merchantUrl: suggestion.merchantUrl ?? current.merchantUrl ?? "",
    issueSummary: suggestion.issueSummary || current.issueSummary,
    issueType: suggestion.issueType,
    desiredOutcome: suggestion.desiredOutcome,
    paymentMethod: suggestion.paymentMethod,
    purchaseDate: suggestion.purchaseDate ?? current.purchaseDate ?? "",
    merchantContactEmail: suggestion.merchantContactEmail ?? current.merchantContactEmail ?? ""
  };
}

export function VoiceIntakePanel({
  sessionUser,
  gmailStatus,
  form,
  autopilotContext,
  suggestion,
  submitStage,
  onConnectGmail,
  onSearchGmail,
  onSelectGmailMessage,
  onCaptureProblem,
  onUpdateFields,
  onCreateCase
}: {
  sessionUser: SessionUserSnapshot;
  gmailStatus: GmailStatus | null;
  form: IntakeFormState;
  autopilotContext: string;
  suggestion: IntakeSuggestion | null;
  submitStage: IntakeSubmitStage;
  onConnectGmail: () => void;
  onSearchGmail: (query: string) => Promise<GmailSearchResult[]>;
  onSelectGmailMessage: (messageId: string) => Promise<void>;
  onCaptureProblem: (rawText: string) => Promise<IntakeSuggestion | null>;
  onUpdateFields: (patch: Partial<IntakeFormState>) => void;
  onCreateCase: () => Promise<{ caseId: string }>;
}) {
  async function fetchFreshAgentConfig() {
    const response = await fetch("/api/v1/agent/intake-session", {
      cache: "no-store"
    });
    const body = await response.json();

    if (!response.ok) {
      throw new Error(body.error?.message ?? "Failed to load the live intake agent session.");
    }

    return body.data.agent as IntakeAgentConfig;
  }

  const [agentConfig, setAgentConfig] = useState<IntakeAgentConfig>({
    agentId: "mock-agent",
    mode: "mock"
  });
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "voice-intake-intro",
      role: "assistant",
      text: "I’m Refund Raider. Tell me what happened, and I’ll structure the action case for you."
    }
  ]);
  const [input, setInput] = useState("");
  const [connectError, setConnectError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [gmailResults, setGmailResults] = useState<GmailSearchResult[]>([]);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);
  const isConfigured = agentConfig.mode === "configured";
  const [micPermission, setMicPermission] = useState<MicPermissionState>("unknown");
  const [sessionTransportMode, setSessionTransportMode] = useState<SessionTransportMode>(null);
  const [voiceSessionStable, setVoiceSessionStable] = useState(false);
  const [voiceDebugState, setVoiceDebugState] = useState<VoiceSessionDebugState>(() =>
    createVoiceSessionDebugState({
      agentId: "mock-agent",
      micPermission: "unknown"
    })
  );
  const lastDisconnectDetailsRef = useRef<DisconnectionDetails | null>(null);
  const lastDebugPayloadRef = useRef<unknown>(null);
  const lastSdkErrorRef = useRef<string | null>(null);

  const intakeSnapshot = useMemo(
    () =>
      buildIntakeSnapshot({
        form,
        gmailStatus,
        sessionUser,
        autopilotContext,
        suggestion
      }),
    [autopilotContext, form, gmailStatus, sessionUser, suggestion]
  );

  const clientTools = {
    get_intake_state: async () => {
      return intakeSnapshot;
    },
    update_intake_fields: async (patch: Partial<IntakeFormState>) => {
      onUpdateFields(patch);
      return "I updated the intake fields in the UI.";
    },
    capture_user_problem: async (parameters: { rawText: string }) => {
      const nextSuggestion = await onCaptureProblem(parameters.rawText);
      return `I structured the intake. merchant=${nextSuggestion?.merchantName ?? "unknown"}; issue=${nextSuggestion?.issueSummary ?? "unknown"}; confidence=${nextSuggestion?.confidence ?? "none"}`;
    },
    connect_gmail: async () => {
      if (sessionUser.mode !== "authenticated") {
        return "The user must sign in with Google before Gmail can be connected.";
      }

      if (!gmailStatus?.available) {
        return "Gmail is not configured on this deployment.";
      }

      if (gmailStatus.connected) {
        return `Gmail is already connected as ${gmailStatus.email ?? "this account"}.`;
      }

      onConnectGmail();
      return "Opening the Gmail connect flow now. The user must approve access once in the browser.";
    },
    search_gmail_messages: async (parameters: { query: string }) => {
      const results = await onSearchGmail(parameters.query);
      setGmailResults(results);

      if (results.length === 0) {
        return "No Gmail results found for that query.";
      }

      return results
        .slice(0, 5)
        .map((result) => `${result.messageId}: ${result.subject || "Untitled"} from ${result.from || "unknown sender"}`)
        .join(" | ");
    },
    select_gmail_message: async (parameters: { messageId: string }) => {
      await onSelectGmailMessage(parameters.messageId);
      return "I used that Gmail thread to populate the intake.";
    },
    create_case: async () => {
      const result = await onCreateCase();
      return `Refund case created successfully. case_id=${result.caseId}`;
    }
  };

  function appendIncomingMessage(message: unknown) {
    const maybeMessage = message as { message?: string; text?: string; source?: string };
    const text = maybeMessage.message ?? maybeMessage.text;
    if (!text) {
      return;
    }

    setMessages((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        role: maybeMessage.source === "user" ? "user" : "assistant",
        text
      }
    ]);
  }

  const voiceConversation = useConversation({
    textOnly: false,
    clientTools,
    onMessage: appendIncomingMessage,
    onConnect: ({ conversationId }) => {
      setVoiceDebugState((current) => recordVoiceConnect(current, conversationId));
    },
    onConversationMetadata: (metadata) => {
      setVoiceDebugState((current) =>
        recordVoiceDebugData(
          recordVoiceConnect(current, metadata.conversation_id),
          "Received conversation metadata.",
          metadata,
          "metadata"
        )
      );
    },
    onDisconnect: (details) => {
      lastDisconnectDetailsRef.current = details;
      setVoiceDebugState((current) => recordVoiceDisconnect(current, details));
    },
    onStatusChange: ({ status }) => {
      setVoiceDebugState((current) => recordVoiceStatusChange(current, status));
    },
    onDebug: (payload) => {
      lastDebugPayloadRef.current = payload;
      setVoiceDebugState((current) =>
        recordVoiceDebugData(current, "SDK debug event received.", payload)
      );
    },
    onError: (errorMessage: string, context?: unknown) => {
      lastSdkErrorRef.current = errorMessage;
      setVoiceDebugState((current) => recordVoiceError(current, errorMessage, context));

      if (voiceConversationStatusRef.current !== "connected") {
        setConnectError(errorMessage);
      }
    }
  });

  const voiceConversationStatusRef = useRef(voiceConversation.status);
  const recoveringTextFallbackRef = useRef(false);
  const lastContextualUpdateRef = useRef<string | null>(null);
  const isHandingOffToCase = submitStage === "opening_workspace";

  const connectionLabel = useMemo(() => {
    if (!isConfigured) {
      return "Mock intake mode";
    }

    if (isHandingOffToCase) {
      return "Opening case workspace";
    }

    if (sessionTransportMode === "typed-fallback") {
      return "Typed fallback ready";
    }

    if (sessionTransportMode === "voice" && voiceConversation.status === "connected") {
      return "Voice intake live";
    }

    if (isStarting) {
      return "Opening voice intake...";
    }

    return "Ready for voice";
  }, [
    isConfigured,
    isHandingOffToCase,
    isStarting,
    sessionTransportMode,
    voiceConversation.status
  ]);

  useEffect(() => {
    let isMounted = true;

    async function hydrateAgentConfig() {
      const nextAgentConfig = await fetchFreshAgentConfig();

      if (isMounted) {
        setAgentConfig(nextAgentConfig);
      }
    }

    hydrateAgentConfig().catch(() => undefined);

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    setVoiceDebugState((current) => ({
      ...current,
      agentId: agentConfig.agentId,
      preferredTransport: agentConfig.preferredTransport ?? current.preferredTransport
    }));
  }, [agentConfig.agentId, agentConfig.preferredTransport]);

  useEffect(() => {
    voiceConversationStatusRef.current = voiceConversation.status;
  }, [voiceConversation.status]);

  useEffect(() => {
    if (sessionTransportMode === "voice" && voiceConversation.status === "disconnected") {
      setSessionTransportMode(null);
      setVoiceSessionStable(false);
      lastContextualUpdateRef.current = null;
    }
  }, [sessionTransportMode, voiceConversation.status]);

  function activateTypedFallback(userFacingReason: string) {
    if (recoveringTextFallbackRef.current || sessionTransportMode === "typed-fallback") {
      return;
    }

    recoveringTextFallbackRef.current = true;
    void voiceConversation.endSession().catch(() => undefined);
    setSessionTransportMode("typed-fallback");
    setVoiceDebugState((current) =>
      recordVoiceError(current, `${userFacingReason} Typed fallback is ready below.`)
    );
    setConnectError(`${userFacingReason} Typed fallback is ready below.`);
    recoveringTextFallbackRef.current = false;
    setIsStarting(false);
  }

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    function handleWindowError(event: ErrorEvent) {
      const nextMessage = getElevenLabsBrowserFailureMessage(event.error ?? event.message);

      if (!nextMessage) {
        return;
      }

      activateTypedFallback(nextMessage);
    }

    function handleUnhandledRejection(event: PromiseRejectionEvent) {
      const nextMessage = getElevenLabsBrowserFailureMessage(event.reason);

      if (!nextMessage) {
        return;
      }

      activateTypedFallback(nextMessage);
    }

    window.addEventListener("error", handleWindowError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleWindowError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function readMicrophonePermission() {
      if (typeof navigator === "undefined" || !("permissions" in navigator)) {
        if (isMounted) {
          setMicPermission("unsupported");
        }
        return;
      }

      try {
        const status = await navigator.permissions.query({
          // TS lib does not include microphone everywhere yet.
          name: "microphone" as PermissionName
        });

        if (isMounted) {
          setMicPermission(status.state as MicPermissionState);
        }

        status.onchange = () => {
          if (isMounted) {
            setMicPermission(status.state as MicPermissionState);
          }
        };
      } catch {
        if (isMounted) {
          setMicPermission("unsupported");
        }
      }
    }

    readMicrophonePermission().catch(() => undefined);

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (
      isConfigured &&
      sessionTransportMode === "voice" &&
      voiceSessionStable &&
      voiceConversation.status === "connected" &&
      lastContextualUpdateRef.current !== intakeSnapshot
    ) {
      lastContextualUpdateRef.current = intakeSnapshot;
      voiceConversation.sendContextualUpdate(`Current intake state: ${intakeSnapshot}`);
    }
  }, [
    intakeSnapshot,
    isConfigured,
    sessionTransportMode,
    voiceConversation.status,
    voiceSessionStable
  ]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ block: "end" });
  }, [messages, gmailResults]);

  async function ensureMicrophoneAccess(): Promise<MicPermissionState> {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setMicPermission("unsupported");
      return "unsupported";
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setMicPermission("granted");
      return "granted";
    } catch {
      setMicPermission("denied");
      throw new Error("Microphone permission was denied in the browser, so the live voice session cannot start.");
    }
  }

  async function waitForConversationReady(
    statusRef: { current: string },
    timeoutMs: number,
    disconnectMessage: string,
    stableWindowMs = 2500
  ) {
    const startedAt = Date.now();
    let sawConnecting = false;
    let connectedAt: number | null = null;

    while (Date.now() - startedAt <= timeoutMs) {
      const status = statusRef.current;

      if (status === "connecting") {
        sawConnecting = true;
      }

      if (status === "connected") {
        connectedAt ??= Date.now();

        if (Date.now() - connectedAt >= stableWindowMs) {
          return;
        }
      } else {
        connectedAt = null;
      }

      if (sawConnecting && status === "disconnected") {
        throw new Error(disconnectMessage);
      }

      await new Promise((resolve) => window.setTimeout(resolve, 100));
    }

    throw new Error("The ElevenLabs session did not reach connected state in time.");
  }

  async function handleConnect() {
    setConnectError(null);
    setIsStarting(true);
    setVoiceSessionStable(false);

    try {
      const nextAgentConfig = await fetchFreshAgentConfig();
      setAgentConfig(nextAgentConfig);

      if (nextAgentConfig.mode === "misconfigured") {
        throw new Error(
          nextAgentConfig.configurationState === "missing_tools"
            ? `The live ElevenLabs intake agent is missing tools: ${(nextAgentConfig.missingToolNames ?? []).join(", ")}. Run the sync step first.`
            : "The live ElevenLabs intake agent is not fully configured yet."
        );
      }

      const nextMicPermission = await ensureMicrophoneAccess();
      lastDisconnectDetailsRef.current = null;
      lastDebugPayloadRef.current = null;
      lastSdkErrorRef.current = null;
      setVoiceDebugState(
        createVoiceSessionDebugState({
          agentId: nextAgentConfig.agentId,
          preferredTransport: nextAgentConfig.preferredTransport,
          micPermission: nextMicPermission
        })
      );

      await startVoiceSessionWithFallback(
        {
          agentId: nextAgentConfig.agentId,
          preferredTransport: nextAgentConfig.preferredTransport,
          conversationToken: nextAgentConfig.conversationToken,
          signedUrl: nextAgentConfig.signedUrl,
          userId: "voice-intake"
        },
        {
          getMicPermission: () => nextMicPermission,
          resetSession: async () => {
            await voiceConversation.endSession().catch(() => undefined);
          },
          startSession: async (config) => {
            await voiceConversation.startSession(config);
          },
          onAttemptStart: (attempt) => {
            setVoiceDebugState((current) => recordVoiceAttemptStart(current, attempt));
          },
          onAttemptFailure: (attempt, attemptError) => {
            const nextMessage =
              attemptError instanceof Error ? attemptError.message : "Voice attempt failed";

            setVoiceDebugState((current) =>
              recordVoiceAttemptResult(
                recordVoiceError(current, nextMessage, attemptError),
                "attempt_failed",
                `Attempt via ${attempt.transport} failed.`,
                {
                  transport: attempt.transport,
                  authMode: attempt.authMode
                }
              )
            );
          },
          onAttemptSuccess: (attempt) => {
            setVoiceDebugState((current) =>
              recordVoiceAttemptResult(
                current,
                "attempt_succeeded",
                `Attempt via ${attempt.transport} connected.`,
                {
                  transport: attempt.transport,
                  authMode: attempt.authMode
                }
              )
            );
          },
          waitForReady: async () => {
            await waitForConversationReady(
              voiceConversationStatusRef,
              12000,
              "The ElevenLabs voice session opened, then disconnected before the voice client became ready."
            );
          }
        }
      );
      setSessionTransportMode("voice");
      setVoiceSessionStable(true);
      setConnectError(null);
    } catch (error) {
      const rawMessage =
        error instanceof Error ? error.message : "Failed to connect intake agent";

      if (
        !rawMessage.includes("missing tools") &&
        !rawMessage.includes("not fully configured")
      ) {
        activateTypedFallback(
          buildVoiceFailureSummary({
            disconnectDetails: serializeDisconnectDetails(lastDisconnectDetailsRef.current),
            errorMessage: lastSdkErrorRef.current ?? rawMessage,
            debugData: lastDebugPayloadRef.current
          })
        );
        return;
      }

      setConnectError(rawMessage);
    } finally {
      setIsStarting(false);
    }
  }

  async function submitMessage(messageText: string) {
    const nextMessage = messageText.trim();
    if (!nextMessage || isHandingOffToCase) {
      return;
    }

    setMessages((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        role: "user",
        text: nextMessage
      }
    ]);

    const activeConversation = sessionTransportMode === "voice" ? voiceConversation : null;

    if (isConfigured && activeConversation?.status === "connected") {
      activeConversation.sendUserMessage(nextMessage);
    } else {
      let answer = buildMockVoiceAnswer(nextMessage, form, gmailStatus);

      try {
        const lower = nextMessage.toLowerCase();

        if (
          (lower.includes("gmail") || lower.includes("receipt") || lower.includes("email")) &&
          gmailStatus?.connected
        ) {
          const results = await onSearchGmail(nextMessage);
          answer =
            results.length > 0
              ? `I found ${results.length} Gmail result${results.length === 1 ? "" : "s"}. Pick one below and I will use it to populate the case.`
              : "I did not find a matching Gmail message yet. Try a merchant name, order number, or receipt keyword.";
        } else if (
          lower.includes("create case") ||
          lower.includes("open the case") ||
          lower.includes("go ahead") ||
          lower.includes("continue") ||
          lower.includes("submit")
        ) {
          const result = await onCreateCase();
          answer = `I opened the case and moved you into the live workspace. case_id=${result.caseId}`;
        } else {
          const nextSuggestion = await onCaptureProblem(nextMessage);
          const preview = nextSuggestion ? applySuggestionToFormPreview(form, nextSuggestion) : form;
          const missing = [
            !preview.merchantName.trim() ? "merchant name" : null,
            !preview.issueSummary.trim() ? "issue summary" : null,
            !preview.purchaseDate.trim() ? "purchase date" : null
          ].filter(Boolean);

          answer =
            missing.length > 0
              ? `I updated the intake and still need ${missing.join(", ")} before opening the case.`
              : `I updated the intake for ${preview.merchantName || "this merchant"}. You can ask me to create the case now.`;
        }
      } catch (error) {
        answer = error instanceof Error ? error.message : "Typed fallback could not process that request.";
      }

      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: answer
        }
      ]);
    }

    setInput("");
  }

  return (
    <section className="grid gap-5 rounded-[2rem] border border-[var(--border-strong)] bg-token-panel-soft p-6 shadow-token-lg">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
            Voice-first intake
          </p>
          <h2 className="text-2xl font-semibold tracking-[-0.04em]">
            Talk it out. Let the agent drive the call, then pull in connectors only when needed.
          </h2>
          <p className="text-sm leading-6 text-[var(--muted)]">
            The voice agent can gather the facts, tell you when it needs Gmail access, search the
            inbox once connected, and open the action case without dropping you into a blank form.
          </p>
        </div>

        <div className="flex flex-col items-start gap-2 sm:items-end">
          <span className="rounded-full border border-[var(--border-strong)] bg-white/80 px-4 py-2 text-sm font-medium">
            {connectionLabel}
          </span>
          <button
            type="button"
            onClick={handleConnect}
            disabled={
              isStarting ||
              isHandingOffToCase ||
              (sessionTransportMode === "voice" && voiceConversation.status === "connected")
            }
            className="rounded-full bg-[var(--foreground)] px-4 py-2 text-sm font-semibold text-white shadow-token-md disabled:opacity-60"
          >
            {isHandingOffToCase
              ? "Opening workspace..."
              : sessionTransportMode === "typed-fallback"
              ? "Retry voice intake"
              : sessionTransportMode === "voice" && voiceConversation.status === "connected"
                ? "Voice intake live"
              : isStarting
                ? "Connecting..."
                : "Start voice intake"}
          </button>
        </div>
      </div>

      {agentConfig.mode === "misconfigured" ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Live voice is not ready yet. The linked ElevenLabs intake agent is missing its configured tool
          surface, so the page is falling back to mock behavior until the live agent is synced.
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-[1.35rem] border border-[var(--border)] bg-white/92 p-4 shadow-token-md">
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Inbox status</p>
          <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">
            {gmailStatus?.connected ? `Connected as ${gmailStatus.email}` : "Gmail not connected"}
          </p>
          <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
            Voice can search Gmail once the account is connected.
          </p>
        </div>
        <div className="rounded-[1.35rem] border border-[var(--border)] bg-white/92 p-4 shadow-token-md">
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Current merchant</p>
          <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">
            {form.merchantName || "Still collecting"}
          </p>
          <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
            {form.issueSummary || "Tell the agent what happened in plain English."}
          </p>
        </div>
        <div className="rounded-[1.35rem] border border-[var(--border)] bg-white/92 p-4 shadow-token-md">
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Workflow stage</p>
          <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">
            {submitStage === "idle" ? "Waiting for intake" : submitStage.replaceAll("_", " ")}
          </p>
          <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
            The manual form below stays in sync as the agent works.
          </p>
        </div>
      </div>

      <div className="grid gap-3 rounded-[1.4rem] border border-[var(--border)] bg-white/90 p-4 md:grid-cols-4">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Live agent</p>
          <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">{agentConfig.agentId || "missing"}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Config state</p>
          <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">{agentConfig.configurationState ?? agentConfig.mode}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Mic permission</p>
          <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">{micPermission}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Preferred transport</p>
          <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">
            {agentConfig.preferredTransport ?? "unknown"}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {quickPrompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => {
              void submitMessage(prompt);
            }}
            disabled={isHandingOffToCase}
            className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm text-[var(--foreground)] shadow-token-md transition hover:-translate-y-0.5 hover:border-[var(--secondary)]"
          >
            {prompt}
          </button>
        ))}
      </div>

      <div className="grid max-h-80 gap-3 overflow-y-auto rounded-[1.75rem] border border-[var(--border)] bg-token-transcript p-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`max-w-[92%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm ${
              message.role === "assistant"
                ? "bg-white text-[var(--foreground)]"
                : "ml-auto bg-[var(--foreground)] text-white"
            }`}
          >
            {message.text}
          </div>
        ))}

        {gmailResults.length > 0 ? (
          <div className="grid gap-2 border-t border-[var(--border)] pt-3">
            {gmailResults.slice(0, 3).map((result) => (
              <button
                key={result.messageId}
                type="button"
                onClick={() => onSelectGmailMessage(result.messageId).catch(() => undefined)}
                className="rounded-[1.1rem] border border-[var(--border)] bg-white/90 px-4 py-3 text-left text-sm"
              >
                <span className="block font-semibold text-[var(--foreground)]">
                  {result.subject || "Untitled Gmail message"}
                </span>
                <span className="mt-1 block text-xs text-[var(--muted)]">{result.from || "Unknown sender"}</span>
              </button>
            ))}
          </div>
        ) : null}

        <div ref={transcriptEndRef} />
      </div>

      <div className="grid gap-3">
        <textarea
          value={input}
          onChange={(event) => {
            if (isHandingOffToCase) {
              return;
            }

            setInput(event.target.value);
            const activeConversation = sessionTransportMode === "voice" ? voiceConversation : null;

            if (isConfigured && activeConversation?.status === "connected") {
              activeConversation.sendUserActivity();
            }
          }}
          disabled={isHandingOffToCase}
          className="min-h-28 rounded-[1.4rem] border border-[var(--border)] bg-white px-4 py-3 text-sm leading-6 shadow-token-md outline-none transition-shadow focus:ring-2 focus:ring-[var(--secondary-soft)]"
          placeholder="Say or type: I was charged by Cursor, search Gmail for the receipt, then create the case."
        />
        {connectError ? (
          <p
            className={`text-sm ${
              connectError.includes("Typed fallback is ready below.") ? "text-amber-700" : "text-red-700"
            }`}
          >
            {connectError}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              void submitMessage(input);
            }}
            disabled={isHandingOffToCase}
            className="rounded-full bg-[var(--foreground)] px-5 py-3 text-sm font-semibold text-white shadow-token-md"
          >
            Send to agent
          </button>
          <p className="text-sm text-[var(--muted)]">
            {isHandingOffToCase
              ? "Refund Raider has the case and is opening the live workspace now."
              : "Voice can drive the flow. The manual form stays available as a visible fallback."}
          </p>
        </div>
      </div>

      <VoiceDiagnosticsPanel
        title="Developer voice diagnostics"
        debugState={voiceDebugState}
      />
    </section>
  );
}
