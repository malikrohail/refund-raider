import type {
  ActionPlanRecord,
  ActionRunKind,
  ActionRunRecord,
  ActionRunStatus,
  AutomationConfidence,
  CaseDetailPayload,
  CaseKind,
  CaseRecord,
  CaseResolution,
  ConsentState,
  DesiredOutcome,
  DraftTone,
  ExecutionChannel,
  FollowUpTaskRecord,
  IssueType,
  MerchantProfileRecord
} from "@/lib/contracts/domain";
import { ConflictError } from "@/server/errors";
import { refundRaiderRepository } from "@/server/repositories/refundRaiderRepository";
import { sendRefundEmail } from "@/server/providers/email";
import { buildRefundDraft } from "@/server/services/draftService";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function addDays(days: number) {
  return new Date(Date.now() + days * DAY_IN_MS).toISOString();
}

function preferredToneForCase(_caseRecord: CaseRecord): DraftTone {
  return "firm_polite";
}

function findSupportEmail(detail: CaseDetailPayload) {
  if (detail.case.merchantContactEmail) {
    return detail.case.merchantContactEmail;
  }

  if (detail.merchantProfile?.supportEmail) {
    return detail.merchantProfile.supportEmail;
  }

  for (const source of detail.policySources) {
    const supportEmail = source.normalizedFacts.supportEmail;
    if (typeof supportEmail === "string" && supportEmail.length > 0) {
      return supportEmail;
    }
  }

  return null;
}

function findSupportUrl(detail: CaseDetailPayload) {
  return (
    detail.policySources.find((source) => source.sourceType === "support_page")?.url ??
    detail.policySources.find((source) => source.url.startsWith("http"))?.url ??
    null
  );
}

function findManualPath(detail: CaseDetailPayload) {
  for (const source of detail.policySources) {
    const manualPath = source.normalizedFacts.manualPath;
    if (manualPath === "support_form" || manualPath === "in_app" || manualPath === "phone") {
      return manualPath;
    }
  }

  return null;
}

