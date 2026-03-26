import { ok } from "@/lib/api/response";
import { createCaseSchema } from "@/lib/validation/schemas";
import { getSessionUser } from "@/server/auth/session";
import { handleRouteError } from "@/server/http/handleRouteError";
import { createCaseForUser } from "@/server/services/casesService";

export async function POST(request: Request) {
  try {
    const payload = createCaseSchema.parse(await request.json());
    const user = await getSessionUser();
    const createdCase = await createCaseForUser(user.id, user.email, payload);

    return ok(
      {
        case: {
          id: createdCase.id,
          status: createdCase.status,
          merchantName: createdCase.merchantName
        }
      },
      201
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
