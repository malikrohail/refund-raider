import { ok } from "@/lib/api/response";
import { handleRouteError } from "@/server/http/handleRouteError";
import { getAgentRuntime } from "@/server/services/elevenLabsAgentService";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const agentRuntime = await getAgentRuntime("intake");

    return ok({
      agent: {
        agentId: agentRuntime.agentId,
        mode: agentRuntime.mode,
        preferredTransport: agentRuntime.preferredTransport,
        configurationState: agentRuntime.configurationState,
        expectedToolNames: agentRuntime.expectedToolNames,
        toolNames: agentRuntime.toolNames,
        missingToolNames: agentRuntime.missingToolNames,
        ...(agentRuntime.conversationToken
          ? { conversationToken: agentRuntime.conversationToken }
          : {}),
        ...(agentRuntime.signedUrl ? { signedUrl: agentRuntime.signedUrl } : {})
      }
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
