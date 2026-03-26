import type { IntakeSuggestion } from "@/lib/contracts/api";
import type { BrowserUploadFile, IntakeFormState, IntakeSource, IntakeSubmitStage } from "@/lib/intake/types";

type FetchLike = typeof fetch;

export async function runCaseCreationWorkflow({
  form,
  suggestion,
  autopilotContext,
  file,
  intakeSource,
  setStage,
  fetchImpl = fetch
}: {
  form: IntakeFormState;
  suggestion: IntakeSuggestion | null;
  autopilotContext: string;
  file: BrowserUploadFile | null;
  intakeSource: IntakeSource;
  setStage?: (stage: IntakeSubmitStage) => void;
  fetchImpl?: FetchLike;
}) {
  setStage?.("creating");

  const createCaseResponse = await fetchImpl("/api/v1/cases", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      ...form,
      merchantUrl: form.merchantUrl || undefined,
      purchaseDate: form.purchaseDate || undefined,
      merchantContactEmail: form.merchantContactEmail || undefined
    })
  });

  const createCaseBody = await createCaseResponse.json();
  if (!createCaseResponse.ok) {
    throw new Error(createCaseBody.error?.message ?? "Failed to create case.");
  }

  const caseId = createCaseBody.data.case.id as string;

  if (autopilotContext.trim()) {
    setStage?.("saving_context");

    const artifactResponse = await fetchImpl(`/api/v1/cases/${caseId}/artifacts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        kind: suggestion?.artifactKind ?? "other",
        sourceText: autopilotContext.trim(),
        metadata: {
          confidence: suggestion?.confidence ?? "low",
          source: intakeSource,
          signals: suggestion?.signals ?? []
        }
      })
    });

    if (!artifactResponse.ok) {
      const artifactBody = await artifactResponse.json();
      throw new Error(artifactBody.error?.message ?? "Failed to save the intake context.");
    }
  }

  if (file) {
    setStage?.("saving_proof");

    const formData = new FormData();
    formData.append("kind", suggestion?.artifactKind === "order_email" ? "order_email" : "receipt");
    formData.append("file", new File([await file.arrayBuffer()], file.name, { type: file.type }));

    const artifactResponse = await fetchImpl(`/api/v1/cases/${caseId}/artifacts`, {
      method: "POST",
      body: formData
    });

    if (!artifactResponse.ok) {
      const artifactBody = await artifactResponse.json();
      throw new Error(artifactBody.error?.message ?? "Failed to upload proof.");
    }
  }

  setStage?.("researching");

  const researchResponse = await fetchImpl(`/api/v1/cases/${caseId}/research`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ forceRefresh: false })
  });

  if (!researchResponse.ok) {
    const researchBody = await researchResponse.json();
    throw new Error(researchBody.error?.message ?? "Failed to run research.");
  }

  const strategyResponse = await fetchImpl(`/api/v1/cases/${caseId}/strategy`, {
    method: "POST"
  });

  if (!strategyResponse.ok) {
    const strategyBody = await strategyResponse.json();
    throw new Error(strategyBody.error?.message ?? "Failed to generate strategy.");
  }

  setStage?.("drafting");

  const draftResponse = await fetchImpl(`/api/v1/cases/${caseId}/drafts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ tone: "firm_polite" })
  });

  if (!draftResponse.ok) {
    const draftBody = await draftResponse.json();
    throw new Error(draftBody.error?.message ?? "Failed to create draft.");
  }

  setStage?.("idle");

  return {
    caseId
  };
}
