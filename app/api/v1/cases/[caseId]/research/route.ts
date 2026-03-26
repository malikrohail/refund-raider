import { ok } from "@/lib/api/response";
import { startResearchSchema } from "@/lib/validation/schemas";
import { getSessionUser } from "@/server/auth/session";
import { handleRouteError } from "@/server/http/handleRouteError";
import { getCaseDetailForUser, startResearchForUser } from "@/server/services/casesService";

type RouteContext = {
  params: Promise<{ caseId: string }> | { caseId: string };
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const params = await context.params;
    const user = await getSessionUser();
    const detail = await getCaseDetailForUser(user.id, params.caseId);

    return ok({
      researchRun: detail.latestResearchRun,
      policySources: detail.policySources
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const params = await context.params;
    startResearchSchema.parse(await request.json().catch(() => ({})));
    const user = await getSessionUser();
    const result = await startResearchForUser(user.id, params.caseId);

    return ok({
      researchRun: {
        id: result.researchRunId,
        status: result.status
      }
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
