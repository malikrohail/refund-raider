import { ok } from "@/lib/api/response";
import { browserExtensionHandshakeSchema } from "@/lib/validation/schemas";
import { getSessionUser } from "@/server/auth/session";
import { handleRouteError } from "@/server/http/handleRouteError";
import { handshakeAutomationSessionForUser } from "@/server/services/browserAutomationService";

type RouteContext = {
  params: Promise<{ sessionId: string }> | { sessionId: string };
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const params = await context.params;
    const payload = browserExtensionHandshakeSchema.parse(await request.json().catch(() => ({})));
    const user = await getSessionUser();
    const automationSession = await handshakeAutomationSessionForUser(user.id, params.sessionId, payload);

    return ok({
      automationSession
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
