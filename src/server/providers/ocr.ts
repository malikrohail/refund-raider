import { env, getProviderRuntimeState, hasConfiguredOcrProvider, type ProviderRuntimeState } from "@/lib/config/env";

export interface OcrProviderState extends ProviderRuntimeState {
  provider: "ocr";
}

export function getOcrRuntimeState(): OcrProviderState {
  const base = getProviderRuntimeState("ocr", hasConfiguredOcrProvider());

  return {
    ...base,
    provider: "ocr",
    message: hasConfiguredOcrProvider()
      ? "Managed OCR is configured for screenshots and PDFs."
      : "Managed OCR is not configured. Text uploads still work, but hosted screenshot/PDF extraction is disabled."
  };
}

export function getMistralModelName() {
  return env.mistralApiKey ? "mistral-ocr-latest" : null;
}
