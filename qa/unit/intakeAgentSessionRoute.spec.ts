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

describe("/api/v1/agent/intake-session", () => {
  it("returns mock mode when ElevenLabs is not configured", async () => {
    delete process.env.ELEVENLABS_AGENT_ID;
    delete process.env.ELEVENLABS_INTAKE_AGENT_ID;
    delete process.env.ELEVENLABS_API_KEY;

    const { GET } = await import("../../app/api/v1/agent/intake-session/route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.agent).toEqual({
      agentId: "mock-agent",
      mode: "mock",
      preferredTransport: "websocket",
      configurationState: "mock",
      expectedToolNames: expect.any(Array),
      toolNames: [],
      missingToolNames: expect.any(Array)
    });
  });

  it("returns a signed url when ElevenLabs is configured", async () => {
    process.env.ELEVENLABS_INTAKE_AGENT_ID = "agent_live_123";
    process.env.ELEVENLABS_API_KEY = "elevenlabs_test_key";

    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes("/convai/agents/")) {
        return {
          ok: true,
          json: async () => ({
            conversation_config: {
              agent: {
                prompt: {
                  tool_ids: ["tool_1"]
                }
              }
            },
            workflow: {
              nodes: {}
            }
          })
        } as Response;
      }

      if (url.includes("/convai/tools")) {
        return {
          ok: true,
          json: async () => ({
            tools: [{ id: "tool_1", tool_config: { name: "get_intake_state" } }]
          })
        } as Response;
      }

      return {
        ok: true,
        json: async () => ({ signed_url: "https://signed.example/session" })
      } as Response;
    }));

    const { GET } = await import("../../app/api/v1/agent/intake-session/route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.agent.agentId).toBe("agent_live_123");
    expect(body.data.agent.mode).toBe("misconfigured");
    expect(body.data.agent.configurationState).toBe("missing_tools");
    expect(body.data.agent.signedUrl).toBeUndefined();
  });

  it("returns configured when the live intake agent has the expected tool surface", async () => {
    process.env.ELEVENLABS_INTAKE_AGENT_ID = "agent_live_123";
    process.env.ELEVENLABS_API_KEY = "elevenlabs_test_key";

    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes("/convai/agents/")) {
        return {
          ok: true,
          json: async () => ({
            conversation_config: {
              agent: {
                prompt: {
                  tool_ids: [
                    "tool_1",
                    "tool_2",
                    "tool_3",
                    "tool_4",
                    "tool_5",
                    "tool_6",
                    "tool_7"
                  ]
                }
              }
            },
            workflow: {
              nodes: {}
            }
          })
        } as Response;
      }

      if (url.includes("/convai/tools")) {
        return {
          ok: true,
          json: async () => ({
            tools: [
              { id: "tool_1", tool_config: { name: "get_intake_state" } },
              { id: "tool_2", tool_config: { name: "update_intake_fields" } },
              { id: "tool_3", tool_config: { name: "capture_user_problem" } },
              { id: "tool_4", tool_config: { name: "connect_gmail" } },
              { id: "tool_5", tool_config: { name: "search_gmail_messages" } },
              { id: "tool_6", tool_config: { name: "select_gmail_message" } },
              { id: "tool_7", tool_config: { name: "create_case" } }
            ]
          })
        } as Response;
      }

      return {
        ok: true,
        json: async () => ({ signed_url: "https://signed.example/session" })
      } as Response;
    }));

    const { GET } = await import("../../app/api/v1/agent/intake-session/route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.agent.mode).toBe("configured");
    expect(body.data.agent.preferredTransport).toBe("websocket");
    expect(body.data.agent.configurationState).toBe("live_ready");
    expect(body.data.agent.signedUrl).toBe("https://signed.example/session");
  });
});