function inferMerchantHost(merchantUrl: string | null) {
  if (!merchantUrl) {
    return null;
  }

  try {
    return new URL(merchantUrl).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function resolutionFromOutcome(caseRecord: CaseRecord): CaseResolution {
  if (caseRecord.caseKind === "cancellation") {
    return "cancellation";
  }

  if (caseRecord.caseKind === "billing_fix") {
    return "billing_fix";
  }

  if (caseRecord.desiredOutcome === "replacement") {
    return "replacement";
  }

  return "refund";
}

export function deriveCaseKindFromInputs(
  issueType: IssueType,
  desiredOutcome: DesiredOutcome,
  issueSummary: string
): CaseKind {
  if (issueType === "subscription_cancellation") {
    return "cancellation";
  }

  if (desiredOutcome === "replacement") {
    return "replacement";
  }

  if (/\b(charge|charged|billing|renewal|invoice|double billed)\b/i.test(issueSummary)) {
    return "billing_fix";
  }

  if (issueType === "damaged_item" || issueType === "wrong_item") {
    return desiredOutcome === "refund_or_replacement" ? "replacement" : "refund";
  }

  return "refund";
}

function inferPrimaryChannel(detail: CaseDetailPayload): ExecutionChannel {
  if (findSupportEmail(detail)) {
    return "email";
  }

  return "ops_queue";
}

function inferFallbackChannel(detail: CaseDetailPayload, primaryChannel: ExecutionChannel) {
  if (detail.activeStrategy?.fallbackPath === "card_dispute") {
    return "manual" as const;
  }

  if (primaryChannel !== "ops_queue") {
    return "ops_queue" as const;
  }

  return null;
}

function inferAutomationConfidence(detail: CaseDetailPayload, primaryChannel: ExecutionChannel): AutomationConfidence {
  const supportEmail = findSupportEmail(detail);

  if (primaryChannel === "email" && supportEmail && detail.policySources.length >= 2) {
    return "high";
  }

  if (primaryChannel === "email") {
    return "medium";
  }

  return "low";
}

function requiresConsent(channel: ExecutionChannel) {
  return channel === "email";
}

function resolutionLabel(resolution: CaseResolution) {
  switch (resolution) {
    case "replacement":
      return "replacement";
    case "cancellation":
      return "cancellation";
    case "billing_fix":
      return "billing correction";
    case "manual_review":
      return "manual review";
    default:
      return "refund";
  }
}

function channelLabel(channel: ExecutionChannel) {
  switch (channel) {
    case "email":
      return "email";
    case "ops_queue":
      return "ops queue";
    case "support_form":
      return "support form";
    case "in_app":
      return "in-app flow";
    case "phone_prep":
      return "phone prep";
    case "portal":
      return "account portal";
    default:
      return "manual path";
  }
}

function buildPlanSummary(
  detail: CaseDetailPayload,
  resolution: CaseResolution,
  primaryChannel: ExecutionChannel
) {
  const merchantName = detail.case.merchantName;
  const resolutionText = resolutionLabel(resolution);
  const primaryChannelText = channelLabel(primaryChannel);

  if (primaryChannel === "email") {
    return `Use the evidence-backed email path to pursue a ${resolutionText} from ${merchantName}, then track for merchant response and escalate if the merchant stalls.`;
  }

  if (primaryChannel === "browser_runtime") {
    return `Browser automation is disabled in this build. Route the ${resolutionText} through the manual support path and track what happens next.`;
  }

  return `Route ${merchantName} through the ${primaryChannelText} fallback because the case needs a non-email execution path or lower-confidence handling.`;
}

function buildPrimaryActionInput(
  detail: CaseDetailPayload,
  planId: string,
  resolution: CaseResolution,
  primaryChannel: ExecutionChannel
) {
  const supportEmail = findSupportEmail(detail);
  const supportUrl = findSupportUrl(detail);
  const title =
    primaryChannel === "email"
      ? `Send the ${resolutionLabel(resolution)} request`
      : `Prepare the ${resolutionLabel(resolution)} support path`;
  const description =
    primaryChannel === "email"
      ? `Send the evidence-backed message to ${supportEmail ?? "the merchant support address"} and wait for a reply.`
      : `Prepare the non-email ${resolutionLabel(resolution)} path using ${supportUrl ?? "the detected merchant support flow"}.`;
  const actionKind: ActionRunKind =
    primaryChannel === "ops_queue"
      ? "ops_handoff"
      : resolution === "replacement"
        ? "request_replacement"
        : resolution === "cancellation"
      ? "request_cancellation"
      : "request_refund";

  return {
    caseId: detail.case.id,
    planId,
    actionKind,
    executionChannel: primaryChannel,
    status: "planned" as ActionRunStatus,
    title,
    description,
    requiresConsent: requiresConsent(primaryChannel),
    consentState: requiresConsent(primaryChannel) ? ("required" as ConsentState) : ("not_required" as ConsentState),
    details: {
      desiredOutcome: detail.case.desiredOutcome,
      supportEmail,
      supportUrl,
      merchantName: detail.case.merchantName,
      requestedResolution: resolution
    },
    errorMessage: null,
    completedAt: null
  };
}

function buildFallbackActionInput(
  detail: CaseDetailPayload,
  planId: string,
  fallbackChannel: ExecutionChannel | null
) {
  if (!fallbackChannel) {
    return null;
  }

  const actionKind: ActionRunKind = fallbackChannel === "manual" ? "prepare_chargeback" : "ops_handoff";

  return {
    caseId: detail.case.id,
    planId,
    actionKind,
    executionChannel: fallbackChannel,
    status: "planned" as ActionRunStatus,
    title:
      fallbackChannel === "manual"
        ? "Prepare the fallback escalation packet"
        : "Escalate through the ops fallback lane",
    description:
      fallbackChannel === "manual"
        ? "Collect the proof and policy excerpts needed for a manual escalation or chargeback."
        : "Queue the merchant-specific fallback path for manual handling.",
    requiresConsent: false,
    consentState: "not_required" as ConsentState,
    details: {
      fallbackPath: detail.activeStrategy?.fallbackPath ?? null
    },
    errorMessage: null,
    completedAt: null
  };
}

function buildFollowUpInputs(
  caseId: string,
  actionRuns: ActionRunRecord[],
  primaryChannel: ExecutionChannel
) {
  const primaryRun = actionRuns[0] ?? null;
  const dueAt = primaryChannel === "email" ? addDays(3) : addDays(1);

  return [
    {
      caseId,
      actionRunId: primaryRun?.id ?? null,
      title:
        primaryChannel === "email"
          ? "Check for a merchant response and send a follow-up if needed"
          : "Review the ops queue outcome and next escalation step",
      status: "scheduled" as const,
      dueAt,
      details: {
        source: "action_plan"
      },
      completedAt: null
    }
  ];
}

function buildMerchantProfileInput(detail: CaseDetailPayload, primaryChannel: ExecutionChannel) {
  const supportUrl = findSupportUrl(detail);
  return {
    caseId: detail.case.id,
    merchantHost: inferMerchantHost(detail.case.merchantUrl),
    supportEmail: findSupportEmail(detail),
    supportUrl,
    policyUrl: detail.policySources.find((source) => source.sourceType === "refund_policy")?.url ?? null,
    portalPath: findManualPath(detail),
    executionChannelPreference: primaryChannel,
    confidenceScore: detail.policySources[0]?.confidenceScore ?? null
  };
}

export async function createActionPlanForUser(userId: string, caseId: string) {
  const detail = await refundRaiderRepository.getCaseDetail(caseId, userId);

  if (!detail.activeStrategy) {
    throw new ConflictError("Generate strategy before building the action plan.");
  }

  const primaryChannel = inferPrimaryChannel(detail);
  const fallbackChannel = inferFallbackChannel(detail, primaryChannel);
  const automationConfidence = inferAutomationConfidence(detail, primaryChannel);
  const recommendedOutcome = resolutionFromOutcome(detail.case);

  const merchantProfile = await refundRaiderRepository.createOrReplaceMerchantProfile(
    caseId,
    buildMerchantProfileInput(detail, primaryChannel)
  );

  const plan = await refundRaiderRepository.createOrReplaceActionPlan(caseId, {
    caseId,
    status: primaryChannel === "ops_queue" ? "blocked" : "ready",
    summary: buildPlanSummary(detail, recommendedOutcome, primaryChannel),
    recommendedOutcome,
    primaryChannel,
    fallbackChannel,
    automationConfidence,
    requiresConsent: requiresConsent(primaryChannel),
    opsFallbackReason:
      primaryChannel === "ops_queue"
        ? "A non-email or lower-confidence merchant flow still needs manual handling."
        : null
  });

  const createdActionRuns = await refundRaiderRepository.replaceActionRuns(caseId, plan.id, [
    buildPrimaryActionInput(detail, plan.id, recommendedOutcome, primaryChannel),
    ...(() => {
      const fallback = buildFallbackActionInput(detail, plan.id, fallbackChannel);
      return fallback ? [fallback] : [];
    })()
  ]);

  const followUps = await refundRaiderRepository.replaceFollowUpTasks(
    caseId,
    buildFollowUpInputs(caseId, createdActionRuns, primaryChannel)
  );

  await refundRaiderRepository.updateCase(caseId, userId, {
    status: primaryChannel === "ops_queue" ? "needs_ops" : "action_ready",
    automationConfidence,
    consentState: requiresConsent(primaryChannel) ? "required" : "not_required",
    priority: automationConfidence === "low" ? "high" : detail.case.priority
  });

  await refundRaiderRepository.createAction({
    caseId,
    draftId: null,
    actionType: "action_plan_created",
    status: "completed",
    externalId: null,
    details: {
      planId: plan.id,
      primaryChannel,
      recommendedOutcome
    }
  });

  await refundRaiderRepository.createAction({
    caseId,
    draftId: null,
    actionType: "follow_up_scheduled",
    status: "completed",
    externalId: null,
    details: {
      followUpIds: followUps.map((followUp) => followUp.id)
    }
  });

  return {
    merchantProfile,
    plan,
    actionRuns: createdActionRuns,
    followUps
  };
}

export async function requestConsentForActionRunForUser(userId: string, actionRunId: string) {
  const actionRun = await refundRaiderRepository.getActionRun(actionRunId);
  await refundRaiderRepository.getCase(actionRun.caseId, userId);

  if (!actionRun.requiresConsent) {
    return {
      actionRun,
      approval: null
    };
  }

  const existing = await refundRaiderRepository.getApprovalGrantForActionRun(actionRunId);
  const requestedAt = existing?.requestedAt ?? new Date().toISOString();
  const approval = await refundRaiderRepository.upsertApprovalGrant({
    caseId: actionRun.caseId,
    actionRunId,
    scope: actionRun.executionChannel === "email" ? "send_message" : "execute_action",
    status: "pending",
    requestedAt,
    decidedAt: null,
    decisionNote: null
  });

  const updatedRun = await refundRaiderRepository.updateActionRun(actionRunId, {
    status: "waiting_for_consent",
    consentState: "requested"
  });

  await refundRaiderRepository.updateCase(actionRun.caseId, userId, {
    status: "needs_consent",
    consentState: "requested"
  });

  await refundRaiderRepository.createAction({
    caseId: actionRun.caseId,
    draftId: null,
    actionType: "consent_requested",
    status: "completed",
    externalId: null,
    details: {
      actionRunId
    }
  });

  return {
    actionRun: updatedRun,
    approval
  };
}

export async function approveActionRunForUser(userId: string, actionRunId: string, note?: string) {
  const actionRun = await refundRaiderRepository.getActionRun(actionRunId);
  const detail = await refundRaiderRepository.getCaseDetail(actionRun.caseId, userId);
  const existing = await refundRaiderRepository.getApprovalGrantForActionRun(actionRunId);
  const decidedAt = new Date().toISOString();

  const approval = await refundRaiderRepository.upsertApprovalGrant({
    caseId: actionRun.caseId,
    actionRunId,
    scope: actionRun.executionChannel === "email" ? "send_message" : "execute_action",
    status: "approved",
    requestedAt: existing?.requestedAt ?? decidedAt,
    decidedAt,
    decisionNote: note ?? null
  });

  const updatedRun = await refundRaiderRepository.updateActionRun(actionRunId, {
    status: "planned",
    consentState: "granted"
  });

  await refundRaiderRepository.updateCase(actionRun.caseId, userId, {
    status: "action_ready",
    consentState: "granted"
  });

  if (detail.activeDraft && detail.activeDraft.status === "draft" && actionRun.executionChannel === "email") {
    await refundRaiderRepository.updateDraft(detail.activeDraft.id, {
      status: "approved",
      approvedAt: decidedAt
    });

    await refundRaiderRepository.createAction({
      caseId: actionRun.caseId,
      draftId: detail.activeDraft.id,
      actionType: "draft_approved",
      status: "completed",
      externalId: null,
      details: {
        draftId: detail.activeDraft.id,
        source: "action_approval"
      }
    });
  }

  return {
    actionRun: updatedRun,
    approval
  };
}

async function ensureDraftForEmail(detail: CaseDetailPayload) {
  if (detail.activeDraft) {
    if (detail.activeDraft.status === "approved" || detail.activeDraft.status === "sent") {
      return detail.activeDraft;
    }

    const approvedDraft = await refundRaiderRepository.updateDraft(detail.activeDraft.id, {
      status: "approved",
      approvedAt: new Date().toISOString()
    });

    await refundRaiderRepository.createAction({
      caseId: detail.case.id,
      draftId: approvedDraft.id,
      actionType: "draft_approved",
      status: "completed",
      externalId: null,
      details: {
        draftId: approvedDraft.id,
        source: "auto_approval"
      }
    });

    return approvedDraft;
  }

  if (!detail.activeStrategy) {
    throw new ConflictError("Generate strategy before executing the email path.");
  }

  const tone = preferredToneForCase(detail.case);
  const generatedDraft = buildRefundDraft({
    caseRecord: detail.case,
    strategy: detail.activeStrategy,
    policySources: detail.policySources,
    artifacts: detail.artifacts,
    tone
  });

  const createdDraft = await refundRaiderRepository.createDraft({
    caseId: detail.case.id,
    strategyId: detail.activeStrategy.id,
    status: "approved",
    subject: generatedDraft.subject,
    body: generatedDraft.body,
    tone,
    approvedAt: new Date().toISOString(),
    sentAt: null
  });

  await refundRaiderRepository.createAction({
    caseId: detail.case.id,
    draftId: createdDraft.id,
    actionType: "draft_created",
    status: "completed",
    externalId: null,
    details: {
      draftId: createdDraft.id,
      source: "action_engine"
    }
  });

  await refundRaiderRepository.createAction({
    caseId: detail.case.id,
    draftId: createdDraft.id,
    actionType: "draft_approved",
    status: "completed",
    externalId: null,
    details: {
      draftId: createdDraft.id,
      source: "action_engine"
    }
  });

  return createdDraft;
}

export async function executeActionRunForUser(userId: string, userEmail: string, actionRunId: string) {
  const actionRun = await refundRaiderRepository.getActionRun(actionRunId);
  const detail = await refundRaiderRepository.getCaseDetail(actionRun.caseId, userId);

  if (actionRun.requiresConsent) {
    const approval = await refundRaiderRepository.getApprovalGrantForActionRun(actionRunId);
    if (approval?.status !== "approved") {
      return requestConsentForActionRunForUser(userId, actionRunId);
    }
  }

  await refundRaiderRepository.updateCase(actionRun.caseId, userId, {
    status: "executing"
  });

  const runningRun = await refundRaiderRepository.updateActionRun(actionRunId, {
    status: "running",
    consentState: actionRun.requiresConsent ? "granted" : "not_required"
  });

  if (runningRun.executionChannel === "email") {
    const supportEmail = findSupportEmail(detail);
    if (!supportEmail) {
      await refundRaiderRepository.updateActionRun(actionRunId, {
        status: "failed",
        errorMessage: "A merchant support email is still required before the email path can run."
      });
      throw new ConflictError("A merchant support email is still required before the email path can run.");
    }

    const draft = await ensureDraftForEmail(detail);
    const delivery = await sendRefundEmail({
      to: [supportEmail, userEmail],
      subject: draft.subject,
      text: draft.body,
      html: `<pre>${draft.body}</pre>`
    });

    await refundRaiderRepository.updateDraft(draft.id, {
      status: "sent",
      sentAt: new Date().toISOString()
    });

    const completedRun = await refundRaiderRepository.updateActionRun(actionRunId, {
      status: "completed",
      completedAt: new Date().toISOString(),
      errorMessage: null,
      details: {
        ...runningRun.details,
        sentTo: [supportEmail],
        externalId: delivery.externalId,
        provider: delivery.provider
      }
    });

    await refundRaiderRepository.updateCase(actionRun.caseId, userId, {
      status: "waiting",
      consentState: "granted"
    });

    await refundRaiderRepository.createAction({
      caseId: actionRun.caseId,
      draftId: draft.id,
      actionType: "action_run_completed",
      status: "completed",
      externalId: delivery.externalId,
      details: {
        actionRunId,
        executionChannel: "email"
      }
    });

    await refundRaiderRepository.createAction({
      caseId: actionRun.caseId,
      draftId: draft.id,
      actionType: "email_sent",
      status: "completed",
      externalId: delivery.externalId,
      details: {
        provider: delivery.provider,
        to: [supportEmail],
        ccUser: true
      }
    });

    const approval = await refundRaiderRepository.getApprovalGrantForActionRun(actionRunId);
    return {
      actionRun: completedRun,
      approval
    };
  }

  if (runningRun.executionChannel === "browser_runtime") {
    if (!detail.currentAutomationSession) {
      await refundRaiderRepository.updateActionRun(actionRunId, {
        status: "blocked",
        errorMessage: "Start a browser automation session before running this action."
      });
      throw new ConflictError("Start a browser automation session before running this action.");
    }

    const supportUrl = findSupportUrl(detail);
    const targetUrl = supportUrl ?? detail.case.merchantUrl ?? detail.currentAutomationSession.pageUrl;
    const command = await refundRaiderRepository.createBrowserCommand({
      automationSessionId: detail.currentAutomationSession.id,
      caseId: detail.case.id,
      actionType: targetUrl ? "navigate" : "extract",
      status: "pending",
      selector: null,
      textValue: null,
      targetUrl: targetUrl ?? null,
      waitForText: null,
      description:
        runningRun.actionKind === "request_cancellation"
          ? "Open the merchant cancellation or account page."
          : runningRun.actionKind === "request_replacement"
            ? "Open the merchant support flow for a replacement request."
            : "Open the merchant support or return flow for this case.",
      resultSummary: null,
      metadata: {
        actionRunId
      },
      completedAt: null
    });

    await refundRaiderRepository.createAutomationEvent({
      automationSessionId: detail.currentAutomationSession.id,
      caseId: detail.case.id,
      eventType: "command_queued",
      payload: {
        commandId: command.id,
        actionRunId
      }
    });

    await refundRaiderRepository.updateAutomationSession(detail.currentAutomationSession.id, {
      status: "executing"
    });

    await refundRaiderRepository.updateCase(actionRun.caseId, userId, {
      status: "executing",
      consentState: "granted"
    });

    return {
      actionRun: runningRun,
      approval: await refundRaiderRepository.getApprovalGrantForActionRun(actionRunId)
    };
  }

  const completedRun = await refundRaiderRepository.updateActionRun(actionRunId, {
    status: "completed",
    completedAt: new Date().toISOString(),
    errorMessage: null,
    details: {
      ...runningRun.details,
      handoff: true
    }
  });

  await refundRaiderRepository.updateCase(actionRun.caseId, userId, {
    status: "needs_ops",
    consentState: "not_required"
  });

  await refundRaiderRepository.createAction({
    caseId: actionRun.caseId,
    draftId: null,
    actionType: "ops_handoff",
    status: "completed",
    externalId: null,
    details: {
      actionRunId,
      executionChannel: runningRun.executionChannel
    }
  });

  return {
    actionRun: completedRun,
    approval: await refundRaiderRepository.getApprovalGrantForActionRun(actionRunId)
  };
}

export async function createFollowUpForUser(userId: string, caseId: string, title?: string, dueAt?: string) {
  const detail = await refundRaiderRepository.getCaseDetail(caseId, userId);
  const primaryRun = detail.actionRuns[0] ?? null;

  const followUp = await refundRaiderRepository.createFollowUpTask({
    caseId,
    actionRunId: primaryRun?.id ?? null,
    title: title ?? "Check for a merchant response and escalate if needed",
    status: "scheduled",
    dueAt: dueAt ?? addDays(3),
    details: {
      source: "manual_request"
    },
    completedAt: null
  });

  await refundRaiderRepository.createAction({
    caseId,
    draftId: null,
    actionType: "follow_up_scheduled",
    status: "completed",
    externalId: null,
    details: {
      followUpId: followUp.id
    }
  });

  return followUp;
}

export function buildActionPlanSnapshot(detail: CaseDetailPayload) {
  const primaryChannel = inferPrimaryChannel(detail);
  const fallbackChannel = inferFallbackChannel(detail, primaryChannel);
  const automationConfidence = inferAutomationConfidence(detail, primaryChannel);
  const recommendedOutcome = resolutionFromOutcome(detail.case);

  return {
    primaryChannel,
    fallbackChannel,
    automationConfidence,
    recommendedOutcome
  };
}
