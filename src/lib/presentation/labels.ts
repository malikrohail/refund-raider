import type {
  ActionType,
  ActionRunKind,
  ActionRunStatus,
  ArtifactKind,
  AutomationEventType,
  AutomationSessionStatus,
  BrowserActionType,
  BrowserCommandStatus,
  CaseKind,
  CaseStatus,
  DesiredOutcome,
  ExecutionChannel,
  FollowUpStatus,
  IssueType,
  PaymentMethod,
  PolicySourceType,
  RecommendedPath,
  StrategyEligibility
} from "@/lib/contracts/domain";

function titleCaseWords(value: string) {
  return value.replace(/\b\w/g, (character) => character.toUpperCase());
}

export function humanizeSnakeCase(value: string) {
  return titleCaseWords(value.replace(/_/g, " "));
}

export function formatIssueTypeLabel(value: IssueType) {
  switch (value) {
    case "damaged_item":
      return "Damaged item";
    case "missing_item":
      return "Missing item";
    case "wrong_item":
      return "Wrong item";
    case "late_delivery":
      return "Late delivery";
    case "service_not_rendered":
      return "Service not rendered";
    case "subscription_cancellation":
      return "Subscription cancellation";
    default:
      return "Other";
  }
}

export function formatDesiredOutcomeLabel(value: DesiredOutcome) {
  switch (value) {
    case "full_refund":
      return "Full refund";
    case "partial_refund":
      return "Partial refund";
    case "replacement":
      return "Replacement";
    case "refund_or_replacement":
      return "Refund or replacement";
  }
}

export function formatPaymentMethodLabel(value: PaymentMethod) {
  switch (value) {
    case "credit_card":
      return "Credit card";
    case "debit_card":
      return "Debit card";
    case "paypal":
      return "PayPal";
    case "apple_pay":
      return "Apple Pay";
    case "shop_pay":
      return "Shop Pay";
    case "other":
      return "Other";
    default:
      return "Unknown";
  }
}

export function formatCaseStatusLabel(value: CaseStatus) {
  switch (value) {
    case "verdict_ready":
      return "Verdict ready";
    case "action_ready":
      return "Action ready";
    case "draft_ready":
      return "Draft ready";
    case "needs_consent":
      return "Needs consent";
    case "needs_ops":
      return "Needs ops";
    case "follow_up_needed":
      return "Follow-up needed";
    default:
      return humanizeSnakeCase(value);
  }
}

export function formatCaseKindLabel(value: CaseKind) {
  switch (value) {
    case "billing_fix":
      return "Billing fix";
    default:
      return humanizeSnakeCase(value);
  }
}

export function formatEligibilityLabel(value: StrategyEligibility) {
  switch (value) {
    case "likely_eligible":
      return "Likely eligible";
    case "likely_ineligible":
      return "Likely ineligible";
    default:
      return humanizeSnakeCase(value);
  }
}

export function formatRecommendedPathLabel(value: RecommendedPath) {
  switch (value) {
    case "support_email_first":
      return "Email support first";
    case "support_form_first":
      return "Use the support form first";
    case "replacement_first":
      return "Request a replacement first";
    case "card_dispute":
      return "Prepare a card dispute fallback";
    case "manual_review":
      return "Manual fallback review";
  }
}

export function formatPolicySourceTypeLabel(value: PolicySourceType) {
  switch (value) {
    case "refund_policy":
      return "Refund policy";
    case "warranty_policy":
      return "Warranty policy";
    case "support_page":
      return "Support page";
    case "complaint_context":
      return "Uploaded proof";
    case "faq":
      return "FAQ";
    default:
      return "Other source";
  }
}

export function formatArtifactKindLabel(value: ArtifactKind) {
  switch (value) {
    case "order_email":
      return "Order email";
    case "support_thread":
      return "Support thread";
    case "product_photo":
      return "Product photo";
    default:
      return humanizeSnakeCase(value);
  }
}

export function formatExecutionChannelLabel(value: ExecutionChannel) {
  switch (value) {
    case "browser_runtime":
      return "Browser runtime";
    case "support_form":
      return "Support form";
    case "in_app":
      return "In-app flow";
    case "phone_prep":
      return "Phone prep";
    case "ops_queue":
      return "Ops queue";
    default:
      return humanizeSnakeCase(value);
  }
}

export function formatActionRunKindLabel(value: ActionRunKind) {
  switch (value) {
    case "request_refund":
      return "Request refund";
    case "request_replacement":
      return "Request replacement";
    case "request_cancellation":
      return "Request cancellation";
    case "prepare_chargeback":
      return "Prepare escalation";
    case "ops_handoff":
      return "Ops handoff";
    case "follow_up":
      return "Follow up";
  }
}

export function formatActionRunStatusLabel(value: ActionRunStatus) {
  switch (value) {
    case "waiting_for_consent":
      return "Waiting for consent";
    default:
      return humanizeSnakeCase(value);
  }
}

export function formatFollowUpStatusLabel(value: FollowUpStatus) {
  return humanizeSnakeCase(value);
}

export function formatAutomationSessionStatusLabel(value: AutomationSessionStatus) {
  return humanizeSnakeCase(value);
}

export function formatBrowserActionTypeLabel(value: BrowserActionType) {
  switch (value) {
    case "wait_for_text":
      return "Wait for text";
    case "press_key":
      return "Press key";
    default:
      return humanizeSnakeCase(value);
  }
}

export function formatBrowserCommandStatusLabel(value: BrowserCommandStatus) {
  return humanizeSnakeCase(value);
}

export function formatAutomationEventTypeLabel(value: AutomationEventType) {
  switch (value) {
    case "session_created":
      return "Session created";
    case "extension_connected":
      return "Extension connected";
    case "snapshot_updated":
      return "Snapshot updated";
    case "command_queued":
      return "Command queued";
    case "command_completed":
      return "Command completed";
    case "command_failed":
      return "Command failed";
    default:
      return humanizeSnakeCase(value);
  }
}

export function formatActionTypeLabel(value: ActionType) {
  switch (value) {
    case "research_started":
      return "Research started";
    case "research_completed":
      return "Research completed";
    case "strategy_created":
      return "Verdict created";
    case "action_plan_created":
      return "Action plan created";
    case "draft_created":
      return "Draft created";
    case "draft_approved":
      return "Draft approved";
    case "consent_requested":
      return "Consent requested";
    case "action_run_completed":
      return "Action completed";
    case "email_sent":
      return "Email sent";
    case "email_failed":
      return "Email failed";
    case "ops_handoff":
      return "Ops handoff";
    case "follow_up_scheduled":
      return "Follow-up scheduled";
    case "follow_up_recommended":
      return "Follow-up recommended";
  }
}
