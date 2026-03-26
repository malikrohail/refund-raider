import type { DisconnectionDetails, Status } from "@elevenlabs/react";
import type {
  VoiceSessionAttempt,
  VoiceTransportPreference
} from "@/lib/agent/voiceSessionBootstrap";

type VoiceEventKind =
  | "attempt_started"
  | "attempt_failed"
  | "attempt_succeeded"
  | "status"
  | "connected"
  | "disconnected"
  | "error"
  | "debug"
  | "metadata";

type VoiceStatusTransition = {
  status: Status;
  at: string;
};

type SerializableDisconnectDetails = {
  reason: DisconnectionDetails["reason"];
  message?: string;
  closeCode?: number;
  closeReason?: string;
  contextType?: string;
};

type VoiceEventLogEntry = {
  id: string;
  at: string;
  kind: VoiceEventKind;
  detail: string;
  data?: unknown;
};

export type VoiceSessionDebugState = {
  agentId: string;
  preferredTransport: VoiceTransportPreference | null;
  attemptId: string | null;
  transport: VoiceTransportPreference | null;
  authMode: VoiceSessionAttempt["authMode"] | null;
  micPermission: string;
  conversationId: string | null;
  statusTransitions: VoiceStatusTransition[];
  disconnectDetails: SerializableDisconnectDetails | null;
  errorMessage: string | null;
  startedAt: string | null;
  endedAt: string | null;
  events: VoiceEventLogEntry[];
};

type VoiceFailureSummaryInput = {
  disconnectDetails: SerializableDisconnectDetails | null;
  errorMessage: string | null;
  debugData?: unknown;
};

function nowIso() {
  return new Date().toISOString();
}

function createLogEntry(kind: VoiceEventKind, detail: string, data?: unknown): VoiceEventLogEntry {
  return {
    id: crypto.randomUUID(),
    at: nowIso(),
    kind,
    detail,
    ...(typeof data === "undefined" ? {} : { data })
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function serializeVoiceValue(value: unknown, depth = 0): unknown {
  if (depth > 4) {
    return "[max-depth]";
  }

  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (typeof value === "undefined") {
    return "undefined";
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message
    };
  }

  if (
    typeof Event !== "undefined" &&
    value instanceof Event
  ) {
    const eventValue = value as Event & { code?: number; reason?: string };

    return {
      type: eventValue.type,
      ...(typeof eventValue.code === "number" ? { code: eventValue.code } : {}),
      ...(typeof eventValue.reason === "string" && eventValue.reason
        ? { reason: eventValue.reason }
        : {})
    };
  }

  if (Array.isArray(value)) {
    return value.map((entry) => serializeVoiceValue(entry, depth + 1));
  }

  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, serializeVoiceValue(entry, depth + 1)])
    );
  }

  return String(value);
}

export function serializeDisconnectDetails(
  details: DisconnectionDetails | null
): SerializableDisconnectDetails | null {
  if (!details) {
    return null;
  }

  return {
    reason: details.reason,
    ...("message" in details && details.message ? { message: details.message } : {}),
    ...("closeCode" in details && typeof details.closeCode === "number"
      ? { closeCode: details.closeCode }
      : {}),
    ...("closeReason" in details && details.closeReason ? { closeReason: details.closeReason } : {}),
    ...("context" in details && details.context ? { contextType: details.context.type } : {})
  };
}

export function createVoiceSessionDebugState({
  agentId,
  preferredTransport,
  micPermission
}: {
  agentId: string;
  preferredTransport?: VoiceTransportPreference | null;
  micPermission?: string;
}): VoiceSessionDebugState {
  return {
    agentId,
    preferredTransport: preferredTransport ?? null,
    attemptId: null,
    transport: null,
    authMode: null,
    micPermission: micPermission ?? "unknown",
    conversationId: null,
    statusTransitions: [],
    disconnectDetails: null,
    errorMessage: null,
    startedAt: null,
    endedAt: null,
    events: []
  };
}

function appendEvent(
  state: VoiceSessionDebugState,
  kind: VoiceEventKind,
  detail: string,
  data?: unknown
) {
  return {
    ...state,
    events: [...state.events.slice(-39), createLogEntry(kind, detail, data)]
  };
}

