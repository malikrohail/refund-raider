import { ok } from "@/lib/api/response";
import { createArtifactJsonSchema } from "@/lib/validation/schemas";
import { getSessionUser } from "@/server/auth/session";
import { handleRouteError } from "@/server/http/handleRouteError";
import { createArtifactForUser, getCaseDetailForUser } from "@/server/services/casesService";
import { saveUploadedFile } from "@/server/storage/localUploads";

type RouteContext = {
  params: Promise<{ caseId: string }> | { caseId: string };
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const params = await context.params;
    const user = await getSessionUser();
    const detail = await getCaseDetailForUser(user.id, params.caseId);

    return ok({
      artifacts: detail.artifacts
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const params = await context.params;
    const user = await getSessionUser();

    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file");
      const kindValue = formData.get("kind");
      const kind = typeof kindValue === "string" ? kindValue : "other";

      if (!(file instanceof File)) {
        throw new Error("Multipart upload requires a file.");
      }

      const upload = await saveUploadedFile(params.caseId, file);
      const artifact = await createArtifactForUser(user.id, params.caseId, {
        kind: kind as "receipt" | "order_email" | "screenshot" | "product_photo" | "support_thread" | "other",
        fileName: file.name,
        mimeType: file.type,
        storagePath: upload.storagePath,
        sourceText: upload.sourceText ?? undefined,
        metadata: {
          size: file.size,
          extractedTextLength: upload.sourceText?.length ?? 0
        }
      });

      return ok(
        {
          artifact: {
            id: artifact.id,
            kind: artifact.kind
          }
        },
        201
      );
    }

    const payload = createArtifactJsonSchema.parse(await request.json());
    const artifact = await createArtifactForUser(user.id, params.caseId, payload);

    return ok(
      {
        artifact: {
          id: artifact.id,
          kind: artifact.kind
        }
      },
      201
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
