import { ok } from "@/lib/api/response";
import { getSessionUser } from "@/server/auth/session";
import { handleRouteError } from "@/server/http/handleRouteError";
import { createActionPlanForUser } from "@/server/services/actionEngineService";
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
      merchantProfile: detail.merchantProfile,
      plan: detail.activeActionPlan,
      actionRuns: detail.actionRuns,
      approvals: detail.approvals,
      followUps: detail.followUps
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(_request: Request, context: RouteContext) {
  try {
    const params = await context.params;
    const user = await getSessionUser();
    const result = await createActionPlanForUser(user.id, params.caseId);

    return ok({
      merchantProfile: result.merchantProfile,
      plan: result.plan,
      actionRuns: result.actionRuns,
      followUps: result.followUps
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
