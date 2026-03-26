import type { ArtifactRecord } from "@/lib/contracts/domain";
import { refundRaiderRepository } from "@/server/repositories/refundRaiderRepository";
import { searchRefundEvidence } from "@/server/providers/firecrawl";

function extractReturnWindowDays(markdown: string) {
  const match = markdown.toLowerCase().match(/(\d{1,3})\s*-?\s*day/);
  return match ? Number(match[1]) : 30;
}

function extractManualPath(markdown: string) {
  const lower = markdown.toLowerCase();
  if (/(contact us|support form|submit a request|contact form)/.test(lower)) {
    return "support_form";
  }
  if (/(account portal|manage your subscription|account settings|cancel in app)/.test(lower)) {
    return "in_app";
  }
  if (/(call us|phone|speak to an agent)/.test(lower)) {
    return "phone";
  }

  return null;
}

function extractSupportEmail(markdown: string) {
  const match = markdown.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi);
  return match?.[0] ?? null;
}

function buildComplaintContextSources(
  artifacts: ArtifactRecord[],
  caseId: string,
  researchRunId: string
) {
  return artifacts
    .filter((artifact) => artifact.sourceText && artifact.sourceText.trim().length > 0)
    .map((artifact) => ({
      caseId,
      researchRunId,
      sourceType: "complaint_context" as const,
      url: `artifact://${artifact.id}`,
      title: artifact.fileName ?? artifact.kind.replaceAll("_", " "),
      quoteText: artifact.sourceText?.slice(0, 600) ?? null,
      normalizedFacts: {
        rawText: artifact.sourceText,
        returnWindowDays: extractReturnWindowDays(artifact.sourceText ?? ""),
        supportEmail: extractSupportEmail(artifact.sourceText ?? ""),
        manualPath: extractManualPath(artifact.sourceText ?? ""),
        artifactKind: artifact.kind
      },
      confidenceScore: 0.7
    }));
}

export async function runRefundResearch(caseId: string, userId: string) {
  const caseRecord = await refundRaiderRepository.getCase(caseId, userId);
  const artifacts = await refundRaiderRepository.listArtifacts(caseId);
  await refundRaiderRepository.updateCase(caseId, userId, { status: "researching" });

  const researchRun = await refundRaiderRepository.createResearchRun({
    caseId,
    status: "running",
    queryBundle: {},
    resultSummary: {},
    errorMessage: null,
    startedAt: new Date().toISOString(),
    completedAt: null
  });

  await refundRaiderRepository.createAction({
    caseId,
    draftId: null,
    actionType: "research_started",
    status: "completed",
    externalId: null,
    details: {
      researchRunId: researchRun.id
    }
  });

  try {
    const results = await searchRefundEvidence(
      caseRecord.merchantName,
      caseRecord.merchantUrl,
      caseRecord.issueSummary
    );
    const complaintContextSources = buildComplaintContextSources(artifacts, caseId, researchRun.id);

    const sources = await refundRaiderRepository.replacePolicySources(
      caseId,
      researchRun.id,
      [
        ...results.map((result) => ({
          caseId,
          researchRunId: researchRun.id,
          sourceType: result.sourceType,
          url: result.url,
          title: result.title,
          quoteText: result.markdown.slice(0, 600),
          normalizedFacts: {
            rawText: result.markdown,
            returnWindowDays: extractReturnWindowDays(result.markdown),
            supportEmail: result.supportEmail ?? null,
            manualPath: extractManualPath(result.markdown)
          },
          confidenceScore: result.confidenceScore
        })),
        ...complaintContextSources
      ]
    );

    await refundRaiderRepository.updateResearchRun(researchRun.id, {
      status: "completed",
      resultSummary: {
        sourceCount: sources.length
      },
      completedAt: new Date().toISOString()
    });

    await refundRaiderRepository.createAction({
      caseId,
      draftId: null,
      actionType: "research_completed",
      status: "completed",
      externalId: null,
      details: {
        researchRunId: researchRun.id,
        sourceCount: sources.length
      }
    });

    return {
      researchRunId: researchRun.id,
      status: "completed",
      sources
    };
  } catch (error) {
    await refundRaiderRepository.updateResearchRun(researchRun.id, {
      status: "failed",
      errorMessage: error instanceof Error ? error.message : "Unknown research failure",
      completedAt: new Date().toISOString()
    });

    throw error;
  }
}
