import { ok } from "@/lib/api/response";
import { getSessionUser } from "@/server/auth/session";
import { handleRouteError } from "@/server/http/handleRouteError";
import { getGmailConnectionStatus } from "@/server/integrations/gmail";

export async function GET() {
  try {
    const user = await getSessionUser();
    const status = user.mode === "authenticated"
      ? await getGmailConnectionStatus(user.id)
      : { available: false, connected: false, email: null };

    return ok({
      gmail: {
        ...status,
        requiresAuth: user.mode !== "authenticated"
      }
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
