import { rmSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import {
  approveDraftForUser,
  createArtifactForUser,
  createCaseForUser,
  createDraftForUser,
  createStrategyForUser,
  getCaseDetailForUser,
  sendDraftForUser,
  startResearchForUser
} from "../../src/server/services/casesService";
import { createActionPlanForUser } from "../../src/server/services/actionEngineService";

const userId = "test-user";
const email = "demo@refundraider.local";

beforeEach(() => {
  rmSync(path.join(process.cwd(), ".data"), { recursive: true, force: true });
});

describe("Refund Raider case lifecycle", () => {
  it("can complete the core refund workflow from case creation to send", async () => {
    const createdCase = await createCaseForUser(userId, email, {
      merchantName: "Best Buy",
      merchantUrl: "https://www.bestbuy.com",
      issueSummary: "My headphones arrived damaged and support has not replied.",
      issueType: "damaged_item",
      desiredOutcome: "full_refund",
      purchaseDate: "2026-03-18",
      paymentMethod: "credit_card"
    });

    await createArtifactForUser(userId, createdCase.id, {
      kind: "receipt",
      fileName: "receipt.txt",
      mimeType: "text/plain",
      storagePath: "/tmp/receipt.txt",
      sourceText: "Order #12345"
    });

    const research = await startResearchForUser(userId, createdCase.id);
    expect(research.status).toBe("completed");
    expect(research.sources.length).toBeGreaterThan(0);
    expect(research.sources.some((source) => source.sourceType === "complaint_context")).toBe(true);

    const strategy = await createStrategyForUser(userId, createdCase.id);
    expect(strategy.eligibility).toBe("likely_eligible");
    await createActionPlanForUser(userId, createdCase.id);

    const plannedDetail = await getCaseDetailForUser(userId, createdCase.id);
    expect(plannedDetail.activeActionPlan?.primaryChannel).toBe("email");
    expect(plannedDetail.actionRuns.length).toBeGreaterThan(0);
    expect(plannedDetail.followUps.length).toBeGreaterThan(0);

    const draft = await createDraftForUser(userId, createdCase.id, {
      tone: "firm_polite"
    });
    expect(draft.subject).toMatch(/refund/i);

    const approvedDraft = await approveDraftForUser(userId, draft.id);
    expect(approvedDraft.status).toBe("approved");

    const sendResult = await sendDraftForUser(
      userId,
      email,
      approvedDraft.id,
      ["support@bestbuy.com"],
      true
    );

    expect(sendResult.action.actionType).toBe("email_sent");

    const finalDetail = await getCaseDetailForUser(userId, createdCase.id);
    expect(finalDetail.case.status).toBe("waiting");
    expect(finalDetail.timeline.some((event) => event.actionType === "email_sent")).toBe(true);
  });

  it("keeps a non-email fallback path visible for subscription cancellations", async () => {
    const createdCase = await createCaseForUser(userId, email, {
      merchantName: "Spotify",
      merchantUrl: "https://www.spotify.com",
      issueSummary: "I canceled, but the billing kept going.",
      issueType: "subscription_cancellation",
      desiredOutcome: "full_refund",
      purchaseDate: "2026-03-18",
      paymentMethod: "shop_pay"
    });

    await createArtifactForUser(userId, createdCase.id, {
      kind: "order_email",
      fileName: "order-email.txt",
      mimeType: "text/plain",
      storagePath: "/tmp/order-email.txt",
      sourceText: "Subscription confirmation"
    });

    await startResearchForUser(userId, createdCase.id);
    const strategy = await createStrategyForUser(userId, createdCase.id);
    await createActionPlanForUser(userId, createdCase.id);
    const detail = await getCaseDetailForUser(userId, createdCase.id);

    expect(strategy.recommendedPath).toBe("support_form_first");
    expect(strategy.fallbackPath).toBe("manual_review");
    expect(detail.case.merchantContactEmail).toBe("support@spotify.com");
    expect(detail.activeActionPlan?.primaryChannel).toBe("email");
  });
});
