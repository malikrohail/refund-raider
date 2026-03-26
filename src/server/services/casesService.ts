import type {
  CreateArtifactRequest,
  CreateCaseRequest,
  CreateDraftRequest,
  UpdateCaseRequest,
  UpdateDraftRequest
} from "@/lib/contracts/api";
import { refundRaiderRepository } from "@/server/repositories/refundRaiderRepository";
import { BadRequestError, ConflictError, ValidationError } from "@/server/errors";
import { deriveCaseKindFromInputs } from "@/server/services/actionEngineService";
import { deriveRefundStrategy } from "@/server/services/strategyService";
import { buildRefundDraft } from "@/server/services/draftService";
import { runRefundResearch } from "@/server/services/researchService";
import { sendRefundEmail } from "@/server/providers/email";

function assertNonEmptyString(value: string | undefined, fieldName: string) {
  if (!value || value.trim().length === 0) {
    throw new ValidationError(`${fieldName} is required`, { field: fieldName });
  }
}

function extractLikelySupportEmail(sourceText: string | null) {
  if (!sourceText) {
    return null;
  }

  const matches = sourceText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [];
  const ranked = matches
    .map((email) => {
      const localPart = email.split("@")[0]?.toLowerCase() ?? "";
      let score = 0;

      if (/(support|help|returns?|care|service)/.test(localPart)) score += 5;
      if (/(no-?reply|do-?not-?reply)/.test(localPart)) score -= 5;

      return { email, score };
    })
    .sort((left, right) => right.score - left.score);

  return ranked[0] && ranked[0].score > 0 ? ranked[0].email : null;
}

export async function createCaseForUser(userId: string, email: string, payload: CreateCaseRequest) {
  assertNonEmptyString(payload.merchantName, "merchantName");
  assertNonEmptyString(payload.issueSummary, "issueSummary");

  await refundRaiderRepository.ensureProfile(userId, email);

  return refundRaiderRepository.createCase({
    userId,
    merchantName: payload.merchantName.trim(),
    merchantUrl: payload.merchantUrl?.trim() || null,
    issueSummary: payload.issueSummary.trim(),
    issueType: payload.issueType,
    desiredOutcome: payload.desiredOutcome,
    caseKind:
      payload.caseKind ??
      deriveCaseKindFromInputs(payload.issueType, payload.desiredOutcome, payload.issueSummary),
    purchaseDate: payload.purchaseDate || null,
    paymentMethod: payload.paymentMethod ?? "unknown",
    automationConfidence: "medium",
    consentState: "required",
    priority: "normal",
    merchantContactEmail: payload.merchantContactEmail?.trim() || null
  });
}

export async function updateCaseForUser(userId: string, caseId: string, payload: UpdateCaseRequest) {
  if (payload.merchantName !== undefined) {
    assertNonEmptyString(payload.merchantName, "merchantName");
  }

  if (payload.issueSummary !== undefined) {
    assertNonEmptyString(payload.issueSummary, "issueSummary");
  }

  return refundRaiderRepository.updateCase(caseId, userId, {
    ...(payload.merchantName !== undefined ? { merchantName: payload.merchantName.trim() } : {}),
    ...(payload.merchantUrl !== undefined ? { merchantUrl: payload.merchantUrl.trim() || null } : {}),
    ...(payload.issueSummary !== undefined ? { issueSummary: payload.issueSummary.trim() } : {}),
    ...(payload.issueType !== undefined ? { issueType: payload.issueType } : {}),
    ...(payload.desiredOutcome !== undefined ? { desiredOutcome: payload.desiredOutcome } : {}),
    ...(payload.purchaseDate !== undefined ? { purchaseDate: payload.purchaseDate || null } : {}),
    ...(payload.paymentMethod !== undefined ? { paymentMethod: payload.paymentMethod } : {}),
    ...(payload.merchantContactEmail !== undefined
      ? { merchantContactEmail: payload.merchantContactEmail.trim() || null }
      : {})
  });
}

export async function getCaseDetailForUser(userId: string, caseId: string) {
  return refundRaiderRepository.getCaseDetail(caseId, userId);
}

export async function createArtifactForUser(
  userId: string,
  caseId: string,
  payload: CreateArtifactRequest
) {
  const caseRecord = await refundRaiderRepository.getCase(caseId, userId);

  const artifact = await refundRaiderRepository.createArtifact({
    caseId: caseRecord.id,
    kind: payload.kind,
    fileName: payload.fileName ?? null,
    mimeType: payload.mimeType ?? null,
    storagePath: payload.storagePath ?? null,
    sourceText: payload.sourceText ?? null,
    metadata: payload.metadata ?? {}
  });

  if (!caseRecord.merchantContactEmail) {
    const supportEmail = extractLikelySupportEmail(payload.sourceText ?? null);
    if (supportEmail) {
      await refundRaiderRepository.setCaseContactEmail(caseRecord.id, userId, supportEmail);
    }
  }

  return artifact;
}

export async function startResearchForUser(userId: string, caseId: string) {
  return runRefundResearch(caseId, userId);
}

