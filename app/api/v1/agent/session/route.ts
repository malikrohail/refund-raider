import { ok } from "@/lib/api/response";
import { createAgentSessionSchema } from "@/lib/validation/schemas";
import { getSessionUser } from "@/server/auth/session";
import { handleRouteError } from "@/server/http/handleRouteError";
import { getCaseDetailForUser } from "@/server/services/casesService";
import { getAgentRuntime } from "@/server/services/elevenLabsAgentService";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const payload = createAgentSessionSchema.parse(await request.json());
    const user = await getSessionUser();
    const detail = await getCaseDetailForUser(user.id, payload.caseId);
    const agentRuntime = await getAgentRuntime("case");

    return ok({
      agent: {
        agentId: agentRuntime.agentId,
        caseId: payload.caseId,
        mode: agentRuntime.mode,
        preferredTransport: agentRuntime.preferredTransport,
        configurationState: agentRuntime.configurationState,
        expectedToolNames: agentRuntime.expectedToolNames,
        toolNames: agentRuntime.toolNames,
        missingToolNames: agentRuntime.missingToolNames,
        ...(agentRuntime.conversationToken
          ? { conversationToken: agentRuntime.conversationToken }
          : {}),
        ...(agentRuntime.signedUrl ? { signedUrl: agentRuntime.signedUrl } : {}),
        variables: {
          merchantName: detail.case.merchantName,
          caseStatus: detail.case.status
        }
      }
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
