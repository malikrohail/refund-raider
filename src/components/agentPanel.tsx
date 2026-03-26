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
import type {
  BrowserClickToolInput,
  BrowserExtractToolInput,
  BrowserNavigateToolInput,
  BrowserPressKeyToolInput,
  BrowserScrollToolInput,
  BrowserSnapshotToolInput,
  FirecrawlCrawlStatusToolInput,
  FirecrawlExtractStatusToolInput,
  FirecrawlExtractToolInput,
  FirecrawlStartCrawlToolInput,
  StartBrowserSessionToolInput,
  BrowserTypeToolInput,
  BrowserWaitForTextToolInput
} from "@/lib/contracts/agentTools";

type AgentPanelProps = {
  caseId: string;
  merchantName: string;
  summary: string;
  proofSummary: string | null;
  deadlineAt: string | null;
  merchantEmail: string | null;
  mode: "configured" | "mock" | "misconfigured";
  agentId: string;
  preferredTransport?: VoiceTransportPreference;
  conversationToken?: string;
  signedUrl?: string;
  onCaseRefresh?: () => Promise<void>;
};

type CaseAgentConfig = {
  agentId: string;
  mode: "configured" | "mock" | "misconfigured";
  preferredTransport?: VoiceTransportPreference;
  configurationState?: "mock" | "live_ready" | "missing_tools" | "missing_credentials" | "inspect_failed";
  missingToolNames?: string[];
  conversationToken?: string;
  signedUrl?: string;
};

type SessionTransportMode = "voice" | "text-fallback" | null;

type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

const quickPrompts = [
  "What action can you take for me right now?",
  "Do I still qualify based on this evidence?",
  "What happens if the merchant ignores me?"
];

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function truncateText(value: string, maxLength = 2000) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength)}...`;
}

function getElementFromSelector(selector: string) {
  const trimmedSelector = selector.trim();

  if (!trimmedSelector) {
    throw new Error("A CSS selector is required.");
  }

  try {
    const element = document.querySelector(trimmedSelector);

    if (!element) {
      throw new Error(`No element matched selector: ${trimmedSelector}`);
    }

    return element;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("No element matched selector")) {
      throw error;
    }

    throw new Error(`Invalid CSS selector: ${trimmedSelector}`);
  }
}

function getElementText(element: Element | null) {
  if (!element) {
    return "";
  }

  const htmlElement = element as HTMLElement;
  return normalizeWhitespace(htmlElement.innerText || htmlElement.textContent || "");
}

function describeElement(element: Element) {
  const tagName = element.tagName.toLowerCase();
  const ariaLabel = element.getAttribute("aria-label");
  const text = getElementText(element);
  const labelParts = [tagName];

  if (ariaLabel) {
    labelParts.push(`aria-label="${ariaLabel}"`);
  }

  if (text) {
    labelParts.push(`text="${truncateText(text, 120)}"`);
  }

  return labelParts.join(" ");
}

function getPageSnapshotText(selector?: string) {
  const sourceText = selector ? getElementText(getElementFromSelector(selector)) : document.body?.innerText || document.body?.textContent || "";
  return truncateText(normalizeWhitespace(sourceText));
}

function setTypedValue(element: Element, value: string, clear: boolean) {
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    element.focus();
    element.value = clear ? value : `${element.value}${value}`;
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
    return;
  }

  if (element instanceof HTMLElement && element.isContentEditable) {
    element.focus();
    element.textContent = clear ? value : `${element.textContent ?? ""}${value}`;
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
    return;
  }

  throw new Error("The selected element does not accept typed text.");
}

async function waitForBrowserText(waitForText: string, timeoutMs: number) {
  const needle = normalizeWhitespace(waitForText).toLowerCase();

  if (!needle) {
    throw new Error("A text fragment is required.");
  }

  const startedAt = Date.now();

  while (Date.now() - startedAt <= timeoutMs) {
    const currentText = normalizeWhitespace(document.body?.innerText || document.body?.textContent || "").toLowerCase();

    if (currentText.includes(needle)) {
      return `Found "${waitForText}" on the page.`;
    }

    await new Promise((resolve) => window.setTimeout(resolve, 250));
  }

  throw new Error(`Timed out after ${timeoutMs}ms waiting for "${waitForText}".`);
}

function buildMockAnswer(question: string, summary: string, deadlineAt: string | null, merchantName: string) {
  const lower = question.toLowerCase();
  if (lower.includes("deadline") || lower.includes("when")) {
    return deadlineAt
      ? `The current evidence suggests the important deadline is ${new Date(deadlineAt).toLocaleDateString()}.`
      : "I do not have a precise deadline yet, but the current policy evidence should still be reviewed before waiting longer.";
  }

  if (lower.includes("why") || lower.includes("qualify")) {
    return summary;
  }

  if (lower.includes("send") || lower.includes("email")) {
    return `The next move is to generate the refund draft, review it, and send it to ${merchantName}'s support channel.`;
  }

  return `Refund Raider's current recommendation is: ${summary}`;
}

