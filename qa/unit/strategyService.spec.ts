import { describe, expect, it } from "vitest";
import type { CaseRecord, PolicySourceRecord } from "../../src/lib/contracts/domain";
import { deriveRefundStrategy } from "../../src/server/services/strategyService";

function buildCase(overrides: Partial<CaseRecord> = {}): CaseRecord {
  return {
    id: "case_123",
    userId: "user_123",
    merchantName: "Best Buy",
    merchantUrl: "https://www.bestbuy.com",
    issueSummary: "The item arrived damaged and support has not replied.",
    issueType: "damaged_item",
    desiredOutcome: "full_refund",
    caseKind: "refund",
    purchaseDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    paymentMethod: "credit_card",
    status: "intake",
    automationConfidence: "medium",
    consentState: "required",
    priority: "normal",
    currency: "USD",
    orderTotalAmount: 119.99,
    merchantContactEmail: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides
  };
}

function buildSource(overrides: Partial<PolicySourceRecord> = {}): PolicySourceRecord {
  return {
    id: "source_123",
    caseId: "case_123",
    researchRunId: "research_123",
    sourceType: "refund_policy",
    url: "https://www.bestbuy.com/returns",
    title: "Returns policy",
    quoteText: "Returns accepted within 30 days for damaged items.",
    normalizedFacts: {
      returnWindowDays: 30,
      supportEmail: "support@bestbuy.com"
    },
    confidenceScore: 0.9,
    createdAt: new Date().toISOString(),
    ...overrides
  };
}

describe("deriveRefundStrategy", () => {
  it("marks a recent damaged-item case as likely eligible", () => {
    const strategy = deriveRefundStrategy(buildCase(), [buildSource()]);

    expect(strategy.eligibility).toBe("likely_eligible");
    expect(strategy.recommendedPath).toBe("support_email_first");
    expect(strategy.inferredMerchantContactEmail).toBe("support@bestbuy.com");
  });

  it("marks an out-of-window case as likely ineligible", () => {
    const strategy = deriveRefundStrategy(
      buildCase({
        purchaseDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
        issueType: "late_delivery"
      }),
      [buildSource()]
    );

    expect(strategy.eligibility).toBe("likely_ineligible");
  });

  it("downgrades to unclear when final sale appears in the evidence", () => {
    const strategy = deriveRefundStrategy(buildCase({ issueType: "other" }), [
      buildSource({
        quoteText: "Final sale items are not eligible for refunds."
      })
    ]);

    expect(strategy.eligibility).toBe("likely_ineligible");
  });

  it("chooses a non-email fallback path for subscription cancellations", () => {
    const strategy = deriveRefundStrategy(
      buildCase({
        issueType: "subscription_cancellation",
        paymentMethod: "shop_pay"
      }),
      [
        buildSource({
          quoteText: "Cancel any time from the account portal.",
          normalizedFacts: {
            rawText: "Cancel any time from the account portal."
          }
        })
      ]
    );

    expect(strategy.recommendedPath).toBe("support_form_first");
    expect(strategy.fallbackPath).toBe("manual_review");
  });
});
