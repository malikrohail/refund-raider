import { describe, expect, it, vi } from "vitest";
import { runCaseCreationWorkflow } from "../../src/lib/intake/runCaseCreationWorkflow";
import type { IntakeSuggestion } from "../../src/lib/contracts/api";

const baseForm = {
  merchantName: "Best Buy",
  merchantUrl: "https://www.bestbuy.com",
  issueSummary: "My headphones arrived cracked and I want a refund.",
  issueType: "damaged_item" as const,
  desiredOutcome: "full_refund" as const,
  purchaseDate: "2026-03-18",
  paymentMethod: "credit_card" as const,
  merchantContactEmail: "support@bestbuy.com"
};

const suggestion: IntakeSuggestion = {
  merchantName: "Best Buy",
  merchantUrl: "https://www.bestbuy.com",
  issueSummary: "My headphones arrived cracked and I want a refund.",
  issueType: "damaged_item",
  desiredOutcome: "full_refund",
  purchaseDate: "2026-03-18",
  paymentMethod: "credit_card",
  merchantContactEmail: "support@bestbuy.com",
  artifactKind: "order_email",
  confidence: "high",
  signals: ["Detected merchant name."]
};

function jsonResponse(body: unknown, ok: boolean = true) {
  return {
    ok,
    json: async () => body
  } as Response;
}

describe("runCaseCreationWorkflow", () => {
  it("runs the full create/save/research/strategy/draft sequence for context-first intake", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ data: { case: { id: "case_123" } } }))
      .mockResolvedValueOnce(jsonResponse({ data: { artifact: { id: "artifact_123" } } }))
      .mockResolvedValueOnce(jsonResponse({ data: { researchRun: { id: "research_123" } } }))
      .mockResolvedValueOnce(jsonResponse({ data: { strategy: { id: "strategy_123" } } }))
      .mockResolvedValueOnce(jsonResponse({ data: { draft: { id: "draft_123" } } }));

    const stages: string[] = [];
    const result = await runCaseCreationWorkflow({
      form: baseForm,
      suggestion,
      autopilotContext: "From: Best Buy Support <support@bestbuy.com>",
      file: null,
      intakeSource: "voice",
      setStage: (stage) => stages.push(stage),
      fetchImpl
    });

    expect(result.caseId).toBe("case_123");
    expect(stages).toEqual(["creating", "saving_context", "researching", "drafting", "idle"]);
    expect(fetchImpl).toHaveBeenCalledTimes(5);
    expect(fetchImpl).toHaveBeenNthCalledWith(
      2,
      "/api/v1/cases/case_123/artifacts",
      expect.objectContaining({
        method: "POST"
      })
    );
  });

  it("surfaces downstream workflow failures and keeps the failing stage visible to the caller", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ data: { case: { id: "case_456" } } }))
      .mockResolvedValueOnce(jsonResponse({ data: { artifact: { id: "artifact_456" } } }))
      .mockResolvedValueOnce(
        jsonResponse({ error: { message: "Research provider timed out." } }, false)
      );

    const stages: string[] = [];

    await expect(
      runCaseCreationWorkflow({
        form: baseForm,
        suggestion,
        autopilotContext: "From: Best Buy Support <support@bestbuy.com>",
        file: null,
        intakeSource: "voice",
        setStage: (stage) => stages.push(stage),
        fetchImpl
      })
    ).rejects.toThrow("Research provider timed out.");

    expect(stages).toEqual(["creating", "saving_context", "researching"]);
  });
});
