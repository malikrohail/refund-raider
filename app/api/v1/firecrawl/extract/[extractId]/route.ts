import { ok } from "@/lib/api/response";
import { handleRouteError } from "@/server/http/handleRouteError";
import { getFirecrawlExtractStatus } from "@/server/providers/firecrawl";

type RouteContext = {
  params: Promise<{ extractId: string }> | { extractId: string };
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const params = await context.params;
    const result = await getFirecrawlExtractStatus(params.extractId);

    return ok({
      result
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
