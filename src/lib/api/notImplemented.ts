import { apiError } from "@/lib/api/response";

export function notImplemented(featureName: string) {
  return apiError(
    501,
    "not_implemented",
    `${featureName} is scaffolded but not implemented yet.`
  );
}
