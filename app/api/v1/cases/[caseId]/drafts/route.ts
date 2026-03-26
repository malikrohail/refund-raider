import { ok } from "@/lib/api/response";
import { createDraftSchema } from "@/lib/validation/schemas";
import { getSessionUser } from "@/server/auth/session";
import { handleRouteError } from "@/server/http/handleRouteError";
import { createDraftForUser } from "@/server/services/casesService";

type RouteContext = {
  params: Promise<{ caseId: string }> | { caseId: string };
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const params = await context.params;
    const payload = createDraftSchema.parse(await request.json().catch(() => ({})));
    const user = await getSessionUser();
    const draft = await createDraftForUser(user.id, params.caseId, payload);

    return ok(
      {
        draft: {
          id: draft.id,
          subject: draft.subject,
          body: draft.body,
          status: draft.status
        }
      },
      201
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
