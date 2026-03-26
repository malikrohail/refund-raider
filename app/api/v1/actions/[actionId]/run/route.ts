import { ok } from "@/lib/api/response";
import { getSessionUser } from "@/server/auth/session";
import { handleRouteError } from "@/server/http/handleRouteError";
import { executeActionRunForUser } from "@/server/services/actionEngineService";

type RouteContext = {
  params: Promise<{ actionId: string }> | { actionId: string };
};

export async function POST(_request: Request, context: RouteContext) {
  try {
    const params = await context.params;
    const user = await getSessionUser();
    const result = await executeActionRunForUser(user.id, user.email, params.actionId);

    return ok({
      actionRun: result.actionRun,
      approval: result.approval
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
