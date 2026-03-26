import { ok } from "@/lib/api/response";
import { firecrawlStartCrawlSchema } from "@/lib/validation/schemas";
import { handleRouteError } from "@/server/http/handleRouteError";
import { startFirecrawlCrawl } from "@/server/providers/firecrawl";

export async function POST(request: Request) {
  try {
    const payload = firecrawlStartCrawlSchema.parse(await request.json());
    const crawlJob = await startFirecrawlCrawl(payload.url, payload.limit ?? 3, payload.prompt);

    return ok(
      {
        crawlJob
      },
      201
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
