import { describe, expect, it } from "vitest";
import {
  buildVoiceFailureSummary,
  getElevenLabsBrowserFailureMessage,
  serializeDisconnectDetails
} from "../../src/lib/agent/voiceSessionDiagnostics";

describe("voiceSessionDiagnostics", () => {
  it("maps browser transport failures into a concrete voice-sdk message", () => {
    expect(
      getElevenLabsBrowserFailureMessage("RTCErrorEvent: DataChannel closed unexpectedly")
    ).toBe(
      "The ElevenLabs browser voice client crashed while opening the live session. The backend session is up, but the SDK transport failed in the browser."
    );
  });

  it("prefers disconnect close details when summarizing a failed voice session", () => {
    const disconnectDetails = serializeDisconnectDetails({
      reason: "error",
      message: "Transport failed",
      context: { type: "close" } as Event,
      closeCode: 1006,
      closeReason: "abnormal closure"
    });

    expect(
      buildVoiceFailureSummary({
        disconnectDetails,
        errorMessage: "The ElevenLabs voice session opened, then disconnected before the voice client became ready."
      })
    ).toBe(
      "The ElevenLabs voice session disconnected (1006): abnormal closure."
    );
  });
});
