import { ok } from "@/lib/api/response";
import { z } from "zod";
import { getSessionUser } from "@/server/auth/session";
import { handleRouteError } from "@/server/http/handleRouteError";
import { requireAuthenticatedUser, searchGmailMessages } from "@/server/integrations/gmail";

const gmailSearchSchema = z.object({
  query: z.string().min(1)
});

export async function POST(request: Request) {
  try {
    const payload = gmailSearchSchema.parse(await request.json());
    const user = await getSessionUser();
    requireAuthenticatedUser(user.mode);

    const messages = await searchGmailMessages({
      userId: user.id,
      query: payload.query
    });

    return ok({
      messages
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
