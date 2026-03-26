import { ok } from "@/lib/api/response";
import { firecrawlExtractSchema } from "@/lib/validation/schemas";
import { handleRouteError } from "@/server/http/handleRouteError";
import { extractFirecrawlData } from "@/server/providers/firecrawl";

export async function POST(request: Request) {
  try {
    const payload = firecrawlExtractSchema.parse(await request.json());
    const result = await extractFirecrawlData(payload.urls, payload.prompt, payload.schema);

    return ok({
      result
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
