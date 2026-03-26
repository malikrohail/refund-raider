import type {
  ArtifactRecord,
  CaseRecord,
  DraftTone,
  PolicySourceRecord,
  RefundStrategyRecord
} from "@/lib/contracts/domain";

function formatEvidenceList(policySources: PolicySourceRecord[]) {
  return policySources
    .slice(0, 3)
    .map((source) => {
      const quote = source.quoteText ?? source.title ?? source.url;
      return `- ${quote}`;
    })
    .join("\n");
}

function buildOpening(issueType: CaseRecord["issueType"]) {
  switch (issueType) {
    case "damaged_item":
      return "The item arrived damaged.";
    case "missing_item":
      return "Part of the order was missing.";
    case "wrong_item":
      return "I received the wrong item.";
    case "late_delivery":
      return "The order arrived later than promised.";
    case "service_not_rendered":
      return "The service I paid for was not delivered as expected.";
    case "subscription_cancellation":
      return "I am requesting a refund related to a cancellation issue.";
    case "other":
    default:
      return "I am requesting a refund for this order.";
  }
}

function formatProofList(artifacts: ArtifactRecord[]) {
  return artifacts
    .filter((artifact) => artifact.sourceText && artifact.sourceText.trim().length > 0)
    .slice(0, 2)
    .map((artifact) => {
      const label = artifact.fileName ?? artifact.kind.replaceAll("_", " ");
      const snippet = artifact.sourceText?.replace(/\s+/g, " ").trim().slice(0, 180) ?? "";
      return `- ${label}: ${snippet}`;
    })
    .join("\n");
}

export function buildRefundDraft(params: {
  caseRecord: CaseRecord;
  strategy: RefundStrategyRecord;
  policySources: PolicySourceRecord[];
  artifacts: ArtifactRecord[];
  tone: DraftTone;
}) {
  const { caseRecord, strategy, policySources, artifacts, tone } = params;
  const evidenceList = formatEvidenceList(policySources);
  const proofList = formatProofList(artifacts);
  const toneLine =
    tone === "escalation_ready"
      ? "I would appreciate a prompt resolution. If needed, I can escalate this with my payment provider."
      : tone === "neutral"
        ? "Please let me know the correct next step to resolve this."
        : "Please issue the refund at your earliest convenience.";

  const subject = `${caseRecord.desiredOutcome.replaceAll("_", " ")} request for ${caseRecord.merchantName}`;
  const body = [
    `Hello ${caseRecord.merchantName} support team,`,
    "",
    buildOpening(caseRecord.issueType),
    caseRecord.issueSummary,
    "",
    "Based on the published policy and support instructions I found, my request appears to fall within your stated rules.",
    strategy.plainEnglishSummary,
    "",
    "Supporting details:",
    evidenceList || "- Proof of purchase and issue details are attached.",
    ...(proofList ? ["", "Uploaded proof:", proofList] : []),
    "",
    toneLine,
    "",
    "Thank you,",
    "Refund Raider user"
  ].join("\n");

  return {
    subject,
    body
  };
}