export function recordVoiceAttemptStart(
  state: VoiceSessionDebugState,
  attempt: VoiceSessionAttempt
) {
  const nextState = {
    ...state,
    attemptId: attempt.id,
    transport: attempt.transport,
    authMode: attempt.authMode,
    micPermission: attempt.micPermission,
    conversationId: null,
    statusTransitions: [],
    disconnectDetails: null,
    errorMessage: null,
    startedAt: nowIso(),
    endedAt: null
  };

  return appendEvent(
    nextState,
    "attempt_started",
    `Starting ${attempt.transport} voice session using ${attempt.authMode.replaceAll("_", " ")}.`,
    {
      transport: attempt.transport,
      authMode: attempt.authMode
    }
  );
}

export function recordVoiceAttemptResult(
  state: VoiceSessionDebugState,
  kind: "attempt_succeeded" | "attempt_failed",
  detail: string,
  data?: unknown
) {
  const nextState = {
    ...state,
    endedAt: nowIso()
  };

  return appendEvent(nextState, kind, detail, data);
}

export function recordVoiceStatusChange(
  state: VoiceSessionDebugState,
  status: Status
) {
  const nextState = {
    ...state,
    statusTransitions: [
      ...state.statusTransitions,
      {
        status,
        at: nowIso()
      }
    ]
  };

  return appendEvent(nextState, "status", `Status changed to ${status}.`, { status });
}

export function recordVoiceConnect(
  state: VoiceSessionDebugState,
  conversationId: string
) {
  const nextState = {
    ...state,
    conversationId,
    endedAt: null
  };

  return appendEvent(nextState, "connected", "Voice session connected.", {
    conversationId
  });
}

export function recordVoiceDisconnect(
  state: VoiceSessionDebugState,
  details: DisconnectionDetails
) {
  const serialized = serializeDisconnectDetails(details);
  const nextState = {
    ...state,
    disconnectDetails: serialized,
    endedAt: nowIso()
  };

  return appendEvent(
    nextState,
    "disconnected",
    `Voice session disconnected (${details.reason}).`,
    serialized ?? undefined
  );
}

export function recordVoiceError(
  state: VoiceSessionDebugState,
  errorMessage: string,
  context?: unknown
) {
  const nextState = {
    ...state,
    errorMessage,
    endedAt: nowIso()
  };

  return appendEvent(nextState, "error", errorMessage, serializeVoiceValue(context));
}

export function recordVoiceDebugData(
  state: VoiceSessionDebugState,
  detail: string,
  data: unknown,
  kind: "debug" | "metadata" = "debug"
) {
  return appendEvent(state, kind, detail, serializeVoiceValue(data));
}

export function getElevenLabsBrowserFailureMessage(errorLike: unknown) {
  const message =
    errorLike instanceof Error
      ? errorLike.message
      : typeof errorLike === "string"
        ? errorLike
        : typeof errorLike === "object" && errorLike && "message" in errorLike
          ? String(errorLike.message)
          : "";

  if (!message) {
    return null;
  }

  if (
    message.includes("error_type") ||
    message.includes("RTCErrorEvent") ||
    message.includes("DataChannel")
  ) {
    return "The ElevenLabs browser voice client crashed while opening the live session. The backend session is up, but the SDK transport failed in the browser.";
  }

  return null;
}

export function buildVoiceFailureSummary({
  disconnectDetails,
  errorMessage,
  debugData
}: VoiceFailureSummaryInput) {
  const browserTransportFailure =
    getElevenLabsBrowserFailureMessage(errorMessage) ??
    getElevenLabsBrowserFailureMessage(debugData);

  if (browserTransportFailure) {
    return browserTransportFailure;
  }

  if (disconnectDetails?.reason === "error") {
    if (disconnectDetails.closeCode && disconnectDetails.closeReason) {
      return `The ElevenLabs voice session disconnected (${disconnectDetails.closeCode}): ${disconnectDetails.closeReason}.`;
    }

    if (disconnectDetails.message) {
      return `The ElevenLabs voice session failed: ${disconnectDetails.message}`;
    }
  }

  if (disconnectDetails?.reason === "agent") {
    return "The ElevenLabs agent ended the voice session before it became interactive.";
  }

  if (errorMessage) {
    return errorMessage;
  }

  return "The ElevenLabs voice session disconnected before it became ready.";
}