export async function createStrategyForUser(userId: string, caseId: string) {
  const detail = await refundRaiderRepository.getCaseDetail(caseId, userId);

  if (detail.policySources.length === 0) {
    throw new ConflictError("Research must complete before strategy generation.");
  }

  const derived = deriveRefundStrategy(detail.case, detail.policySources);

  const strategy = await refundRaiderRepository.createOrReplaceStrategy(caseId, {
    caseId,
    eligibility: derived.eligibility,
    recommendedPath: derived.recommendedPath,
    fallbackPath: derived.fallbackPath,
    deadlineAt: derived.deadlineAt,
    plainEnglishSummary: derived.plainEnglishSummary,
    reasoningNotes: derived.reasoningNotes
  });

  if (derived.inferredMerchantContactEmail) {
    await refundRaiderRepository.setCaseContactEmail(caseId, userId, derived.inferredMerchantContactEmail);
  }

  await refundRaiderRepository.updateCase(caseId, userId, {
    status: "verdict_ready",
    automationConfidence:
      derived.recommendedPath === "support_email_first" ? "medium" : detail.case.automationConfidence
  });

  await refundRaiderRepository.createAction({
    caseId,
    draftId: null,
    actionType: "strategy_created",
    status: "completed",
    externalId: null,
    details: {
      strategyId: strategy.id,
      eligibility: strategy.eligibility
    }
  });
  return strategy;
}

export async function createDraftForUser(
  userId: string,
  caseId: string,
  payload: CreateDraftRequest
) {
  const detail = await refundRaiderRepository.getCaseDetail(caseId, userId);

  if (!detail.activeStrategy) {
    throw new ConflictError("Generate strategy before creating a draft.");
  }

  const safeTone = payload.tone ?? "firm_polite";
  const { subject, body } = buildRefundDraft({
    caseRecord: detail.case,
    strategy: detail.activeStrategy,
    policySources: detail.policySources,
    artifacts: detail.artifacts,
    tone: safeTone
  });

  const draft = await refundRaiderRepository.createDraft({
    caseId,
    strategyId: detail.activeStrategy.id,
    status: "draft",
    subject,
    body,
    tone: safeTone,
    approvedAt: null,
    sentAt: null
  });

  await refundRaiderRepository.updateCase(caseId, userId, {
    status: "draft_ready"
  });

  await refundRaiderRepository.createAction({
    caseId,
    draftId: draft.id,
    actionType: "draft_created",
    status: "completed",
    externalId: null,
    details: {
      draftId: draft.id
    }
  });

  return draft;
}

export async function updateDraftForUser(userId: string, draftId: string, payload: UpdateDraftRequest) {
  const currentDraft = await refundRaiderRepository.getDraft(draftId);
  const databaseDraftOwner = await refundRaiderRepository.getCaseDetail(currentDraft.caseId, userId);
  const activeDraft = databaseDraftOwner.activeDraft;

  if (!activeDraft || activeDraft.id !== draftId) {
    throw new BadRequestError("Draft is not available for update.");
  }

  return refundRaiderRepository.updateDraft(draftId, {
    ...(payload.subject !== undefined ? { subject: payload.subject } : {}),
    ...(payload.body !== undefined ? { body: payload.body } : {}),
    ...(payload.tone !== undefined ? { tone: payload.tone } : {})
  });
}

export async function approveDraftForUser(userId: string, draftId: string) {
  const draft = await refundRaiderRepository.getDraft(draftId);
  await refundRaiderRepository.getCase(draft.caseId, userId);

  const updated = await refundRaiderRepository.updateDraft(draftId, {
    status: "approved",
    approvedAt: new Date().toISOString()
  });

  await refundRaiderRepository.createAction({
    caseId: updated.caseId,
    draftId: updated.id,
    actionType: "draft_approved",
    status: "completed",
    externalId: null,
    details: {
      draftId: updated.id
    }
  });

  return updated;
}

export async function sendDraftForUser(
  userId: string,
  userEmail: string,
  draftId: string,
  to: string[],
  ccUser: boolean
) {
  const draft = await refundRaiderRepository.getDraft(draftId);
  const caseRecord = await refundRaiderRepository.getCase(draft.caseId, userId);

  if (draft.status !== "approved") {
    throw new ConflictError("Draft must be approved before sending.");
  }

  if (to.length === 0) {
    throw new ValidationError("At least one support email is required.", { field: "to" });
  }

  const delivery = await sendRefundEmail({
    to: ccUser ? [...to, userEmail] : to,
    subject: draft.subject,
    text: draft.body,
    html: `<pre>${draft.body}</pre>`
  });

  const updatedDraft = await refundRaiderRepository.updateDraft(draftId, {
    status: "sent",
    sentAt: new Date().toISOString()
  });

  await refundRaiderRepository.updateCase(caseRecord.id, userId, {
    status: "waiting"
  });

  const action = await refundRaiderRepository.createAction({
    caseId: caseRecord.id,
    draftId: updatedDraft.id,
    actionType: "email_sent",
    status: "completed",
    externalId: delivery.externalId,
    details: {
      provider: delivery.provider,
      to,
      ccUser
    }
  });

  return {
    updatedDraft,
    action
  };
}
