import { ok } from "@/lib/api/response";
import { getSessionUser } from "@/server/auth/session";
import { handleRouteError } from "@/server/http/handleRouteError";
import { claimNextBrowserCommandForUser } from "@/server/services/browserAutomationService";

type RouteContext = {
  params: Promise<{ sessionId: string }> | { sessionId: string };
};

async function handleNextCommand(context: RouteContext) {
  try {
    const params = await context.params;
    const user = await getSessionUser();
    const browserCommand = await claimNextBrowserCommandForUser(user.id, params.sessionId);

    return ok({
      browserCommand,
      command: browserCommand,
      nextCommand: browserCommand
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function GET(_request: Request, context: RouteContext) {
  return handleNextCommand(context);
}

export async function POST(_request: Request, context: RouteContext) {
  return handleNextCommand(context);
}
