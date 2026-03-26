import { describe, expect, it } from "vitest";
import type {
  ArtifactRecord,
  CaseRecord,
  PolicySourceRecord,
  RefundStrategyRecord
} from "../../src/lib/contracts/domain";
import { buildRefundDraft } from "../../src/server/services/draftService";

function buildCase(): CaseRecord {
  return {
    id: "case_123",
    userId: "user_123",
    merchantName: "Best Buy",
    merchantUrl: "https://www.bestbuy.com",
    issueSummary: "My headphones arrived damaged and support has not replied.",
    issueType: "damaged_item",
    desiredOutcome: "full_refund",
    caseKind: "refund",
    purchaseDate: "2026-03-18",
    paymentMethod: "credit_card",
    status: "draft_ready",
    automationConfidence: "medium",
    consentState: "required",
    priority: "normal",
    currency: "USD",
    orderTotalAmount: null,
    merchantContactEmail: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function buildStrategy(): RefundStrategyRecord {
  return {
    id: "strategy_123",
    caseId: "case_123",
    eligibility: "likely_eligible",
    recommendedPath: "support_email_first",
    fallbackPath: "card_dispute",
    deadlineAt: "2026-04-17T00:00:00.000Z",
    plainEnglishSummary:
      "You appear to be inside the 30-day window. The best first move is to contact merchant support with proof and ask for the refund directly.",
    reasoningNotes: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

describe("buildRefundDraft", () => {
  it("uses cleaned evidence snippets without obvious scraper junk", () => {
    const sources: PolicySourceRecord[] = [
      {
        id: "source_1",
        caseId: "case_123",
        researchRunId: "research_1",
        sourceType: "refund_policy",
        url: "https://example.com/returns",
        title: "Returns policy",
        quoteText:
          "Returns accepted within 30 days for damaged items. Contact support@example.com for help.",
        normalizedFacts: {},
        confidenceScore: 0.9,
        createdAt: new Date().toISOString()
      },
      {
        id: "source_2",
        caseId: "case_123",
        researchRunId: "research_1",
        sourceType: "support_page",
        url: "https://example.com/support",
        title: "Support page",
        quoteText: "Submit a request through the contact form if email is unavailable.",
        normalizedFacts: {},
        confidenceScore: 0.8,
        createdAt: new Date().toISOString()
      }
    ];

    const draft = buildRefundDraft({
      caseRecord: buildCase(),
      strategy: buildStrategy(),
      policySources: sources,
      artifacts: [],
      tone: "firm_polite"
    });

    expect(draft.body).toContain("Returns accepted within 30 days");
    expect(draft.body).not.toContain("Sponsored");
    expect(draft.body).not.toContain("None");
  });

  it("includes extracted proof snippets when artifacts contain text", () => {
    const artifacts: ArtifactRecord[] = [
      {
        id: "artifact_1",
        caseId: "case_123",
        kind: "receipt",
        fileName: "receipt.png",
        mimeType: "image/png",
        storagePath: "/tmp/receipt.png",
        sourceText: "Order #12345. Item received damaged with visible cracks on arrival.",
        metadata: {},
        createdAt: new Date().toISOString()
      }
    ];

    const draft = buildRefundDraft({
      caseRecord: buildCase(),
      strategy: buildStrategy(),
      policySources: [],
      artifacts,
      tone: "firm_polite"
    });

    expect(draft.body).toContain("Uploaded proof:");
    expect(draft.body).toContain("Order #12345");
  });
});
