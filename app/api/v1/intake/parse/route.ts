import { ok } from "@/lib/api/response";
import { parseIntakeSchema } from "@/lib/validation/schemas";
import { handleRouteError } from "@/server/http/handleRouteError";
import { parseIntakeRequest } from "@/server/services/intakeAutomationService";

export async function POST(request: Request) {
  try {
    const payload = parseIntakeSchema.parse(await request.json());
    const suggestion = parseIntakeRequest(payload);

    return ok({
      suggestion
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
