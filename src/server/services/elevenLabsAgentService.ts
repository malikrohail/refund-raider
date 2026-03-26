import manifest from "../../../workflow/refundRaiderToolManifest.json";
import { env, getElevenLabsAgentId } from "@/lib/config/env";
import type { VoiceTransportPreference } from "@/lib/agent/voiceSessionBootstrap";

type AgentKind = "intake" | "case";

type ElevenLabsTool = {
  id: string;
  tool_config?: {
    name?: string;
  };
};

type ElevenLabsAgent = {
  agent_id?: string;
  name?: string;
  workflow?: {
    nodes?: Record<string, unknown>;
  };
  conversation_config?: {
    agent?: {
      prompt?: {
        prompt?: string;
        tool_ids?: string[];
      };
    };
  };
};

function expectedToolNames(kind: AgentKind) {
  return kind === "intake"
    ? [...manifest.intakeToolNames]
    : [...manifest.caseToolNames, ...manifest.browserToolNames];
}

function getPreferredTransport({
  signedUrl,
  conversationToken
}: {
  signedUrl: string | null;
  conversationToken: string | null;
}): VoiceTransportPreference {
  if (signedUrl) {
    return "websocket";
  }

  if (conversationToken) {
    return "webrtc";
  }

  return "websocket";
}

async function listTools(apiKey: string) {
  const response = await fetch("https://api.elevenlabs.io/v1/convai/tools?page_size=100", {
    headers: {
      "xi-api-key": apiKey
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ElevenLabs tools: ${response.status}`);
  }

  const body = (await response.json()) as { tools?: ElevenLabsTool[] };
  return body.tools ?? [];
}

async function getAgent(apiKey: string, agentId: string) {
  const response = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${agentId}`, {
    headers: {
      "xi-api-key": apiKey
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ElevenLabs agent: ${response.status}`);
  }

  return (await response.json()) as ElevenLabsAgent;
}

async function getSignedUrl(apiKey: string, agentId: string) {
  const response = await fetch(
    `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${agentId}`,
    {
      headers: {
        "xi-api-key": apiKey
      }
    }
  );

  if (!response.ok) {
    return null;
  }

  const body = (await response.json()) as { signed_url?: string };
  return body.signed_url ?? null;
}

async function getConversationToken(apiKey: string, agentId: string) {
  const response = await fetch(
    `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${agentId}`,
    {
      headers: {
        "xi-api-key": apiKey
      }
    }
  );

  if (!response.ok) {
    return null;
  }

  const body = (await response.json()) as { token?: string };
  return body.token ?? null;
}

export async function getAgentRuntime(kind: AgentKind) {
  const agentId = getElevenLabsAgentId(kind);
  const apiKey = env.elevenLabsApiKey;

  if (!agentId) {
    return {
      agentId: "mock-agent",
      mode: "mock" as const,
      preferredTransport: "websocket" as const,
      configurationState: "mock" as const,
      signedUrl: undefined,
      conversationToken: undefined,
      expectedToolNames: expectedToolNames(kind),
      toolNames: [],
      missingToolNames: expectedToolNames(kind),
      workflowNodeCount: 0
    };
  }

  if (!apiKey) {
    return {
      agentId,
      mode: "misconfigured" as const,
      preferredTransport: "websocket" as const,
      configurationState: "missing_credentials" as const,
      signedUrl: undefined,
      conversationToken: undefined,
      expectedToolNames: expectedToolNames(kind),
      toolNames: [],
      missingToolNames: expectedToolNames(kind),
      workflowNodeCount: 0
    };
  }

  try {
    const [agent, tools] = await Promise.all([getAgent(apiKey, agentId), listTools(apiKey)]);
    const attachedToolIds = agent.conversation_config?.agent?.prompt?.tool_ids ?? [];
    const attachedNames = tools
      .filter((tool) => attachedToolIds.includes(tool.id))
      .map((tool) => tool.tool_config?.name)
      .filter((name): name is string => Boolean(name));
    const expectedNames = expectedToolNames(kind);
    const missingToolNames = expectedNames.filter((toolName) => !attachedNames.includes(toolName));

    if (missingToolNames.length > 0) {
      return {
        agentId,
        mode: "misconfigured" as const,
        preferredTransport: "websocket" as const,
        configurationState: "missing_tools" as const,
        signedUrl: undefined,
        conversationToken: undefined,
        expectedToolNames: expectedNames,
        toolNames: attachedNames,
        missingToolNames,
        workflowNodeCount: Object.keys(agent.workflow?.nodes ?? {}).length
      };
    }

    const [signedUrl, conversationToken] = await Promise.all([
      getSignedUrl(apiKey, agentId),
      getConversationToken(apiKey, agentId)
    ]);

    return {
      agentId,
      mode: "configured" as const,
      preferredTransport: getPreferredTransport({ signedUrl, conversationToken }),
      configurationState: "live_ready" as const,
      signedUrl,
      conversationToken,
      expectedToolNames: expectedNames,
      toolNames: attachedNames,
      missingToolNames: [],
      workflowNodeCount: Object.keys(agent.workflow?.nodes ?? {}).length
    };
  } catch {
    return {
      agentId,
      mode: "misconfigured" as const,
      preferredTransport: "websocket" as const,
      configurationState: "inspect_failed" as const,
      signedUrl: undefined,
      conversationToken: undefined,
      expectedToolNames: expectedToolNames(kind),
      toolNames: [],
      missingToolNames: expectedToolNames(kind),
      workflowNodeCount: 0
    };
  }
}
