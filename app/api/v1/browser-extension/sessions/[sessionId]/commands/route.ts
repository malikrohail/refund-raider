import { ok } from "@/lib/api/response";
import { queueBrowserCommandSchema } from "@/lib/validation/schemas";
import { getSessionUser } from "@/server/auth/session";
import { handleRouteError } from "@/server/http/handleRouteError";
import {
  getAutomationSessionStateForUser,
  queueBrowserCommandForUser
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
      browserCommands: workspace.browserCommands
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const params = await context.params;
    const payload = queueBrowserCommandSchema.parse(await request.json().catch(() => ({})));
    const user = await getSessionUser();
    const browserCommand = await queueBrowserCommandForUser(user.id, params.sessionId, payload);

    return ok(
      {
        browserCommand
      },
      201
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
