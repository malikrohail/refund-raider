import type { SessionConfig } from "@elevenlabs/client";

export type VoiceTransportPreference = "websocket" | "webrtc";

type VoiceSessionBootstrapInput = {
  agentId: string;
  conversationToken?: string;
  signedUrl?: string;
  userId: string;
  preferredTransport?: VoiceTransportPreference;
};

export type VoiceSessionAttempt = {
  id: string;
  transport: VoiceTransportPreference;
  authMode: "signed_url" | "conversation_token" | "agent_id";
  config: SessionConfig;
  micPermission: string;
};

type VoiceSessionBootstrapDeps = {
  resetSession: () => Promise<void>;
  startSession: (config: SessionConfig) => Promise<unknown>;
  waitForReady: () => Promise<void>;
  getMicPermission?: () => string;
  onAttemptStart?: (attempt: VoiceSessionAttempt) => void;
  onAttemptFailure?: (attempt: VoiceSessionAttempt, error: unknown) => void;
  onAttemptSuccess?: (attempt: VoiceSessionAttempt) => void;
};

function buildVoiceSessionAttempts({
  agentId,
  conversationToken,
  signedUrl,
  userId,
  preferredTransport = "websocket"
}: VoiceSessionBootstrapInput, micPermission = "unknown"): VoiceSessionAttempt[] {
  const attempts: VoiceSessionAttempt[] = [];
  const orderedTransports =
    preferredTransport === "webrtc" ? ["webrtc", "websocket"] : ["websocket", "webrtc"];

  for (const transport of orderedTransports) {
    if (transport === "websocket" && signedUrl) {
      attempts.push({
        id: crypto.randomUUID(),
        transport: "websocket",
        authMode: "signed_url",
        micPermission,
        config: {
          signedUrl,
          connectionType: "websocket",
          userId
        }
      });
    }

    if (transport === "webrtc" && conversationToken) {
      attempts.push({
        id: crypto.randomUUID(),
        transport: "webrtc",
        authMode: "conversation_token",
        micPermission,
        config: {
          conversationToken,
          connectionType: "webrtc",
          userId
        }
      });
    }
  }

  if (attempts.length === 0) {
    attempts.push({
      id: crypto.randomUUID(),
      transport: "websocket",
      authMode: "agent_id",
      micPermission,
      config: {
        agentId,
        connectionType: "websocket",
        userId
      }
    });
  }

  return attempts;
}

export function buildVoiceSessionConfigs(input: VoiceSessionBootstrapInput): SessionConfig[] {
  return buildVoiceSessionAttempts(input).map((attempt) => attempt.config);
}

export async function startVoiceSessionWithFallback(
  input: VoiceSessionBootstrapInput,
  deps: VoiceSessionBootstrapDeps
) {
  const attempts = buildVoiceSessionAttempts(
    input,
    deps.getMicPermission?.() ?? "unknown"
  );
  let lastError: unknown = null;

  for (const attempt of attempts) {
    try {
      deps.onAttemptStart?.(attempt);
      await deps.resetSession();
      await deps.startSession(attempt.config);
      await deps.waitForReady();
      deps.onAttemptSuccess?.(attempt);
      return attempt;
    } catch (error) {
      deps.onAttemptFailure?.(attempt, error);
      lastError = error;
    }
  }

  if (lastError instanceof Error) {
    throw lastError;
  }

  throw new Error("Failed to start the ElevenLabs voice session.");
}
