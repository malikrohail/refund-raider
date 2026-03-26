import { apiError } from "@/lib/api/response";
import { AppError } from "@/server/errors";

export function handleRouteError(error: unknown) {
  if (error instanceof AppError) {
    return apiError(error.statusCode, error.code, error.message, error.details);
  }

  if (error instanceof Error) {
    return apiError(500, "internal_error", error.message);
  }

  return apiError(500, "internal_error", "Unknown server error");
}
