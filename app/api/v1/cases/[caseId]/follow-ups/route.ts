import { ok } from "@/lib/api/response";
import { createFollowUpSchema } from "@/lib/validation/schemas";
import { getSessionUser } from "@/server/auth/session";
import { handleRouteError } from "@/server/http/handleRouteError";
import { createFollowUpForUser } from "@/server/services/actionEngineService";
import { getCaseDetailForUser } from "@/server/services/casesService";

type RouteContext = {
  params: Promise<{ caseId: string }> | { caseId: string };
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const params = await context.params;
    const user = await getSessionUser();
    const detail = await getCaseDetailForUser(user.id, params.caseId);

    return ok({
      followUps: detail.followUps
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const params = await context.params;
    const payload = createFollowUpSchema.parse(await request.json().catch(() => ({})));
    const user = await getSessionUser();
    const followUp = await createFollowUpForUser(user.id, params.caseId, payload.title, payload.dueAt);

    return ok(
      {
        followUp
      },
      201
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
