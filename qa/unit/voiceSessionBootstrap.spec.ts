import { describe, expect, it, vi } from "vitest";
import {
  buildVoiceSessionConfigs,
  startVoiceSessionWithFallback
} from "../../src/lib/agent/voiceSessionBootstrap";

describe("buildVoiceSessionConfigs", () => {
  it("prefers the signed websocket session when websocket is the preferred transport", () => {
    expect(
      buildVoiceSessionConfigs({
        agentId: "agent_live",
        conversationToken: "conv_token",
        signedUrl: "https://signed.example/session",
        preferredTransport: "websocket",
        userId: "voice-intake"
      })
    ).toEqual([
      {
        signedUrl: "https://signed.example/session",
        connectionType: "websocket",
        userId: "voice-intake"
      },
      {
        conversationToken: "conv_token",
        connectionType: "webrtc",
        userId: "voice-intake"
      }
    ]);
  });

  it("can still prefer webrtc when explicitly requested", () => {
    expect(
      buildVoiceSessionConfigs({
        agentId: "agent_live",
        conversationToken: "conv_token",
        signedUrl: "https://signed.example/session",
        preferredTransport: "webrtc",
        userId: "voice-intake"
      })
    ).toEqual([
      {
        conversationToken: "conv_token",
        connectionType: "webrtc",
        userId: "voice-intake"
      },
      {
        signedUrl: "https://signed.example/session",
        connectionType: "websocket",
        userId: "voice-intake"
      }
    ]);
  });

  it("falls back to the public websocket session only when no private session is available", () => {
    expect(
      buildVoiceSessionConfigs({
        agentId: "agent_live",
        userId: "case_123"
      })
    ).toEqual([
      {
        agentId: "agent_live",
        connectionType: "websocket",
        userId: "case_123"
      }
    ]);
  });
});

describe("startVoiceSessionWithFallback", () => {
  it("retries voice over webrtc when websocket is preferred but websocket fails readiness", async () => {
    const resetSession = vi.fn().mockResolvedValue(undefined);
    const startSession = vi.fn().mockResolvedValue(undefined);
    const waitForReady = vi
      .fn()
      .mockRejectedValueOnce(new Error("websocket failed"))
      .mockResolvedValueOnce(undefined);
    const onAttemptStart = vi.fn();
    const onAttemptFailure = vi.fn();
    const onAttemptSuccess = vi.fn();

    const result = await startVoiceSessionWithFallback(
      {
        agentId: "agent_live",
        conversationToken: "conv_token",
        signedUrl: "https://signed.example/session",
        preferredTransport: "websocket",
        userId: "voice-intake"
      },
      {
        resetSession,
        startSession,
        waitForReady,
        getMicPermission: () => "granted",
        onAttemptStart,
        onAttemptFailure,
        onAttemptSuccess
      }
    );

    expect(result.transport).toBe("webrtc");
    expect(result.authMode).toBe("conversation_token");
    expect(resetSession).toHaveBeenCalledTimes(2);
    expect(startSession).toHaveBeenNthCalledWith(1, {
      signedUrl: "https://signed.example/session",
      connectionType: "websocket",
      userId: "voice-intake"
    });
    expect(startSession).toHaveBeenNthCalledWith(2, {
      conversationToken: "conv_token",
      connectionType: "webrtc",
      userId: "voice-intake"
    });
    expect(waitForReady).toHaveBeenCalledTimes(2);
    expect(onAttemptStart).toHaveBeenCalledTimes(2);
    expect(onAttemptFailure).toHaveBeenCalledTimes(1);
    expect(onAttemptSuccess).toHaveBeenCalledTimes(1);
    expect(onAttemptStart.mock.calls[0][0].micPermission).toBe("granted");
  });

  it("throws the last connection error when every voice transport fails", async () => {
    const resetSession = vi.fn().mockResolvedValue(undefined);
    const startSession = vi.fn().mockResolvedValue(undefined);
    const waitForReady = vi
      .fn()
      .mockRejectedValueOnce(new Error("websocket failed"))
      .mockRejectedValueOnce(new Error("webrtc failed"));

    await expect(
      startVoiceSessionWithFallback(
        {
          agentId: "agent_live",
          conversationToken: "conv_token",
          signedUrl: "https://signed.example/session",
          userId: "voice-intake"
        },
        {
          resetSession,
          startSession,
          waitForReady
        }
      )
    ).rejects.toThrow("webrtc failed");
  });
});