export function AgentPanel({
  caseId,
  merchantName,
  summary,
  proofSummary,
  deadlineAt,
  merchantEmail,
  mode,
  agentId,
  preferredTransport,
  conversationToken,
  signedUrl,
  onCaseRefresh
}: AgentPanelProps) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "assistant-intro",
      role: "assistant",
      text: `I’m your refund advocate for ${merchantName}. Ask me whether you qualify, what deadline matters, or what should happen next.`
    }
  ]);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);
  const conversationStatusRef = useRef("disconnected");
  const recoveringTextFallbackRef = useRef(false);
  const lastContextualUpdateRef = useRef<string | null>(null);
  const isConfigured = mode === "configured";
  const [sessionTransportMode, setSessionTransportMode] = useState<SessionTransportMode>(null);
  const [micPermission, setMicPermission] = useState<"unknown" | "granted" | "denied" | "unsupported">("unknown");
  const [voiceSessionStable, setVoiceSessionStable] = useState(false);
  const [voiceDebugState, setVoiceDebugState] = useState<VoiceSessionDebugState>(() =>
    createVoiceSessionDebugState({
      agentId,
      preferredTransport,
      micPermission: "unknown"
    })
  );
  const lastDisconnectDetailsRef = useRef<DisconnectionDetails | null>(null);
  const lastDebugPayloadRef = useRef<unknown>(null);
  const lastSdkErrorRef = useRef<string | null>(null);

  async function fetchAutomationWorkspace() {
    const response = await fetch(`/api/v1/cases/${caseId}/automation`);
    const body = await response.json();

    if (!response.ok) {
      throw new Error(body.error?.message ?? "Failed to load the browser automation session.");
    }

    return body.data as {
      automationSession?: { id: string; status: string } | null;
      browserSnapshots?: Array<{ pageTitle?: string | null; pageUrl: string; visibleText?: string | null }>;
    };
  }

  async function ensureAutomationSession() {
    const currentWorkspace = await fetchAutomationWorkspace();
    if (currentWorkspace.automationSession?.id) {
      return currentWorkspace.automationSession;
    }

    const response = await fetch(`/api/v1/cases/${caseId}/automation`, {
      method: "POST"
    });
    const body = await response.json();

    if (!response.ok) {
      throw new Error(body.error?.message ?? "Failed to create the browser automation session.");
    }

    await onCaseRefresh?.();
    return body.data?.automationSession as { id: string; status: string };
  }

  async function queueBrowserCommand(
    actionType: string,
    payload: {
      description: string;
      selector?: string;
      textValue?: string;
      targetUrl?: string;
      waitForText?: string;
      metadata?: Record<string, unknown>;
    }
  ) {
    const automationSession = await ensureAutomationSession();
    const response = await fetch(`/api/v1/automation/sessions/${automationSession.id}/commands`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        actionType,
        ...payload
      })
    });
    const body = await response.json();

    if (!response.ok) {
      throw new Error(body.error?.message ?? "Failed to queue the browser command.");
    }

    await onCaseRefresh?.();
    return {
      session: automationSession,
      browserCommand: body.data?.browserCommand as { id: string }
    };
  }

  const conversation = useConversation({
    textOnly: !isConfigured,
    clientTools: {
      start_browser_session: async () => {
        return "Browser automation is disabled in this demo build. Use the email path or explain the manual support step instead.";
      },
      browser_snapshot: async () => {
        return "Browser automation is disabled in this demo build. Use the case evidence, support email, and manual instructions instead.";
      },
      browser_navigate: async () => {
        return "Browser automation is disabled in this demo build. Use the email path or explain the manual support step instead.";
      },
      browser_click: async () => {
        return "Browser automation is disabled in this demo build. Use the email path or explain the manual support step instead.";
      },
      browser_type: async () => {
        return "Browser automation is disabled in this demo build. Use the email path or explain the manual support step instead.";
      },
      browser_scroll: async () => {
        return "Browser automation is disabled in this demo build. Use the email path or explain the manual support step instead.";
      },
      browser_wait_for_text: async () => {
        return "Browser automation is disabled in this demo build. Use the email path or explain the manual support step instead.";
      },
      browser_extract: async () => {
        return "Browser automation is disabled in this demo build. Use the case evidence already collected instead.";
      },
      browser_press_key: async () => {
        return "Browser automation is disabled in this demo build. Use the email path or explain the manual support step instead.";
      },
      lookup_policy_evidence: async () => {
        await fetch(`/api/v1/cases/${caseId}/research`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ forceRefresh: true })
        });

        await fetch(`/api/v1/cases/${caseId}/strategy`, {
          method: "POST"
        });

        await onCaseRefresh?.();
        return "Research refreshed and the strategy has been updated.";
      },
      summarize_eligibility: async () => {
        const response = await fetch(`/api/v1/cases/${caseId}/strategy`);
        const body = await response.json();
        return body.data?.strategy?.plainEnglishSummary ?? summary;
      },
      build_action_plan: async () => {
        const response = await fetch(`/api/v1/cases/${caseId}/plan`, {
          method: "POST"
        });

        if (!response.ok) {
          const body = await response.json();
          throw new Error(body.error?.message ?? "Failed to build the action plan.");
        }

        const body = await response.json();
        await onCaseRefresh?.();

        return `Action plan ready. Primary channel=${body.data?.plan?.primaryChannel ?? "unknown"}; recommended outcome=${body.data?.plan?.recommendedOutcome ?? "unknown"}; automation confidence=${body.data?.plan?.automationConfidence ?? "unknown"}`;
      },
      create_refund_draft: async (parameters: { tone?: "firm_polite" | "neutral" | "escalation_ready" }) => {
        const response = await fetch(`/api/v1/cases/${caseId}/drafts`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            tone: parameters.tone ?? "firm_polite"
          })
        });

        if (!response.ok) {
          const body = await response.json();
          throw new Error(body.error?.message ?? "Failed to create refund draft.");
        }

        await onCaseRefresh?.();
        return "Refund draft created and ready for review in the draft panel.";
      },
      request_user_consent: async (parameters: { actionId?: string }) => {
        const detailResponse = await fetch(`/api/v1/cases/${caseId}`);
        const detailBody = await detailResponse.json();
        const actionId =
          parameters.actionId ??
          (detailBody.data?.caseDetail?.actionRuns as Array<{ id: string; status: string; requiresConsent?: boolean }> | undefined)
            ?.find((actionRun) => actionRun.status !== "completed" && actionRun.requiresConsent)
            ?.id;

        if (!actionId) {
          return "No consent-gated action is waiting right now.";
        }

        const response = await fetch(`/api/v1/actions/${actionId}/run`, {
          method: "POST"
        });
        const body = await response.json();

        if (!response.ok) {
          throw new Error(body.error?.message ?? "Failed to request user consent.");
        }

        await onCaseRefresh?.();
        return `Approval requested for action ${actionId}. The UI now shows the pending consent step.`;
      },
      execute_case_action: async (parameters: { actionId?: string }) => {
        const detailResponse = await fetch(`/api/v1/cases/${caseId}`);
        const detailBody = await detailResponse.json();
        const actionId =
          parameters.actionId ??
          (
            detailBody.data?.caseDetail?.actionRuns as
              | Array<{ id: string; status: string }>
              | undefined
          )?.find((actionRun) => actionRun.status !== "completed")?.id;

        if (!actionId) {
          return "No runnable case action is available right now.";
        }

        const response = await fetch(`/api/v1/actions/${actionId}/run`, {
          method: "POST"
        });
        const body = await response.json();

        if (!response.ok) {
          throw new Error(body.error?.message ?? "Failed to execute the planned action.");
        }

        await onCaseRefresh?.();
        return `Action ${actionId} is now ${body.data?.actionRun?.status ?? "updated"}.`;
      },
      schedule_follow_up: async (parameters: { title?: string }) => {
        const response = await fetch(`/api/v1/cases/${caseId}/follow-ups`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            title: parameters.title
          })
        });

        const body = await response.json();
        if (!response.ok) {
          throw new Error(body.error?.message ?? "Failed to schedule follow-up.");
        }

        await onCaseRefresh?.();
        return `Follow-up scheduled for ${body.data?.followUp?.dueAt ?? "the case timeline"}.`;
      },
      firecrawl_extract: async (parameters: FirecrawlExtractToolInput) => {
        const response = await fetch("/api/v1/firecrawl/extract", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(parameters)
        });
        const body = await response.json();

        if (!response.ok) {
          throw new Error(body.error?.message ?? "Failed to start Firecrawl extract.");
        }

        return `Firecrawl extract started. extract_id=${body.data?.result?.id ?? "unknown"}; status=${body.data?.result?.status ?? "unknown"}`;
      },
      firecrawl_get_extract_status: async (parameters: FirecrawlExtractStatusToolInput) => {
        const response = await fetch(`/api/v1/firecrawl/extract/${parameters.extractId}`);
        const body = await response.json();

        if (!response.ok) {
          throw new Error(body.error?.message ?? "Failed to read Firecrawl extract status.");
        }

        return JSON.stringify(body.data?.result ?? {});
      },
      firecrawl_start_crawl: async (parameters: FirecrawlStartCrawlToolInput) => {
        const response = await fetch("/api/v1/firecrawl/crawl", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(parameters)
        });
        const body = await response.json();

        if (!response.ok) {
          throw new Error(body.error?.message ?? "Failed to start Firecrawl crawl.");
        }

        return `Firecrawl crawl started. crawl_id=${body.data?.crawlJob?.id ?? "unknown"}; status=${body.data?.crawlJob?.status ?? "unknown"}`;
      },
      firecrawl_get_crawl_status: async (parameters: FirecrawlCrawlStatusToolInput) => {
        const response = await fetch(`/api/v1/firecrawl/crawl/${parameters.crawlId}`);
        const body = await response.json();

        if (!response.ok) {
          throw new Error(body.error?.message ?? "Failed to read Firecrawl crawl status.");
        }

        return JSON.stringify(body.data?.crawlJob ?? {});
      },
      get_case_status: async () => {
        const response = await fetch(`/api/v1/cases/${caseId}`);
        const body = await response.json();
        const detail = body.data?.caseDetail;
        const caseStatus = detail?.case?.status ?? "unknown";
        const latestStep = detail?.timeline?.[detail.timeline.length - 1]?.actionType ?? "case_created";
        const nextActionId =
          detail?.actionRuns?.find(
            (actionRun: { id: string; status: string }) => actionRun.status !== "completed"
          )?.id ?? "none";
        const proofExcerpt =
          detail?.artifacts
            ?.filter((artifact: { sourceText?: string | null }) => Boolean(artifact.sourceText))
            .slice(0, 2)
            .map((artifact: { sourceText?: string | null }) =>
              artifact.sourceText?.replace(/\s+/g, " ").trim().slice(0, 120)
            )
            .filter(Boolean)
            .join(" | ") ?? "none";
        const nextRecommendedAction =
          detail?.activeDraft?.status === "approved"
            ? "send_refund_email"
            : detail?.activeActionPlan
              ? "execute_case_action"
            : detail?.activeDraft
              ? "review_draft"
              : detail?.activeStrategy
                ? "build_action_plan"
                : "lookup_policy_evidence";

        return `case_status=${caseStatus}; latest_step=${latestStep}; next_recommended_action=${nextRecommendedAction}; next_action_id=${nextActionId}; proof_excerpt=${proofExcerpt}`;
      },
      send_refund_email: async () => {
        const detailResponse = await fetch(`/api/v1/cases/${caseId}`);
        const detailBody = await detailResponse.json();
        const detail = detailBody.data?.caseDetail;
        const draftId = detail?.activeDraft?.id as string | undefined;

        if (!draftId) {
          return "A refund draft does not exist yet. Create one first.";
        }

        if (detail?.activeDraft?.status !== "approved") {
          return "User approval is still required. The draft must be approved in the UI before sending.";
        }

        if (!merchantEmail) {
          return "A merchant support email is still required before sending.";
        }

        const sendResponse = await fetch(`/api/v1/drafts/${draftId}/send`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            to: [merchantEmail],
            ccUser: true
          })
        });

        if (!sendResponse.ok) {
          const body = await sendResponse.json();
          throw new Error(body.error?.message ?? "Failed to send refund email.");
        }

        await onCaseRefresh?.();
        return "The refund email has been sent and the timeline has been updated.";
      }
    },
    onMessage: (message: unknown) => {
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
    },
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

      if (conversationStatusRef.current !== "connected") {
        setConnectError(errorMessage);
      }
    }
  });

  useEffect(() => {
    conversationStatusRef.current = conversation.status;
  }, [conversation.status]);

  useEffect(() => {
    setVoiceDebugState((current) => ({
      ...current,
      agentId,
      preferredTransport: preferredTransport ?? current.preferredTransport
    }));
  }, [agentId, preferredTransport]);

  useEffect(() => {
    if (conversation.status === "disconnected") {
      setSessionTransportMode(null);
      setVoiceSessionStable(false);
      lastContextualUpdateRef.current = null;
    }
  }, [conversation.status]);

  async function startTextFallbackSession(userFacingReason: string) {
    if (recoveringTextFallbackRef.current) {
      return;
    }

    recoveringTextFallbackRef.current = true;

    try {
      const nextAgentConfig = await fetchFreshCaseAgentConfig();

      if (nextAgentConfig.mode !== "configured") {
        setConnectError(userFacingReason);
        return;
      }

      await conversation.endSession().catch(() => undefined);

      if (nextAgentConfig.signedUrl) {
        await conversation.startSession({
          signedUrl: nextAgentConfig.signedUrl,
          connectionType: "websocket",
          textOnly: true,
          userId: caseId
        });
      } else {
        await conversation.startSession({
          agentId: nextAgentConfig.agentId,
          connectionType: "websocket",
          textOnly: true,
          userId: caseId
        });
      }

      await waitForConversationReady(8000);
      setSessionTransportMode("text-fallback");
      setVoiceDebugState((current) =>
        recordVoiceDebugData(current, "Activated live text fallback after voice failure.", {
          transport: "websocket",
          fallback: "text"
        })
      );
      setConnectError(`${userFacingReason} Live text fallback is connected instead.`);
    } catch {
      setVoiceDebugState((current) =>
        recordVoiceError(current, `${userFacingReason} Live text fallback could not connect.`)
      );
      setConnectError(userFacingReason);
    } finally {
      recoveringTextFallbackRef.current = false;
      setIsStarting(false);
    }
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

      void startTextFallbackSession(nextMessage);
    }

    function handleUnhandledRejection(event: PromiseRejectionEvent) {
      const nextMessage = getElevenLabsBrowserFailureMessage(event.reason);

      if (!nextMessage) {
        return;
      }

      void startTextFallbackSession(nextMessage);
    }

    window.addEventListener("error", handleWindowError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleWindowError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  const helperText = useMemo(() => {
    return deadlineAt
      ? `Evidence-backed deadline: ${new Date(deadlineAt).toLocaleDateString()}`
      : "Evidence-backed summary is available even if no exact deadline was found.";
  }, [deadlineAt]);

  const proofHelper = useMemo(() => {
    return proofSummary ?? "No extracted proof text yet. Upload a screenshot, receipt, or PDF to ground the case.";
  }, [proofSummary]);

  const connectionLabel = useMemo(() => {
    if (!isConfigured) {
      return mode === "misconfigured" ? "Live agent misconfigured" : "Mock advocate mode";
    }

    if (conversation.status === "connected" && sessionTransportMode === "text-fallback") {
      return "Live text fallback";
    }

    if (conversation.status === "connected") {
      return "Live voice connected";
    }

    if (isStarting) {
      return "Opening voice session...";
    }

    return "Ready to connect";
  }, [conversation.status, isConfigured, isStarting, mode, sessionTransportMode]);

  const connectionHelper = useMemo(() => {
    if (!isConfigured) {
      return "Type a question to simulate the advocate flow.";
    }

    if (conversation.status === "connected") {
      return "Voice is live. Ask follow-up questions or trigger research from the case.";
    }

    return "Start the agent to make the talk-to-Refund-Raider moment feel live on the case page.";
  }, [conversation.status, isConfigured]);

  useEffect(() => {
    const nextContext = `Case ${caseId}. Merchant: ${merchantName}. Current summary: ${summary}. ${helperText}. Proof summary: ${proofHelper}`;

    if (
      mode === "configured" &&
      voiceSessionStable &&
      conversation.status === "connected" &&
      lastContextualUpdateRef.current !== nextContext
    ) {
      lastContextualUpdateRef.current = nextContext;
      conversation.sendContextualUpdate(
        nextContext
      );
    }
  }, [caseId, conversation.status, helperText, merchantName, mode, proofHelper, summary, voiceSessionStable]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  async function fetchFreshCaseAgentConfig() {
    const response = await fetch("/api/v1/agent/session", {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        caseId
      })
    });
    const body = await response.json();

    if (!response.ok) {
      throw new Error(body.error?.message ?? "Failed to load the live case agent session.");
    }

    return body.data.agent as CaseAgentConfig;
  }

  async function ensureMicrophoneAccess() {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setMicPermission("unsupported");
      return "unsupported" as const;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setMicPermission("granted");
      return "granted" as const;
    } catch {
      setMicPermission("denied");
      throw new Error("Microphone permission was denied in the browser, so the live voice session cannot start.");
    }
  }

  async function waitForConversationReady(timeoutMs: number, stableWindowMs = 2500) {
    const startedAt = Date.now();
    let sawConnecting = false;
    let connectedAt: number | null = null;

    while (Date.now() - startedAt <= timeoutMs) {
      const status = conversationStatusRef.current;

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
        throw new Error(
          "The ElevenLabs case session opened, then disconnected before the voice client became ready."
        );
      }

      await new Promise((resolve) => window.setTimeout(resolve, 100));
    }

    throw new Error("The ElevenLabs case session did not reach connected state in time.");
  }

  async function handleConnect() {
    setConnectError(null);
    setIsStarting(true);
    setVoiceSessionStable(false);

    try {
      const nextAgentConfig = await fetchFreshCaseAgentConfig();

      if (nextAgentConfig.mode === "misconfigured") {
        throw new Error(
          nextAgentConfig.configurationState === "missing_tools"
            ? `The live ElevenLabs case agent is missing tools: ${(nextAgentConfig.missingToolNames ?? []).join(", ")}. Run the ElevenLabs sync step first.`
            : "The live ElevenLabs case agent is not fully configured yet."
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
          userId: caseId
        },
        {
          getMicPermission: () => nextMicPermission,
          resetSession: async () => {
            await conversation.endSession().catch(() => undefined);
          },
          startSession: async (config) => {
            await conversation.startSession(config);
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
            await waitForConversationReady(12000);
          }
        }
      );
      setSessionTransportMode("voice");
      setVoiceSessionStable(true);
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : "Failed to connect agent";

      if (
        !rawMessage.includes("missing tools") &&
        !rawMessage.includes("not fully configured")
      ) {
        await startTextFallbackSession(
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

  function submitMessage(messageText: string) {
    const nextMessage = messageText.trim();
    if (!nextMessage) {
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

    if (isConfigured && conversation.status === "connected") {
      conversation.sendUserMessage(nextMessage);
    } else {
      const answer = buildMockAnswer(nextMessage, summary, deadlineAt, merchantName);
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

  function handleSend() {
    submitMessage(input);
  }

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-[var(--border)] bg-token-panel-vertical p-6 shadow-token-lg">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top_right,_rgba(20,100,109,0.14),_transparent_58%)]" />
      <div className="relative">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-strong)] bg-white/80 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-[var(--secondary)]">
              Talk to Refund Raider
            </div>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">
              Let the advocate carry the explanation.
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--muted)]">
              Ask what evidence matters, whether you qualify, or what should happen next. The
              transcript stays grounded in the case summary and policy evidence.
            </p>
          </div>
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <span className="rounded-full border border-[var(--border-strong)] bg-white/80 px-4 py-2 text-sm font-medium text-[var(--foreground)]">
              {connectionLabel}
            </span>
            {isConfigured ? (
              <button
                type="button"
                onClick={handleConnect}
                disabled={conversation.status === "connected" || isStarting}
                className="rounded-full bg-[var(--foreground)] px-4 py-2 text-sm font-medium text-white shadow-token-md transition-opacity disabled:opacity-60"
              >
                {conversation.status === "connected"
                  ? sessionTransportMode === "text-fallback"
                    ? "Live text fallback"
                    : "Voice session live"
                  : isStarting
                    ? "Connecting..."
                    : "Start voice session"}
              </button>
            ) : (
              <span className="rounded-full border border-[var(--border)] px-4 py-2 text-xs text-[var(--muted)]">
                Mock advocate mode
              </span>
            )}
          </div>
        </div>

        {mode === "misconfigured" ? (
          <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            The custom SDK UI is loaded, but the live ElevenLabs case agent itself is not configured
            with the required tools yet. The page is falling back to mock behavior until the live
            agent is synced.
          </div>
        ) : null}

        <div className="mb-5 grid gap-3 md:grid-cols-4">
          <div className="rounded-2xl border border-[var(--border)] bg-white/92 p-4 shadow-token-md">
            <div className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Merchant</div>
            <div className="mt-2 text-sm font-medium text-[var(--foreground)]">{merchantName}</div>
            <p className="mt-1 text-xs leading-5 text-[var(--muted)]">The agent stays scoped to this merchant only.</p>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-white/92 p-4 shadow-token-md">
            <div className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Deadline</div>
            <div className="mt-2 text-sm font-medium text-[var(--foreground)]">
              {deadlineAt ? new Date(deadlineAt).toLocaleDateString() : "Not extracted yet"}
            </div>
            <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{helperText}</p>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-white/92 p-4 shadow-token-md">
            <div className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Support + proof</div>
            <div className="mt-2 truncate text-sm font-medium text-[var(--foreground)]">
              {merchantEmail ?? "No support email captured"}
            </div>
            <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{proofHelper || connectionHelper}</p>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-white/92 p-4 shadow-token-md">
            <div className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Voice transport</div>
            <div className="mt-2 text-sm font-medium text-[var(--foreground)]">
              {voiceDebugState.transport ?? preferredTransport ?? "unknown"}
            </div>
            <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
              Mic: {micPermission}. Preferred: {preferredTransport ?? "unknown"}.
            </p>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {quickPrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => submitMessage(prompt)}
              className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm text-[var(--foreground)] shadow-token-md transition hover:-translate-y-0.5 hover:border-[var(--secondary)]"
            >
              {prompt}
            </button>
          ))}
        </div>

        <div className="mb-4 grid max-h-96 gap-3 overflow-y-auto rounded-[1.75rem] border border-[var(--border)] bg-token-transcript p-4">
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
          <div ref={transcriptEndRef} />
        </div>

        <div className="grid gap-3">
          <textarea
            data-testid="agent-input"
            value={input}
            onChange={(event) => {
              setInput(event.target.value);
              if (isConfigured && conversation.status === "connected") {
                conversation.sendUserActivity();
              }
            }}
            className="min-h-28 rounded-[1.4rem] border border-[var(--border)] bg-white px-4 py-3 text-sm leading-6 shadow-token-md outline-none transition-shadow focus:ring-2 focus:ring-[var(--secondary-soft)]"
            placeholder="Ask: Do I still qualify? What evidence matters most? What should I send?"
          />
        {connectError ? (
          <p
            className={`text-sm ${
              connectError.includes("fallback is connected instead.") ? "text-amber-700" : "text-red-700"
            }`}
          >
            {connectError}
          </p>
        ) : null}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleSend}
              data-testid="agent-send"
              className="rounded-full bg-[var(--foreground)] px-5 py-3 text-sm font-medium text-white shadow-token-md transition-opacity hover:bg-[var(--accent-strong)]"
            >
              Send message
            </button>
            <p className="text-sm text-[var(--muted)]">
              Press send to keep the advocate moment tight and case-specific.
            </p>
          </div>
        </div>

        <VoiceDiagnosticsPanel
          title="Developer voice diagnostics"
          debugState={voiceDebugState}
        />
      </div>
    </section>
  );
}
