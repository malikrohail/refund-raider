import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const originalEnv = { ...process.env };

beforeEach(() => {
  process.env = { ...originalEnv };
  vi.resetModules();
  vi.restoreAllMocks();
});

afterEach(() => {
  process.env = { ...originalEnv };
  vi.resetModules();
  vi.restoreAllMocks();
});

function buildAgentResponse(toolIds: string[]) {
  return {
    conversation_config: {
      agent: {
        prompt: {
          tool_ids: toolIds
        }
      }
    },
    workflow: {
      nodes: {}
    }
  };
}

const intakeTools = [
  { id: "tool_1", tool_config: { name: "get_intake_state" } },
  { id: "tool_2", tool_config: { name: "update_intake_fields" } },
  { id: "tool_3", tool_config: { name: "capture_user_problem" } },
  { id: "tool_4", tool_config: { name: "connect_gmail" } },
  { id: "tool_5", tool_config: { name: "search_gmail_messages" } },
  { id: "tool_6", tool_config: { name: "select_gmail_message" } },
  { id: "tool_7", tool_config: { name: "create_case" } }
];

describe("getAgentRuntime", () => {
  it("prefers websocket when a signed url is available", async () => {
    process.env.ELEVENLABS_INTAKE_AGENT_ID = "agent_live_123";
    process.env.ELEVENLABS_API_KEY = "elevenlabs_test_key";

    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes("/convai/agents/")) {
        return {
          ok: true,
          json: async () => buildAgentResponse(intakeTools.map((tool) => tool.id))
        } as Response;
      }

      if (url.includes("/convai/tools")) {
        return {
          ok: true,
          json: async () => ({ tools: intakeTools })
        } as Response;
      }

      if (url.includes("/conversation/get-signed-url")) {
        return {
          ok: true,
          json: async () => ({ signed_url: "https://signed.example/session" })
        } as Response;
      }

      return {
        ok: true,
        json: async () => ({ token: "conv_token" })
      } as Response;
    }));

    const { getAgentRuntime } = await import("../../src/server/services/elevenLabsAgentService");
    const runtime = await getAgentRuntime("intake");

    expect(runtime.mode).toBe("configured");
    expect(runtime.preferredTransport).toBe("websocket");
    expect(runtime.signedUrl).toBe("https://signed.example/session");
    expect(runtime.conversationToken).toBe("conv_token");
  });

  it("falls back to webrtc when only a conversation token is available", async () => {
    process.env.ELEVENLABS_INTAKE_AGENT_ID = "agent_live_123";
    process.env.ELEVENLABS_API_KEY = "elevenlabs_test_key";

    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes("/convai/agents/")) {
        return {
          ok: true,
          json: async () => buildAgentResponse(intakeTools.map((tool) => tool.id))
        } as Response;
      }

      if (url.includes("/convai/tools")) {
        return {
          ok: true,
          json: async () => ({ tools: intakeTools })
        } as Response;
      }

      if (url.includes("/conversation/get-signed-url")) {
        return {
          ok: false,
          json: async () => ({})
        } as Response;
      }

      return {
        ok: true,
        json: async () => ({ token: "conv_token" })
      } as Response;
    }));

    const { getAgentRuntime } = await import("../../src/server/services/elevenLabsAgentService");
    const runtime = await getAgentRuntime("intake");

    expect(runtime.mode).toBe("configured");
    expect(runtime.preferredTransport).toBe("webrtc");
    expect(runtime.signedUrl).toBeNull();
    expect(runtime.conversationToken).toBe("conv_token");
  });
});
