import { ok } from "@/lib/api/response";
import { handleRouteError } from "@/server/http/handleRouteError";
import { getFirecrawlCrawlStatus } from "@/server/providers/firecrawl";

type RouteContext = {
  params: Promise<{ crawlId: string }> | { crawlId: string };
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const params = await context.params;
    const crawlJob = await getFirecrawlCrawlStatus(params.crawlId);

    return ok({
      crawlJob
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
