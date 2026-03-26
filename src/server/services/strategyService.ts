import type { CaseRecord, PolicySourceRecord, RecommendedPath, RefundStrategyRecord } from "@/lib/contracts/domain";

function extractReturnWindowDays(sources: PolicySourceRecord[]) {
  for (const source of sources) {
    const deadline = source.normalizedFacts.returnWindowDays;
    if (typeof deadline === "number" && Number.isFinite(deadline)) {
      return deadline;
    }

    const text = `${source.quoteText ?? ""} ${source.normalizedFacts.rawText ?? ""}`.toLowerCase();
    const match = text.match(/(\d{1,3})\s*-?\s*day/);
    if (match) {
      return Number(match[1]);
    }
  }

  return 30;
}

function calculateDaysSincePurchase(purchaseDate: string | null) {
  if (!purchaseDate) {
    return null;
  }

  const purchase = new Date(purchaseDate);
  if (Number.isNaN(purchase.valueOf())) {
    return null;
  }

  const now = new Date();
  const milliseconds = now.getTime() - purchase.getTime();
  return Math.max(0, Math.floor(milliseconds / (1000 * 60 * 60 * 24)));
}

function findManualPath(sources: PolicySourceRecord[]) {
  for (const source of sources) {
    const manualPath = source.normalizedFacts.manualPath;
    if (
      manualPath === "support_form" ||
      manualPath === "in_app" ||
      manualPath === "phone"
    ) {
      return manualPath;
    }
  }

  return null;
}

function determineRecommendedPath(
  caseRecord: CaseRecord,
  policySources: PolicySourceRecord[]
): RecommendedPath {
  if (caseRecord.desiredOutcome === "replacement") {
    return "replacement_first";
  }

  const manualPath = findManualPath(policySources);
  if (manualPath === "support_form" || manualPath === "in_app") {
    return "support_form_first";
  }

  switch (caseRecord.issueType) {
    case "subscription_cancellation":
      return "support_form_first";
    default:
      return "support_email_first";
  }
}

function inferFallbackPath(paymentMethod: CaseRecord["paymentMethod"]): RecommendedPath | null {
  switch (paymentMethod) {
    case "credit_card":
    case "debit_card":
    case "paypal":
      return "card_dispute";
    default:
      return "manual_review";
  }
}

function inferMerchantSupportEmail(sources: PolicySourceRecord[]) {
  for (const source of sources) {
    const supportEmail = source.normalizedFacts.supportEmail;
    if (typeof supportEmail === "string" && supportEmail.length > 0) {
      return supportEmail;
    }
  }

  return null;
}

export function deriveRefundStrategy(
  caseRecord: CaseRecord,
  policySources: PolicySourceRecord[]
): Omit<RefundStrategyRecord, "id" | "createdAt" | "updatedAt"> & {
  inferredMerchantContactEmail: string | null;
} {
  const returnWindowDays = extractReturnWindowDays(policySources);
  const daysSincePurchase = calculateDaysSincePurchase(caseRecord.purchaseDate);
  const fallbackPath = inferFallbackPath(caseRecord.paymentMethod);
  const recommendedPath = determineRecommendedPath(caseRecord, policySources);
  const inferredMerchantContactEmail = inferMerchantSupportEmail(policySources);

  let eligibility: RefundStrategyRecord["eligibility"] = "unclear";
  let plainEnglishSummary = "The available evidence is mixed, so a manual review is recommended.";

  if (daysSincePurchase !== null && daysSincePurchase <= returnWindowDays) {
    eligibility = "likely_eligible";
    plainEnglishSummary = `You appear to be inside the ${returnWindowDays}-day window. The best first move is to contact merchant support with proof and ask for the refund directly.`;
  } else if (caseRecord.issueType === "damaged_item" || caseRecord.issueType === "wrong_item") {
    eligibility = "likely_eligible";
    plainEnglishSummary =
      "Damaged or incorrect items are usually eligible for a refund or replacement when you include order proof and photos of the problem.";
  } else if (daysSincePurchase !== null && daysSincePurchase > returnWindowDays) {
    eligibility = "likely_ineligible";
    plainEnglishSummary = `You appear to be outside the merchant's ${returnWindowDays}-day return window. A goodwill request may still work, but you should prepare a fallback.`;
  }

  if (policySources.some((source) => (source.quoteText ?? "").toLowerCase().includes("final sale"))) {
    eligibility = caseRecord.issueType === "damaged_item" ? "unclear" : "likely_ineligible";
    plainEnglishSummary =
      "The merchant appears to mark this category as final sale. If the item arrived damaged or defective, you may still have a warranty-style path.";
  }

  const deadlineAt =
    caseRecord.purchaseDate && daysSincePurchase !== null
      ? new Date(
          new Date(caseRecord.purchaseDate).getTime() + returnWindowDays * 24 * 60 * 60 * 1000
        ).toISOString()
      : null;

  return {
    caseId: caseRecord.id,
    eligibility,
    recommendedPath,
    fallbackPath,
    deadlineAt,
    plainEnglishSummary,
    reasoningNotes: {
      returnWindowDays,
      daysSincePurchase,
      evidenceSourceIds: policySources.map((source) => source.id)
    },
    inferredMerchantContactEmail
  };
}
