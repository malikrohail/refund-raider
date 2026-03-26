import { ok } from "@/lib/api/response";
import { browserSnapshotSchema } from "@/lib/validation/schemas";
import { getSessionUser } from "@/server/auth/session";
import { handleRouteError } from "@/server/http/handleRouteError";
import {
  getAutomationSessionStateForUser,
  recordBrowserSnapshotForUser
} from "@/server/services/browserAutomationService";

type RouteContext = {
  params: Promise<{ sessionId: string }> | { sessionId: string };
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const params = await context.params;
    const user = await getSessionUser();
    const workspace = await getAutomationSessionStateForUser(user.id, params.sessionId);

    return ok({
      browserSnapshots: workspace.browserSnapshots
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const params = await context.params;
    const payload = browserSnapshotSchema.parse(await request.json().catch(() => ({})));
    const user = await getSessionUser();
    const snapshot = await recordBrowserSnapshotForUser(user.id, params.sessionId, payload);

    return ok(
      {
        snapshot
      },
      201
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
