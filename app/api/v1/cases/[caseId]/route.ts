import { ok } from "@/lib/api/response";
import { updateCaseWithContactSchema } from "@/lib/validation/schemas";
import { getSessionUser } from "@/server/auth/session";
import { handleRouteError } from "@/server/http/handleRouteError";
import { getCaseDetailForUser, updateCaseForUser } from "@/server/services/casesService";

type RouteContext = {
  params: Promise<{ caseId: string }> | { caseId: string };
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const params = await context.params;
    const user = await getSessionUser();
    const caseDetail = await getCaseDetailForUser(user.id, params.caseId);

    return ok({
      caseDetail
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const params = await context.params;
    const payload = updateCaseWithContactSchema.parse(await request.json());
    const user = await getSessionUser();
    const updatedCase = await updateCaseForUser(user.id, params.caseId, payload);

    return ok({
      case: updatedCase
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
