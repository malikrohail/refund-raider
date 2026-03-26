import { ok } from "@/lib/api/response";
import { getSessionUser } from "@/server/auth/session";
import { handleRouteError } from "@/server/http/handleRouteError";
import { approveDraftForUser } from "@/server/services/casesService";

type RouteContext = {
  params: Promise<{ draftId: string }> | { draftId: string };
};

export async function POST(_request: Request, context: RouteContext) {
  try {
    const params = await context.params;
    const user = await getSessionUser();
    const draft = await approveDraftForUser(user.id, params.draftId);

    return ok({
      draft: {
        id: draft.id,
        status: draft.status,
        approvedAt: draft.approvedAt
      }
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
