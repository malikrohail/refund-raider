import { ok } from "@/lib/api/response";
import { getSessionUser } from "@/server/auth/session";
import { handleRouteError } from "@/server/http/handleRouteError";
import { createStrategyForUser, getCaseDetailForUser } from "@/server/services/casesService";

type RouteContext = {
  params: Promise<{ caseId: string }> | { caseId: string };
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const params = await context.params;
    const user = await getSessionUser();
    const detail = await getCaseDetailForUser(user.id, params.caseId);

    return ok({
      strategy: detail.activeStrategy
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(_request: Request, context: RouteContext) {
  try {
    const params = await context.params;
    const user = await getSessionUser();
    const strategy = await createStrategyForUser(user.id, params.caseId);

    return ok({
      strategy: {
        id: strategy.id,
        eligibility: strategy.eligibility,
        recommendedPath: strategy.recommendedPath,
        fallbackPath: strategy.fallbackPath,
        deadlineAt: strategy.deadlineAt,
        plainEnglishSummary: strategy.plainEnglishSummary
      }
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
