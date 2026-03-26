import { ok } from "@/lib/api/response";
import { completeBrowserCommandSchema } from "@/lib/validation/schemas";
import { getSessionUser } from "@/server/auth/session";
import { handleRouteError } from "@/server/http/handleRouteError";
import { completeBrowserCommandForUser } from "@/server/services/browserAutomationService";

type RouteContext = {
  params: Promise<{ commandId: string }> | { commandId: string };
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const params = await context.params;
    const payload = completeBrowserCommandSchema.parse(await request.json().catch(() => ({})));
    const user = await getSessionUser();
    const browserCommand = await completeBrowserCommandForUser(user.id, params.commandId, payload);

    return ok({
      browserCommand
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
