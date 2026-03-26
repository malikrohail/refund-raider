import { ok } from "@/lib/api/response";
import { browserExtensionHandshakeSchema, browserSnapshotSchema } from "@/lib/validation/schemas";
import { getSessionUser } from "@/server/auth/session";
import { handleRouteError } from "@/server/http/handleRouteError";
import { attachBrowserToSessionForUser } from "@/server/services/browserAutomationService";

type RouteContext = {
  params: Promise<{ sessionId: string }> | { sessionId: string };
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const params = await context.params;
    const rawPayload = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const snapshot =
      rawPayload.snapshot && typeof rawPayload.snapshot === "object"
        ? browserSnapshotSchema.parse(rawPayload.snapshot)
        : null;
    const payload = browserExtensionHandshakeSchema.parse(rawPayload);
    const user = await getSessionUser();
    const automationSession = await attachBrowserToSessionForUser(user.id, params.sessionId, {
      ...payload,
      snapshot
    });

    return ok({
      automationSession
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
