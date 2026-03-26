import { ok } from "@/lib/api/response";
import { updateDraftSchema } from "@/lib/validation/schemas";
import { getSessionUser } from "@/server/auth/session";
import { handleRouteError } from "@/server/http/handleRouteError";
import { updateDraftForUser } from "@/server/services/casesService";

type RouteContext = {
  params: Promise<{ draftId: string }> | { draftId: string };
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const params = await context.params;
    const payload = updateDraftSchema.parse(await request.json());
    const user = await getSessionUser();
    const draft = await updateDraftForUser(user.id, params.draftId, payload);

    return ok({
      draft: {
        id: draft.id,
        subject: draft.subject,
        body: draft.body,
        tone: draft.tone,
        status: draft.status
      }
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
