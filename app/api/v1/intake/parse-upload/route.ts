import { ok } from "@/lib/api/response";
import { ValidationError } from "@/server/errors";
import { handleRouteError } from "@/server/http/handleRouteError";
import { parseIntakeRequest } from "@/server/services/intakeAutomationService";
import { extractTextFromFileBuffer } from "@/server/storage/documentTextExtraction";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const merchantUrlHintValue = formData.get("merchantUrlHint");
    const merchantUrlHint = typeof merchantUrlHintValue === "string" ? merchantUrlHintValue : "";

    if (!(file instanceof File)) {
      throw new ValidationError("A file is required.", { field: "file" });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const extractedText = await extractTextFromFileBuffer(file.name, file.type || null, buffer);
    if (!extractedText) {
      throw new ValidationError(
        "Refund Raider could not extract text from that file yet. Try a clearer screenshot, PDF, or paste the message directly.",
        { field: "file" }
      );
    }

    const suggestion = parseIntakeRequest({
      rawText: extractedText,
      merchantUrlHint
    });

    return ok({
      suggestion,
      extractedText
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
