import { ok } from "@/lib/api/response";
import { sendDraftSchema } from "@/lib/validation/schemas";
import { getSessionUser } from "@/server/auth/session";
import { handleRouteError } from "@/server/http/handleRouteError";
import { sendDraftForUser } from "@/server/services/casesService";

type RouteContext = {
  params: Promise<{ draftId: string }> | { draftId: string };
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const params = await context.params;
    const payload = sendDraftSchema.parse(await request.json());
    const user = await getSessionUser();
    const result = await sendDraftForUser(
      user.id,
      user.email,
      params.draftId,
      payload.to,
      payload.ccUser ?? false
    );

    return ok({
      action: {
        id: result.action.id,
        actionType: result.action.actionType,
        status: result.action.status,
        createdAt: result.action.createdAt
      }
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
