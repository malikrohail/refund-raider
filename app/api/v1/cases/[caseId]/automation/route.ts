import { ok } from "@/lib/api/response";
import { getSessionUser } from "@/server/auth/session";
import { handleRouteError } from "@/server/http/handleRouteError";
import {
  getAutomationWorkspaceForUser,
  openAutomationSessionForUser
} from "@/server/services/browserAutomationService";

type RouteContext = {
  params: Promise<{ caseId: string }> | { caseId: string };
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const params = await context.params;
    const user = await getSessionUser();
    const workspace = await getAutomationWorkspaceForUser(user.id, params.caseId);

    return ok(workspace);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(_request: Request, context: RouteContext) {
  try {
    const params = await context.params;
    const user = await getSessionUser();
    const result = await openAutomationSessionForUser(user.id, params.caseId);
    const workspace = await getAutomationWorkspaceForUser(user.id, params.caseId);

    return ok(
      {
        ...workspace,
        automationSession: result.automationSession
      },
      result.created ? 201 : 200
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
