import { ok } from "@/lib/api/response";
import { getSessionUser } from "@/server/auth/session";
import { handleRouteError } from "@/server/http/handleRouteError";
import { disconnectGmail, requireAuthenticatedUser } from "@/server/integrations/gmail";

export async function POST() {
  try {
    const user = await getSessionUser();
    requireAuthenticatedUser(user.mode);
    const removed = await disconnectGmail(user.id);

    return ok({
      gmail: removed ? { email: removed.email } : null
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
