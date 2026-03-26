import { ok } from "@/lib/api/response";
import { getSessionUser } from "@/server/auth/session";
import { handleRouteError } from "@/server/http/handleRouteError";
import { approveActionRunForUser } from "@/server/services/actionEngineService";

type RouteContext = {
  params: Promise<{ actionId: string }> | { actionId: string };
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const params = await context.params;
    const payload = (await request.json().catch(() => ({}))) as { note?: string };
    const user = await getSessionUser();
    const result = await approveActionRunForUser(user.id, params.actionId, payload.note);

    return ok({
      actionRun: result.actionRun,
      approval: result.approval
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
